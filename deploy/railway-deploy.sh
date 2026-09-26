#!/usr/bin/env bash
# Deploy dealer-web, dealer-gateway, dealer-core, and MySQL to Railway.
# Requires RAILWAY_TOKEN (Railway project token). Does not run `railway login`.
set -euo pipefail

cd "$(dirname "$0")/.."

note() {
  printf '%s\n' "$*"
}

summary() {
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
    printf '%s\n' "$*" >>"$GITHUB_STEP_SUMMARY"
  fi
}

skip_unused() {
  note "Railway deploy skipped because RAILWAY_TOKEN is not a valid project token."
  summary "### Railway"
  summary "Skipped. RAILWAY_TOKEN is not a valid project token."
  exit 0
}

railway_token="${RAILWAY_TOKEN:-}"
if [[ -z "${railway_token//[[:space:]]/}" ]]; then
  skip_unused
fi

export CI=true

if ! command -v jq >/dev/null 2>&1; then
  note "jq is required to read Railway JSON."
  exit 1
fi

if ! command -v railway >/dev/null 2>&1; then
  npm install -g @railway/cli
fi

sanitize() {
  if [[ -n "${RAILWAY_TOKEN:-}" ]]; then
    sed "s|${RAILWAY_TOKEN}|[redacted]|g"
  else
    cat
  fi
}

# JSON stays on stdout. Progress and errors stay on stderr. Arguments are not logged.
run_railway() {
  local err
  err="$(mktemp)"
  if ! railway "$@" 2>"$err"; then
    note "Railway command failed: railway $1" >&2
    sanitize <"$err" >&2 || true
    rm -f "$err"
    return 1
  fi
  if [[ -s "$err" ]]; then
    sanitize <"$err" >&2 || true
  fi
  rm -f "$err"
}

services_file="$(mktemp)"
refresh_services() {
  run_railway service list --json >"$services_file"
}

