# 18 · Backend dealer-core engineering design

- Status: **current (v6 core engineering)**
- **HTTP follows [14-Backend-API-Contract.md](14-Backend-API-Contract.md)** (paths, DTOs, error codes, envelope). This document does not start a second contract or rewrite 14 JSON.
- **Data / tenant / empty draft / membership / SOLD / OMVIC fixed rules follow [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md)**. This document does not change those rulings or `V1__init.sql`.
- This document covers only: **how the `dealer-core` repo splits Java files, application-service responsibilities, tenant intercept, exception mapping, outbound AI calls, audit, and test-class mapping**. Team members can write from the directory and class names.
- Authority on conflict: course PPT hard items > spec PDF fields > [IMPLEMENTATION-BRIEF.md](IMPLEMENTATION-BRIEF.md) / [00](00-Current-Development-Design.md) > **15 / 14 / [13](13-Frontend-Engineering.md)** > this document (core engineering) > [12](12-Frontend-UI-Conventions.md). `16` / `17` are acceptance and fixtures and **do not change the contract**.
- Repo duties align [08-DevOps-and-Implementation.md](08-DevOps-and-Implementation.md): core = Spring Boot + Flyway + one database + tenant isolation + business API + AI via Gateway. Gateway writes no business; ai-service has no database.
- Out of scope: tickets / leads / a separate password table (the hash lives on `app_user`) / Service Bus / a second database / opening 8081 to the browser. Do not change SQL. Do not write Java business-code bodies here (class names and duties only).

Coding repo: `dealer-core` (currently only `src/main/resources/db/migration/V1__init.sql`). **core is not open to the browser**; it listens on intranet port **8081** only (15 §10).

---

## 1. Stack and package names (enough to start)

| Item | Locked |
|---|---|
| Language | **Java 21** (unified across the four Java course repos; 15 §12. Do not mix core 21 and ai-service 17) |
| Framework | **Spring Boot 3** (Web, Validation, Security Resource Server, Data JPA) |
| Migration | **Flyway only**. `V1__init.sql` already exists. Do not use `ddl-auto=update`. Later scripts use `V{YYYYMMDD}_{n}__{action}.sql` (repo `CLAUDE.md`); current ones are `V20260930_1__add_password_hash.sql`, `V20261007_2__widen_customer_email.sql` (history repair for databases created before 2026-10-07: [15](15-Data-Auth-and-Gateway.md) §8.3) |
| Database | **one MySQL**, database name `dealer_core`. Connection string / account in platform `env.example` (`MYSQL_*`). core **owns** the data plane exclusively |
| Port | `CORE_PORT=8081`. No browser CORS; no ACAO for `5173` (15 §10 / §13) |
| Identity | admin-issued username/password (15 §8). `POST /api/v1/auth/login` checks the BCrypt `app_user.password_hash` and issues an HS256 JWT (`sub`=username, `name`, `roles`) signed with `DEV_JWT_SECRET`; core and Gateway both validate it with the same secret. `JWT_MODE` must be `dev`. No separate password table |
| Calls | synchronous REST. No queue, no outbox |

Suggested root package: `com.dealerops.core`. Subpackages as below. **Do not** add `ticket` / `lead` / a standalone `auth` service / `bus`.

```
com.dealerops.core
  config
  security
  dealer
  vehicle
  customer
  listing
  compliance
  audit
  assistant
  common.exception
  common.tenant
```

Contract fields live in this repo's DTOs (08: no separate contracts repo). DTO **shape is copied from 14; this document writes class names only**.

---

## 2. Directory tree (create files from this)

The current repo has no `src/main/java` yet; create it as follows. Test directories are in section 10.

