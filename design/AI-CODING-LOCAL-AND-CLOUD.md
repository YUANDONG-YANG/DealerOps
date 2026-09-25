# AI-CODING · How to start the four local services, and minimum cloud resource names

Version: currently in force · 2026-09-21  
Status: **Coding AIs start by copying this file.** Do not change contracts, and do not change 13–19 / BRIEF / `AI-CODING-BACKEND` / `AI-CODING-FRONTEND` / `AI-PROTOCOL`.  
**Do not** change the `dealer-platform/infra/main.bicep` body (an unfinished cloud draft must not be passed off as deployed).  
**Do not** change the existing `docker-compose.yml` to pretend the four services are already implemented.

Principles and ports follow [15](15-Data-Auth-and-Gateway.md) / [19](19-Gateway-and-AI-Engineering.md). This file only records **copy-paste commands, name patterns, and acceptance curls**.

---

## 1. Port table (same pinned set as 15 / 19 / `env.example`)

| Process | Environment variable | Port | Browser |
|---|---|---|---|
| dealer-web (Vite) | — | **5173** | Static only + Entra redirect |
| dealer-gateway | `GATEWAY_PORT` | **8080** | **Only API origin** (`VITE_GATEWAY_URL=http://localhost:8080`) |
| dealer-core | `CORE_PORT` | **8081** | Must fail (product entry is not 8081) |
| ai-service | `AI_PORT` | **8082** | Must fail |
| MySQL | — | **3306** | Not for the browser |

Upstream (Gateway outbound, same as `env.example`):

```text
CORE_URL=http://host.docker.internal:8081
AI_URL=http://host.docker.internal:8082
```

When the IDE runs processes on the host (not in containers), `http://127.0.0.1:8081` / `http://127.0.0.1:8082` are allowed.

---

## 2. Local start order + health-check URLs

**Fact:** the existing `dealer-platform/docker-compose.yml` **starts MySQL only**; it has no web / gateway / core / ai-service. The four services land from the target fragment in section 3 after the coding AI creates the repos. **Do not change compose now to pretend they are complete.**

### 2.1 Order (pinned)

1. **MySQL** (existing compose)
2. **dealer-core** (needs the database; Flyway)
3. **ai-service** (no database; may run in parallel with core, but must be ready before Gateway)
4. **dealer-gateway** (must resolve `CORE_URL` / `AI_URL`)
5. **dealer-web** (hits 8080 only)

```text
# 1) MySQL only (current state is fine)
cd dealer-platform
docker compose up -d mysql

# 2) Wait for 3306
mysql -h 127.0.0.1 -P 3306 -u dealer -pdealer_dev_only -e "SELECT 1"

# 3–5) After each repo is ready (stop here if repos are not all created; do not fake processes)
# dealer-core  → CORE_PORT=8081
# ai-service   → AI_PORT=8082
# dealer-gateway → GATEWAY_PORT=8080
# dealer-web   → vite :5173
```

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

## 3. Target compose (not landed yet — coding AI builds this)

**Current state in one sentence:** `dealer-platform/docker-compose.yml` currently has only `mysql:8.4`, mapped `3306:3306`, database name `dealer_core`.

The fragment below is the **target**. The coding AI writes it into compose only after the four-repo Dockerfiles exist. **Do not commit this fragment into the existing compose now to pretend the four services are running.**