service_names() {
  jq -r '
    def items:
      if type == "array" then .
      elif (.services | type) == "array" then .services
      elif (.edges | type) == "array" then [.edges[].node]
      else [] end;
    items[] | (.name // .serviceName // empty)
  ' "$services_file"
}

service_exists() {
  local want="$1"
  service_names | grep -Fxq "$want"
}

mysql_name() {
  service_names | grep -Eix '.*mysql.*' | head -n 1 || true
}

note "Checking RAILWAY_TOKEN with Railway. The token value is not printed."
status_file="$(mktemp)"
status_err="$(mktemp)"
if ! railway status --json >"$status_file" 2>"$status_err"; then
  rm -f "$status_file" "$status_err"
  skip_unused
fi
rm -f "$status_err"
note "Railway project token accepted."

refresh_services

db_name="$(mysql_name || true)"
if [[ -z "${db_name}" ]]; then
  note "Adding MySQL. dealer-core does not boot without it."
  add_out="$(mktemp)"
  run_railway add --database mysql --json >"$add_out"
  db_name="$(jq -r '.name // .service.name // .serviceName // empty' "$add_out")"
  rm -f "$add_out"
  refresh_services
  if [[ -z "${db_name}" ]]; then
    db_name="$(mysql_name || true)"
  fi
fi
if [[ -z "${db_name}" ]]; then
  note "MySQL service name was not found after railway add --database mysql."
  exit 1
fi
note "MySQL service: ${db_name}"

for app in dealer-core dealer-gateway dealer-web; do
  if service_exists "$app"; then
    note "Service ${app} already exists."
  else
    note "Creating service ${app}."
    run_railway add --service "$app" --json >/dev/null
    refresh_services
  fi
done

host_from() {
  local file="$1"
  [[ -s "$file" ]] || return 1
  jq -er '[.. | strings | select(test("^(https?://)?[A-Za-z0-9.-]+\\.railway\\.app/?$"))] | first' "$file" \
    | sed -E 's#^https?://##; s#/.*##'
}

public_host() {
  local service="$1"
  local port="$2"
  local file host
  file="$(mktemp)"
  if ! run_railway domain list --service "$service" --json >"$file"; then
    echo '[]' >"$file"
  fi
  host="$(host_from "$file" || true)"
  if [[ -z "${host}" ]]; then
    note "Generating a railway.app domain for ${service} on port ${port}." >&2
    run_railway domain --service "$service" --port "$port" --json >"$file"
    host="$(host_from "$file" || true)"
  else
    note "Public domain for ${service}: ${host}" >&2
    run_railway domain update "$host" --service "$service" --port "$port" --json >/dev/null \
      || note "Left existing domain ${host} unchanged." >&2
  fi
  rm -f "$file"
  if [[ -z "${host}" ]]; then
    note "Could not read a railway.app hostname for ${service}." >&2
    return 1
  fi
  printf '%s\n' "$host"
}

gateway_host="$(public_host dealer-gateway 8080)"
web_host="$(public_host dealer-web 5173)"
gateway_url="https://${gateway_host}"
web_url="https://${web_host}"
note "Gateway origin: ${gateway_url}"
note "Web origin: ${web_url}"

# Railway resolves ${{Service.VAR}} at runtime. Keep those references literal.
# Shell-escape only the service name interpolation.
ref() {
  printf '${{%s.%s}}' "$1" "$2"
}

jdbc_url="jdbc:mysql://$(ref "$db_name" MYSQLHOST):$(ref "$db_name" MYSQLPORT)/$(ref "$db_name" MYSQLDATABASE)?useSSL=false&allowPublicKeyRetrieval=true"

note "Setting service variables. Values are not printed."
run_railway variable set --service dealer-core --skip-deploys \
  "CORE_PORT=8081" \
  "MYSQL_URL=${jdbc_url}" \
  "MYSQL_USER=$(ref "$db_name" MYSQLUSER)" \
  "MYSQL_PASSWORD=$(ref "$db_name" MYSQLPASSWORD)" \
  "INTERNAL_TOKEN=dealer-internal" \
  "JWT_MODE=dev" \
  "DEV_JWT_SECRET=dealer-dev-jwt-secret-change-me" \
  "GATEWAY_PUBLIC_URL=${gateway_url}" \
  >/dev/null

run_railway variable set --service dealer-gateway --skip-deploys \
  "GATEWAY_PORT=8080" \
  "CORE_URL=http://dealer-core.railway.internal:8081" \
  "INTERNAL_TOKEN=dealer-internal" \
  "JWT_MODE=dev" \
  "DEV_JWT_SECRET=dealer-dev-jwt-secret-change-me" \
  "CORS_ALLOWED_ORIGIN=${web_url}" \
  >/dev/null

run_railway variable set --service dealer-web --skip-deploys \
  "GATEWAY_PUBLIC_URL=${gateway_url}" \
  "VITE_GATEWAY_URL=${gateway_url}" \
  >/dev/null

deploy_app() {
  local name="$1"
  local dir="$2"
  note "Deploying ${name} from ${dir} (Dockerfile)."
  run_railway up --service "$name" --path-as-root --ci -y \
    --message "github ${GITHUB_SHA:-manual}" \
    "$dir"
  note "Railway accepted the ${name} deployment."
}

deploy_app dealer-core dealer-core
deploy_app dealer-gateway dealer-gateway
deploy_app dealer-web dealer-web

note "PUBLIC_WEB_URL=${web_url}"
note "PUBLIC_GATEWAY_URL=${gateway_url}"
note "SWAGGER_URL=${gateway_url}/swagger-ui/index.html"
note "Core has no public domain. Swagger is on the gateway host, not port 8081."
note "Open Railway logs in the project dashboard: each service, Deployments, View logs."

summary "### Railway"
summary "- Web: ${web_url}"
summary "- Gateway: ${gateway_url}"
summary "- Swagger: ${gateway_url}/swagger-ui/index.html"
summary "Logs: Railway project, service, Deployments."