```
dealer-core/
  pom.xml                          # Java 21, Boot 3, Flyway, mysql, spring-boot-starter-oauth2-resource-server
  # No Dockerfile: Maven packages a JAR, App Service runs it (deploy/README.md)
  src/main/resources/
    application.yml                # server.port=8081; flyway; datasource; jwk; no CORS
    db/migration/V1__init.sql      # already landed; this document does not change it
  src/main/java/com/dealerops/core/
    DealerCoreApplication.java
    config/
      SecurityConfig.java          # Resource Server; /api/v1/** requires JWT; do not expose actuator business
      WebConfig.java               # no browser CORS (or empty)
      JacksonConfig.java           # camelCase; dates YYYY-MM-DD / ISO-8601 UTC (14 §1.3)
      AiClientConfig.java          # WebClient: Gateway base URL + internal header
    security/
      JwtRoleMapper.java           # claims.roles → Platform.Admin | Dealer.User | NONE (15 §8)
      JwtIssuer.java               # signs the HS256 login token (sub=username, name, roles)
      MeController.java            # GET /api/v1/me (14 §2)
      MeService.java               # return role / dealerId / dealerLegalName; Admin last two null
      CurrentUser.java             # username, role, tenantDealerId (nullable)
    dealer/
      AuthController.java          # POST /api/v1/auth/login (14 §1.4), anonymous
      AuthService.java             # BCrypt check against app_user.password_hash
      AdminDealerController.java   # 14 §3 dealership CRUD
      AdminMemberController.java   # 14 §3 members
      DealerAdminService.java
      MembershipService.java
      DealerEntity.java
      DealerRepository.java
      AppUserEntity.java
      AppUserRepository.java
      MembershipEntity.java
      MembershipRepository.java
      dto/                         # 14 fields only: DealerResponse, CreateDealerRequest, …
    vehicle/
      VehicleController.java       # 14 §4
      VehicleService.java
      VehicleEntity.java
      VehicleRepository.java
      dto/
    customer/
      CustomerController.java      # 14 §5
      CustomerVehicleController.java  # 14 §6 PUT + DELETE
      CustomerService.java         # includes link / unlink
      CustomerEntity.java
      CustomerRepository.java
      CustomerVehicleEntity.java
      CustomerVehicleRepository.java
      dto/
    listing/
      ListingController.java       # GET/PATCH /vehicles/{id}/listing; ready / export (14 §7–8)
      ListingService.java          # empty draft not persisted; PATCH uses ''
      ListingEntity.java
      ListingRepository.java
      dto/
    compliance/
      ComplianceCheckController.java  # POST /listings/{id}/checks (14 §8.2)
      ComplianceCheckService.java
      OmvicRuleEngine.java         # 15 §6 pseudocode; before AI
      ComplianceCheckEntity.java
      ComplianceCheckRepository.java
      CheckStatusMapper.java       # derived checkStatus five states (14 §8)
    audit/
      AuditController.java         # GET /audit (14 §9)
      AuditService.java
      AuditEventEntity.java
      AuditEventRepository.java
    assistant/
      AssistantController.java     # POST /assistant/ask (14 §10)
      AssistantService.java        # retrieve this dealership ≤5; do not write business tables
      AssistantResourceQuery.java  # assemble resources; strip phone/email/address
    common/
      exception/
        ApiException.java          # carries 14 code
        ApiExceptionHandler.java   # → {code,message}; VALIDATION may include fieldErrors
        ErrorCode.java             # enum: VIN_DUP, SOLD_LOCKED, … (14 §12 only)
      tenant/
        TenantContext.java         # ThreadLocal: tenantDealerId
        TenantFilter.java          # JWT + membership → dealerId
        TenantGuard.java           # cross-dealership 404; no membership 403
    integration/
      AiGatewayClient.java         # Gateway POST /internal/v1/** + X-Dealer-Internal
      InternalHeaders.java         # header-name constants; do not forward user JWT
```

Do not add: `ticket/`, `lead/`, `password/`, `bus/`, `public/`. There is no `stores`-style session in core: each request is resolved from JWT + membership.

Controllers only: validate input, call one application service, return 14 DTOs / status codes. **Ignore** `dealerId` in body / query / header.

---

## 3. V1 tables → Entity + Repository

Follow `V1__init.sql`: **one entity class + one Repository per table**. Column names match V1; add no columns. Enum values are in 15 "Entity-layer landing notes"; constraints are application-layer, not DB CHECK.

