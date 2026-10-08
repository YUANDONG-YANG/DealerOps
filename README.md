# Dealer Ops

## Development phase: no test authoring

**Development is not complete. Do not write TEST code until the user confirms feature development is complete and explicitly authorizes test work.**

- Do not create, expand, modify, or refactor unit, integration, or end-to-end tests, empty test skeletons, assertions, test fixtures, mocks, or test-only helpers/configuration. This includes fixes made only to get existing tests to compile or pass.
- Requests to review requirements, inspect code, fix features, build, commit, or push do not authorize test authoring. Do not infer development completion from a successful build or existing coverage.
- Use source review, compilation/builds, and manual feature checks as appropriate. Running existing tests does not authorize editing them; obey any separate restriction on running tests. Report test failures without changing test code during development.
- Test-writing instructions elsewhere in this document or linked plans are deferred, including empty-class and sprint-based test tasks. Keep existing tests; do not delete or disable them to bypass failures.
- This is a student capstone: implement only required behavior and avoid unnecessary complexity.


Multi-tenant back office for independent used-car dealers. Each dealership has its own DMS, CRM, and ad-compliance data. A platform admin opens stores and binds staff; staff never see another store, and admins see no vehicle, customer, or listing records.

This checkout is the course implementation workspace. Course rules still treat `dealer-web`, `dealer-gateway`, `dealer-core`, and `ai-service` as **four independently built apps** (plus `dealer-platform` for IaC). They live as sibling folders here today.

