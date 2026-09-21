# 19 · Gateway and ai-service engineering design

- Status: **current (v6 Gateway YAML-level / ai-service adapter-level)**
- **Routes, JWT, CORS, internal header, direct-access failure, why no standalone auth repo, why no Service Bus: follow [15](15-Data-Auth-and-Gateway.md).** This document does not set new principles; it only writes file-splittable config and adapter boundaries.
- **ai-manager integration follows [09](09-AI-Agent-Integration.md)** (in-process embed, `AiManager`, do not scan `com.gateway`, implement timeout yourself).
- **HTTP paths and JSON follow [14](14-Backend-API-Contract.md).** Public surface is only `/api/v1/**`; internal surface is only `/internal/v1/ad-check` and `/internal/v1/assistant`. This document invents no extra paths, no extra error codes, and no business tables.
- In-dealership assistant product flow follows [10](10-Web-AI-Assistant.md) (Vue → Gateway → core filter → internal assistant via Gateway). This document writes the ai-service-side adapter only.
- How fixtures produce "AI unavailable" follows [17](17-Ad-Check-Fixtures.md) **FX-12**.
- **Does not cover** `dealer-core` package structure, entities, Flyway, or rule-engine implementation (left to 18). **Does not change** BRIEF / README / `13`–`17` / SCOPE / SQL.

Coding repos: `dealer-gateway`, `ai-service` (if files are not yet split as here, create the directories below).

---

## 0. Conflict order and this document's boundary

| Question | Where |
|---|---|
| Can the browser hit 8081/8082, who configures CORS, what the internal header is called, JWT claims | **15** |
| JSON for `/api/v1/**` and `/internal/v1/**`, 502 `AI_UNAVAILABLE` | **14** |
| `AiManager` API, commit, Gateway components that must not be exposed | **09** |
| Fixed OMVIC checklist pseudocode | **15 §6** (runs in **core**; this document does not rewrite it) |
| Fixture bodies and FX-12 | **17** |
| Gateway `application.yaml` fragments, where JWT filters hang, ai-service adapter directories and timeouts | **this document** |

Forbidden: a fifth auth repo / a standalone container for the GitHub component; Service Bus / a vector store / a homegrown model SDK; treating `com.gateway` or the library `/api/ai/**` as a public API; treating `ai-manager` as a fifth microservice.

---

## 1. dealer-gateway

### 1.1 Stack and suggested directory

**Spring Cloud Gateway**, **Java 21** (matches 07 / 15 §12; the three Java repos share one version — do not mix gateway 21 and ai-service 17). No MySQL, no model SDK, no business writes.

```
dealer-gateway/
  pom.xml
  src/main/resources/application.yaml
  src/main/java/ca/sait/dealerops/gateway/
    GatewayApplication.java
    config/
      SecurityConfig.java          # resource server: issuer/audience in 15 §8
      CorsConfig.java              # or yaml cors; web origin only
    filter/
      InternalRouteFilter.java     # /internal/v1/** without X-Dealer-Internal → 404
```

Package name is yours; **do not** use the upstream library `com.gateway`. Responsibility ends here (15 §7): routing, user-JWT validation, blocking internal, stripping sensitive headers, forwarding `/api/v1` `Authorization`.

Environment variable names follow `dealer-platform/env.example`:

| Variable | Purpose |
|---|---|
| `GATEWAY_PORT` | listen **8080** |
| `CORE_URL` | upstream core (local `http://host.docker.internal:8081` or machine `http://127.0.0.1:8081`) |
| `AI_URL` | upstream ai-service (local `http://host.docker.internal:8082`) |
| `ENTRA_ISSUER` / `ENTRA_AUDIENCE` | JWT signature validation (15 §8) |

The shared internal secret **`INTERNAL_TOKEN`** is already ruled in **15 §7 / §11** (suggested KV name `INTERNAL-TOKEN`). `env.example` does not list it yet: **do not change env.example in this document**; at start, add it to local `.env` / KV per 15; web **does not read** it.

### 1.2 Route table (`application.yaml` level)

Browser-to-service HTTP enters this process only. `/api/v1/**` **must not** be forwarded to ai-service.

