#!/usr/bin/env bash
# Private stack for E2E runs: dealer-core, dealer-gateway and the React dev server built from the
# current working tree, on their own ports and their own database. The shared development stack
# (8080/8081/5174, database dealer_core) is never restarted or written to. ai-service is shared.
#
# Usage: scripts/e2e-stack.sh start|stop|restart|status
set -uo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$E2E_DIR/.." && pwd)"
STACK="$E2E_DIR/.stack"
# Prefixed names: .env.local exports CORE_PORT, GATEWAY_PORT, CORE_URL and friends for the shared
# stack, and sourcing it must never redirect this stack to the shared core or database.
STACK_CORE_PORT="${E2E_CORE_PORT:-18081}"
STACK_GATEWAY_PORT="${E2E_GATEWAY_PORT:-18080}"
STACK_WEB_PORT="${E2E_WEB_PORT:-5175}"
STACK_DB_NAME="${E2E_DB_NAME:-dealer_core_e2e}"

say() { printf '[e2e-stack] %s\n' "$*"; }

load_env() {
  # Same local-only settings as start-local.sh; values are never printed.
  if [[ -f "$ROOT/dealer-platform/.env.local" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/dealer-platform/.env.local"
    set +a
  fi
  export MYSQL_URL="Server=127.0.0.1;Port=3306;Database=$STACK_DB_NAME;User=dealer;Password=dealer_dev_only"
  export ASPNETCORE_ENVIRONMENT=Development JWT_MODE=dev
  export DEV_JWT_SECRET="${DEV_JWT_SECRET:-dealer-dev-jwt-secret-change-me}"
  export INTERNAL_TOKEN="${INTERNAL_TOKEN:-dealer-internal}"
  export ADMIN_USERNAME="${ADMIN_USERNAME:-admin}" ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
  export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
  export AI_URL="${E2E_AI_URL:-http://127.0.0.1:8082}"
  export LOG_DIR="$STACK/logs"
}

create_db() {
  if [[ ! "$STACK_DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
    say "refusing to use an invalid database name"
    return 1
  fi
  local reset_statement=""
  if [[ "$STACK_DB_NAME" == "dealer_core_e2e" || "${E2E_RESET_DB:-0}" == "1" ]]; then
    reset_statement="DROP DATABASE IF EXISTS $STACK_DB_NAME;"
  fi
  mysql -h 127.0.0.1 -P 3306 -u root <<SQL
$reset_statement
CREATE DATABASE IF NOT EXISTS $STACK_DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON $STACK_DB_NAME.* TO 'dealer'@'localhost';
GRANT ALL PRIVILEGES ON $STACK_DB_NAME.* TO 'dealer'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
}

build() {
  say "building core and gateway into $STACK/build"
  for svc in Core Gateway; do
    dotnet build "$ROOT/backend/dotnet/DealerOps.$svc/DealerOps.$svc.csproj" \
      -o "$STACK/build/$svc" -v quiet -nologo >"$STACK/logs/build-$svc.log" 2>&1 \
      || { say "build of $svc failed, see $STACK/logs/build-$svc.log"; return 1; }
  done
}

stop() {
  for name in core gateway web; do
    local pid_file="$STACK/$name.pid"
    [[ -f "$pid_file" ]] || continue
    local pid; pid="$(cat "$pid_file")"
    # Kill the process group so `npx vite` and `dotnet` children go too.
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    rm -f "$pid_file"
  done
  # A restart must not race the old processes for the ports.
  for _ in $(seq 1 30); do
    local busy=0
    for port in "$STACK_CORE_PORT" "$STACK_GATEWAY_PORT" "$STACK_WEB_PORT"; do
      lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && busy=1
    done
    ((busy)) || break
    sleep 0.5
  done
  say "stopped"
}

# spawn NAME DIR [VAR=value ...] COMMAND...: runs COMMAND in DIR in its own process group.
spawn() {
  local name="$1" dir="$2"; shift 2
  set -m
  (cd "$dir" && exec env "$@" >"$STACK/logs/$name.out" 2>&1) &
  echo $! >"$STACK/$name.pid"
  set +m
}

wait_ready() {
  for _ in $(seq 1 90); do
    if curl -fsS -H "X-Dealer-Internal: $INTERNAL_TOKEN" -o /dev/null \
        "http://127.0.0.1:$STACK_CORE_PORT/actuator/health" 2>/dev/null \
      && curl -fsS "http://127.0.0.1:$STACK_GATEWAY_PORT/actuator/health" 2>/dev/null | grep -q '"core":{"status":"UP"}' \
      && curl -fsS -o /dev/null "http://localhost:$STACK_WEB_PORT/" 2>/dev/null; then
      say "ready: web http://localhost:$STACK_WEB_PORT, gateway http://127.0.0.1:$STACK_GATEWAY_PORT, db $STACK_DB_NAME"
      return 0
    fi
    sleep 1
  done
  say "not ready after 90s; logs in $STACK/logs"
  return 1
}

start() {
  mkdir -p "$STACK/logs"
  load_env
  if [[ "$STACK_DB_NAME" == "dealer_core" || "$STACK_CORE_PORT" == "8081" || "$STACK_GATEWAY_PORT" == "8080" ]]; then
    say "refusing to start: the E2E stack must not use the shared core, gateway or database"
    return 1
  fi
  create_db || { say "could not create database $STACK_DB_NAME"; return 1; }
  build || return 1
  spawn core "$STACK/build/Core" \
    "Kestrel__Endpoints__Http__Url=http://0.0.0.0:$STACK_CORE_PORT" dotnet DealerOps.Core.dll
  spawn gateway "$STACK/build/Gateway" \
    "GATEWAY_PORT=$STACK_GATEWAY_PORT" "CORE_URL=http://127.0.0.1:$STACK_CORE_PORT" \
    "CORS_ALLOWED_ORIGIN=http://localhost:$STACK_WEB_PORT" dotnet DealerOps.Gateway.dll
  spawn web "$ROOT/frontend/react" "VITE_GATEWAY_URL=http://localhost:$STACK_GATEWAY_PORT" \
    npx vite --port "$STACK_WEB_PORT" --strictPort --host 127.0.0.1
  wait_ready
}

case "${1:-}" in
  start) stop >/dev/null; start ;;
  stop) stop ;;
  restart) stop; start ;;
  status) curl -fsS "http://127.0.0.1:$STACK_GATEWAY_PORT/actuator/health" && echo ;;
  *) echo "usage: $0 start|stop|restart|status"; exit 2 ;;
esac
