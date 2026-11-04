#!/usr/bin/env bash
# Lifecycle for the one-shot dealership role migration test
# (requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md section 4,
#  deploy/ROLE-MIGRATION-2026-11-03.md).
#
# The patch lives in dealer-core's startup, behind a marker row in schema_patch claimed with
# INSERT IGNORE, so the only way to run it is to start Core. This script starts Core alone - no
# gateway, no Vite - on its own port and its own throwaway database, so it cannot disturb the
# shared development stack (core 8081, database dealer_core) or the browser-test stack
# (core 18081, database dealer_core_e2e), and neither of those is stopped, restarted or read.
#
# Usage: scripts/role-migration.sh prepare|run|stop
#
#   prepare  Recreate the database, build Core, start it once against the empty database so
#            EnsureCreated builds the schema, stop it, then clear the patch marker and load
#            role-migration-fixture.sql. Clearing the marker is the documented revert step
#            (runbook section 5.2); it is what lets the next start see legacy rows, which no
#            real database has ever shown this code.
#   run      Start Core against the prepared database, wait until it is healthy (the patch runs
#            before the health endpoint answers), then stop it. The first `run` after `prepare`
#            migrates the fixture; a second `run` must be a no-op because the marker is claimed.
#   stop     Stop a Core left running by this script.
set -uo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT="$(cd "$E2E_DIR/.." && pwd)"
WORK="$E2E_DIR/.stack/role-migration"
PORT="${ROLE_MIGRATION_CORE_PORT:-18581}"
DB_NAME="${ROLE_MIGRATION_DB_NAME:-dealer_core_role_migration}"
MARKER="dealer_role_hierarchy_2026_11_03"

say() { printf '[role-migration] %s\n' "$*"; }

guard() {
  if [[ ! "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
    say "refusing to use an invalid database name"; return 1
  fi
  # The shared development database and the browser-suite database are off limits: this script
  # drops its database and rewrites role rows in it.
  case "$DB_NAME" in
    dealer_core|dealer_core_e2e)
      say "refusing to use $DB_NAME; this script drops and rewrites its database"; return 1 ;;
  esac
  case "$PORT" in
    8080|8081|18080|18081|5174|5175)
      say "refusing port $PORT; it belongs to the shared or browser-test stack"; return 1 ;;
  esac
}

load_env() {
  # Same local-only settings as the browser-test stack; values are never printed. MYSQL_URL is
  # exported after sourcing so .env.local cannot redirect this run at the shared database.
  if [[ -f "$ROOT/dealer-platform/.env.local" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$ROOT/dealer-platform/.env.local"
    set +a
  fi
  export MYSQL_URL="Server=127.0.0.1;Port=3306;Database=$DB_NAME;User=dealer;Password=dealer_dev_only"
  export ASPNETCORE_ENVIRONMENT=Development JWT_MODE=dev
  export DEV_JWT_SECRET="${DEV_JWT_SECRET:-dealer-dev-jwt-secret-change-me}"
  export INTERNAL_TOKEN="${INTERNAL_TOKEN:-dealer-internal}"
  export ADMIN_USERNAME="${ADMIN_USERNAME:-admin}" ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
  export ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
  export LOG_DIR="$WORK/logs"
}

db() { mysql -h 127.0.0.1 -P 3306 -u root --batch --skip-column-names "$DB_NAME"; }

create_db() {
  mysql -h 127.0.0.1 -P 3306 -u root <<SQL
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
GRANT ALL PRIVILEGES ON $DB_NAME.* TO 'dealer'@'localhost';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO 'dealer'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
}

build() {
  # Its own output directory: .stack/build is in use by a browser-test stack that may be running.
  say "building core into $WORK/build/Core"
  dotnet build "$ROOT/backend/dotnet/DealerOps.Core/DealerOps.Core.csproj" \
    -o "$WORK/build/Core" -v quiet -nologo >"$WORK/logs/build-Core.log" 2>&1 \
    || { say "build failed, see $WORK/logs/build-Core.log"; return 1; }
}

stop() {
  local pid_file="$WORK/core.pid"
  if [[ -f "$pid_file" ]]; then
    local pid; pid="$(cat "$pid_file")"
    kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    rm -f "$pid_file"
  fi
  for _ in $(seq 1 30); do
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || return 0
    sleep 0.5
  done
}

# start_core LOGNAME: Core alone, in its own process group, and wait until it is healthy. The role
# patch runs in the startup block before the host listens, so a healthy Core means the patch has
# either run or been skipped on the marker.
start_core() {
  local log="$1"
  set -m
  (cd "$WORK/build/Core" && exec env "Kestrel__Endpoints__Http__Url=http://127.0.0.1:$PORT" \
    dotnet DealerOps.Core.dll >"$WORK/logs/$log.out" 2>&1) &
  echo $! >"$WORK/core.pid"
  set +m
  for _ in $(seq 1 90); do
    if curl -fsS -H "X-Dealer-Internal: $INTERNAL_TOKEN" -o /dev/null \
        "http://127.0.0.1:$PORT/actuator/health" 2>/dev/null; then
      say "core healthy on $PORT against $DB_NAME ($log)"
      return 0
    fi
    # A Core that died on a startup failure will never answer; fail fast on that.
    kill -0 "$(cat "$WORK/core.pid")" 2>/dev/null || break
    sleep 1
  done
  say "core did not become healthy; see $WORK/logs/$log.out"
  tail -n 40 "$WORK/logs/$log.out" || true
  stop
  return 1
}

prepare() {
  guard || return 1
  mkdir -p "$WORK/logs"
  load_env
  stop
  create_db || { say "could not create database $DB_NAME"; return 1; }
  build || return 1
  # Start 1: empty database. EnsureCreated builds the schema and the patch claims its marker over
  # zero rows, which is exactly what every e2e run has done so far.
  start_core virgin || return 1
  stop
  local claimed
  claimed="$(printf "SELECT COUNT(*) FROM schema_patch WHERE patch_id = '%s';" "$MARKER" | db)" || return 1
  if [[ "$claimed" != "1" ]]; then
    say "expected the first start to claim the patch marker, got count=$claimed"; return 1
  fi
  # Release the marker so the next start migrates the legacy fixture. This is the revert step from
  # deploy/ROLE-MIGRATION-2026-11-03.md section 5.2, not a change to the patch.
  printf "DELETE FROM schema_patch WHERE patch_id = '%s';" "$MARKER" | db || return 1
  mysql -h 127.0.0.1 -P 3306 -u root "$DB_NAME" <"$E2E_DIR/scripts/role-migration-fixture.sql" || return 1
  say "prepared $DB_NAME with legacy rows and no patch marker"
}

run() {
  guard || return 1
  mkdir -p "$WORK/logs"
  load_env
  stop
  start_core "run-$(date +%s)" || return 1
  stop
  say "core start completed against $DB_NAME"
}

case "${1:-}" in
  prepare) prepare ;;
  run) run ;;
  stop) guard && stop && say stopped ;;
  *) echo "usage: $0 prepare|run|stop"; exit 2 ;;
esac