| Table | Entity | Repository | Write-path notes (behavior is in 15) |
|---|---|---|---|
| `dealer` | `DealerEntity` | `DealerRepository` | optimistic lock `version`. Four contacts non-empty. No DELETE dealership |
| `app_user` | `AppUserEntity` | `AppUserRepository` | `uk_user_username (username)`. `dealer_id` **is not** tenant authority |
| `membership` | `MembershipEntity` | `MembershipRepository` | tenant authority: `username` + `active=1` **exactly one row**. Two active rows at once → 500-class config error (15 §2.4) |
| `vehicle` | `VehicleEntity` | `VehicleRepository` | `uk_vehicle_vin (dealer_id, vin)`. `status` only `IN_STOCK`/`SOLD`. Sell as a pair |
| `customer` | `CustomerEntity` | `CustomerRepository` | this-dealership isolation. Optimistic lock `version` |
| `customer_vehicle` | `CustomerVehicleEntity` | `CustomerVehicleRepository` | `uk_cv_vehicle` one vehicle one customer. No `version` column: link/unlink have no optimistic lock (14) |
| `listing` | `ListingEntity` | `ListingRepository` | `uk_listing_vehicle`. `title`/`body` Java non-null default `""` (15 §1) |
| `compliance_check` | `ComplianceCheckEntity` | `ComplianceCheckRepository` | `rule_findings` / `ai_notes` as JSON columns; element shape in 14 §8.1 |
| `audit_event` | `AuditEventEntity` | `AuditEventRepository` | `dealer_id` nullable (Admin create/bind) |

### 3.1 `listing.last_check_id` has no FK (15 §5)

SQL already has the column and **no** FK to `compliance_check` (avoids a cycle). **Do not** add a hard `@ManyToOne` FK on the entity, and do not suggest a V2 FK.

Application layer:

1. Same transaction: `INSERT compliance_check` first, then write the generated `id` back to `listing.last_check_id`.
2. May only point at a check **this listing itself inserted**. On read, if the row is missing or `check.listing_id` / `check.dealer_id` mismatch → **treat as no check**, not 500.
3. Incrementing `contentVersion` **must not clear** `last_check_id` (UI uses version compare to show Stale).
4. Clients **must not** PATCH `lastCheckId`.

### 3.2 `app_user.dealer_id` is not tenant authority (15 §2)

| Use | Use who |
|---|---|
| This-request isolation of `vehicle` / `customer` / `listing` / `audit` / assistant retrieval | **`membership.active=1` `dealer_id`** → `TenantContext.tenantDealerId` |
| `GET /me` `dealerId` / `dealerLegalName` | may read `app_user.dealer_id` (cache); if it disagrees with membership, **membership wins and is written back** (self-heal, not 500) |
| Admin | `app_user.dealer_id` **must be NULL**; do not join business tables with it |

**Forbidden:** `WHERE vehicle.dealer_id = app_user.dealer_id` without checking membership.

---

## 4. Application-service list (one paragraph per service)

Each service maps to a 14 endpoint group. Implementations cite paths only and copy JSON from 14.

### 4.1 `DealerAdminService`

