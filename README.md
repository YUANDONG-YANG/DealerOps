# Dealer Ops

Multi-tenant back office for independent used-car dealers: DMS (vehicles), CRM (customers and leads), and OMVIC ad compliance with a real AI review. A platform admin opens dealerships and binds staff; staff only see their own dealership.

Private GitHub: [YUANDONG-YANG/DealerOps](https://github.com/YUANDONG-YANG/DealerOps).

## Architecture at a glance

```text
Browser ──> dealer-web (5173) ──> dealer-gateway (8080) ──> dealer-core (8081) ──> MySQL (3306)
                                                                  └──> ai-service (8082) ──> LLM provider
```

| Folder | What it is |
|---|---|
| `dealer-web/` | Vue 3 + Element Plus frontend (Vite) |
| `dealer-gateway/` | Spring Cloud Gateway: the only API entry for the browser (`/api/v1/**`), validates JWT |
| `dealer-core/` | Spring Boot + Flyway + MySQL: all business APIs, login, and admin |
| `ai-service/` | Internal AI adapter around the vendored `ai-manager` sources; no database |
| `dealer-platform/` | `openapi.yaml`, `API.md`, `env.example` |
| `deploy/` | Terraform + Azure deployment ([deploy/README.md](deploy/README.md)) |
| `design/` | Design documents, the source of truth ([design/README.md](design/README.md)) |

The browser only talks to the gateway on `8080`. Core (`8081`) and ai-service (`8082`) listen on `127.0.0.1` and must not be called from the browser. Everything runs as plain processes; there are no containers.

## Local development startup

You will start five processes, **in this order**, and wait for each to be healthy before starting the next:

```text
MySQL → dealer-core → ai-service → dealer-gateway → dealer-web
```

### Step 0. Install the tools

| Tool | Version | Check |
|---|---|---|
| JDK | **21** for the three Java services (not 25) | `java -version` |
| Maven | 3.9+ | `mvn -v` |
| Node.js + npm | 20+ | `node -v` |
| MySQL | 8.4 | `mysql --version` |
| IntelliJ IDEA | any recent | recommended for running the Java services |

On macOS: `brew install openjdk@21 maven node@20 mysql@8.4`.

### Step 1. Start MySQL and create the database

```text
brew services start mysql@8.4
mysql -u root
```

In the MySQL prompt, run once:

```sql
CREATE DATABASE IF NOT EXISTS dealer_core CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'dealer'@'localhost' IDENTIFIED BY 'dealer_dev_only';
CREATE USER IF NOT EXISTS 'dealer'@'127.0.0.1' IDENTIFIED BY 'dealer_dev_only';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'localhost';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'127.0.0.1';
FLUSH PRIVILEGES;
exit;
```

Check that the app user works:

```text
mysql -h 127.0.0.1 -P 3306 -u dealer -pdealer_dev_only dealer_core -e "SELECT 1"
```

Tables are created automatically by Flyway when `dealer-core` starts.

### Step 2. Get an AI model key (optional)

`ai-service` carries the `ai-manager` library as vendored source, so there is nothing extra to clone or install. To get real AI answers you need an LLM API key (Groq free tier by default). Without a key, ai-service still starts, but AI calls fail with `AI_KEY_MISSING`. Details: [ai-service/README.md](ai-service/README.md).

### Step 3. Create the IntelliJ run configurations

Open the repository root in IntelliJ. Set **Project SDK** and **Maven importer JDK** to JDK 21. Then create one **Spring Boot** run configuration per service, select JDK 21, and paste the environment variables below into its **Environment variables** field.

| Name | Module | Main class |
|---|---|---|
| `dealer-core-local` | `dealer-core` | `com.dealerops.core.DealerCoreApplication` |
| `ai-service-local` | `ai-service` | `ca.sait.dealerops.aiservice.AiServiceApplication` |
| `dealer-gateway-local` | `dealer-gateway` | `ca.sait.dealerops.gateway.GatewayApplication` |

**dealer-core-local**

```text
CORE_PORT=8081;SERVER_ADDRESS=127.0.0.1;LOG_DIR=$PROJECT_DIR$/log-sum;MYSQL_URL=jdbc:mysql://127.0.0.1:3306/dealer_core?useSSL=false&allowPublicKeyRetrieval=true;MYSQL_USER=dealer;MYSQL_PASSWORD=dealer_dev_only;GATEWAY_PUBLIC_URL=http://localhost:8080;AI_BASE_URL=http://127.0.0.1:8082;INTERNAL_TOKEN=dealer-internal;JWT_MODE=dev;DEV_JWT_SECRET=dealer-dev-jwt-secret-change-me;ADMIN_USERNAME=admin;ADMIN_PASSWORD=admin123;ADMIN_EMAIL=admin@example.com
```

**ai-service-local** (put your key after `AIMANAGER_API_KEY=`)

```text
AI_PORT=8082;SERVER_ADDRESS=127.0.0.1;LOG_DIR=$PROJECT_DIR$/log-sum;SPRING_APPLICATION_NAME=ai-service;SPRING_PROFILES_ACTIVE=dev;INTERNAL_TOKEN=dealer-internal;AIMANAGER_API_KEY=;AIMANAGER_GATEWAY_PROVIDER=groq;AIMANAGER_GATEWAY_MODEL=qwen/qwen3.8-27b;AIMANAGER_GATEWAY_MAX_TOKENS=800
```

**dealer-gateway-local**

```text
GATEWAY_PORT=8080;CORE_URL=http://127.0.0.1:8081;AI_URL=http://127.0.0.1:8082;LOG_DIR=$PROJECT_DIR$/log-sum;SPRING_PROFILES_ACTIVE=dev;INTERNAL_TOKEN=dealer-internal;CORS_ALLOWED_ORIGIN=http://localhost:5173;JWT_MODE=dev;DEV_JWT_SECRET=dealer-dev-jwt-secret-change-me
```

These are local-only values. Never reuse them in the cloud, and never commit API keys. Reference list: [dealer-platform/env.example](dealer-platform/env.example).

### Step 4. Start the three Java services

Before starting a service, delete **that service's own** `target/` folder (or run `mvn clean` in it) so it starts from a clean build. Then run the configurations one at a time and open the readiness URL. Move on only when it returns HTTP 200 with `{"status":"UP"}`:

| Order | Run | Wait for |
|---|---|---|
| 1 | `dealer-core-local` | http://127.0.0.1:8081/actuator/health/readiness |
| 2 | `ai-service-local` | http://127.0.0.1:8082/actuator/health/readiness |
| 3 | `dealer-gateway-local` | http://127.0.0.1:8080/actuator/health/readiness |

<details>
<summary>Without IntelliJ (terminal, macOS/Linux)</summary>

Run each line in its own terminal from the repository root, in the order above. The checked-in application config files (`application.yml` / `application.yaml`) already default to the local values; only these overrides are needed. `JWT_MODE=dev` must be set explicitly on core and gateway: they refuse to start when it comes only from the config default. Make sure `java -version` shows 21.

```text
cd dealer-core && SERVER_ADDRESS=127.0.0.1 LOG_DIR=../log-sum JWT_MODE=dev ADMIN_USERNAME=admin ADMIN_PASSWORD=admin123 ADMIN_EMAIL=admin@example.com mvn clean spring-boot:run
cd ai-service && SERVER_ADDRESS=127.0.0.1 LOG_DIR=../log-sum SPRING_PROFILES_ACTIVE=dev AIMANAGER_API_KEY=<your key> mvn clean spring-boot:run
cd dealer-gateway && LOG_DIR=../log-sum SPRING_PROFILES_ACTIVE=dev JWT_MODE=dev mvn clean spring-boot:run
```

</details>

### Step 5. Start the frontend

```text
cd dealer-web
cp .env.example .env
npm ci
npm run dev
```

Open http://localhost:5173/.

### Step 6. Sign in

| Account | Login | Password | Lands on |
|---|---|---|---|
| Platform admin | `admin` or `admin@example.com` | `admin123` | `/admin` |

There is no demo business data. As admin, create a dealership on `/admin`, then use **Bind staff** to create a staff account (username, email and/or phone, temporary password of at least 8 characters). Sign out and sign in as that staff user to reach `/dms`. Self-registered accounts land on `/no-access` until the admin binds them under **Admin → Members → Pending accounts**.

The admin is seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD` only on the first start; changing them later does not change an existing password. Sign-in design: [design/15-Data-Auth-and-Gateway.md](design/15-Data-Auth-and-Gateway.md) §8.

### Useful URLs

| What | URL |
|---|---|
| Web app | http://localhost:5173/ |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |
| Logs | `log-sum/<service>-<date>.log` |

### Troubleshooting

| Symptom | Fix |
|---|---|
| core fails with a database or Flyway error | MySQL is not running, or Step 1 was skipped; re-run the `SELECT 1` check. Databases created before 2026-10-07 need the Flyway repair in [design/15-Data-Auth-and-Gateway.md](design/15-Data-Auth-and-Gateway.md) §8.3 |
| Compile errors such as `invalid target release` | The run configuration or terminal is not using JDK 21 |
| Ad check returns `AI_UNAVAILABLE` / `AI_KEY_MISSING` | Set `AIMANAGER_API_KEY` on ai-service and restart it |
| Login works but every API call returns 401 | `DEV_JWT_SECRET` differs between core and gateway |
| Browser shows CORS errors | Open the app at `http://localhost:5173`, not `127.0.0.1:5173` |
| Anything else | Check `log-sum/` first ([design/20-Observability.md](design/20-Observability.md)) |

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
| Contributor and AI-agent rules (including the current no-test-authoring rule) | [CLAUDE.md](CLAUDE.md) |
