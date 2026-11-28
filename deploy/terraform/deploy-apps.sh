#!/usr/bin/env bash
# Build and upload the four apps to the Azure stack this directory created.
# Run `terraform apply` first: every name and URL below comes from terraform output.
#
#   ./deploy-apps.sh            # all four
#   ./deploy-apps.sh core web   # only these
#   ./deploy-apps.sh --check    # only the clean-checkout check below; deploy.sh runs it first
#
# Needs: az (logged in), terraform, .NET 10 SDK, Node 20 + npm/pnpm.
# Procedure and verification: ../README.md
set -euo pipefail
# az prints routine notices (no build automation, Kudu warm-up) as warnings; show only errors.
export AZURE_CORE_ONLY_SHOW_ERRORS=true

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "${here}/../.." && pwd)"

for tool in az terraform dotnet npm zip tar curl seq git; do
  command -v "${tool}" >/dev/null 2>&1 || { echo "Missing required tool: ${tool}" >&2; exit 1; }
done

# Publish only a clean checkout of its latest upstream commit. Otherwise different
# apps in one deployment could be built from different local edits or stale sources.
upstream="$(git -C "${repo}" rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null)" \
  || { echo "The current branch has no upstream; refusing to publish." >&2; exit 1; }
remote="${upstream%%/*}"
git -C "${repo}" fetch --quiet "${remote}" \
  || { echo "Could not fetch ${remote}; refusing to publish stale or unverified code." >&2; exit 1; }
head_commit="$(git -C "${repo}" rev-parse HEAD)"
upstream_commit="$(git -C "${repo}" rev-parse "${upstream}")"
if [ "${head_commit}" != "${upstream_commit}" ]; then
  echo "Checkout is not at the latest upstream commit (${upstream}); refusing to publish." >&2
  exit 1
fi
if ! git -C "${repo}" diff-index --quiet HEAD --; then
  echo "Tracked files have uncommitted changes; refusing to publish a mixed build." >&2
  exit 1
fi
untracked_sources="$(git -C "${repo}" ls-files --others --exclude-standard -- backend/dotnet frontend/react)"
if [ -n "${untracked_sources}" ]; then
  echo "Untracked backend or frontend source files are present; refusing to publish." >&2
  printf '%s\n' "${untracked_sources}" >&2
  exit 1
fi
if [ "${1:-}" = "--check" ]; then
  echo "==> checkout is clean and at ${upstream} (${head_commit})"
  exit 0
fi
echo "==> publishing ${head_commit} (${upstream})"

# Build output goes to a scratch directory, never into the source tree: a publish folder inside a
# project directory is picked up as content by the next `dotnet publish`, and installing into
# frontend/react would rewrite the pnpm-managed node_modules the local dev servers run from.
work="$(mktemp -d "${TMPDIR:-/tmp}/dealerops-deploy.XXXXXX")"
trap 'rm -rf "${work}"' EXIT

tf() { terraform -chdir="${here}" output -raw "$1" 2>/dev/null || true; }

# `terraform output` is empty when a local state file has not been refreshed yet.
# Evaluate the same Terraform locals as a fallback so a successful build can never
# silently continue with an empty App Service name or API URL.
tf_expr() {
  printf '%s\n' "$1" \
    | terraform -chdir="${here}" console -compact-warnings 2>/dev/null \
    | sed 's/^"//; s/"$//'
}

from_output_or_local() {
  local output local_expr value
  output="$(tf "$1")"
  if [ -n "$output" ] && [ "$output" != "null" ]; then
    printf '%s\n' "$output"
    return
  fi
  local_expr="$2"
  value="$(tf_expr "$local_expr")"
  printf '%s\n' "$value"
}

resource_group="$(from_output_or_local resource_group_name local.resource_group_name)"
core_app="$(from_output_or_local core_app_name local.core_app_name)"
ai_app="$(from_output_or_local ai_app_name local.ai_app_name)"
gateway_app="$(from_output_or_local gateway_app_name local.gateway_app_name)"
web_app="$(from_output_or_local web_app_name local.web_app_name)"
gateway_url="$(from_output_or_local gateway_public_url local.gateway_public_url)"
web_url="$(from_output_or_local web_public_url local.web_public_origin)"

for deployment_value in resource_group core_app ai_app gateway_app web_app gateway_url web_url; do
  if [ -z "${!deployment_value}" ] || [ "${!deployment_value}" = "null" ]; then
    echo "Could not resolve ${deployment_value} from Terraform outputs or locals." >&2
    exit 1
  fi
done

published_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# A new app's Kudu site restarts during its first deploy, and az then fails with "Connection
# refused" although the zip may already be in place. Uploading the same zip again is harmless,
# and the health checks below still decide whether the deployment worked.
upload_zip() {
  local app="$1" zip="$2" attempt
  for attempt in 1 2 3; do
    az webapp deploy --resource-group "${resource_group}" --name "${app}" --type zip \
      --src-path "${zip}" --async false --track-status false --output none && return 0
    [ "${attempt}" -lt 3 ] && { echo "==> ${app}: upload attempt ${attempt} failed; retrying in 30s" >&2; sleep 30; }
  done
  echo "==> ${app}: upload failed 3 times" >&2
  return 1
}