```yaml
server:
  port: ${GATEWAY_PORT:8080}

spring:
  cloud:
    gateway:
      globalcors:
        add-to-simple-url-handler-mapping: true
        cors-configurations:
          '[/**]':
            allowedOrigins:
              - "http://localhost:5173"
            allowedMethods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
            allowedHeaders: [Authorization, Content-Type]
            exposedHeaders: []
            allowCredentials: false
      default-filters:
        - DedupeResponseHeader=Access-Control-Allow-Origin Access-Control-Allow-Credentials, RETAIN_UNIQUE
      routes:
        - id: dealer-core-public
          uri: ${CORE_URL}
          predicates:
            - Path=/api/v1/**
          filters:
            - PreserveHostHeader
            # forward user JWT as-is; do not strip Authorization
        - id: ai-service-internal
          uri: ${AI_URL}
          predicates:
            - Path=/internal/v1/**
            - Header=X-Dealer-Internal, ${INTERNAL_TOKEN}
          filters:
            - RemoveRequestHeader=Authorization   # user JWT must not enter ai-service (15 §7)
        - id: not-found
          uri: no://op
          predicates:
            - Path=/**
          filters:
            - SetStatus=404
```

**Browser calls to `/internal/v1/**` must fail (15 §7; missing one of the three will be torn apart in defense):**

1. Gateway predicate: no header `X-Dealer-Internal: <INTERNAL_TOKEN>` → **404** (do not use 401, which would acknowledge the path). Without the header the table above never enters `ai-service-internal` and falls through to 404.
2. core outbound adds that header itself; **do not** forward the user JWT to ai-service.
3. ai-service missing that header is also **404**. Direct 8082 still fails.

`Access-Control-Allow-Headers` **must not** list `X-Dealer-Internal` (15 §13). CORS is **only** on Gateway (and Vite for 5173); core / ai-service do not configure browser CORS.

Azure: allow only the web HTTPS origin (replace `localhost:5173`). Local preflight serves Vite only.

### 1.3 JWT (Entra → two roles)

Mapping is locked, same function as 15 §8.1; this document does not change the claim table:

- App Role `value`: `Platform.Admin`, `Dealer.User`
- `iss` = `ENTRA_ISSUER`, `aud` = `ENTRA_AUDIENCE` (default `api://dealer-api`)
- `roles[]` is the sole RBAC source; `scp` is not a role; `groups` are ignored
- `Platform.Admin` and `Dealer.User` both present → **Admin wins**
- Cannot map → Gateway **401**; never reaches core business

Gateway and core **both** validate signatures. After Gateway validates, it must still forward **`Authorization: Bearer`** to core (core validates again in case 8081 is later opened by mistake).

SPA: MSAL + PKCE, no client secret. Gateway **does not issue** tokens.

### 1.4 CORS only on Gateway

Allowed web origin (local): **`http://localhost:5173`** (paired with `VITE_GATEWAY_URL=http://localhost:8080`).  
Allowed headers: `Authorization`, `Content-Type`. Cookies are not this course's approach.

core:8081 / ai:8082: **do not** configure ACAO for 5173. This is part of "direct access fails", not optional.

### 1.5 How to prove direct core:8081 / ai:8082 access fails

Same port set as 15 §10 (`env.example`): web `5173`, gateway **`8080`**, core **`8081`**, ai **`8082`**.

| Demo | Expect |
|---|---|
| Page `fetch('http://localhost:8081/api/v1/vehicles')` (with or without Bearer) | browser blocks (no CORS). Product entry is not 8081 |
| Same request via `http://localhost:8080/api/v1/vehicles` + Bearer | 200 or a business error (401/403/404…) |
| Page `fetch('http://localhost:8082/internal/v1/ad-check')` | no CORS; even a non-browser client without the internal header → **404** |
| Page `fetch('http://localhost:8080/internal/v1/ad-check')` (no internal header) | Gateway **404** |
| Azure | core / ai **internal** Ingress; public FQDNs are web + gateway only |

compose mapping: Gateway 8080; do not bind core/ai to `0.0.0.0` for the whole class to scan. Classroom backup: if `curl` 8081 still works, say "no CORS / no public net / needs intranet"; **do not** rely on turning the firewall off as the only evidence.

### 1.6 Half-page defense pointer (Auth domain = Entra)

The PPT Auth domain wants **OAuth/OIDC + JWT + RBAC** and forbids homegrown authentication. This course's Auth unit **is Microsoft Entra ID** (table 07), **not** a fifth Java repo and not a GitHub-component container.

Classroom wrap (full "why no Service Bus" section is in **15 §8.2 / §9**; do not repeat it here):

- Identity lives in Entra; the application side only validates tickets (Gateway + core) and binds dealerships (core `membership`)
- Gateway does not issue tokens; admin "issuing an account" = bind `entra_oid` → `dealer_id`
- Writing `dealer-auth` would hit a password table / fifth pipeline / fifth Container App

---

## 2. ai-service

### 2.1 Position

Java 21 Spring Boot, **no database**, no Flyway, no business tables. In-process dependency on the private GitHub **ai-manager** JAR; **do not** give the component its own container (07 / 09).

