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
    say "正在停止本次启动的服务..."
    kill "${PIDS[@]}" 2>/dev/null || true
    wait "${PIDS[@]}" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

command -v dotnet >/dev/null || die "未找到 .NET SDK 8，请先安装 dotnet。"
command -v node >/dev/null || die "未找到 Node.js，请先安装 Node.js 20+。"
command -v npm >/dev/null || die "未找到 npm，请先安装 Node.js 20+。"
command -v mysql >/dev/null || die "未找到 MySQL 客户端，请先安装 MySQL 8。"

mkdir -p "$LOG_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  say "首次运行，创建本机开发环境..."
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

say "检查 MySQL..."
if ! mysqladmin ping -h 127.0.0.1 -P 3306 --silent >/dev/null 2>&1; then
  warn "MySQL 尚未运行，尝试启动。"
  if command -v brew >/dev/null && brew services start mysql@8.4 >/dev/null 2>&1; then
    for _ in {1..30}; do
      mysqladmin ping -h 127.0.0.1 -P 3306 --silent >/dev/null 2>&1 && break
      sleep 1
    done
  fi
fi
mysqladmin ping -h 127.0.0.1 -P 3306 --silent >/dev/null 2>&1 || die "MySQL 未运行，请启动 MySQL 后重试。"

mysql -h 127.0.0.1 -P 3306 -u root <<'SQL'
CREATE DATABASE IF NOT EXISTS dealer_core CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'dealer'@'localhost' IDENTIFIED BY 'dealer_dev_only';
CREATE USER IF NOT EXISTS 'dealer'@'127.0.0.1' IDENTIFIED BY 'dealer_dev_only';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'localhost';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

if [[ ! -d "$ROOT_DIR/frontend/react/node_modules" ]]; then
  say "首次安装前端依赖..."
  (cd "$ROOT_DIR/frontend/react" && npm install)
fi

start_service() {
  local name="$1" project="$2"
  say "启动 $name..."
  (cd "$ROOT_DIR" && dotnet run --project "$project" --no-launch-profile >>"$LOG_DIR/$name.log" 2>&1) &
  PIDS+=("$!")
}

start_service "dealer-core" "backend/dotnet/DealerOps.Core/DealerOps.Core.csproj"
start_service "ai-service" "backend/dotnet/DealerOps.AiService/DealerOps.AiService.csproj"
start_service "dealer-gateway" "backend/dotnet/DealerOps.Gateway/DealerOps.Gateway.csproj"

say "启动 React 前端..."
(cd "$ROOT_DIR/frontend/react" && npm run dev -- --host 127.0.0.1 >>"$LOG_DIR/dealer-web.log" 2>&1) &
PIDS+=("$!")

say "等待服务就绪..."
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
  ((ready)) || warn "服务尚未响应：${url}（详情见 ${LOG_DIR}）"
done

if [[ -z "$AIMANAGER_API_KEY" ]]; then
  warn "AI Key 未配置：系统和前端已启动，AI 请求会返回 AI_KEY_MISSING。"
  warn "如需启用 AI，把 AIMANAGER_API_KEY 写入 $ENV_FILE 后重新运行本脚本。"
fi

say "启动完成：打开 http://localhost:5174"
say "登录账号：${ADMIN_USERNAME} / ${ADMIN_PASSWORD}"
say "按 Ctrl+C 可停止本次启动的全部服务。"
wait