- **Who:** `Platform.Admin` only. Staff hitting `/api/v1/admin/**` → `403 FORBIDDEN`.
- **Endpoints (14 §3):** `GET/POST /admin/dealers`, `GET/PATCH /admin/dealers/{id}`.
- **Duties:** create dealership (four contacts non-empty → 201); list includes derived `staffCount` (count of that dealership's **active memberships**); single-dealership read-only fill-back; PATCH four contacts + `active`, `version` required. No delete dealership.
- **Ignore** body.`id` / any `dealerId`. Dealership missing → 404.
- **Audit (optional):** `entityType=DEALER`, `dealerId` may be empty or that dealership.

### 4.2 `MembershipService`

- **Endpoints (14 §3.5–3.7):** `GET/POST /admin/dealers/{id}/members`, `DELETE .../members/{username}`.
- **Duties:** bind writes `membership` + `app_user` (display name, `role=Dealer.User`, `dealer_id` synced with membership). Already **active** at that dealership → `409 DUP_MEMBER`. Same username already active at **another dealership** → also `409 DUP_MEMBER` (15: only one active at a time). Binding an unbound same-row again → **reactivate**, do not insert a second row (hits `uk_membership`).
- **Unbind:** `membership.active=0`; `app_user.dealer_id=NULL`; **do not change** `app_user.role`; do not delete `app_user`. Business APIs then 403 (see section 5).
- **Audit:** `entityType=MEMBERSHIP`.

### 4.3 `VehicleService`

- **Endpoints (14 §4):** `GET/POST /vehicles`, `GET/PATCH /vehicles/{id}`, `POST /vehicles/{id}/sell`.
- **Duties:** list this dealership, `q`=VIN/make/model, `status`, `condition` (that is `conditionCode`), pagination envelope `{items,page,size,total}`, `page` from 0, `size` capped at 10. POST forces `IN_STOCK`, ignores client `dealerId`/`status`/`sold*`. VIN unique in this dealership → `400 VIN_DUP`.
- **Sold lock (15 §3):** PATCH purchase/identity fields → `409 SOLD_LOCKED`. Do not PATCH `status`/`soldOn`/`soldPrice`. Changing `conditionCode` when a listing exists → `contentVersion++` (purchase-cost-only change does not void the ad).
- **Sell:** `soldOn`+`soldPrice`+`version` as a pair; price `> 0`; sell again after sold → `409 SOLD_LOCKED`; missing either → `400 SOLD_PAIR_REQUIRED`. Do not delete `customer_vehicle`.
- **Audit:** `VEHICLE` / `CREATE` | `UPDATE` | `SELL`. Cross-dealership id → 404.

### 4.4 `CustomerService` (includes link + unlink)

- **Endpoints (14 §5–6):** `GET/POST /customers`, `GET/PATCH /customers/{id}`, `PUT /customers/{id}/vehicles/{vehicleId}`, `DELETE` same path → **204**.
- **Duties:** four fields required. List `q` + `linked`; list derived `linkedVehicle` (most recent `linkedAt` when many); detail `linkedVehicles[]`. Ignore `dealerId`.
- **PUT link:** customer and vehicle are **the same dealership** and equal `tenantDealerId`; not yet taken. Same-store `IN_STOCK` and `SOLD` vehicles may both be newly linked. `CustomerService.link` does not read `vehicle.status` and does not throw `WRONG_DEALER_OR_SOLD`. Already linked (including to this customer) → `409 VEHICLE_ALREADY_LINKED`. Cross-dealership id → **404**. One customer many vehicles allowed.
- **DELETE unlink:** in stock → hard-delete the association row (V1 has no soft-delete column); vehicle returns to unlinked; do not change `vehicle.status`. Sold → **409 `SOLD_LOCKED`** (sale record not erased). No association / cross-dealership → 404.
- **Audit:** `CUSTOMER` CREATE/UPDATE; `CUSTOMER_VEHICLE` LINK/UNLINK. `entityId` for link uses `customer_vehicle.id`; `fieldSummary` is only `{customerId,vehicleId}`, **no** full phone/email/address.

### 4.5 `ListingService`

- **Endpoints (14 §7, §8.3–8.4):** `GET/PATCH /vehicles/{id}/listing`, `POST /listings/{id}/ready`, `POST /listings/{id}/exports`.
- **Empty draft not persisted (15 §1):** when the vehicle has no `listing` row, GET **does not INSERT**; return a virtual draft (`id=null`, `title`/`body`=`""`, `adKind=CASH`, `medium=ONLINE`, `status=DRAFT`, `contentVersion=1`, `lastCheckId=null`, `version=0`). Shape is in 14 §7.1; this document does not reprint it.
- **First PATCH:** INSERT. Omitted or blank `title`/`body` write **`''`**, not JDBC `null`. May omit `version` or send `0`. Later requests must send the current `version`.
- PATCH increments `contentVersion` and returns `status` to `DRAFT`. If it was Passed, derived `checkStatus=STALE`; after Blocked, edited copy shows `NEEDS_AI` — **do not** mark Stale (14 §8).
- **Ready / Export:** only when the current check is **Passed and** `check.contentVersion == listing.contentVersion`. Otherwise `409 CHECK_STALE` or `NOT_PASSED`. Export: `200` `text/plain`; content = dealership public four fields + vehicle public fields (no cost) + title/body + check time; **do not write customers**.

### 4.6 `ComplianceCheckService`

- **Endpoints (14 §8.2):** `POST /listings/{id}/checks`, body `{version}` (listing optimistic lock).
- **Order locked:** this dealership + version → **`OmvicRuleEngine` (15 §6)** → if hard miss, **do not call AI** → persist `recommendation=BLOCKED`, `aiStatus=SKIPPED` → HTTP **200** (Blocked is not 4xx).
- No hard block: via `AiGatewayClient` call `POST /internal/v1/ad-check` (≤15s). Success and no new hard miss → `PASSED`/`SUCCESS`. Timeout/failure → still **persist** `UNAVAILABLE`, write back `last_check_id`, HTTP **502** `AI_UNAVAILABLE`. Never treat as Pass.
- Same transaction writes the check + `listing.last_check_id` (§3.1). Derived `checkStatus` uses `CheckStatusMapper` (14 five states).

### 4.7 `AuditService`

- **Endpoints (14 §9):** `GET /audit?entityType=&entityId=` (required), pagination optional.
- **Write:** called by DMS/CRM (and optional Admin) services. Record **who** (`actorUsername`) **did what** (`entityType`+`action`+`entityId`) **when** (`createdAt`).
- **Read:** staff this dealership only; entity not in this dealership → 404. Admin querying business entities → **403**, no `fieldSummary` business content. Staff cannot query `DEALER`/`MEMBERSHIP`.
- **Summary:** see section 8.

### 4.8 `AssistantService`

- **Endpoints (14 §10):** `POST /assistant/ask`, `{text}`. Empty text → `400 VALIDATION`. Admin → 403.
- **Duties:** read-only retrieve this dealership's vehicles/customers/listings; assemble at most 5 `resources` (no phone/email/address). Via Gateway `POST /internal/v1/assistant`. Model-returned ids **must** fall in this retrieval set; otherwise drop them.
- **Do not write** `vehicle` / `customer` / `listing` / `compliance_check`. The next AI call sends question + resources only. A three-turn cap, if kept, limits only what may be sent and is not a `ConcurrentHashMap` or deque. Per-user turns are not retained in memory, because that history is not sent and must not grow for the life of the JVM. It is **not persisted to business tables**.
- Model down: HTTP **200**, `summary=null`, `summaryAvailable=false`, `cards` still the retrieval list. Do not use 502 as if it were an ad-check failure.

### 4.9 Supporting types (not business services 5–8, but required)

| Class | Duty |
|---|---|
| `MeService` | 14 §2. Signed-in is enough. Staff with no membership still 200, `dealerId=null` |
| `OmvicRuleEngine` | pure function; input listing + vehicle public + dealership public; output hard/soft (15 §6). **Do not** use purchase cost as asking price |
| `AiGatewayClient` | see section 7 |
| `TenantFilter` / `TenantGuard` | see section 5 |

---

## 5. Tenant intercept

Every `/api/v1/**` (business paths other than `/me`) resolves tenant before the Controller. Order locked (15 §2 + §8):

1. Gateway already validated the JWT; **core validates again** (issuer/audience). Missing/bad JWT → `401 UNAUTHORIZED`.
2. `JwtRoleMapper`: `roles` contains `Platform.Admin` → Admin (**Admin wins**, even if `Dealer.User` is also present); `Dealer.User` only → staff; otherwise 403 except `/me`.
3. Find or lazily insert `app_user` by JWT `sub` (username) (display name may be written back). **Authorization compares the current JWT**; an expired `role` in the database cannot elevate.
4. Staff: load **exactly one** `membership.username=:username AND active=1`. `TenantContext.tenantDealerId = membership.dealer_id`. 0 rows → **403 `FORBIDDEN`** (signed in, no dealership, **not** 401/404). ≥2 rows → 500-class configuration error; reject business.
5. **Ignore** request-body / query / header `dealerId` (including invented `X-Dealer-Id`). Writes always use `tenantDealerId`.
6. Admin: do not set a business `tenantDealerId`; allow only `/api/v1/admin/**` and `/me`. Hitting `/vehicles` `/customers` `/listings/**` `/audit` (business entities) `/assistant` → **403 `FORBIDDEN`**, response has **no** vin/cost/customer or other business fields.
7. After loading a resource by path id: `resource.dealerId != tenantDealerId` → **404 `NOT_FOUND`** (anti-probing, not 403). Missing id in this dealership is also 404.

**Hibernate `tenantFilter`:** business tables (`vehicle`, `customer`, `customer_vehicle`, `listing`, `compliance_check`) declare filter `dealer_id = :tenantDealerId`, bound from `TenantContext` when a dealer-user JPA session/repository runs. Excluded: `app_user`, `membership`, `dealer` (identity / admin), and `audit_event` (nullable `dealer_id` for platform rows). Admin does **not** enable the filter and is still **403** on business APIs before repository access. `@Filter` does **not** cover `EntityManager.find` / Spring Data `findById` — keep `findByIdAndDealerId` (or `TenantGuard.assertSameDealer`) as a second line of defense. Inserts: `@PrePersist` listener sets `dealer_id` from context for dealer users (overwrites client values).

`GET /me`: membership not required; staff with no dealership get `dealerId`/`dealerLegalName` as `null`.

---

## 6. Exceptions → 14 error codes

`ApiExceptionHandler` always emits `{code,message}`; `400 VALIDATION` may add `fieldErrors`. Do not send SQL, stack traces, or raw model text outbound.

| Throw timing (inside core) | code | HTTP |
|---|---|---|
| Bean Validation / illegal enum / empty text | `VALIDATION` | 400 |
| This-dealership VIN hits `uk_vehicle_vin` or pre-check duplicate | `VIN_DUP` | 400 |
| sell missing `soldOn` or `soldPrice`; price ≤0 uses VALIDATION or this code (16: ≤0 → 400) | `SOLD_PAIR_REQUIRED` | 400 |
| PUT link does not throw this. `CustomerService.link` ignores vehicle status, so a same-store sold vehicle may be linked. Cross-store ids are `NOT_FOUND` (404). The enum stays on `ErrorCode` and has no production throw site. | `WRONG_DEALER_OR_SOLD` | 400 |
| Missing/bad JWT | `UNAUTHORIZED` | 401 |
| Role hitting the wrong prefix; staff 0 active memberships | `FORBIDDEN` | 403 |
| No id in this dealership / **cross-dealership id** / no association | `NOT_FOUND` | 404 |
| `version` ≠ current row | `VERSION_CONFLICT` | 409 |
| This dealership already has an active member; or this username is still active at another dealership | `DUP_MEMBER` | 409 |
| Vehicle already linked (including to this customer) | `VEHICLE_ALREADY_LINKED` | 409 |
| Sold purchase edit, sell again, **sold unlink** | `SOLD_LOCKED` | 409 |
| Ready/Export: previously passed but version incremented / lastCheck version ≠ listing | `CHECK_STALE` | 409 |
| Ready/Export: Blocked / Needs AI / UNAVAILABLE / no check | `NOT_PASSED` | 409 |
| Rules passed, AI timeout or failure (row already written) | `AI_UNAVAILABLE` | 502 |

Do not invent a 13th business code. Translate unique-key collisions into the table above; do not return raw `DataIntegrityViolation` text to the client.

---

## 7. core calls ai-service via Gateway

core **does not** treat a direct `8082` call as the product path; outbound hits Gateway internal routes (15 §7). The browser can never reach these two paths (Gateway without the internal header → **404**).

| Caller | Method | Path | When |
|---|---|---|---|
| `ComplianceCheckService` | POST | `/internal/v1/ad-check` | after fixed rules **hard is empty** |
| `AssistantService` | POST | `/internal/v1/assistant` | after this-dealership `resources` are assembled |

`AiGatewayClient`:

1. Base URL = Gateway (local `http://localhost:8080`, cloud `GATEWAY_BASE_URL`), **not** the browser origin.
2. Request header **`X-Dealer-Internal: <INTERNAL_TOKEN>`** (env / Key Vault). **Do not** forward the user JWT to ai-service.
3. Body field names match 14 §11: `listing` + `vehiclePublic` (year/make/model/vin/condition/source, **no** purchase/repair/sold price) + `dealerPublic` (dealership name + three contacts). Assistant: `question` + filtered `resources`.
4. Adapter timeout **≤15s** (handbook; set connect/response yourself).
5. **Blocked: `OmvicRuleEngine` already returned hard → the method returns immediately, Client makes zero calls.** (16 BE-09)
6. AI failure/timeout: check path **502 + persist UNAVAILABLE** (14 §8.2); assistant path **200** + `summaryAvailable=false` (14 §10). If persist fails, the database wins; check again next time (15 §5).

core **does not** hold `AIMANAGER_API_KEY`. Do not embed the ai-manager JAR.

---

## 8. Audit: who / did what / when

Every DMS/CRM write (and optional Admin create/bind) inserts one `audit_event` row:

| Column | Meaning |
|---|---|
| `actor_username` | **who**: JWT `sub` (the username) |
| `entity_type` + `action` + `entity_id` | **did what** |
| `created_at` | **when** |
| `dealer_id` | staff = this dealership; Admin may be empty |
| `field_summary` | JSON summary, **do not write** full customer `phone` / `email` / `homeAddress` |

Allowed `entity_type` / `action` match 14 §9: `VEHICLE|CUSTOMER|CUSTOMER_VEHICLE` × `CREATE|UPDATE|SELL|LINK|UNLINK`; Admin may also use `DEALER`/`MEMBERSHIP`.

Summaries record only ids, enums, field-name booleans for the contact fields that actually changed (for example `{"name":true,"phone":true}`), or link `{customerId,vehicleId}`. The only contact keys are `name`, `email`, `phone`, and `homeAddress`, and each value is `true`. Changing a customer phone still records `UPDATE`, but **do not** put the new number, email, or address in the JSON.

---

## 9. Suggested test classes ↔ 16 BE-xx

Class names only; **do not write test code**. The implementation group lands [16](16-Acceptance-and-Test.md) §3 as JUnit. Paths/codes still follow 14.

| Test class | Maps to |
|---|---|
| `CrossTenantIsolationIT` | **BE-01** cross-dealership 404 |
| `NoMembershipForbiddenIT` | **BE-02** no membership → business 403; `GET /me` still 200 |
| `SoldLockedIT` | **BE-03** sold locks purchase |
| `VinDuplicateIT` | **BE-04** VIN duplicate in this dealership |
| `CustomerVehicleLinkIT` | **BE-05** three link branches |
| `SoldUnlinkLockedIT` | **BE-06** sold cannot unlink; in-stock 204 |
| `CheckStaleIT` | **BE-07** Ready/Export `CHECK_STALE` |
| `AiUnavailableIT` | **BE-08** 502 + already persisted UNAVAILABLE |
| `BlockedSkipsAiIT` | **BE-09** 200 BLOCKED / SKIPPED; do not call `/internal/v1/ad-check` |
| `ReadyExportGuardIT` | **BE-10** not Passed / not current version → 409; qualified export `text/plain` |
| `AuditNoPiiIT` | **BE-11** summary has no full phone/email/address |
| `AssistantAskIT` | **BE-12** ≤5 cards, read-only, Admin 403, model down still 200 |
| `AdminForbiddenOnBusinessIT` | **BE-13** Admin hitting business URLs has no business fields |
| `CoreNotPublicIT` | **BE-14** no browser CORS; product entry is not 8081 (config assertion is enough) |
| `SellPairRequiredIT` | **BE-15** sell as a pair |
| `IgnoreClientDealerIdIT` | **BE-16** body/query/header spoofing another dealership still writes this dealership |
| `OmvicRuleEngineTest` | 15 §6 unit: empty draft / missing price / FINANCE missing APR → hard; AI allowed only when no hard |
| `TenantFilterTest` | JWT + membership; ignore client `dealerId` |
| `ApiExceptionHandlerTest` | section 6 mapping table |
| `MeServiceTest` | `/me` fields for Admin / staff with a dealership / unbound staff |

CI: this repo's JUnit + compile. **Do not** hit a real paid model (AI tests use stub / WireMock Gateway).

---

## 10. core is not open to the browser

Align 15 §10 / 08: browser-to-service HTTP **only** goes through Gateway `8080` (cloud is Gateway HTTPS).

| Item | Requirement |
|---|---|
| Listen | bind **8081** only (`CORE_PORT`), on `127.0.0.1` locally (`SERVER_ADDRESS`). Azure: App Service access restrictions deny every caller but Azure-internal ones |
| CORS | **do not** configure `http://localhost:5173`. Direct `fetch(8081)` must be blocked by the browser |
| Routes | implement `/api/v1/**` business only. Do not implement `/internal/v1/**` for the browser |
| Outbound | AI calls add the internal header only; see section 7 |
| Demo | Gateway + user JWT `/api/v1/**` is the product entry. If `curl 127.0.0.1:8081` still works locally, that only proves "no CORS / no public net" and **cannot** be treated as a public API |

---

## 11. Coding order (handbook tasks, still no code)

Suggested order after the team splits files from the directory (BRIEF §11 tasks 3–9, 11–13):

1. Entities / enums / Flyway start V1  
2. Security + `TenantFilter` + `GET /me`  
3. `DealerAdmin` + `Membership`  
4. `Vehicle` + audit  
5. `Customer` (PUT + DELETE) + audit  
6. `Listing` empty draft + `OmvicRuleEngine` (no AI call)  
7. `ComplianceCheck` + `AiGatewayClient`  
8. Ready / Export  
9. `Assistant`  

Do not bring retired `01`–`06` tickets/leads/password tables into this repo.