```yaml
# === Target (not landed) dealer-platform/docker-compose.yml ===
# Merge after the coding AI has all four repos; Gateway maps 8080; do not bind core/ai on 0.0.0.0 for the class to scan.
services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_DATABASE: dealer_core
      MYSQL_USER: dealer
      MYSQL_PASSWORD: dealer_dev_only
      MYSQL_ROOT_PASSWORD: dealer_root_dev_only
    ports:
      - "3306:3306"
    command: ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_0900_ai_ci"]

  dealer-core:
    build: ../dealer-core
    environment:
      CORE_PORT: "8081"
      MYSQL_URL: jdbc:mysql://mysql:3306/dealer_core?useSSL=false&allowPublicKeyRetrieval=true
      MYSQL_USER: dealer
      MYSQL_PASSWORD: dealer_dev_only
      INTERNAL_TOKEN: dealer-internal
      ENTRA_ISSUER: ${ENTRA_ISSUER}
      ENTRA_AUDIENCE: ${ENTRA_AUDIENCE:-api://dealer-api}
    # Bind loopback only for local demo curl; do not use "8081:8081"
    ports:
      - "127.0.0.1:8081:8081"
    depends_on:
      - mysql

  ai-service:
    build: ../ai-service
    environment:
      AI_PORT: "8082"
      INTERNAL_TOKEN: dealer-internal
      AIMANAGER_API_KEY: ${AIMANAGER_API_KEY}
      AIMANAGER_GATEWAY_PROVIDER: ${AIMANAGER_GATEWAY_PROVIDER:-openai}
      AIMANAGER_GATEWAY_MODEL: ${AIMANAGER_GATEWAY_MODEL}
    ports:
      - "127.0.0.1:8082:8082"

  dealer-gateway:
    build: ../dealer-gateway
    environment:
      GATEWAY_PORT: "8080"
      CORE_URL: http://host.docker.internal:8081
      AI_URL: http://host.docker.internal:8082
      INTERNAL_TOKEN: dealer-internal
      CORS_ALLOWED_ORIGIN: http://localhost:5173
      ENTRA_ISSUER: ${ENTRA_ISSUER}
      ENTRA_AUDIENCE: ${ENTRA_AUDIENCE:-api://dealer-api}
    ports:
      - "8080:8080"
    extra_hosts:
      - "host.docker.internal:host-gateway"

  dealer-web:
    build: ../dealer-web
    environment:
      VITE_GATEWAY_URL: http://localhost:8080
      VITE_ENTRA_TENANT_ID: ${VITE_ENTRA_TENANT_ID}
      VITE_ENTRA_CLIENT_ID: ${VITE_ENTRA_CLIENT_ID}
      VITE_ENTRA_API_SCOPE: ${VITE_ENTRA_API_SCOPE:-api://dealer-api/access_as_user}
    ports:
      - "5173:5173"
```

`../dealer-*` is the agreed path of the four independent repos relative to `dealer-platform`; do not hard-code empty images when a repo is not checked out.

---

## 4. Gateway CORS and internal header (environment variable names pinned)

| Item | Pinned value |
|---|---|
| Local CORS origin | **`http://localhost:5173`** |
| Environment variable (Gateway) | **`CORS_ALLOWED_ORIGIN`** (local default is the row above; Azure becomes the web HTTPS origin) |
| Internal request header name | **`X-Dealer-Internal`** |
| Environment variable (value) | **`INTERNAL_TOKEN`** |
| Local default | **`dealer-internal`** |
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

Target compose binds 8081/8082 to `127.0.0.1` only. Replace `127.0.0.1` with your LAN IPv4:

```text
curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 3 http://<LAN_IP>:8081/actuator/health
# Expected: cannot connect (exit != 0 / timeout), not 200

curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 3 http://<LAN_IP>:8082/actuator/health
# Expected: cannot connect

curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 3 http://<LAN_IP>:8080/actuator/health
# Expected: 200 (Gateway is the public entry)
```

If `curl` to local `127.0.0.1:8081` still returns 401: class may use that only to say “no CORS / not the product entry”; it **cannot** count as “direct-access failure already accepted.”

Azure: core / ai use **internal** Ingress; the public FQDN is **only** web + gateway.

---

## 6. Azure minimum resource name patterns

`main.bicep` `prefix` defaults to **`dealerops`**. Compose names as below; **do not invent a second nickname set**.

| Resource | Count | Name pattern | Example (`prefix=dealerops`) | `main.bicep` status |
|---|---|---|---|---|
| Azure Container Registry | 1 (Basic, admin off) | `${prefix}acr` | `dealeropsacr` | **This item only is written** |
| Container Apps Environment | 1 | `${prefix}-cae` | `dealerops-cae` | Not written |
| Container App | **4** | `${prefix}-web` `${prefix}-gateway` `${prefix}-core` `${prefix}-ai` | `dealerops-web` … `dealerops-ai` | Not written |
| MySQL Flexible Server | 1, database name **`dealer_core`** | `${prefix}-mysql` | `dealerops-mysql` | Not written |
| Key Vault | 1 | `${prefix}-kv` | `dealerops-kv` | Not written |
| Application Insights | 1 | `${prefix}-appi` | `dealerops-appi` | Not written |

