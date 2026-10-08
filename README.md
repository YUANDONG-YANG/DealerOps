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
| Java service defaults | `ai-service/src/main/resources/application.yml` | `ai-service` |
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

2. **dealer-core** — configure `CORE_PORT=8081`, `SERVER_ADDRESS=127.0.0.1`, `MYSQL_URL=jdbc:mysql://localhost:3306/dealer_core?useSSL=false&allowPublicKeyRetrieval=true`, `MYSQL_USER=dealer`, `MYSQL_PASSWORD=dealer_dev_only`, `GATEWAY_BASE_URL=http://localhost:8080`, `GATEWAY_PUBLIC_URL=http://localhost:8080`, `AI_BASE_URL=http://127.0.0.1:8082`, `INTERNAL_TOKEN=dealer-internal`, `JWT_MODE=dev`, `DEV_JWT_SECRET=dealer-dev-jwt-secret-change-me`, `LOG_DIR=../log-sum`, and optional `ADMIN_USERNAME` / `ADMIN_PASSWORD`. `AI_BASE_URL` must point directly to ai-service, never to Gateway. Start it only after MySQL is healthy and wait for `http://127.0.0.1:8081/actuator/health` to return 200.

   ```text
   cd dealer-core
   mvn spring-boot:run
   ```

3. **ai-service** — install the pinned `ai-manager` JAR from the sibling checkout first, then configure `AI_PORT=8082`, `SERVER_ADDRESS=127.0.0.1`, `SPRING_PROFILES_ACTIVE=dev`, `INTERNAL_TOKEN=dealer-internal`, `AIMANAGER_API_KEY`, `AIMANAGER_GATEWAY_PROVIDER=groq`, `AIMANAGER_GATEWAY_MODEL=qwen/qwen3.8-27b`, and `LOG_DIR=../log-sum`. Run the normal Maven build and start it after core configuration is ready; wait for `http://127.0.0.1:8082/actuator/health` to return 200.

   ```text
   cd ai-service
   mvn spring-boot:run
   ```

   The normal POM uses the real `ai-manager` dependency directly, as described in [ai-service/README.md](ai-service/README.md).

4. **dealer-gateway** — configure `GATEWAY_PORT=8080`, `CORE_URL=http://localhost:8081`, `AI_URL=http://localhost:8082`, `SPRING_PROFILES_ACTIVE=dev`, `INTERNAL_TOKEN=dealer-internal`, `CORS_ALLOWED_ORIGIN=http://localhost:5173`, `JWT_MODE=dev`, `LOG_DIR=../log-sum`, and the same `DEV_JWT_SECRET` used by core. Start it only after both core and AI health checks pass.

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

These commands run from a module folder, so `LOG_DIR=../log-sum` keeps all three service logs in the repo-root `log-sum/` folder ([design/20-Observability.md](design/20-Observability.md) §2). Without it, each service writes a separate `log-sum/` inside its own module.

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

Terraform must be run by an operator who is authenticated to the intended Azure subscription. The repository does not contain Azure credentials, and the Terraform directory has no remote backend; keep `terraform.tfstate` and the generated plan together and do not run concurrent applies.

```text
az login
az account set --subscription "<subscription id>"

cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars   # fill in; it is git-ignored
terraform init
terraform validate
terraform plan -out tfplan
terraform apply tfplan

cd ../..
deploy/terraform/deploy-apps.sh                # packages the three JARs, builds the SPA, uploads all four
```

`terraform.tfvars` needs `mysql_admin_password`, `internal_token`, `jwt_signing_secret`, and the `admin_username` / `admin_password` pair that seeds the first platform admin. Generate the shared secrets with `openssl rand -base64 48`. Never commit that file, and never reuse the local development values.

Review the plan before applying it. The default plan creates billable Azure resources, including a Linux App Service plan and MySQL Flexible Server. `terraform apply` creates infrastructure and app settings only; it does not upload application artifacts. Run `deploy/terraform/deploy-apps.sh` after the apply completes. The script packages the three Java services, builds the frontend, and uploads the four applications. The core app uses `AI_BASE_URL` to call ai-service directly; it must not be changed to the Gateway URL.

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

## How to test (student guide)

