# Dealer Ops

Multi-tenant back office for independent used-car dealers: DMS (vehicles), CRM (customers and leads), and OMVIC ad compliance with a real AI review. A platform admin opens dealerships and binds staff; staff only see their own dealership.

GitHub: [YUANDONG-YANG/DealerOps](https://github.com/YUANDONG-YANG/DealerOps) (public). Live demo: https://dealer-ops-dev.azurewebsites.net (when the Azure stack is deployed).

## Architecture at a glance

```text
Browser ──> dealer-web (5174) ──> dealer-gateway (8080) ──> dealer-core (8081) ──> MySQL (3306)
                                                                  └──> ai-service (8082) ──> LLM provider
```

| Folder | What it is |
|---|---|
| `frontend/react/` | React 19 + TypeScript frontend (Vite, port 5174) |
| `backend/dotnet/DealerOps.Gateway/` | YARP gateway: the only API entry for the browser (`/api/v1/**`), validates JWT, CORS |
| `backend/dotnet/DealerOps.Core/` | ASP.NET Core + EF Core + MySQL: all business APIs, login, admin, audit |
| `backend/dotnet/DealerOps.AiService/` | Internal AI adapter (ad review, assistant); no database |
| `dealer-platform/` | `openapi.yaml`, `API.md`, `env.example`, and the demo seed generator (`seed/`) |
| `playwright/` | Browser end-to-end tests on a private stack ([playwright/README.md](playwright/README.md)) |
| `deploy/` | Terraform + Azure App Service deployment ([deploy/README.md](deploy/README.md)) |
| `design/` | Design documents, the source of truth ([design/README.md](design/README.md)) |
| `requirements/` | Customer sources and the requirements specification |

The browser only talks to the gateway on `8080`. Core (`8081`) and ai-service (`8082`) must not be called from the browser. Everything runs as plain processes; there are no containers. The Java and Vue implementations have been removed.

## Local development

### Prerequisites

| Tool | Version | macOS install |
|---|---|---|
| .NET SDK | 10 | `brew install dotnet` |
| Node.js | 20 or newer | `brew install node` |
| MySQL | 8.4 | `brew install mysql@8.4 && brew link --force mysql@8.4` |
| Git | any | `brew install git` |

### One-command start

From the repository root:

```bash
./start-local.sh
```

The launcher starts MySQL if needed, creates the `dealer_core` database and the `dealer` user, installs the React dependencies on first use, then starts Core, AI Service, Gateway and the React dev server, and writes logs to `log-sum/`. Open http://localhost:5174 when it reports that startup is complete. Press `Ctrl+C` to stop everything it started.

Core creates the tables itself on first start (EF Core `EnsureCreated` plus column patches); there are no migrations to run.

AI is optional. Without `AIMANAGER_API_KEY` everything works except the AI review and assistant answers, which return `AI_KEY_MISSING`. To enable AI, put your key in `dealer-platform/.env.local` (created on first run and Git-ignored) and run `./start-local.sh` again. Never commit that file.

### Starting the services by hand

`start-local.sh` is the reference for environment variables. In separate terminals, in this order:

```bash
dotnet run --project backend/dotnet/DealerOps.Core --no-launch-profile       # 8081
dotnet run --project backend/dotnet/DealerOps.AiService --no-launch-profile  # 8082
dotnet run --project backend/dotnet/DealerOps.Gateway --no-launch-profile    # 8080
cd frontend/react && npm install && npm run dev                              # 5174
```

Wait for `http://127.0.0.1:<port>/actuator/health` to report `UP` before starting the next one. Core (8081) and ai-service (8082) answer 404 unless the request carries `X-Dealer-Internal: <INTERNAL_TOKEN>`; the gateway (8080) answers 404 when it does.

### Accounts and demo data

| Account | Sign in with | Password | Role | Lands on |
|---|---|---|---|---|
| Platform admin | `admin` or `admin@example.com` | `admin123` | `Platform.Admin` | `/admin` |
| Dealer user | `lafe` | `admin1234` | `Dealer.User` (dealership "Mazda") | `/dms` |

The admin is seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD` on the first start only. `lafe` and the rest of the demo data live in the shared development database; to load the generated demo dealerships, vehicles, photos, customers, leads and listings into a fresh database, see [dealer-platform/seed/README.md](dealer-platform/seed/README.md). Self-registered accounts land on the no-access page until the admin binds them under **Admin → Members → Pending accounts**.

### Useful URLs

| What | URL |
|---|---|
| Web app | http://localhost:5174/ |
| Gateway health | http://localhost:8080/actuator/health |
| Release times of all four apps | http://localhost:8080/actuator/release |
| Swagger UI | http://localhost:8080/swagger/index.html |
| Logs | `log-sum/<service>-<date>.log` |

### Troubleshooting

| Symptom | Fix |
|---|---|
| Core fails with a database error | MySQL is not running: `brew services start mysql@8.4`, then rerun `./start-local.sh` |
| Ad check returns `AI_UNAVAILABLE` / `AI_KEY_MISSING` | Set `AIMANAGER_API_KEY` in `dealer-platform/.env.local` and restart |
| Login works but every API call returns 401 | The JWT secret differs between core and gateway; start both through `start-local.sh` |
| Browser shows CORS errors | Open `http://localhost:5174`, not `127.0.0.1:5174` |
| Google sign-in shows "origin is not allowed" | The Google OAuth client authorizes `http://localhost:5174` and the Azure web URL only; other ports (such as the test stack on 5175) cannot use Google sign-in |
| `Port ... already in use` | The service is already running; find it with `lsof -i :8080` |
| Anything else | Check `log-sum/` first ([design/20-Observability.md](design/20-Observability.md)) |

## Testing

Browser end-to-end tests run against a private stack (web 5175, gateway 18080, core 18081, database `dealer_core_e2e`), so they never write to the development database.

```bash
cd playwright
npm install && npx playwright install chromium   # first time
npm test                                         # rebuild the private stack and run the full suite
npm run test:roles                               # walk every page as admin and lafe, desktop and phone width
```

Details, layout and the `autofix` loop: [playwright/README.md](playwright/README.md).

## Cloud deployment (Azure)

Terraform creates the App Service plan, the four web apps, MySQL Flexible Server, Key Vault and monitoring; a script uploads the apps. `terraform apply` alone leaves the database empty apart from the platform admin. One command deploys everything and then loads the committed demo seed:

```bash
az login
./deploy/deploy.sh --apply --seed     # terraform apply, upload all apps, then load dealer-platform/seed
```

`--seed` adds the 30 demo dealerships and does not delete rows that are already there. The platform admin password stays the one from `terraform output -raw admin_password`. Replacing Azure with a local database dump is separate and does delete existing rows; that procedure is in [deploy/README.md](deploy/README.md). `terraform destroy` in `deploy/terraform` removes the whole stack; apply and destroy can be repeated. Full procedure, verification and cost control: [deploy/README.md](deploy/README.md).

## AI agent MCP servers

The repository ships shared MCP server configuration for coding agents: `.mcp.json` (Claude Code) and `.cursor/mcp.json` (Cursor).

| Server | Use | Setup |
|---|---|---|
| `github` | Actions runs and logs, pull requests, issues | Export `GITHUB_PERSONAL_ACCESS_TOKEN` (a fine-grained token with read access to this repository's Actions, contents, issues, and pull requests) before starting the agent |
| `atlassian` | JIRA work items | Sign in through the OAuth prompt the first time (`/mcp` in Claude Code, or the MCP settings page in Cursor) |

Claude Code asks each developer to approve project servers on first use. Never commit a token; the configs read it from the environment.

## More documentation

| Topic | Document |
|---|---|
| Approved scope (in / out) | [design/SCOPE-BASELINE.md](design/SCOPE-BASELINE.md) |
| Requirements (English) | [requirements/DealerOps-Requirements.md](requirements/DealerOps-Requirements.md) |
| Map of all design docs | [design/README.md](design/README.md) |
| API contract | [design/14-Backend-API-Contract.md](design/14-Backend-API-Contract.md), [dealer-platform/openapi.yaml](dealer-platform/openapi.yaml) |
| Testing and team acceptance | [design/TESTING-AND-ACCEPTANCE-GUIDE.md](design/TESTING-AND-ACCEPTANCE-GUIDE.md) |
| Cloud deployment (Terraform + Azure) | [deploy/README.md](deploy/README.md) |
| Delivery status | [project-plan/Implementation-Delivery-Status.md](project-plan/Implementation-Delivery-Status.md) |
| Contributor and AI-agent rules | [CLAUDE.md](CLAUDE.md) |