Bicep **current state = ACR only**. Do not treat commented TODOs as deployed. Do not write a subscriptionId or plaintext secrets in Bicep.

### When cloud acceptance counts

| Sprint | Cloud business? |
|---|---|
| **Sprint 1** | Cloud business is **not required**. Local four processes + architecture diagram + Entra two roles + “direct 8081/8082 fails” is enough to present. ACR placeholder is enough. |
| **Sprint 2** | Cloud **must** be the real path: sign-in → Gateway → record one vehicle → **real AI** ad check. KV / MySQL / CAE / four Container Apps / Insights must be added to the same `main.bicep` before deploy. core/ai internal; gateway/web external + HTTPS. |
| **Sprint 3** | Do not add a bus/second database; finish isolation, CRM, three ad kinds, export, and audit. |

---

## 7. Pipeline (GitHub Actions by default; no longer a choice)

**Default CI: GitHub Actions.** Each application has a compile workflow under `.github/workflows/`. `dealer-platform` validates Bicep and does not build business images.

**Automatic publish** is container images on GitHub Container Registry, plus a local Compose acceptance stack. The step-by-step procedure, URLs, and failure checks are in [deploy/README.md](../deploy/README.md). This automation does not create Azure resources and does not host the UI on Vercel. The Bicep stack in `dealer-platform/infra/main.bicep` stays an optional paid design; the publish workflow does not log in to Azure or deploy it.

On `main`, `.github/workflows/publish-ghcr.yml` generates **one** UTC timestamp (`yyyy-MM-dd'T'HH:mm:ss'Z'`, second precision) per run. That same value is baked into `dealer-web` as `VITE_PUBLISHED_AT` (footer text `Published <timestamp>`) and into `dealer-core` as `PUBLISHED_AT` (Swagger info description on the gateway at `/swagger-ui/index.html`). Image tags `:sha` and `:main` come from that same run. A machine with no `VITE_PUBLISHED_AT` / `PUBLISHED_AT` shows `Published local`. The browser never uses core port `8081` for Swagger. A public HTTPS demo, when one is running, is the procedure in [deploy/README.md](../deploy/README.md); it is not an Azure deployment.

| Repo | JDK / Node | PR | `main` publish |
|---|---|---|---|
| dealer-gateway | **Java 21** | `echo` repo name → `mvn -B -DskipTests compile` | Same image push as the others (`ghcr.io/yuandong-yang/dealer-gateway`) |
| dealer-core | **Java 21** | Same, plus unit tests | Same; Swagger shows `PUBLISHED_AT` |
| ai-service | **Java 21** | Stub compile; do not hit paid endpoints | Same stub image |
| dealer-web | Node 20 | `echo` repo name → `npm ci && npm run build` | Same; footer shows `VITE_PUBLISHED_AT` |

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
  image:
    if: github.ref == 'refs/heads/main'
    needs: compile
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - run: echo "Images are published by .github/workflows/publish-ghcr.yml"
```

The live publisher is `.github/workflows/publish-ghcr.yml`, documented in [deploy/README.md](../deploy/README.md). Do not change images by hand and call it a pipeline.

---

## 8. Java and secrets

- The three Java repos (`dealer-gateway` / `dealer-core` / `ai-service`) are uniformly **21**. Ban one repo on 21 and another on 17.
- `dealer-web` has no JDK. Upstream `ai-manager` remains a Java 17 bytecode JAR; **do not change that library**; a 21 runtime may depend on it.
- **Secrets stay out of the repo:** `.env`, `AIMANAGER_API_KEY`, real MySQL passwords, and real `INTERNAL_TOKEN` values do not go into Git. Locally copy `dealer-platform/env.example`. Cloud uses Key Vault `secretRef`.
- SPA has **no** Entra client secret (PKCE). `VITE_ENTRA_CLIENT_ID` is not a secret.

---

## Coding AI must not

- Change 13–19, BRIEF, `AI-CODING-BACKEND` / `AI-CODING-FRONTEND` / `AI-PROTOCOL`
- Change `dealer-platform/infra/main.bicep` to pretend the cloud is complete
- Change the existing compose as if the four services are implemented
- Add a fifth auth repo / Service Bus / secrets in the repo / default to Azure DevOps