Locked (09; plan only, do not change that repo's source):

- Repo: `https://github.com/YUANDONG-YANG/ai-manager` (private)
- Branch `main`, commit **`c07e1f2afe5dd692c20f3567ad3a42a90d31a87a`**
- Current Maven coordinates: `com.aimanager:aimanager:1.0.0-SNAPSHOT` (SNAPSHOT is not a release number; see §2.8)
- Use only `com.manager.AiManager`: `request(String)`, `startConversation(id, systemMessage)`, `closeConversation`
- **Do not** scan `com.gateway`, **do not** start `AIApplication`, **do not** expose library `/api/ai/request`, `/chat`, `/credentials`, `/runtime`

The key goes to ai-service **only**: `AIMANAGER_API_KEY` (env / Key Vault). web / gateway / core do not read it.

### 2.2 Suggested directory (adapter level, not a rule engine)

```
ai-service/
  pom.xml
  src/main/resources/application.yaml
  src/main/java/ca/sait/dealerops/aiservice/
    AiServiceApplication.java
    config/
      InternalGuardFilter.java     # missing X-Dealer-Internal → 404
      AiTimeoutConfig.java         # connect/response total ≤15s (09: library has no ready timeout)
    adapter/adcheck/
      AdCheckController.java       # POST /internal/v1/ad-check
      AdCheckAdapter.java          # startConversation + finally closeConversation
    adapter/assistant/
      AssistantController.java     # POST /internal/v1/assistant
      AssistantAdapter.java        # short conversation; consumes only core-filtered resources
    support/
      AiManagerFactory.java        # read AIMANAGER_* ; rate-limit queue off by default
      ModelFailureException.java   # timeout / missing Key / vendor failure → core maps 502
```

Listen **`AI_PORT=8082`**. Do not configure browser CORS.

### 2.3 Timeout must be implemented here (09)

The library OpenAI path is `WebClient...blockOptional()` and **has no ready 15-second guarantee**. The adapter must set **connect + response** itself so the whole model call is **≤15s** (matches 07 / 14 "wait at most 15 seconds").

- Timeout, connection failure, non-success → adapter failure; **do not** pretend Pass
- Rate-limit queue **off by default**, so it does not stack with the course 15s (09)
- CI uses a stub and **does not hit paid endpoints**; Sprint 2 must send one real request to this library (09)

`application.yaml`-level sketch (pin 15s; wrap WebClient/HttpClient in the implementation; do not change ai-manager source):

```yaml
server:
  port: ${AI_PORT:8082}
dealerops:
  ai:
    timeout-ms: 15000
    require-internal-header: true
```

### 2.4 Internal APIs (paths cite 14 §11 only)

Gateway → ai-service. core calls; **browser 404**.

#### `POST /internal/v1/ad-check`

Request-body shape **cites 14 §11 as-is**: `listing` (title/body/adKind/medium), `vehiclePublic` (year/make/model/vin/conditionCode/source, **no** purchase/repair/sold price), `dealerPublic` (dealership public four fields).

Adapter:

1. `startConversation`: system = review instructions (not the 15 hard rule engine; hard rules already ran in core)
2. user = the JSON above
3. check `AIResponse.isSuccess()` first, then parse content
4. `finally` `closeConversation`
5. Fold model output into **notes for core to write as `aiNotes`** (14: elements at least `{ "message": "..." }`). **Do not** persist `compliance_check` in this service

Transport / timeout / missing Key: return **5xx or an agreed failure body** (pick one and lock it); **core** records `UNAVAILABLE` and returns **502 `AI_UNAVAILABLE`** to the outside (14 §8.2). ai-service **must not write business tables or return five states to the browser itself**.

#### `POST /internal/v1/assistant`

Request-body shape **cites 14 §11 as-is**: `question` + `resources` (already filtered by core; no phone/email/address).

The adapter likewise starts a short conversation and returns **short text** (14: "return short text; core re-checks ids"). core owns: at most 5 cards, drop invented ids, model down still **200** outside with `summaryAvailable=false` (14 §10 / document 10). When ai-service fails, give core a recognizable failure; **do not** write vehicles/customers/listings here.

Do not invent `/internal/v1/chat`, `/api/ai/**`, or the library's own Gateway paths.

### 2.5 Boundary with core (do not steal the 18 rule engine)

| Step | Who | Implemented in this document? |
|---|---|---|
| JWT, tenant, `listing.version`, this-dealership validation | **core** | No |
| **Fixed OMVIC checklist** (15 §6 pseudocode: `hard[]` / `soft[]`) | **core, before any model call** | **No. Do not move the rule engine into ai-service** |
| `hard[]` not empty → `BLOCKED` + `aiStatus=SKIPPED`, **no HTTP AI call** | **core** | No |
| `hard[]` empty → Gateway `POST /internal/v1/ad-check` (≤15s) | core outbound + **this service's adapter** | model call only |
| Write `compliance_check` / write back `last_check_id` / outside 200 or 502 | **core** | No |
| Assistant: retrieve at most 5, filter privacy, check ids, do not write business tables | **core** (10 / 14) | No |
| Model conversation + 15s timeout + Key | **ai-service** | Yes |

ai-service **assumes** an incoming ad-check already passed fixed rules. It does not re-judge `PRICE_MISSING` and similar hard misses, and it does not decide page five states. If an FX-01-class hard-miss ad is sent to 8082 by mistake, that is only "the model ran again" and **cannot** replace core's Blocked=200.

### 2.6 Model and environment variables (follow `env.example`)

PPT: real AI, **Azure OpenAI preferred**. No homegrown SDK; vendors use capabilities already in the library (09: groq / openai / claude / deepseek; **no** `provider=mock`).

| `env.example` name | ai-service use |
|---|---|
| `AI_PORT` | 8082 |
| `AIMANAGER_API_KEY` | sole model key; empty must fail on first call after start (see below) |
| `AIMANAGER_GATEWAY_PROVIDER` | default example `openai`; in class prefer the **Azure OpenAI-compatible openai path** (or an Azure-hosted endpoint the library already supports, 07) |
| `AIMANAGER_GATEWAY_MODEL` | deployment / model name; empty uses the library default, but pairing must set it explicitly |

Do not introduce `OPENAI_API_KEY`, a vector connection string, or a second model client. Rotating a key = change KV / `.env` only, not the image (15 §13).

### 2.7 How failure lets core map `AI_UNAVAILABLE` 502

ai-service **does not** invent an `AI_UNAVAILABLE` business table. It only makes failure observable:

| Cause | Adapter | core (14; not implemented here) |
|---|---|---|
| Over 15s | abort, 5xx / timeout error | check row already written `UNAVAILABLE`, outside **502** `AI_UNAVAILABLE` |
| `AIMANAGER_API_KEY` missing or invalid | fail immediately; do not hang the full 15s | same as above |
| `isSuccess()==false` / parse failure | fail | same as above |
| Assistant model down | fail | outside still **200** + `summaryAvailable=false` (**different** from check 502) |

Forbidden: ai-service returning a "fake Passed"; treating timeout as 200 empty notes.

### 2.8 Private package / immutable version (plan only)

At implementation time (**do not change code outside this document, do not change ai-manager source**):

1. From commit `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a` cut a **non-SNAPSHOT** immutable version
2. Publish to GitHub Packages `https://maven.pkg.github.com/YUANDONG-YANG/ai-manager`
3. `ai-service` references that immutable version only
4. Local `mvn install` before that version exists is for development only
5. CI stub; do not hit paid endpoints
6. A 21 runtime can depend on a **17 bytecode** JAR (15 §12); do not drop the three repos to 17 unless the whole machine falls back

Library README tests are unmaintained (09): **cannot** treat that library itself as quality proof. Fixture labels are team-authored (17).

---

## 3. FX-12: how pairing produces "AI unavailable"

Fixture authority is **17**: FX-12 title/body are **the same as FX-10** (clean CASH / ONLINE, `hard[]` empty). **Do not** impersonate this fixture with a missing-price or other hard-miss ad (hard miss never calls AI).

Pick one pairing method (adapter ≤15s):

1. **Break the Key:** empty or wrong `AIMANAGER_API_KEY`, then restart ai-service
2. **Timeout:** set timeout extremely short, or make the vendor unreachable, so the adapter fails inside 15s
3. **CI stub:** stub always fails (does not hit paid endpoints)

Expected chain (14 + 17; core persists, ai-service only fails):

- Fixed rules **Needs AI** → Gateway internal ad-check
- Call fails → outside **502** `AI_UNAVAILABLE`
- `compliance_check` **already written** `recommendation=UNAVAILABLE`; listing already points at that row
- GET: `checkStatus=AI_UNAVAILABLE`; UI **must not** treat as Pass; Ready/Export → **409** `NOT_PASSED`

Classroom order (17): FX-01 → FX-03 → FX-10 (real AI) → export → FX-11 Stale → optional FX-12 cut AI.

---

## 4. Start file-split checklist (still no business code)

**gateway:** `pom` (Java 21 + Spring Cloud Gateway + resource server) → `application.yaml` (§1.2) → JWT config (issuer/audience) → internal-header 404 → CORS for 5173 only.

**ai-service:** `pom` (Java 21 + immutable/local ai-manager JAR) → internal-header 404 → `AdCheckAdapter` / `AssistantAdapter` + 15s timeout → Controllers for the two 14 paths → missing Key/timeout fail upstream.

**Do not do in these repos:** core packages, rule engine, SQL, a fifth container, Service Bus, exposing `com.gateway`.