if [ "$#" -eq 0 ]; then
  set -- core ai gateway web
fi

deploy_dotnet() {
  local project="$1" app="$2"
  local project_dir="${repo}/backend/dotnet/${project}"

  echo "==> ${project}: stamp PUBLISHED_AT=${published_at}"
  az webapp config appsettings set \
    --resource-group "${resource_group}" --name "${app}" \
    --settings "PUBLISHED_AT=${published_at}" --output none

  echo "==> ${project}: publish"
  # Leftovers of older runs of this script would otherwise be published as content files.
  rm -rf "${project_dir}/publish" "${project_dir}/deploy.zip"
  dotnet publish "${project_dir}" -c Release -o "${work}/${project}" --nologo -v quiet
  [ -f "${work}/${project}/${project}.dll" ] || { echo "Publish of ${project} produced no ${project}.dll" >&2; exit 1; }

  echo "==> ${project}: zip and upload to ${app}"
  (cd "${work}/${project}" && zip -r -q "${work}/${project}.zip" .)
  upload_zip "${app}" "${work}/${project}.zip"
}

for target in "$@"; do
  case "${target}" in
    core)
      deploy_dotnet DealerOps.Core "${core_app}"
      ;;
    ai)
      deploy_dotnet DealerOps.AiService "${ai_app}"
      ;;
    gateway)
      deploy_dotnet DealerOps.Gateway "${gateway_app}"
      ;;
    web)
      # Same clock as PUBLISHED_AT on the three .NET apps. Gateway reports it as web time.
      echo "==> gateway: stamp WEB_PUBLISHED_AT=${published_at}"
      az webapp config appsettings set \
        --resource-group "${resource_group}" --name "${gateway_app}" \
        --settings "WEB_PUBLISHED_AT=${published_at}" --output none
      echo "==> react frontend: build against ${gateway_url}"
      (
        # Clean copy plus `npm ci` from package-lock.json: reproducible, and the working tree's
        # node_modules stays untouched.
        mkdir -p "${work}/web"
        tar -C "${repo}/frontend/react" --exclude=./node_modules --exclude=./dist \
          --exclude=./tsconfig.tsbuildinfo -cf - . | tar -C "${work}/web" -xf -
        cd "${work}/web"
        npm ci --no-audit --no-fund
        VITE_GATEWAY_URL="${gateway_url}" \
        VITE_PUBLISHED_AT="${published_at}" \
          npm run build
        grep -rqF "${gateway_url#https://}" dist/assets \
          || { echo "SPA build does not contain ${gateway_url}" >&2; exit 1; }
        echo "==> react frontend: zip and upload dist/ to ${web_app}"
        (cd dist && zip -r -q ../web.zip .)
        upload_zip "${web_app}" web.zip
      )
      ;;
    *)
      echo "Unknown target: ${target}. Use core, ai, gateway, or web." >&2
      exit 1
      ;;
  esac
done

deployed_web=false
deployed_backend=false
for target in "$@"; do
  case "${target}" in
    web) deployed_web=true ;;
    *) deployed_backend=true ;;
  esac
done

# az's startup tracking misreads the failed first start of an app Terraform created with no code
# (exit 155 before the first upload) and reports a failed deploy, so uploads skip it and this
# check waits for the gateway to report core and ai healthy instead. A web-only deploy skips it.
if [ "${deployed_backend}" = true ]; then
  backend_healthy() {
    echo "${health}" | grep -q '"core":{"status":"UP"' && echo "${health}" | grep -q '"ai":{"status":"UP"'
  }
  echo "==> waiting for ${gateway_url}/actuator/health to report core and ai UP"
  health=""
  for _ in $(seq 1 60); do
    health="$(curl -fsS --max-time 30 "${gateway_url}/actuator/health" 2>/dev/null || true)"
    backend_healthy && break
    sleep 10
  done
  backend_healthy \
    || { echo "Services did not become healthy within 10 minutes: ${health:-no response}" >&2; exit 1; }
fi

# A zip deploy that left only hostingstart.html still "succeeds", so check the served SPA itself:
# the root must return the built index.html, and a client route must load it through SPA fallback.
if [ "${deployed_web}" = true ]; then
  spa_serves() {
    local body
    body="$(curl -fsS --max-time 30 "$1" 2>/dev/null)" && echo "${body}" | grep -q '<div id="root">'
  }
  echo "==> waiting for ${web_url}/ to serve the SPA"
  web_ok=false
  for _ in $(seq 1 30); do
    if spa_serves "${web_url}/" && spa_serves "${web_url}/login"; then
      web_ok=true
      break
    fi
    sleep 10
  done
  [ "${web_ok}" = true ] \
    || { echo "SPA not served at ${web_url}/ and ${web_url}/login within 5 minutes. Check /home/site/wwwroot/index.html and the pm2 startup log." >&2; exit 1; }
fi

echo
echo "Published ${published_at}"
echo "Web     ${web_url}"
echo "Gateway ${gateway_url}/actuator/health"
echo "Swagger $(tf swagger_url)"
