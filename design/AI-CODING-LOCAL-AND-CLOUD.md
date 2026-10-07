# AI-CODING · How to start the four local services, and minimum cloud resource names

## Development phase: no test authoring

**Development is not complete. Do not write TEST code until the user confirms feature development is complete and explicitly authorizes test work.**

- Do not create, expand, modify, or refactor unit, integration, or end-to-end tests, empty test skeletons, assertions, test fixtures, mocks, or test-only helpers/configuration. This includes fixes made only to get existing tests to compile or pass.
- Requests to review requirements, inspect code, fix features, build, commit, or push do not authorize test authoring. Do not infer development completion from a successful build or existing coverage.
- Use source review, compilation/builds, and manual feature checks as appropriate. Running existing tests does not authorize editing them; obey any separate restriction on running tests. Report test failures without changing test code during development.
- Test-writing instructions elsewhere in this document or linked plans are deferred, including empty-class and sprint-based test tasks. Keep existing tests; do not delete or disable them to bypass failures.
- This is a student capstone: implement only required behavior and avoid unnecessary complexity.


Version: currently in force · 2026-09-21  
Status: **Coding AIs start by copying this file.** Do not change contracts, and do not change 13–19 / BRIEF / `AI-CODING-BACKEND` / `AI-CODING-FRONTEND` / `AI-PROTOCOL`.  
**Do not** add a container runtime back. There are no Dockerfiles, no Compose file, and no container registry in this project: local is five processes, cloud is `deploy/terraform` plus a JAR upload.  
**Do not** edit `deploy/terraform` to claim a resource is live. That stack is real infrastructure as code, and only `terraform apply` on an operator machine makes it exist.

Principles and ports follow [15](15-Data-Auth-and-Gateway.md) / [19](19-Gateway-and-AI-Engineering.md). This file only records **copy-paste commands, name patterns, and acceptance curls**.

---

## 1. Port table (same pinned set as 15 / 19 / `env.example`)

| Process | Environment variable | Port | Browser |
|---|---|---|---|
| dealer-web (Vite) | — | **5173** | Static only; signs in through the gateway |
| dealer-gateway | `GATEWAY_PORT` | **8080** | **Only API origin** (`VITE_GATEWAY_URL=http://localhost:8080`) |
| dealer-core | `CORE_PORT` | **8081** | Must fail (product entry is not 8081) |
| ai-service | `AI_PORT` | **8082** | Must fail |
| MySQL | — | **3306** | Not for the browser |

Upstream (Gateway outbound, same as `env.example`):

```text
CORE_URL=http://localhost:8081
AI_URL=http://localhost:8082
```

Every process runs on the machine itself, so `http://127.0.0.1:8081` / `http://127.0.0.1:8082` are the same thing and both spellings are allowed.

`dealer-core` and `ai-service` also take `SERVER_ADDRESS=127.0.0.1`, so they bind loopback and section 5.3 still holds without a container port mapping. `dealer-gateway` leaves it unset. In Azure, App Service routes to the app, so none of the three sets it.

---

## 2. Local start order + health-check URLs

**Fact:** there is no orchestrator. Five processes are started by hand, in the order below, and each one waits for the previous health check. Copy-ready IntelliJ run configurations and shell commands: [README](../README.md) "Local development startup".

### 2.1 Order (pinned)

1. **MySQL** (a local MySQL 8 service on 3306)
2. **dealer-core** (needs the database; Flyway)
3. **ai-service** (no database; may run in parallel with core, but must be ready before Gateway)
4. **dealer-gateway** (must resolve `CORE_URL` / `AI_URL`)
5. **dealer-web** (hits 8080 only)

```text
# 1) MySQL 8 on 3306, database dealer_core, user dealer
mysql -h 127.0.0.1 -P 3306 -u dealer -pdealer_dev_only dealer_core -e "SELECT 1"

# 2) dealer-core   → CORE_PORT=8081 SERVER_ADDRESS=127.0.0.1
cd dealer-core && mvn spring-boot:run

# 3) ai-service    → AI_PORT=8082 SERVER_ADDRESS=127.0.0.1
cd ai-service && mvn spring-boot:run   # stub profile is the default; real AI adds -Daimanager.real=true

# 4) dealer-gateway → GATEWAY_PORT=8080
cd dealer-gateway && mvn spring-boot:run

# 5) dealer-web     → vite :5173
cd dealer-web && npm ci && npm run dev
```

