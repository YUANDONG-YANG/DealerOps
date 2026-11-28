#!/usr/bin/env bash
set -Eeuo pipefail

# One-command local development launcher.
# Secrets are accepted only through the ignored local env file; nothing is committed.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT_DIR/dealer-platform/.env.local"
LOG_DIR="$ROOT_DIR/log-sum"
PIDS=()

say() { printf '\n\033[1;36m[DealerOps]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[DealerOps]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[DealerOps]\033[0m %s\n' "$*" >&2; exit 1; }

cleanup() {
  trap - EXIT INT TERM
  if ((${#PIDS[@]})); then
    say "Stopping the services started by this run..."
    kill "${PIDS[@]}" 2>/dev/null || true
    wait "${PIDS[@]}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

command -v dotnet >/dev/null || die ".NET SDK 8 not found. Install dotnet first."
command -v node >/dev/null || die "Node.js not found. Install Node.js 20+ first."
command -v npm >/dev/null || die "npm not found. Install Node.js 20+ first."
command -v mysql >/dev/null || die "MySQL client not found. Install MySQL 8 first."

mkdir -p "$LOG_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  say "First run: creating the local development environment..."
  cp "$ROOT_DIR/dealer-platform/env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

# Safe development defaults. They are deliberately local-only values.
# dealer-platform/env.example is shared with the Java stack and therefore contains
# a JDBC URL. The .NET launcher needs the equivalent ADO.NET connection string.
if [[ -z "${MYSQL_URL:-}" || "${MYSQL_URL:-}" == jdbc:* ]]; then
  MYSQL_URL="Server=127.0.0.1;Port=3306;Database=dealer_core;User=dealer;Password=dealer_dev_only"
fi
: "${ADMIN_USERNAME:=admin}"
: "${ADMIN_PASSWORD:=admin123}"
: "${ADMIN_EMAIL:=admin@example.com}"
: "${AIMANAGER_API_KEY:=}"
export MYSQL_URL ADMIN_USERNAME ADMIN_PASSWORD ADMIN_EMAIL AIMANAGER_API_KEY
export ASPNETCORE_ENVIRONMENT=Development
export CORE_URL=http://127.0.0.1:8081
export AI_URL=http://127.0.0.1:8082
export GATEWAY_PORT=8080
export AI_PORT=8082
export LOG_DIR
export JWT_MODE=dev
export DEV_JWT_SECRET="${DEV_JWT_SECRET:-dealer-dev-jwt-secret-change-me}"
export INTERNAL_TOKEN="${INTERNAL_TOKEN:-dealer-internal}"
export CORS_ALLOWED_ORIGIN="${CORS_ALLOWED_ORIGIN:-http://localhost:5174}"

say "Checking MySQL..."
if ! mysqladmin ping -h 127.0.0.1 -P 3306 --silent >/dev/null 2>&1; then
  warn "MySQL is not running yet; trying to start it."
  if command -v brew >/dev/null && brew services start mysql@8.4 >/dev/null 2>&1; then
    for _ in {1..30}; do
      mysqladmin ping -h 127.0.0.1 -P 3306 --silent >/dev/null 2>&1 && break
      sleep 1
    done
  fi
fi
mysqladmin ping -h 127.0.0.1 -P 3306 --silent >/dev/null 2>&1 || die "MySQL is not running. Start MySQL and try again."

mysql -h 127.0.0.1 -P 3306 -u root <<'SQL'
CREATE DATABASE IF NOT EXISTS dealer_core CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'dealer'@'localhost' IDENTIFIED BY 'dealer_dev_only';
CREATE USER IF NOT EXISTS 'dealer'@'127.0.0.1' IDENTIFIED BY 'dealer_dev_only';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'localhost';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

if [[ ! -d "$ROOT_DIR/frontend/react/node_modules" ]]; then
  say "Installing frontend dependencies for the first time..."
  (cd "$ROOT_DIR/frontend/react" && npm install)
fi

start_service() {
  local name="$1" project="$2"
  say "Starting $name..."
  (cd "$ROOT_DIR" && dotnet run --project "$project" --no-launch-profile >>"$LOG_DIR/$name.log" 2>&1) &
  PIDS+=("$!")
}

start_service "dealer-core" "backend/dotnet/DealerOps.Core/DealerOps.Core.csproj"
start_service "ai-service" "backend/dotnet/DealerOps.AiService/DealerOps.AiService.csproj"
start_service "dealer-gateway" "backend/dotnet/DealerOps.Gateway/DealerOps.Gateway.csproj"

say "Starting the React frontend..."
(cd "$ROOT_DIR/frontend/react" && npm run dev -- --host 127.0.0.1 >>"$LOG_DIR/dealer-web.log" 2>&1) &
PIDS+=("$!")

say "Waiting for services to become ready..."
for url in \
  http://127.0.0.1:8081/actuator/health \
  http://127.0.0.1:8082/actuator/health \
  http://127.0.0.1:8080/actuator/health; do
  ready=0
  # core and ai-service answer 404 without the internal header, health included; the gateway
  # answers 404 when a caller sends it.
  probe=(curl -fsS "$url")
  [[ "$url" == *:8080/* ]] || probe=(curl -fsS -H "X-Dealer-Internal: ${INTERNAL_TOKEN}" "$url")
  for _ in {1..60}; do
    if "${probe[@]}" >/dev/null 2>&1; then ready=1; break; fi
    sleep 1
  done
  ((ready)) || warn "Service is not responding yet: ${url} (see ${LOG_DIR} for details)"
done

if [[ -z "$AIMANAGER_API_KEY" ]]; then
  warn "AI key is not configured: the system and frontend are running, but AI requests will return AI_KEY_MISSING."
  warn "To enable AI, set AIMANAGER_API_KEY in $ENV_FILE and run this script again."
fi

say "Startup complete: open http://localhost:5174"
say "Sign-in account: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}"
say "Press Ctrl+C to stop all services started by this run."
wait