Private GitHub: [YUANDONG-YANG/DealerOps](https://github.com/YUANDONG-YANG/DealerOps).

## In scope / out of scope

Approved scope is [design/SCOPE-BASELINE.md](design/SCOPE-BASELINE.md). Change it only with a re-sign or confirming email.

**In scope:** two roles (`Platform.Admin`, `Dealer.User`); admin-issued username/password + JWT (client spec); browser traffic only through the gateway; spec PDF vehicle/customer fields; VIN unique per store; paired sell; sold purchase fields locked; one customer per vehicle; OMVIC rule check then real AI; Ready + TXT export only when the latest check is Passed and not Stale; DMS/CRM audit (who / what / when); read-only in-store Assistant (same AI component, no writes).

**Out of scope:** work orders, leads/follow-up, buyer site / public inventory, OEM portal, KPI dashboard, CSV import, Service Bus / outbox / second DB / vector store, third-party listing publish, payments, Image Studio, homemade auth or model SDK, extra vehicle fields (mileage, color, fuel, and similar).

`design/01`–`06` are **withdrawn** (not for grading or coding); see [design/archive/](design/archive/).

## Repo layout

| Path | Status |
|---|---|
| `dealer-web/` | Vue 3 + Element Plus. Six pages (`/login`, `/admin`, `/dms`, `/crm`, `/ads`, `/assistant`). Local: `npm run dev` on `5173`. Cloud: `npm run build`, then `dist/` is uploaded to Azure Static Web Apps. |
| `dealer-gateway/` | Spring Cloud Gateway on `8080`. Routes `/api/v1/**` to core and `/internal/v1/**` to AI (internal header required). |
| `dealer-core/` | Java 21 + Spring Boot + Flyway (`V1__init.sql`) + MySQL. Business APIs and JWT/membership are present; treat as in-progress, not a finished product. |
| `ai-service/` | Java 21, no database. In-process adapter for the real `ai-manager` library; install that JAR before importing the module. |
| `dealer-platform/` | Shared contract and configuration surface: `env.example`, `openapi.yaml`, `API.md`, pipeline notes. |
| `deploy/` | Cloud deployment. Terraform for the Azure resources plus the app upload script: [deploy/README.md](deploy/README.md). |
| `design/` | Current course design. Start here. Machine and account blockers: [design/PREP-CHECKLIST.md](design/PREP-CHECKLIST.md). |
| `references/` | Research copies only, not runtime modules. Reuse notes: [references/REUSE-PLAN.md](references/REUSE-PLAN.md). |

Browser calls only `http://localhost:8080` (`/api/v1`). Direct browser access to core (`8081`) or ai-service (`8082`) must fail. Every service runs as a plain process: three JVMs, Vite, and a MySQL 8 server. There is no container runtime and no Compose file; the only exception is the `dealer-core` Testcontainers integration tests, which start a throwaway MySQL container when a Docker engine is available.

## How to read the docs

Do not use `design/01`–`06` as requirements (archived under [design/archive/](design/archive/)).

1. [design/SCOPE-BASELINE.md](design/SCOPE-BASELINE.md) — signed in/out of scope
2. [design/DEVELOPMENT-DESIGN.md](design/DEVELOPMENT-DESIGN.md) — backend scope, phases, invariants
3. [design/14-Backend-API-Contract.md](design/14-Backend-API-Contract.md) + [dealer-platform/openapi.yaml](dealer-platform/openapi.yaml) — public HTTP and DTOs
4. [design/AI-PROTOCOL-AND-RULES.md](design/AI-PROTOCOL-AND-RULES.md) — internal AI JSON and rule details
5. [design/18-Backend-Core-Engineering.md](design/18-Backend-Core-Engineering.md) / [design/19-Gateway-and-AI-Engineering.md](design/19-Gateway-and-AI-Engineering.md) plus the `design/AI-CODING-*.md` task guides

Frontend still follows [design/13-Frontend-Engineering.md](design/13-Frontend-Engineering.md) and [design/AI-CODING-FRONTEND.md](design/AI-CODING-FRONTEND.md). Map of every current doc: [design/README.md](design/README.md). Coding handbook (do not copy it wholesale): [design/IMPLEMENTATION-BRIEF.md](design/IMPLEMENTATION-BRIEF.md). Logging (`log-sum/`) and local-only SkyWalking tracing: [design/20-Observability.md](design/20-Observability.md).

**Conflict priority:** course PPT hard items > specification PDF fields > `DEVELOPMENT-DESIGN` / `AI-PROTOCOL-AND-RULES` > `14` / `15` > task sheets — **except Auth**, where the specification PDF wins per [design/SCOPE-BASELINE.md](design/SCOPE-BASELINE.md) errata item 1 (reversed 2026-09-30).

Internal AI success/error bodies follow PROTOCOL (`{success, notes[]}` / `{success, summary}`; failures `{success:false, code, message}`). Public check failures stay `502 AI_UNAVAILABLE`. Do not implement `{failed, reason}`.

## Local development startup

### Prerequisites

- JDK 21 and Maven
- Node.js and npm
- MySQL 8.4 running locally on `3306`
- A local checkout of `ai-manager` at the pinned commit; it is installed into the local Maven repository before opening `ai-service`

The classroom path is **IntelliJ IDEA + local MySQL + Vite**: five processes, no containers. Do not use Java 25 for the Java services; select JDK 21 in IntelliJ and Maven.

### Configuration files: where to edit values

| What you are configuring | File or location | Used by |
|---|---|---|
| Native MySQL database | MySQL server on `127.0.0.1:3306` | `dealer-core` |
| Java service defaults | `dealer-core/src/main/resources/application.yml` | `dealer-core` |
| Java service defaults | `ai-service/src/main/resources/application.yaml` | `ai-service` |
| Java service defaults and routes | `dealer-gateway/src/main/resources/application.yaml` | `dealer-gateway` |
| IntelliJ local overrides | Each IntelliJ Spring Boot run configuration's **Environment variables** field | `dealer-core`, `ai-service`, `dealer-gateway` |
| Frontend local gateway URL | `dealer-web/.env`, copied from `dealer-web/.env.example` | `dealer-web` |
| Reference list of every local value | `dealer-platform/env.example` | Copy into a local `.env` or into IntelliJ run configurations |

For IntelliJ startup, do not edit passwords, ports, or service URLs directly into Java source. Put the values from the run-configuration table below into each run configuration. Do not commit `.env` files or real API keys.

### IntelliJ IDEA + local MySQL: copy-ready setup

This is the standard path for a new developer. IntelliJ IDEA runs the three Java applications, MySQL runs as a local service, and Vite runs the frontend. Start one process per step and wait for each health check before the next.

1. **Install and start MySQL 8.4**. On macOS with Homebrew:

   ```text
   brew install mysql@8.4
   brew services start mysql@8.4
   ```

   If MySQL 8.4 is already installed, only run the service-start command. Verify that the server is reachable:

   ```text
   mysqladmin ping -h 127.0.0.1 -P 3306 -u root
   ```

2. **Create the local database and application user**. Run this once as the local MySQL `root` user. The default Homebrew installation has no root password unless one was configured:

   ```text
   mysql -u root
   ```

   Then execute:

   ```sql
   CREATE DATABASE IF NOT EXISTS dealer_core CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE USER IF NOT EXISTS 'dealer'@'localhost' IDENTIFIED BY 'dealer_dev_only';
   CREATE USER IF NOT EXISTS 'dealer'@'127.0.0.1' IDENTIFIED BY 'dealer_dev_only';
   ALTER USER 'dealer'@'localhost' IDENTIFIED BY 'dealer_dev_only';
   ALTER USER 'dealer'@'127.0.0.1' IDENTIFIED BY 'dealer_dev_only';
   GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'localhost';
   GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'127.0.0.1';
   FLUSH PRIVILEGES;
   ```

   Exit MySQL with `exit;`, then verify the application credentials:

   ```text
   mysql -h 127.0.0.1 -P 3306 -u dealer -pdealer_dev_only dealer_core -e "SELECT DATABASE(), VERSION();"
   ```

3. **Set IntelliJ's JDK to Java 21**. In IntelliJ, set the Project SDK, Maven importer JDK, and each Spring Boot run configuration to JDK 21. Do not use JDK 25 for these modules.

4. **Create four IntelliJ run configurations**. Use the main class shown below, the module shown below, and add the listed environment variables. Keep each configuration running in its own IntelliJ Run window.

   | Run configuration | Module | Main class | Required environment |
   |---|---|---|---|
   | `dealer-core-local` | `dealer-core` | `com.dealerops.core.DealerCoreApplication` | `CORE_PORT=8081;SERVER_ADDRESS=127.0.0.1;LOG_DIR=$PROJECT_DIR$/log-sum;MYSQL_URL=jdbc:mysql://127.0.0.1:3306/dealer_core?useSSL=false&allowPublicKeyRetrieval=true;MYSQL_USER=dealer;MYSQL_PASSWORD=dealer_dev_only;GATEWAY_BASE_URL=http://localhost:8080;GATEWAY_PUBLIC_URL=http://localhost:8080;AI_BASE_URL=http://127.0.0.1:8082;INTERNAL_TOKEN=dealer-internal;JWT_MODE=dev;DEV_JWT_SECRET=dealer-dev-jwt-secret-change-me;ADMIN_USERNAME=admin;ADMIN_PASSWORD=admin123` |
   | `ai-service-local` | `ai-service` | `ca.sait.dealerops.aiservice.AiServiceApplication` | `AI_PORT=8082;SERVER_ADDRESS=127.0.0.1;LOG_DIR=$PROJECT_DIR$/log-sum;SPRING_APPLICATION_NAME=ai-service;SPRING_PROFILES_ACTIVE=dev;INTERNAL_TOKEN=dealer-internal;AIMANAGER_API_KEY=;AIMANAGER_GATEWAY_PROVIDER=groq;AIMANAGER_GATEWAY_MODEL=qwen/qwen3.8-27b;AIMANAGER_GATEWAY_MAX_TOKENS=800` |
   | `dealer-gateway-local` | `dealer-gateway` | `ca.sait.dealerops.gateway.GatewayApplication` | `GATEWAY_PORT=8080;CORE_URL=http://127.0.0.1:8081;AI_URL=http://127.0.0.1:8082;LOG_DIR=$PROJECT_DIR$/log-sum;SPRING_PROFILES_ACTIVE=dev;INTERNAL_TOKEN=dealer-internal;CORS_ALLOWED_ORIGIN=http://localhost:5173;JWT_MODE=dev;DEV_JWT_SECRET=dealer-dev-jwt-secret-change-me` |

   `SERVER_ADDRESS=127.0.0.1` keeps `dealer-core` and `ai-service` on loopback, which is what makes the "direct `8081` / `8082` must fail" check hold without a container port mapping. `dealer-gateway` deliberately omits it. Azure leaves it unset so App Service can route to the app.

   `ai-service` has one Maven path: install the pinned `ai-manager` JAR first, then run the normal Maven lifecycle. There is no stub profile or profile flag to remember ([ai-service/README.md](ai-service/README.md)).

5. **Run the configurations in this exact order**. Do not start the next item until the health check returns HTTP 200:

   ```text
   MySQL → dealer-core → ai-service → dealer-gateway → dealer-web
   ```

   Check each Java service:

   ```text
   http://127.0.0.1:8081/actuator/health/readiness
   http://127.0.0.1:8082/actuator/health/readiness
   http://127.0.0.1:8080/actuator/health/readiness
   ```

   The core readiness check includes MySQL. The gateway readiness check includes both core and
   ai-service. Continue only when each response is HTTP 200 with `{"status":"UP"}`. Liveness
   endpoints are available at the same ports under `/actuator/health/liveness`.

6. **Start the frontend** from IntelliJ's Terminal tool window or a system terminal:

   ```text
   cd dealer-web
   cp .env.example .env
   npm ci
   npm run dev
   ```

   Open `http://localhost:5173/`. Swagger is available at `http://localhost:8080/swagger-ui/index.html` and its OpenAPI JSON is at `http://localhost:8080/v3/api-docs`.

### Manual startup commands (cross-platform)

1. **MySQL** — start MySQL 8.4 on port `3306` with database `dealer_core`, user `dealer`, and password `dealer_dev_only` (step 1 and step 2 of the IntelliJ setup above create them). Verify:

   ```text
   mysql -h 127.0.0.1 -P 3306 -u dealer -pdealer_dev_only dealer_core -e "SELECT 1"
   ```

2. **dealer-core** — configure `CORE_PORT=8081`, `SERVER_ADDRESS=127.0.0.1`, `MYSQL_URL=jdbc:mysql://localhost:3306/dealer_core?useSSL=false&allowPublicKeyRetrieval=true`, `MYSQL_USER=dealer`, `MYSQL_PASSWORD=dealer_dev_only`, `GATEWAY_BASE_URL=http://localhost:8080`, `GATEWAY_PUBLIC_URL=http://localhost:8080`, `AI_BASE_URL=http://127.0.0.1:8082`, `INTERNAL_TOKEN=dealer-internal`, `JWT_MODE=dev`, `DEV_JWT_SECRET=dealer-dev-jwt-secret-change-me`, and optional `ADMIN_USERNAME` / `ADMIN_PASSWORD`. `AI_BASE_URL` must point directly to ai-service, never to Gateway. Start it only after MySQL is healthy and wait for `http://127.0.0.1:8081/actuator/health` to return 200.

   ```text
   cd dealer-core
   mvn spring-boot:run
   ```

3. **ai-service** — install the pinned `ai-manager` JAR from the sibling checkout first, then configure `AI_PORT=8082`, `SERVER_ADDRESS=127.0.0.1`, `SPRING_PROFILES_ACTIVE=dev`, `INTERNAL_TOKEN=dealer-internal`, `AIMANAGER_API_KEY`, `AIMANAGER_GATEWAY_PROVIDER=groq`, and `AIMANAGER_GATEWAY_MODEL=qwen/qwen3.8-27b`. Run the normal Maven build and start it after core configuration is ready; wait for `http://127.0.0.1:8082/actuator/health` to return 200.

   ```text
   cd ai-service
   mvn spring-boot:run
   ```

   The normal POM uses the real `ai-manager` dependency directly, as described in [ai-service/README.md](ai-service/README.md).

4. **dealer-gateway** — configure `GATEWAY_PORT=8080`, `CORE_URL=http://localhost:8081`, `AI_URL=http://localhost:8082`, `SPRING_PROFILES_ACTIVE=dev`, `INTERNAL_TOKEN=dealer-internal`, `CORS_ALLOWED_ORIGIN=http://localhost:5173`, `JWT_MODE=dev`, and the same `DEV_JWT_SECRET` used by core. Start it only after both core and AI health checks pass.

   ```text
   cd dealer-gateway
   mvn spring-boot:run
   ```

   Verify `http://127.0.0.1:8080/actuator/health` returns 200 before starting the browser.

5. **dealer-web** — copy [dealer-web/.env.example](dealer-web/.env.example) to `dealer-web/.env` and keep `VITE_GATEWAY_URL=http://localhost:8080`. Install dependencies and start Vite only after the gateway is healthy:

   ```text
   cd dealer-web
   cp .env.example .env
   npm ci
   npm run dev
   ```

   Open `http://localhost:5173/`. The browser must call `/api/v1/**` through the gateway. Do not point the frontend at `8081`, `8082`, or `/internal/v1`.

The same values can be entered as environment variables in IDE run configurations. The checked-in Spring `application.yml` / `application.yaml` files provide defaults; the `dev` profile and the overrides above are what make a local run work. Do not set the `dev` profile on Azure, and do not reuse the local `INTERNAL_TOKEN`, `DEV_JWT_SECRET`, or admin password there.

## Cloud deployment (Terraform + Azure)

The cloud path is Terraform plus Azure App Service, with no container images anywhere. Terraform creates the resources; two commands then upload the applications. Full procedure, verification, cost, and teardown: [deploy/README.md](deploy/README.md).

| Piece | Azure resource |
|---|---|
| `dealer-gateway` | Linux Web App, Java 21 SE. **The only public API origin**, and it serves Swagger |
| `dealer-core` | Linux Web App, Java 21 SE. Access restricted to callers inside Azure, so a browser is refused |
| `ai-service` | Linux Web App, Java 21 SE. Restricted the same way |
| `dealer-web` | Static Web App (Free tier) serving the built `dist/` |
| Database | Azure Database for MySQL Flexible Server, database `dealer_core`, TLS required |
| Secrets | Key Vault, read through a user-assigned managed identity. No secret value sits in an app setting |

Needs Azure CLI, Terraform 1.9+, JDK 21 + Maven, and Node 20. One operator holds the local Terraform state.

```text
az login
az account set --subscription "<subscription id>"

cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in; it is git-ignored
terraform init
terraform plan -out tfplan
terraform apply tfplan

cd ../..
deploy/terraform/deploy-apps.sh                # packages the three JARs, builds the SPA, uploads all four
```

`terraform.tfvars` needs `mysql_admin_password`, `internal_token`, `jwt_signing_secret`, and the `admin_username` / `admin_password` pair that seeds the first platform admin. Generate the shared secrets with `openssl rand -base64 48`. Never commit that file, and never reuse the local development values.

`terraform output` prints the public URLs. `deploy/terraform/deploy-apps.sh core web` redeploys a subset. CI only runs `terraform fmt -check` and `terraform validate`; it holds no Azure credentials and never applies or deploys.

## Sign-in (admin-issued username/password)

As the client specification requires (`requirements/DealerOps-Specification.pdf` §2, §8), dealers and admins sign in with a username and password issued by the platform admin. Admin "issues access" by creating a staff username + temporary password bound to a dealership on `/admin`.

**Authoritative design** (product surface, JWT roles, env wiring, landings): [design/15-Data-Auth-and-Gateway.md](design/15-Data-Auth-and-Gateway.md) §8. Scope errata: [design/SCOPE-BASELINE.md](design/SCOPE-BASELINE.md).

### Local sign-in

Open `http://localhost:5173/login` and sign in as the platform admin seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD`. With the local development values in the run-configuration table above, that is:

| Account | Username | Password | Lands on |
|---|---|---|---|
| Platform admin | `admin` | `admin123` | `/admin` |

These are local-only defaults. Use a different password on any shared, VM, or public environment. The seed runs only when the username does not exist yet, so changing `ADMIN_PASSWORD` later does not change an existing admin's password.

There are no built-in staff accounts. The admin creates a dealership on `/admin`, then uses **Bind staff** to issue a staff username and temporary password (at least 8 characters). Staff sign in with those values and land on `/dms`.

### Env wiring

| Variable | Where | Notes |
|---|---|---|
| `DEV_JWT_SECRET` | Local: each gateway and core run configuration. Cloud: Key Vault `JWT-SIGNING-SECRET` | ≥32 UTF-8 bytes; unique per environment |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Local: the core run configuration. Cloud: `admin_username` plus Key Vault `ADMIN-PASSWORD` | Seeds the one platform admin on first startup; no-op once it exists |

Copy [dealer-platform/env.example](dealer-platform/env.example) and [dealer-web/.env.example](dealer-web/.env.example). Do not commit real `.env` files. After the platform admin signs in, they create dealerships and use **Bind staff** to issue each person a username and temporary password.

`ai-service` uses the real `ai-manager` dependency directly. Install the pinned library before building the service. Ports and boot order: [design/AI-CODING-LOCAL-AND-CLOUD.md](design/AI-CODING-LOCAL-AND-CLOUD.md). The Azure stack is [deploy/terraform](deploy/terraform) — real infrastructure as code, not a draft.