Every value each process needs is in `dealer-platform/env.example`. Do not fake a process: if a service will not start, fix it or report it.

### 2.2 Health checks (expose these while coding; no JWT)

| Process | URL | Expected |
|---|---|---|
| MySQL | `mysql … -e "SELECT 1"` | Exit code 0 |
| dealer-core | `http://127.0.0.1:8081/actuator/health` | **200** |
| ai-service | `http://127.0.0.1:8082/actuator/health` | **200** |
| dealer-gateway | `http://127.0.0.1:8080/actuator/health` | **200** |
| dealer-web | `http://127.0.0.1:5173/` | **200** (Vite dev page) |

On Windows use `curl.exe` (do not use PowerShell’s `curl` alias):

```text
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8081/actuator/health
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8082/actuator/health
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/actuator/health
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:5173/
```

All four health checks must be **200** before local processes count as complete. Health endpoints **must not** require `Authorization` / `X-Dealer-Internal`.

---

## 3. Local configuration per process

There is no compose file to merge into. Each process reads its values from the environment, and `dealer-platform/env.example` is the single list. Copy it to a local `.env`, or paste the same names into IntelliJ run configurations.

| Process | Must be set locally |
|---|---|
| `dealer-core` | `CORE_PORT=8081`, `SERVER_ADDRESS=127.0.0.1`, `MYSQL_URL` / `MYSQL_USER` / `MYSQL_PASSWORD`, `GATEWAY_BASE_URL`, `GATEWAY_PUBLIC_URL`, `INTERNAL_TOKEN`, `JWT_MODE=dev`, `DEV_JWT_SECRET`, and `ADMIN_USERNAME` / `ADMIN_PASSWORD` to seed the first admin |
| `ai-service` | `AI_PORT=8082`, `SERVER_ADDRESS=127.0.0.1`, `SPRING_PROFILES_ACTIVE=dev`, `INTERNAL_TOKEN`, `AIMANAGER_API_KEY` (empty for the stub), `AIMANAGER_GATEWAY_PROVIDER` |
| `dealer-gateway` | `GATEWAY_PORT=8080`, `CORE_URL`, `AI_URL`, `SPRING_PROFILES_ACTIVE=dev`, `INTERNAL_TOKEN`, `CORS_ALLOWED_ORIGIN=http://localhost:5173`, `JWT_MODE=dev`, the same `DEV_JWT_SECRET` as core |
| `dealer-web` | `VITE_GATEWAY_URL=http://localhost:8080` in `dealer-web/.env` |
| MySQL | Port 3306, database `dealer_core`, user `dealer`. Flyway in `dealer-core` owns the schema |

`INTERNAL_TOKEN` and `DEV_JWT_SECRET` must carry the **same value** in every process that reads them. A mismatch fails as a 404 on the AI path or a 401 on business calls, not as a clear error.

The cloud equivalent of this table is `deploy/terraform/main.tf`: the same variable names become App Service app settings, with the secret ones as Key Vault references. Do not duplicate that mapping in a second file.

## 4. Gateway CORS and internal header (environment variable names pinned)

| Item | Pinned value |
|---|---|
| Local CORS origin | **`http://localhost:5173`** |
| Environment variable (Gateway) | **`CORS_ALLOWED_ORIGIN`** (local default is the row above; Azure becomes the web HTTPS origin) |
| Internal request header name | **`X-Dealer-Internal`** |
| Environment variable (value) | **`INTERNAL_TOKEN`** |
| Local default | **`dealer-internal`**, accepted only when the Spring profile is **`dev`** or **`local`**. Any other profile must set a non-default **`INTERNAL_TOKEN`** shared by gateway, ai-service, and dealer-core. |
| Key Vault secret name | **`INTERNAL-TOKEN`** (cloud; never write the real value in the repo) |

Who reads `INTERNAL_TOKEN`: **gateway** (predicate), **core** (outbound), **ai-service** (guard). **web does not read it.**

Gateway preflight allowed headers list only `Authorization` and `Content-Type`. **Do not** put `X-Dealer-Internal` in `Access-Control-Allow-Headers`.  
core:8081 / ai:8082: **do not** configure CORS for `http://localhost:5173`.

