# DealerOps .NET Backend

C# / .NET 10 port of the Java backend. Three projects in one solution, matching the Java microservice split:

| Project | Port | Java equivalent | Role |
|---|---|---|---|
| `DealerOps.Core` | 8081 | dealer-core | Business APIs, EF Core + Pomelo MySQL, JWT auth, Flyway-compatible schema |
| `DealerOps.AiService` | 8082 | ai-service | AI adapter (OpenAI-compatible), no database |
| `DealerOps.Gateway` | 8080 | dealer-gateway | YARP reverse proxy, JWT validation, CORS |

## Prerequisites

| Tool | Version | Install (macOS) |
|---|---|---|
| .NET SDK | 8.0+ | `brew install dotnet` |
| MySQL | 8.x | `brew install mysql@8.4 && brew services start mysql@8.4` |
| Node.js | 20+ | Install from [nodejs.org](https://nodejs.org/) or `brew install node` |

Verify the installations before continuing:

```bash
dotnet --version  # prints 8.x.xxx
mysql --version   # prints MySQL 8.x
node --version    # prints v20.x or newer
```

The commands below assume macOS or Linux and a terminal opened at the repository root.

## Quick start

### 1. Set up MySQL (same as the Java backend)

If you already ran the Java backend setup, skip this step — they share the same database.

```bash
mysql -u root <<'SQL'
CREATE DATABASE IF NOT EXISTS dealer_core
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'dealer'@'localhost' IDENTIFIED BY 'dealer_dev_only';
CREATE USER IF NOT EXISTS 'dealer'@'127.0.0.1' IDENTIFIED BY 'dealer_dev_only';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'localhost';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
```

The .NET backend auto-creates tables on first start (EF Core `EnsureCreated`). No need to run the Java backend first.

### 2. Build the solution once

```bash
cd backend/dotnet
dotnet build
```

Expected output: **0 errors**. Core may currently print two existing nullable warnings.

### 3. Start the services

Open three terminals. Keep all three terminals running. Start the services in this order and wait for the health check to respond before opening the next terminal.

**Terminal 1 — DealerOps.Core (port 8081)**

```bash
cd backend/dotnet/DealerOps.Core
ASPNETCORE_ENVIRONMENT=Development \
ADMIN_USERNAME=admin ADMIN_PASSWORD=admin123 ADMIN_EMAIL=admin@example.com \
  dotnet run
```

Wait for `Now listening on: http://0.0.0.0:8081`. Check: http://localhost:8081/actuator/health

**Terminal 2 — DealerOps.AiService (port 8082)**

```bash
cd backend/dotnet/DealerOps.AiService
export ASPNETCORE_ENVIRONMENT=Development
export AIMANAGER_API_KEY='paste-your-groq-api-key-here'
dotnet run
```

Replace the placeholder only in your local terminal or secret manager. Never commit it to Git. Check: http://localhost:8082/actuator/health

If you do not need AI features, omit the `export` line. The service will still start, but AI requests will return `AI_KEY_MISSING`.

**Terminal 3 — DealerOps.Gateway (port 8080)**

```bash
cd backend/dotnet/DealerOps.Gateway
dotnet run
```

Check: http://localhost:8080/actuator/health

### 4. Start the frontend

Use a fourth terminal. Return to the repository root before running one of these commands:

```bash
# Vue (port 5173)
cd frontend/vue
npm install
npm run dev

# or React (port 5174)
cd frontend/react
npm install
npm run dev
```

Open the URL printed by Vite, then sign in as `admin` / `admin123`.

### Stop everything

In each terminal, press `Ctrl+C`. MySQL can remain running for the next session.

## Configuration

All settings have local defaults in `appsettings.json`. Override with environment variables using the `__` separator for nested keys.

### DealerOps.Core

| Environment variable | Default | Description |
|---|---|---|
| `ConnectionStrings__Default` | `Server=localhost;Port=3306;Database=dealer_core;User=dealer;Password=dealer_dev_only` | MySQL connection string |
| `Jwt__DevSecret` | `dealer-dev-jwt-secret-change-me` | HS256 signing secret (must match gateway) |
| `AiService__BaseUrl` | `http://127.0.0.1:8082` | AI service URL |
| `AiService__InternalToken` | `dealer-internal` | Shared internal header value |
| `ADMIN_USERNAME` | _(empty)_ | Platform admin username (seed on first start) |
| `ADMIN_PASSWORD` | _(empty)_ | Platform admin password (seed on first start) |
| `ADMIN_EMAIL` | _(empty)_ | Platform admin email |
| `ADMIN_PHONE` | _(empty)_ | Platform admin phone |

### DealerOps.AiService

| Environment variable | Default | Description |
|---|---|---|
| `AIMANAGER_API_KEY` | _(empty)_ | LLM provider API key for local development; use a Key Vault reference in Azure |
| `AiManager__Provider` | `groq` | Provider name |
| `AiManager__Model` | `qwen/qwen3.8-27b` | Model name |
| `AiService__InternalToken` | `dealer-internal` | Must match Core and Gateway |

### DealerOps.Gateway

| Environment variable | Default | Description |
|---|---|---|
| `dealerops__jwt__devSecret` | `dealer-dev-jwt-secret-change-me` | Must match Core |
| `dealerops__internalToken` | `dealer-internal` | Must match Core and AiService |
| `dealerops__corsAllowedOrigin` | `http://localhost:5173` | Browser origin for CORS |

## Useful URLs (after all three are running)

| What | URL |
|---|---|
| Web app (Vue) | http://localhost:5173 |
| Web app (React) | http://localhost:5174 |
| Swagger UI (唯一外部入口) | http://localhost:8080/swagger/index.html |
| Swagger 文档 | Gateway 自动合并 Core 和 AI Service API，无需切换 |
| Gateway OpenAPI JSON | http://localhost:8080/swagger/v1/swagger.json |
| Gateway health | http://localhost:8080/actuator/health |
| Core health | http://localhost:8081/actuator/health |
| AI health | http://localhost:8082/actuator/health |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `dotnet build` fails | Run `dotnet --version` — must be 8.x. On macOS with Homebrew: `export DOTNET_ROOT="/opt/homebrew/opt/dotnet/libexec"` |
| Core crashes with MySQL error | MySQL is not running, or the database/user was not created (Step 1) |
| Login works but API returns 401 | `Jwt__DevSecret` on Core differs from `dealerops__jwt__devSecret` on Gateway |
| AI returns `AI_KEY_MISSING` | Set `AIMANAGER_API_KEY` only in the local AiService terminal or Azure Key Vault reference, then restart AiService |
| CORS errors in browser | `dealerops__corsAllowedOrigin` on Gateway must match the frontend URL |
| Port already in use | The Java backend is running on the same ports — stop it first |