This section teaches the testing workflow for this repository. The [team acceptance guide](#team-acceptance-guide) lists *what* to test (AT-01..AT-38); this section shows *how*.

Remember the [development-phase rule](#development-phase-no-test-authoring): until test work is explicitly authorized, you test by building, running the existing tests, and checking features by hand. You do not add or edit test code.

### The test levels

| Level | What it proves | Tool in this repo |
|---|---|---|
| 1. Build and type check | The code compiles; front-end types match the API layer | `mvn clean package`, `npm run build` |
| 2. Existing automated tests | Behavior already locked in a test still holds | JUnit 5 (surefire / failsafe), Testcontainers MySQL |
| 3. API checks | Each endpoint returns the right status, error `code` and fields | Swagger UI or `curl`, always through the gateway (`8080`) |
| 4. UI checks | Pages, guards and error messages work for a real user | Browser + DevTools |
| 5. Log checks | The request took the expected path and nothing failed silently | `log-sum/<service>-<date>.log` |

Work bottom-up. If level 1 fails, the results from levels 3–5 mean nothing.

### Level 1: build and type check

Before each backend build, delete that module's own `target/` (see the startup hygiene rule in [CLAUDE.md](CLAUDE.md)).

```text
cd dealer-core     && mvn clean package -DskipTests
cd dealer-gateway  && mvn clean package -DskipTests
cd ai-service      && mvn clean package -DskipTests
cd dealer-web      && npm run build      # runs vue-tsc, then vite build
```

A failing build is a defect in itself. Report it before you test anything else.

### Level 2: run the existing automated tests

You may run the existing tests, but you may not change them.

```text
cd dealer-core    && mvn test      # unit tests only (*IT.java excluded)
cd dealer-core    && mvn verify    # also runs the *IT.java integration tests
cd dealer-gateway && mvn test
cd ai-service     && mvn test
```

- The `dealer-core` integration tests (`*IT.java`) start a throwaway MySQL with Testcontainers, so they need a running Docker engine. Without Docker they fail at startup. That is an environment problem, not a product defect.
- The front-end `*.spec.ts` files under `dealer-web/src/**/__tests__` and `dealer-web/e2e` are written for Vitest. Vitest is not a `dealer-web` dependency yet, so these files cannot run today. During the development phase, do not install Vitest and do not edit the files.
- When a test fails, record the module, the test name and the assertion message, and file a defect. Do not "fix" the test to make it pass.

### Level 3: API checks through the gateway

Manual API checks, like browser traffic, go through `http://localhost:8080`. Do not test against core (`8081`) or ai-service (`8082`) directly; that skips JWT validation and routing.

**Get a token.** The admin account can only use `/admin/**`. Business endpoints need a dealer user, such as `a1` from the [common setup](#common-setup-everyone).

```text
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"a1","password":"<a1 password>"}'
```

Copy `accessToken` from the response. In Swagger (`http://localhost:8080/swagger-ui/index.html`), paste it into **Authorize**. With `curl`, send it as a header:

```text
TOKEN=<accessToken>
curl -s http://localhost:8080/api/v1/vehicles -H "Authorization: Bearer $TOKEN"
```

**Test the unhappy paths as well as the happy path.** A case passes only when both the HTTP status and the exact error `code` match. Worked example for DMS-03 (duplicate VIN):

```text
BODY='{"make":"Honda","model":"Civic","modelYear":2020,"vin":"2HGFC2F59LH000001","source":"AUCTION","purchaseCost":15000,"addedOn":"2026-10-01","conditionCode":"AS_IS"}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/v1/vehicles \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY"
# first call  -> 201

curl -s -X POST http://localhost:8080/api/v1/vehicles \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY"
# second call -> 400 {"code":"VIN_DUP", ...}
```

For each endpoint, also try these cases:

| Case | How | Expected |
|---|---|---|
| No token | Drop the `Authorization` header | `401 UNAUTHORIZED` |
| Wrong role | Call a business endpoint with the admin token | `403 FORBIDDEN`, no business fields |
| Other dealership | Use `b1`'s token on an id that belongs to dealership A | `404 NOT_FOUND` |
| Missing or invalid field | Remove a required field or break its format | `400 VALIDATION` with `fieldErrors` |
| Stale edit | Send a `PATCH` with an old `version` | `409 VERSION_CONFLICT` |
| Internal path | `curl http://localhost:8080/internal/v1/assistant` | `404` (never reachable from outside) |

The **Expected** column gives the required behavior. Where the code does not meet it yet, as in the admin read gap listed under [Known gap](#known-gap-at-the-time-of-writing-2026-10-07), the case fails; record that as a defect. The full list of error codes is in [design/14-Backend-API-Contract.md](design/14-Backend-API-Contract.md).

### Level 4: UI checks in the browser

Open `http://localhost:5173` with DevTools (F12) open on the **Network** tab.

- **Routing:** every request goes to `localhost:8080/api/v1/...`. A request to `8081`, `8082` or `/internal` is a defect.
- **Auth:** each request carries `Authorization: Bearer ...`. Once the session is cleared or the token expires, the next call returns 401 and the page goes to `/login`.
- **Guards:** as each role, type each route (`/admin`, `/dms`, `/crm`, `/ads`, `/assistant`) into the address bar. A role must not see a page it cannot use.
- **Page states:** check every list in its loading, empty, error and data states. To force the error state, stop core and reload.
- **Messages:** the text on screen matches the error `code` in the response. For example, `SOLD_LOCKED` shows "Purchase fields are locked".
- **AI cases:** to see "AI unavailable", stop ai-service and run an ad check on copy that has no BLOCK hit (AT-18). Ready and export must stay disabled.

### Level 5: read the logs

All three services write to the repo-root `log-sum/` folder ([design/20-Observability.md](design/20-Observability.md)). Every response carries an `X-Request-ID` header (DevTools → the request → **Headers**). Search for that ID to follow one click through every service:

```text
grep <request-id> log-sum/*-$(date +%F).log
```

Expect one gateway line and one core line per request; AI features add one ai-service line. Look for `WARN` or `ERROR` lines around the same time, and paste them into the defect.

### Record the result

For each case, write down:

1. The AT ID and requirement ID, for example `AT-05 / DMS-03`.
2. The account used and the starting data.
3. The steps, request body, or click path.
4. The expected status, code and message, and the actual ones.
5. Evidence: a screenshot or response body, plus the `X-Request-ID` and the matching log lines.

File each failure as a JIRA issue with these fields (see [Testers (QA)](#testers-qa)).

### After test work is authorized

Automated test authoring follows [design/16-Acceptance-and-Test.md](design/16-Acceptance-and-Test.md) and [design/AI-CODING-TESTS.md](design/AI-CODING-TESTS.md). That later work includes making the front-end spec files runnable: adding Vitest and possibly a browser runner such as Playwright. Record the tool choice in those design documents before you add it.

## Requirements specification

This section is the English counterpart of [requirements/DealerOps-Requirements-zh.html](requirements/DealerOps-Requirements-zh.html) (v1.0, 2026-10-07). Requirement IDs are identical in both documents. Sources: [requirements/DealerOps-Specification.pdf](requirements/DealerOps-Specification.pdf) (2026-09-21, authoritative for fields and business rules), `requirements/Dos Car dealership.docx` (product vision only), and [design/SCOPE-BASELINE.md](design/SCOPE-BASELINE.md) (course scope and errata; decides conflicts). Per-topic analysis lives in [requirements/analysis/](requirements/analysis/). Sign-off status: KAN-5 client/instructor confirmation is still open.

**Conflict priority:** course PPT hard items > specification PDF fields > v6 design > UI conventions. There are two exceptions. Since 2026-09-30, sign-in follows the PDF and uses username/password (erratum 1). Since 2026-10-07, the PPT containerization item has been dropped in favor of Terraform + App Service (erratum 5).

**Priority labels:** Must = explicitly required by a source. Should = needed by the implementation, not stated in the sources. Could = only if time allows. Won't = not in this release.

### 1. Overview and scope

Dealer Ops is a multi-tenant platform for independent used-car dealers in Ontario. One platform admin opens dealerships and issues logins. Every staff account of a dealership shares that dealership's data. DMS (vehicles), CRM (customers) and Ad Compliance are three front-end entry points on one back end and one database. Ad checks read DMS vehicle data and the dealer profile directly, so nothing is entered twice.

**In scope:**
- Tenant isolation, with the admin seeing no business data.
- The spec PDF vehicle fields, VIN unique per dealer, paired sell, and purchase fields locked after sale.
- CRM name / email / phone / address, with one customer per vehicle.
- OMVIC fixed rules plus a real AI review, then Ready + TXT export.
- An audit trail for DMS/CRM.
- A read-only AI assistant.
- Admin-issued username/password with two roles.
- Browser traffic only through the gateway.

**Out of scope:**
- Leads, follow-ups and sales funnel.
- Work orders, reconditioning and archive states.
- Buyer site, public inventory and inquiry forms.
- KPI dashboard and CSV import.
- Third-party ad publishing, payments and contracts.
- Image Studio, OCR and VIN decoding.
- Extra vehicle fields such as mileage, color, fuel, stock number and list price.
- Message queues, a second database and vector stores.
- Rate limits, throughput SLOs and PIPEDA retention.

**Classroom demo storyline:**
1. Two dealers, each with one staff member, cannot see each other's data.
2. The admin is refused on the vehicle API.
3. An ad with a missing price, or a finance ad with no APR, is blocked.
4. One real ad goes through the real model.
5. After a price change, the old check can no longer be exported.

### 2. Roles, permissions and tenancy

| Role | Code | Count | Belongs to |
|---|---|---|---|
| Platform admin | `Platform.Admin` | One. It is seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD` on first start, and no API creates admins | No dealership |
| Dealer user | `Dealer.User` | N per dealership | Exactly one dealership |

All dealer users have the same permissions; the sources do not distinguish manager from sales. The two roles are mutually exclusive.

| Operation | Admin | Dealer user (own dealer) | Dealer user (other dealer) |
|---|---|---|---|
| Create and list dealerships | ✓ | ✗ | ✗ |
| Create, list and remove logins | ✓ | ✗ | ✗ |
| Vehicles: add, edit, view | ✗ | ✓ | ✗ (looks like not found) |
| Customers: add, edit, view | ✗ | ✓ | ✗ |
| Ad check and AI assistant | ✗ | ✓ | ✗ |
| Audit history | ✗ | ✓ | ✗ |

| ID | Requirement | Priority |
|---|---|---|
| AUTH-01 | Only two roles: platform admin and dealer user | Must |
| AUTH-02 | Admin creates a dealership with at least a registered name, phone, email and address. The ad rule for dealer name and contact uses these fields | Must |
| AUTH-03 | Admin creates a login for a dealership: username, display name and temporary password (at least 8 characters). One login belongs to one dealership | Must |
| AUTH-04 | Admin lists a dealership's logins | Must |
| AUTH-05 | Admin removes a login, and its business access ends immediately. Removal is a soft unbind: the account and its history stay. A removed user can still sign in but sees only the no-access page | Must |
| AUTH-06 | All logins of one dealership read and write the same data. A vehicle added by staff A is visible to staff B at once | Must |
| AUTH-07 | A dealer user never sees another dealership's data. Another dealer's record id returns 404, so the response does not reveal whether the record exists | Must |
| AUTH-08 | The admin gets 403 on every business endpoint, and the response carries no business fields | Must |
| AUTH-09 | The server derives the dealership from the signed-in identity and ignores any client-supplied `dealerId` | Must |
| AUTH-10 | Dealer users cannot create or remove logins | Must |
| AUTH-11 | Each person signs in with their own username and password (one account per staff member). Accounts are not shared | Must |
| AUTH-12 | Passwords are stored as salted BCrypt hashes. A successful login issues a JWT that carries the role | Must |
| AUTH-13 | A signed-in user with no dealership gets 403 on business endpoints | Should |
| AUTH-14 | A username has at most one active dealership binding. A duplicate binding, or a username that belongs to the admin, returns 409 `DUP_MEMBER` | Should |
| AUTH-15 | The admin account is seeded from environment variables on first start. Nobody can self-register | Should |

**Account lifecycle:**
1. The admin creates a dealership.
2. The admin binds staff to it (username + temporary password).
3. Staff sign in and use their dealership's data.
4. When the admin unbinds a staff member, that person gets 403 on business endpoints.

Rules that follow from this:
- Audit records keep the actor's username after the login is removed.
- Removing a dealership's last login keeps its data, and new logins can be bound later.
- Re-binding to the same dealership reactivates the existing binding and resets the temporary password. Binding to a different dealership creates a new binding row.

### 3. DMS (vehicles)

| # | Field | API code | Required | Validation |
|---|---|---|---|---|
| 1 | Make | `make` | ✓ | 1–50 characters, trimmed |
| 2 | Model | `model` | ✓ | 1–50 characters, trimmed |
| 3 | Year | `modelYear` | ✓ | Integer from 1900 to current year + 1 |
| 4 | VIN | `vin` | ✓ | 17 characters, upper case, no I/O/Q; unique per dealership |
| 5 | Source | `source` | ✓ | `TRADE_IN` / `AUCTION` / `PRIVATE_PURCHASE` / `OTHER` |
| 6 | Purchase cost | `purchaseCost` | ✓ | ≥ 0, two decimals, CAD |
| 7 | Date added | `addedOn` | ✓ | Not in the future |
| 8 | Condition | `conditionCode` | ✓ | `CERTIFIED` / `AS_IS` / `UNFIT` / `IRREPARABLE` |
| 9 | Repair cost | `repairCost` | — | ≥ 0 |
| 10 | Carfax URL | `carfaxUrl` | — | http(s), at most 500 characters |
| 11 | Sold date | `soldOn` | — | On or after the date added, not in the future |
| 12 | Sold price | `soldPrice` | — | > 0 |

System fields: `id`, `dealerId`, `status`, `version` (optimistic lock), `createdAt`, `updatedAt`. No other vehicle fields are added.

There are two statuses, `IN_STOCK` and `SOLD`, and the server derives them. A vehicle is `SOLD` when both sold fields are set. A sale cannot be undone in this release.

| ID | Requirement | Priority |
|---|---|---|
| DMS-01 | Add a vehicle. All 8 required fields must be present, with an error per field | Must |
| DMS-02 | Repair cost and Carfax URL are optional on create. Sold date and sold price are optional fields entered only through the sell action, and must be sent together (DMS-10) | Must |
| DMS-03 | VIN is unique per dealership; a duplicate returns `VIN_DUP`. Two dealerships may hold the same VIN | Must |
| DMS-04 | VIN is upper-cased and must be 17 letters or digits with no I/O/Q | Should |
| DMS-05 | Source and condition are drop-downs that accept only the enum values | Must |
| DMS-06 | The list is paged (10 per page), newest first | Must |
| DMS-07 | Keyword search on VIN / make / model, plus filters on status and condition | Should |
| DMS-08 | The detail view shows all fields, the linked customer and the audit history | Must |
| DMS-09 | Every non-sold field of an in-stock vehicle can be edited; the sold fields are set only by the sell action | Must |
| DMS-10 | Sold date and sold price are entered together. Sending only one returns `SOLD_PAIR_REQUIRED` | Must |
| DMS-11 | After sale, these purchase fields are locked: make, model, year, VIN, source, purchase cost, date added, repair cost and Carfax. A change returns `SOLD_LOCKED` | Must |
| DMS-12 | A sold vehicle cannot be sold again; a second sale returns `SOLD_LOCKED` | Must |
| DMS-13 | Writes carry `version`. A mismatch returns `VERSION_CONFLICT`, and the UI asks the user to refresh | Should |
| DMS-14 | Create, edit and sell each write an audit record | Must |
| DMS-15 | Changing the condition turns a passed ad check into Stale. Other vehicle or dealer fields do not | Must |
| DMS-16 | The detail view may show profit (sold price − purchase cost − repair cost). It is not stored | Could |
| DMS-17 | Deleting vehicles, which is excluded to protect audit and sales records | Won't |

**Edge cases:**
- Year = current + 1 is accepted; current + 2 is rejected.
- A purchase cost of 0 is accepted.
- Selling below cost is allowed.
- An `IRREPARABLE` vehicle can be added and sold, but its ad must disclose the condition.

### 4. CRM (customers)

| # | Field | API code | Required | Validation |
|---|---|---|---|---|
| 1 | Name | `name` | ✓ | 1–100 characters |
| 2 | Email | `email` | ✓ | Email format, at most 254 characters, stored lower case |
| 3 | Phone | `phone` | ✓ | 7–20 digits; `+ - ( )` and spaces allowed; at most 40 characters in total |
| 4 | Home address | `homeAddress` | ✓ | 1–300 characters, one text box |
| 5 | Purchased vehicles | `linkedVehicles` (response; set via `/customers/{id}/vehicles`) | — | Multi-select links to this dealership's DMS vehicles (optional: a customer may be entered before buying) |

**Link rules:**
- One customer can have N vehicles, and one vehicle has at most one customer.
- Only vehicles of the same dealership can be linked. A vehicle can be in stock or sold, as long as no customer has it yet.
- A sold vehicle's link cannot be removed.

| ID | Requirement | Priority |
|---|---|---|
| CRM-01 | Add a customer. All four fields are required, with an error per field | Must |
| CRM-02 | Edit the four fields | Must |
| CRM-03 | The list shows 10 per page, with search on name / email / phone | Must |
| CRM-04 | The detail view shows the customer, the linked vehicles (year make model, VIN, status) and the audit history | Must |
| CRM-05 | Link an unlinked vehicle of this dealership (in stock or sold) from the customer detail | Must |
| CRM-06 | The link picker lists only vehicles that can be linked: none from other dealerships and none already linked | Must |
| CRM-07 | Linking a vehicle that belongs to another customer returns `VEHICLE_ALREADY_LINKED` | Must |
| CRM-08 | An in-stock vehicle can be unlinked. Unlinking a sold vehicle returns `SOLD_LOCKED` | Must |
| CRM-09 | Another dealership's customer or vehicle id returns 404. Unlinking a link that does not exist also returns 404 | Must |
| CRM-10 | Vehicle detail and customer detail link to each other | Should |
| CRM-11 | Create, edit, link and unlink each write an audit record | Must |
| CRM-12 | A customer's phone, email and address never reach AI prompts, audit summaries or assistant answers | Must |
| CRM-13 | A duplicate email in the same dealership shows a warning but is saved | Could |
| CRM-14 | Deleting customers | Won't |
| CRM-15 | Leads, follow-up tasks and sales funnel | Won't |

### 5. Ad compliance (OMVIC)

"Publish" means marking the ad Ready and exporting it as TXT. There is no external platform and no buyer page. The check reads only the title, the body, the DMS vehicle and the public dealer profile. No vehicle fields are added and no salesperson questionnaire is collected. Prior use or a warranty that the copy never mentions cannot be inferred; this is an accepted demo limitation.

The ad belongs to one vehicle of the dealership, and each vehicle has one ad. An empty draft can be saved but cannot pass. The kind is `CASH` / `FINANCE` / `LEASE`, and the medium is `ONLINE` / `RADIO_TV_BILLBOARD`.

The rule IDs are AD-R01 to R08, R10 to R14 and R20 to R25. There is no R09 and no R15–R19. BLOCK is a hard stop that prevents Ready and export. REVIEW is advisory only.

| ID | Check | Result |
|---|---|---|
| AD-R01 | Dealer registered name missing | BLOCK `DEALER_NAME_MISSING` |
| AD-R02 | Dealer contact | All missing: BLOCK `DEALER_CONTACT_MISSING`. Some missing: REVIEW `DEALER_CONTACT_INCOMPLETE` |
| AD-R03 | Hint of prior use (police / emergency, taxi / limousine, daily lease / rental) without a clear disclosure | REVIEW `PRIOR_USE_UNCLEAR` |
| AD-R04 | Copy says new (brand new / never used / 0 km / new car) but the model year is ≤ current year − 2 | REVIEW `YEAR_NEW_USED_CONTRADICTION` |
| AD-R05 | Year not in the copy | REVIEW `YEAR_NOT_IN_COPY` |
| AD-R06 | Warranty claim present (extended warranty, warranty included, free warranty) | REVIEW `WARRANTY_CLAIM_NEEDS_REVIEW` |
| AD-R07 | Price missing | BLOCK `PRICE_MISSING` |
| AD-R08 | Condition | "Certified" on a vehicle that is not certified: BLOCK `CONDITION_MISMATCH`. `AS_IS` / `UNFIT` / `IRREPARABLE` not stated: BLOCK `CONDITION_UNDISCLOSED`. Certified vehicle with no certified wording: REVIEW `CERTIFIED_NOT_IN_COPY` |
| AD-R10 | Finance-triggered ad without APR | BLOCK `FINANCE_APR_MISSING` |
| AD-R11 | APR placement (online) | REVIEW `FINANCE_APR_PROXIMITY`, raised on every online finance-triggered ad. Not checked for `RADIO_TV_BILLBOARD` |
| AD-R12 | Finance term missing | REVIEW `FINANCE_TERM_MISSING` |
| AD-R13 | Cash price / cost of borrowing | Covered by R07; there is no separate rule |
| AD-R14 | Broadcast exemption | Exempts R11 only. Price and APR are still required, and a missing term is still an R12 hint |
| AD-R20 | Lease ad does not say it is a lease | BLOCK `LEASE_STATEMENT_MISSING` |
| AD-R21 | Lease term missing | REVIEW `LEASE_TERM_MISSING` |
| AD-R22 | Lease payment missing | REVIEW `LEASE_RENT_MISSING` (R07 still applies) |
| AD-R23 | Lease APR missing | BLOCK `LEASE_APR_MISSING` |
| AD-R24 | Lease down payment missing | REVIEW `LEASE_DOWN_MISSING` |
| AD-R25 | Annual km allowance | Below 20,000 with no excess-km charge: BLOCK `LEASE_EXCESS_KM_MISSING`. 20,000 or more: nothing required. No allowance stated: REVIEW `LEASE_ALLOWANCE_UNSTATED` |

An ad is **finance-triggered** when its kind is `FINANCE`, or its kind is `CASH` and the title or body matches an APR or a payment amount pattern (an amount per month, bi-weekly or per week). `LEASE` ads use the lease rules instead.

**Check flow and states:**
- Before any check, the state is `NEEDS_AI`.
- When a check runs, any BLOCK hit makes the state `BLOCKED` (HTTP 200) and AI is not called.
- If there is no BLOCK hit, the real AI is called with a 15 s timeout.
  - On success, the state is `PASSED`, and the REVIEW hints and AI notes are kept.
  - On timeout or error, the state is `AI_UNAVAILABLE` and the public API returns 502.
- When something triggers invalidation, a `PASSED` check becomes `STALE`, and any other result goes back to `NEEDS_AI`.
- What triggers invalidation: a change to the ad title, body, kind or medium (a price edit in the body counts; in practice any saved ad edit bumps the content version), or a change to the vehicle condition.
- Ready and export require `PASSED` on the current content version. Otherwise they return `NOT_PASSED` or `CHECK_STALE`.
- `PASSED` means the demo hard rules passed and the AI answered. It is not legal or OMVIC approval, and AI notes never veto Ready.

| ID | Requirement | Priority |
|---|---|---|
| AD-01 | Create and edit one ad draft per vehicle of the dealership | Must |
| AD-02 | Show a checklist for the chosen kind and medium. It is display only and collects no answers | Must |
| AD-03 | Run the BLOCK / REVIEW rules and store results with reason codes | Must |
| AD-04 | Trigger the rules by kind, by medium and by APR / payment patterns in `CASH` copy. `LEASE` uses the lease rules | Must |
| AD-05 | Year and condition come from DMS | Must |
| AD-06 | Dealer name and contact come from the dealer profile | Must |
| AD-07 | A hard-rule hit skips AI and returns `BLOCKED` | Must |
| AD-08 | A real AI reviews the copy, and its notes do not block | Must |
| AD-09 | An AI timeout or failure is stored as `AI_UNAVAILABLE` and never shown as passed | Must |
| AD-10 | Store the time, the result and the checked content version of every check | Must |
| AD-11 | Editing the ad or changing the condition invalidates an earlier pass | Must |
| AD-12 | Ready and export require a pass on the current version | Must |
| AD-13 | The TXT file holds the dealer's name and contact, the vehicle's year / make / model / VIN / condition / source, the title, the body and the check time. It holds no customer data and no cost | Must |
| AD-14 | A dedicated disclaimer screen. It is deferred: the result panel shows a one-line disclaimer, and the limit is explained orally at the defense | Won't |
| AD-15 | Configurable rules or a rule editor; the rules stay in `OmvicRuleEngine` | Won't |
| AD-16 | Auto-publishing to external platforms | Won't |
| AD-17 | Image Studio | Won't |

### 6. Read-only AI assistant

The spec PDF has no such page. It is added by scope erratum 2 to meet the course requirement for a real AI core feature.

| ID | Requirement | Priority |
|---|---|---|
| AI-01 | Ad compliance uses a real LLM review, not a simulated one | Must |
| AI-02 | AI calls time out after 15 s, and a failure is never shown as passed | Must |
| AI-03 | Read-only Q&A inside the dealership. It finds this dealership's vehicles, customers and ad listings (with check status) by keyword (make, VIN, customer name, and so on) and returns up to 5 resource cards with a short answer. It does not count inventory or customer totals. When the model is unavailable, the cards are still returned. It never writes to the database | Must |
| AI-04 | The assistant sees only this dealership's data. Answers contain no purchase cost and no customer phone, email or address | Must |
| AI-05 | AI notes come back as an array, each with at least a `message`. Rule codes (`ruleId`) and severity (BLOCK / REVIEW) belong to rule results and are shown apart from AI notes | Should |

### 7. Cross-cutting requirements

| ID | Requirement | Priority |
|---|---|---|
| AUD-01 | Audit vehicle create, edit and sell | Must |
| AUD-02 | Audit customer create, edit, link and unlink | Must |
| AUD-03 | Each record holds the actor (username), the action (`CREATE` / `UPDATE` / `SELL` / `LINK` / `UNLINK`), the time (stored in UTC, shown in local time) and the entity type and id | Must |
| AUD-04 | Record a summary of the changed fields. For customer phone, email and address, record only the field name, never the value | Should |
| AUD-05 | The audit trail is append-only | Must |
| AUD-06 | Vehicle and customer detail views show their history, newest first | Must |
| AUD-07 | Audit and business writes happen in the same transaction | Must |
| AUD-08 | Admin dealership and account (membership) operations are audited (already implemented) | Could |
| AUD-09 | Ad check results are kept as check history (AD-10), not as audit records | Should |
| ARC-01 | DMS, CRM and ads are three front ends over one back end and one database | Must |
| ARC-02 | The ad check reads DMS and dealer data directly | Must |
| ARC-03 | The browser reaches the back end only through the gateway. Direct access to core or ai-service fails | Must |
| ARC-04 | Four apps: `dealer-web`, `dealer-gateway`, `dealer-core`, `ai-service` | Must |
| ARC-05 | Synchronous REST and one MySQL 8 database, with no message queue | Must |
| ARC-06 | APIs live under `/api/v1`, and the error body is `{code, message}` | Must |
| ARC-07 | Terraform deploys the three Java services as JARs on Azure App Service and the front end as static files on Azure Static Web Apps, with CI/CD. Course reviews 2 and 3 are demonstrated in the cloud. There are no containers (erratum 5) | Must |
| SEC-01 | Passwords are BCrypt-hashed on the server and never logged or exposed to the front end | Must |
| SEC-02 | The gateway and core both validate the JWT signature, issuer, audience and expiry. The gateway rejects unknown roles, and core authorizes by role (admin ↔ staff crossover returns 403) | Must |
| SEC-03 | HTTPS everywhere in the cloud | Must |
| SEC-04 | Secrets (database password, JWT signing key, AI key) stay out of the repository | Must |
| SEC-05 | Every business query is filtered by dealership in the data layer | Must |
| SEC-06 | Ad copy is passed to AI as data, so prompt injection cannot change the verdict | Should |
| SEC-07 | Customer personal data is never sent to AI and never written to audit as a value | Must |
| NFR-01 | Lists default to 10 per page | Must |
| NFR-02 | Money is shown in CAD with two decimals, and dates as `YYYY-MM-DD` | Should |
| NFR-03 | The UI language is English | Should |
| NFR-04 | Database backup policy (MySQL Flexible Server keeps backups for 7 days) | Should |
| NFR-05 | Custom domain. It is not configured yet; the default Azure host names are used | Should |
| NFR-06 | Desktop first, usable at phone width | Could |
| NFR-07 | Rate limits, throughput SLOs and PIPEDA retention | Won't |
| NFR-08 | After every deploy, the release time (UTC) of all four apps is visible. Each Java service logs one startup line. The Swagger description shows dealer-core's time. The bottom left of every web page lists web / gateway / core / ai, read from the gateway's anonymous `GET /actuator/release`. The deploy step stamps `PUBLISHED_AT`; without it, the build time is used ([design/20-Observability.md](design/20-Observability.md) §5) | Must |

### 8. Pages

| Page | Route | Access | Key requirements |
|---|---|---|---|
| Login | `/login` | Public | One username + password form (UI-01). It redirects by role: admin → `/admin`, bound staff → `/dms` (UI-02). An unbound user sees a not-provisioned message (UI-03). Every inner page redirects to login when signed out (UI-04) |
| Admin | `/admin` | Admin | Dealership list: name, contact, staff count (UI-10). Create a dealership (UI-11). List and bind staff (username, display name, temporary password), with confirmation before unbinding (UI-12). No vehicle, customer or ad entry points (UI-13) |
| DMS | `/dms` | Dealer user | List columns: year make model, VIN, source, condition, cost (CAD), date added, status, with search, filters and paging (UI-20). Add and edit with `*` on required fields, client-side validation and per-field server errors (UI-21). Detail with all fields, the customer, the ad check status and the history (UI-22). Sell as a separate action that takes the date and the price together (UI-23). Locked fields are read-only after sale (UI-24) |
| CRM | `/crm` | Dealer user | List columns: name, email, phone, linked vehicle and purchase count, with search, a linked filter and paging (UI-30). Add and edit (UI-31). Detail with clickable linked vehicles, link and unlink, and the history (UI-32). A searchable link drop-down of this dealership's unlinked vehicles (UI-33) |
| Ads | `/ads` | Dealer user | Pick a vehicle, edit title / body / kind / medium, and view the checklist with no answer fields (UI-40). DMS and dealer values shown (UI-41). A Check button with a loading state of up to 15 s (UI-42). A ✅ / ❌ / ⚠️ result per rule (UI-43). Status badges: Needs AI review / Blocked / AI unavailable / Passed / Stale (UI-44). Ready and Export TXT are enabled only when the ad is passed and not stale (UI-45). A one-line disclaimer, with the dedicated screen deferred (UI-46) |
| Assistant | `/assistant` | Dealer user | An input box and answers with vehicle / customer cards (UI-50). A clear read-only notice (UI-51) |

### 9. Open items

- **Assumptions (Q-01..Q-15 in the Chinese document §11.2):**
  - The four fixed source values.
  - Purchased vehicles are optional.
  - Linking and selling are two separate steps.
  - A sale cannot be undone, and vehicles and customers cannot be deleted.
  - Price, new/used and prior use are judged from the ad copy only.
  - Exactly 20,000 km/year needs no excess-km disclosure.
  - One ad per vehicle.
  - Only changes are audited, not views.
  - One admin.
  - Rules live in code.
- **Questions waiting for the client or instructor:**
  - Should the sale be completed in CRM or in DMS?
  - May DMS add a list-price field and a new/used field?
  - Does a vehicle advertised both online and on a billboard need two ads?
  - Is an undo-sale demo needed?
  - Are the four dealer profile fields (legal name, phone, email, address) enough, and is an OMVIC registration number needed?
  - Written sign-off is still needed on username/password login (KAN-5), and, per erratum 5 in the change log, on dropping containers.

## Team acceptance guide

This guide tells every role on the team how to accept the work against the requirements above.

- **The contract:** acceptance cases AT-01..AT-39 are defined in [requirements/DealerOps-Requirements-zh.html](requirements/DealerOps-Requirements-zh.html) §10. Their IDs, steps and expected results are what acceptance is measured against.
- **Test-level detail:** the checklist and the classroom cases (CL-1..CL-6) are in [design/16-Acceptance-and-Test.md](design/16-Acceptance-and-Test.md).
- **Ad copy fixtures:** FX-01..FX-22 are in [design/17-Ad-Check-Fixtures.md](design/17-Ad-Check-Fixtures.md). They use the dealer "Prairie Auto Ltd." and the vehicles V-ASIS / V-CERT / V-UNFIT / V-IRREP.
- **Classroom minimum demo set:** AT-01, AT-03, AT-12, AT-13, AT-17, AT-19.

### Acceptance flow

1. **Developer self-check.** Every developer passes the self-check for their own role (below) and moves the JIRA issue to review.
2. **Peer review.** Another team member reviews the change against the requirement IDs it claims, then merges.
3. **Integration on `main`.** The CI workflows in `.github/workflows/` (`dealer-core`, `dealer-gateway`, `ai-service`, `dealer-web`, `terraform`) must be green.
4. **Tester run.** A tester runs the full AT list on the local stack, then the minimum demo set on Azure.
5. **Project manager gate.** The project manager signs off the sprint and the release.

A requirement counts as accepted only after step 4 passes for every AT that covers it.

### Common setup (everyone)

1. Start the stack as described in [Local development startup](#local-development-startup). The order is MySQL → `dealer-core` → `ai-service` → `dealer-gateway` → `dealer-web`.
   - Before each backend service starts, delete that service's own `target/` and do a clean build.
   - Wait for `/actuator/health/readiness` to return 200 on 8081, 8082 and 8080 before starting the next process.
2. Open `http://localhost:5173/login` and sign in as the seeded admin `admin` / `admin123` (the local defaults only).
3. Create the test data. There is no seeded business data.
   - On `/admin`, create dealerships A and B, filling all four profile fields.
   - Bind staff `a1` and `a2` to A and `b1` to B. Give each a temporary password of at least 8 characters.
4. For the ad cases, sign in as `a1` and add the design/17 vehicles. Set dealership A's profile to the design/17 values, or create a third dealership with that profile.
5. For API-level checks, use Swagger at `http://localhost:8080/swagger-ui/index.html` with the bearer token returned by login.
   - Always call through the gateway on 8080.
   - Never call 8081 or 8082, except in AT-23, which must fail.
6. When something fails, look in `log-sum/<service>-<date>.log` first.

### Backend developers (`dealer-core`)

- **Before review:** the service starts from a clean build. Every AT that covers the touched requirement IDs passes through the gateway, and so does the minimum demo set.
- **Check by reading the code** what the UI cannot show:
  - AUD-05: there is no update or delete path for audit.
  - AUD-07: the audit write is inside the business transaction.
  - SEC-05: every repository query is filtered by `dealerId`.
  - AUTH-08: every business read and write uses `TenantGuard.requireDealerUser()`.
  - AUTH-09: the dealership comes from the token, never from the request body.
- **Error contract:** each error returns the exact `code` from §3–§5, for example `400 VIN_DUP`, `409 SOLD_LOCKED`, `409 VERSION_CONFLICT`, `409 NOT_PASSED`, `409 CHECK_STALE` and `502 AI_UNAVAILABLE`. The body shape is `{code, message}`, with field errors where they apply.
- **Migrations** follow the naming rule in `CLAUDE.md`. Never edit a migration that has already run.

### Frontend developers (`dealer-web`)

- **Build:** `npm ci && npm run build` must pass with no type errors. The build runs `vue-tsc --noEmit && vite build`.
- **Gateway only:** the app calls only `VITE_GATEWAY_URL` (the gateway, `/api/v1/**`). No code may point at 8081, 8082 or `/internal/v1`.
- **Page requirements:** check each UI ID in §8 by hand in the browser.
  - **Login (UI-01..04):**
    - Signing in redirects by role: the admin goes to `/admin`, bound staff go to `/dms`.
    - An unbound user sees the not-provisioned page.
    - Opening any inner page while signed out redirects to `/login`.
    - Staff cannot open `/admin`, and the admin cannot open the business pages.
  - **Admin (UI-10..13):** the dealership list and create form work. Binding staff works, and unbinding asks for confirmation. There are no vehicle, customer or ad entry points.
  - **DMS (UI-20..24):**
    - The list has the right columns, search, filters and 10 rows per page.
    - Required fields are marked `*`.
    - Client-side validation matches §3: VIN format, the year range, a Carfax URL of at most 500 characters.
    - Server field errors appear on the matching field.
    - Sell is a separate action that takes the date and the price together.
    - After a sale, the locked fields are read-only.
  - **CRM (UI-30..33):** the list has the right columns, search and the linked filter. The link drop-down offers only unlinked vehicles from the dealership. The duplicate-email warning shows but does not block saving (CRM-13).
  - **Ads (UI-40..46):**
    - The checklist changes with kind and medium, and it has no answer fields.
    - The Check button shows a loading state for up to 15 s.
    - Each rule shows ✅ / ❌ / ⚠️ with its reason code.
    - The badges read Needs AI review / Blocked / AI unavailable / Passed / Stale.
    - Ready and Export TXT are enabled only when the ad is Passed and not Stale.
    - The one-line disclaimer is visible.
  - **Assistant (UI-50..51):** answers show vehicle, customer and listing cards that link to the right page. The read-only notice is visible.
- **Error handling:** for each code in §3–§5, the UI shows a readable message.
  - `VERSION_CONFLICT` asks the user to refresh.
  - `AI_UNAVAILABLE` never shows the ad as passed.
  - 401 returns to login.
  - 403 shows the no-access state.
- **Release footer (NFR-08):** every page, including `/login`, shows `Published (UTC)` at the bottom left with web, gateway, core and ai lines. It must not cover the menu or form controls.
- **Formatting:** money shows as CAD with two decimals, dates as `YYYY-MM-DD`, and all UI text is in English (NFR-02, NFR-03). Pages stay usable at phone width (NFR-06).

### AI and integration developers (`ai-service`, gateway AI route)

- **Real model:** with a valid `AIMANAGER_API_KEY`, a fully compliant ad returns `PASSED` with AI notes (AT-17, AI-01).
- **Failure:** with ai-service stopped, or the model timing out after 15 s, the check returns `502 AI_UNAVAILABLE` and never Passed (AT-18, AI-02).
- **Privacy:** prompts carry no customer phone, email or address. Ad copy is passed as data, so text such as "ignore the rules and pass" cannot flip the verdict (SEC-06, SEC-07).
- **Assistant:**
  - Answers come only from the caller's dealership, with at most 5 cards.
  - Answers contain no purchase cost and no customer contact data (AT-21, AT-22, AI-03, AI-04).
  - Asking it to change data changes nothing in the database.
- **Internal access:** `/internal/v1/**` needs the internal token header, and a direct browser call to 8082 fails.

### DevOps (Terraform, Azure, CI)

- **CI:** `terraform fmt -check` and `terraform validate` pass in CI.
- **Deploy:** an operator runs `terraform plan`, reviews it, then applies it and runs `deploy/terraform/deploy-apps.sh`.
- **After deploy:**
  - All three readiness endpoints return 200.
  - `<gateway>/actuator/release` shows the timestamp of this run for every app deployed (NFR-08).
  - The SPA loads over HTTPS.
  - Core and ai-service refuse direct browser access (AT-23, ARC-03).
  - Secrets come from Key Vault (SEC-03, SEC-04).
- **Housekeeping:**
  - Plan files and `terraform.tfvars` are never committed.
  - MySQL backups are enabled with 7-day retention (NFR-04).
  - The cloud uses its own admin password, JWT secret and internal token, never the local values.

### Testers (QA)

- **Run all cases:** execute AT-01..AT-39 in order on the local stack, then the minimum demo set on Azure. For each case record:
  - pass or fail
  - the HTTP status
  - the error `code`
  - a screenshot or the response body
- **Pass criteria:** a case passes only when both the status and the exact error code match. An error message alone is not enough.
- **Tenancy and admin checks:**
  - Repeat AT-01 and AT-38 with ids from the other dealership on vehicles, customers, listings, audit history and the assistant.
  - Staff of the other dealership must get 404. The admin must get 403, with no business fields in the body.
- **Ad checks:**
  - Run the design/17 fixtures and record each reason code and its severity.
  - For AT-18, stop ai-service and use an ad with no BLOCK hit; otherwise AI is never called.
- **Privacy checks:** customer phone, email and address must never appear in audit history, assistant answers or the TXT export (AT-20, AT-22, AT-26).
- **Release time check (AT-39):** after each deploy, check three places.
  - The bottom-left footer shows web, gateway, core and ai times that match the deploy run (the `Published` line printed by `deploy-apps.sh`).
  - The Swagger description shows dealer-core's time.
  - Each Java service's startup log has `Release: <service> published <time>`.
  - With ai-service stopped, the ai line shows `unavailable` and the page still works.
- **Gateway check (AT-23):** open `http://<host>:8081` and `http://<host>:8082` from another machine, or use the cloud core and AI URLs. Both must fail.
- **Defects:** file a JIRA issue with:
  - the AT ID and the requirement ID
  - the steps
  - the expected and actual results
  - the log excerpt from `log-sum/<service>-<date>.log`

  Severity: Blocker means the minimum demo set fails. Critical means a Must requirement fails. Major means a Should requirement fails.
- **Testing rule:** during the development phase, testers run cases manually and report results. Nobody adds or changes test code until feature development is declared complete (see `CLAUDE.md`).

### Project manager / Scrum master

- **Sprint review:** an issue is Done only when its covering ATs pass in the tester run, the docs are updated, and CI is green.
- **Release gate:**
  1. Every Must requirement has a passing AT. AUD-05, AUD-07, SEC-05, SEC-06 and SEC-07 can instead have a documented code review.
  2. The minimum demo set passes on Azure, not only locally.
  3. No Blocker or Critical defect is open, including the known gap below.
- **Demo rehearsal:** walk the classroom storyline in §1 end to end on the cloud URLs. The cloud demo is required for course reviews 2 and 3.
- **Scope control:** check every new request against the out-of-scope list in §1. If one is accepted, record it in [design/SCOPE-BASELINE.md](design/SCOPE-BASELINE.md) and in the Chinese document's change log (§12) before work starts.
- **Sign-off:** chase the open items in §9, especially KAN-5 (username/password login) and erratum 5 (no containers), and file the written confirmation with the requirements.

### Keeping documents in step (everyone)

- **Requirement changes:** a change to behavior updates the requirement row in both [requirements/DealerOps-Requirements-zh.html](requirements/DealerOps-Requirements-zh.html) and this file in the same change. The IDs stay identical.
- **Design docs:** changes to the API, auth, tenancy, gateway or demo flow also update the matching `design/` document.

### Known gap at the time of writing (2026-10-07)

**Status:** AUTH-08, SEC-05, AT-03 and AT-38 are not met yet.

**What is wrong:** in `dealer-core`, two code paths let an admin read every dealership's data.
- `TenantGuard.requireBusinessAccess()` lets `Platform.Admin` through on the vehicle, customer and listing reads and on the assistant.
- `AuditService.list()` has its own admin branch that skips the dealer check.

Writes and compliance checks correctly return 403.

**Conflicting sources:**
- The existing `AdminForbiddenOnBusinessIT` already expects these reads to be refused.
- `design/15-Data-Auth-and-Gateway.md` §2.4 states the opposite: "business reads are cross-dealer".

**The fix:**
1. Switch those reads to `TenantGuard.requireDealerUser()`.
2. Remove the admin branch in `AuditService.list()` and the admin-only cross-dealer queries.
3. Correct design/15 §2.4.

AT-03 is in the classroom minimum demo set, so this must be fixed before the demo.