`AIMANAGER_API_KEY` goes to **ai-service only**. `MYSQL_PASSWORD` goes to **core only**. Secrets stay out of Git; the repo has only empty slots in `env.example`.

---

## 5. Direct 8081 / 8082 must fail (curl expectations)

Always use `curl.exe`. Health-check 200 **does not** count as the product entry.

### 5.1 AI path without the internal header → 404 (not 401)

```text
curl.exe -s -o NUL -w "%{http_code}" -X POST http://127.0.0.1:8080/internal/v1/ad-check
# Expected: 404

curl.exe -s -o NUL -w "%{http_code}" -X POST http://127.0.0.1:8082/internal/v1/ad-check
# Expected: 404

curl.exe -s -o NUL -w "%{http_code}" -X POST http://127.0.0.1:8082/internal/v1/assistant
# Expected: 404
```

### 5.2 Direct core has no browser CORS (product entry is not 8081)

```text
curl.exe -s -D - -o NUL -X OPTIONS http://127.0.0.1:8081/api/v1/vehicles ^
  -H "Origin: http://localhost:5173" ^
  -H "Access-Control-Request-Method: GET"
# Expected: response headers do not include Access-Control-Allow-Origin: http://localhost:5173

curl.exe -s -D - -o NUL -X OPTIONS http://127.0.0.1:8080/api/v1/vehicles ^
  -H "Origin: http://localhost:5173" ^
  -H "Access-Control-Request-Method: GET"
# Expected: Access-Control-Allow-Origin: http://localhost:5173 is present
```

### 5.3 LAN IP direct to core / ai → cannot connect

`SERVER_ADDRESS=127.0.0.1` binds core and ai to loopback only. Replace `127.0.0.1` with your LAN IPv4:

```text
curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 3 http://<LAN_IP>:8081/actuator/health
# Expected: cannot connect (exit != 0 / timeout), not 200

curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 3 http://<LAN_IP>:8082/actuator/health
# Expected: cannot connect

curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 3 http://<LAN_IP>:8080/actuator/health
# Expected: 200 (Gateway is the public entry)
```

If `curl` to local `127.0.0.1:8081` still returns 401: class may use that only to say “no CORS / not the product entry”; it **cannot** count as “direct-access failure already accepted.”

Azure: `dealerops-core` and `dealerops-ai` set `ip_restriction_default_action = "Deny"` and allow only the `AzureCloud` service tag, so `dealerops-gateway` gets through and a browser on the public internet is refused by the platform. The usable public origins are **only** the Static Web App (SPA) and `dealerops-gateway` (API + Swagger). See `deploy/terraform/main.tf` and [deploy/README.md](../deploy/README.md) §2.

---

## 6. Azure resource name patterns

`deploy/terraform` variable `prefix` defaults to **`dealerops`**. Use these names; **do not invent a second nickname set**. Set `name_suffix` when a global `azurewebsites.net` hostname is already taken.

| Resource | Count | Name pattern | Example (`prefix=dealerops`) |
|---|---|---|---|
| Resource group | 1 | `${prefix}-rg` | `dealerops-rg` |
| App Service plan | 1 (Linux, `B2`) | `${prefix}-plan` | `dealerops-plan` |
| Linux Web App (Java 21 SE) | **3** | `${prefix}-gateway` `${prefix}-core` `${prefix}-ai` | `dealerops-gateway` … `dealerops-ai` |
| Static Web App (Free) | 1 | `${prefix}-web` | `dealerops-web` |
| MySQL Flexible Server | 1, database **`dealer_core`** | `${prefix}-mysql` | `dealerops-mysql` |
| Key Vault | 1 | `${prefix}-kv` | `dealerops-kv` |
| User-assigned identity | 1 | `${prefix}-uai` | `dealerops-uai` |
| Log Analytics + Application Insights | 1 each | `${prefix}-logs`, `${prefix}-appi` | `dealerops-logs`, `dealerops-appi` |

There is **no container registry and no Container Apps environment**: App Service runs the JAR that Maven produces. Key Vault holds `INTERNAL-TOKEN`, `MYSQL-PASSWORD`, `JWT-SIGNING-SECRET`, and, when configured, `AIMANAGER-API-KEY` and `ADMIN-PASSWORD`. App settings reference those secrets; they never contain a secret value. Do not write a subscription id, a `terraform.tfvars`, or a `terraform.tfstate` into Git.

### When cloud acceptance counts

| Sprint | Cloud business? |
|---|---|
| **Sprint 1** | Cloud business is **not required**. Local five processes + architecture diagram + two roles + "direct 8081/8082 fails" is enough to present. |
| **Sprint 2** | Cloud **must** be the real path: sign-in → Gateway → record one vehicle → **real AI** ad check, on the Azure stack from `deploy/terraform`. |
| **Sprint 3** | Do not add a bus/second database; finish isolation, CRM, three ad kinds, export, and audit. |

---

## 7. Pipeline (GitHub Actions, compile and validate only)

**Default CI: GitHub Actions.** Each application has a compile workflow under `.github/workflows/`. `.github/workflows/terraform.yml` runs `terraform fmt -check`, `terraform init -backend=false`, and `terraform validate` on changes under `deploy/terraform/`.

**No workflow deploys anything.** CI holds no Azure credentials. The cloud deploy is two operator commands, documented in [deploy/README.md](../deploy/README.md):

1. `terraform apply` in `deploy/terraform` creates or updates the Azure resources.
2. `deploy/terraform/deploy-apps.sh` packages the three JARs, uploads them with `az webapp deploy --type jar`, builds the SPA with `VITE_GATEWAY_URL` set to the gateway URL, and uploads `dist/` to the Static Web App.

That script generates **one** UTC timestamp (`yyyy-MM-dd'T'HH:mm:ss'Z'`, second precision) per run. It becomes the `PUBLISHED_AT` app setting on `dealerops-core` (Swagger info description) and the `VITE_PUBLISHED_AT` build value for `dealer-web` (footer `Published <timestamp>`). A machine with neither shows `Published local`. Swagger is served through the gateway at `/swagger-ui/index.html`; the browser never uses core port `8081`.

| Repo | JDK / Node | PR and `main` | Cloud deploy |
|---|---|---|---|
| dealer-gateway | **Java 21** | `mvn -B -DskipTests compile`, unit tests | JAR upload to `dealerops-gateway` |
| dealer-core | **Java 21** | Same, plus unit tests and the Testcontainers ITs when a Docker engine is present on the runner | JAR upload to `dealerops-core`; Swagger shows `PUBLISHED_AT` |
| ai-service | **Java 21** | Stub compile and tests; do not hit paid endpoints | Stub JAR upload to `dealerops-ai` |
| dealer-web | Node 20 | `npm ci && npm run build` | `dist/` upload to the Static Web App; footer shows `VITE_PUBLISHED_AT` |

The `dealer-core` integration tests are the **only** remaining use of a Docker engine, and only as a test fixture on a CI runner or a developer machine. Nothing that ships is a container.

Minimal skeleton (Java repos; web replaces compile with `npm`):

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  compile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: "21"
      - run: echo "repo=${{ github.repository }}"
      - run: mvn -B -DskipTests compile
```

Do not deploy by hand in the portal and call it a pipeline, and do not add an Azure login to a workflow without the subscription owner's decision.

---

## 8. Java and secrets

- The three Java repos (`dealer-gateway` / `dealer-core` / `ai-service`) are uniformly **21**. Ban one repo on 21 and another on 17.
- `dealer-web` has no JDK. Upstream `ai-manager` remains a Java 17 bytecode JAR; **do not change that library**; a 21 runtime may depend on it.
- **Secrets stay out of the repo:** `.env`, `terraform.tfvars`, `terraform.tfstate`, `AIMANAGER_API_KEY`, real MySQL passwords, and real `INTERNAL_TOKEN` values do not go into Git. Locally copy `dealer-platform/env.example`. Cloud uses Key Vault references from `deploy/terraform`.
- Sign-in is admin-issued username/password ([15](15-Data-Auth-and-Gateway.md) §8). The SPA holds no client secret of any kind.

---

## Coding AI must not

- Change 13–19, BRIEF, `AI-CODING-BACKEND` / `AI-CODING-FRONTEND` / `AI-PROTOCOL`
- Claim a `deploy/terraform` resource is live without an operator `terraform apply`
- Add a Dockerfile, a Compose file, a container registry, or a container-based host back
- Add a fifth auth repo / Service Bus / secrets in the repo / default to Azure DevOps
