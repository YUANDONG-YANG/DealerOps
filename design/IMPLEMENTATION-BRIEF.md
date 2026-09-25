# Dealer Ops implementation brief (for AI coding)

Version 1.8 · 2026-09-23  
Conflict priority: **PPT > specification fields > [DEVELOPMENT-DESIGN.md](DEVELOPMENT-DESIGN.md) / [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) > 14 / 15 > task lists**. `16` / `17` are acceptance cases and ad fixtures and **do not change contracts**. `01`–`06` remain withdrawn (see [archive/](archive/)); do not read them as requirements.

Source design: sibling checkout named `DealerOS-Design`  
Implementation skeleton: this repository

This repository already contains four apps (`dealer-web`, `dealer-gateway`, `dealer-core`, `ai-service`) plus `dealer-platform` (compose, OpenAPI, Bicep/pipeline notes). Each app has source, a build file (`pom.xml` / `package.json`), and a Dockerfile. Platform Compose wires MySQL and the three Java services. Do not scaffold these projects again.

### Coding-AI reading order

1. **[SCOPE-BASELINE.md](SCOPE-BASELINE.md)** (human-approved scope)
2. **Backend design document** [DEVELOPMENT-DESIGN.md](DEVELOPMENT-DESIGN.md) (scope, phases, invariants)
3. **Public HTTP/DTOs** against **14** + [`../dealer-platform/openapi.yaml`](../dealer-platform/openapi.yaml)
4. **Internal protocol/rule details** [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md)
5. **Packaging** in **18** / **19**; execute **[AI-CODING-BACKEND.md](AI-CODING-BACKEND.md)** per repo
6. **Frontend** remains **[13-Frontend-Engineering.md](13-Frontend-Engineering.md)** + **[AI-CODING-FRONTEND.md](AI-CODING-FRONTEND.md)**
7. Start / cloud **[AI-CODING-LOCAL-AND-CLOUD.md](AI-CODING-LOCAL-AND-CLOUD.md)**
8. Tests **[AI-CODING-TESTS.md](AI-CODING-TESTS.md)** + **16** / **17**

Conflict order: **PPT > specification fields > DEVELOPMENT-DESIGN / PROTOCOL > 14/15 > task lists**.

**Internal AI bodies (pinned):** PROTOCOL §B. Success `{success, notes[]}` / `{success, summary}`; failure `{success:false, code, message}` (**504** `AI_TIMEOUT` / **503** `AI_KEY_MISSING` / **502** `AI_PROVIDER_FAILED`). Core check path is still public **502** `AI_UNAVAILABLE`. OpenAPI **public** paths still follow 14.

### Document map (human / full design)

1. Before start, give the instructor: **[SCOPE-BASELINE.md](SCOPE-BASELINE.md)** (one-page scope sign-off)
2. **This brief** (scope, fields, task order) → `00` (six pages)
3. **[13-Frontend-Engineering.md](13-Frontend-Engineering.md)**: frontend file split, routes, page↔API (frontend still follows 13 + `AI-CODING-FRONTEND`)
4. Backend design document: **[DEVELOPMENT-DESIGN.md](DEVELOPMENT-DESIGN.md)** (scope, phases, invariants). Public HTTP/DTOs still follow **14** + OpenAPI; internal protocol/rule details **PROTOCOL**; packaging **18** / **19**.
5. Acceptance / NN-19: **[16-Acceptance-and-Test.md](16-Acceptance-and-Test.md)** (32 cases + 6 classroom scripts; does not change contracts)
6. Ad-check fixtures: **[17-Ad-Check-Fixtures.md](17-Ad-Check-Fixtures.md)** (demo FX-01 / FX-03 / FX-10 / FX-11 / FX-12)
7. `12` UI look; architecture/Sprint/AI in `07`–`11`

### 13/14/15 ruling pointers (not pinned in this brief)

- Pagination envelope `{items,page,size,total}`, `page` from 0; full JSON / assistant `{summary,summaryAvailable,cards}` in **14**.
- Unlink: `DELETE /customers/{id}/vehicles/{vehicleId}` → **204**. Sold vehicles cannot be newly linked (`400 WRONG_DEALER_OR_SOLD`) or unlinked (`409 SOLD_LOCKED`). **15** owns behavior, **14** owns HTTP.
- GET listing with no row: **do not persist**, virtual empty draft; first PATCH uses `''` to satisfy NOT NULL (**15**).
- Tenant authority is `membership.active=1`; ignore client `dealerId`; cross-dealership **404**; staff without a valid membership calling business APIs → **403** `FORBIDDEN` (not 401/404).
- `/me` includes `dealerLegalName`; Admin list includes `staffCount`. `SOLD_LOCKED` is always **409**.

---

## 1. One-sentence product + hard constraints

A multi-tenant back office for independent dealers: each dealership has its own DMS/CRM/ad data; platform admins only open dealerships and bind staff.

| Item | Must |
|---|---|
| Languages | Backend **Java 21** (may align with ai-manager on 17, but the four course repos share one version; prefer 21). Frontend **Vue 3 + Element Plus + MSAL.js**. UI in English. |
| Repositories | **Four independent application repos**: `dealer-web`, `dealer-gateway`, `dealer-core`, `ai-service`. Plus `dealer-platform` for Bicep/compose/pipeline notes. Ban a monorepo. |
| Entry | Browser-to-service HTTP **only through Spring Cloud Gateway**. core / ai-service are not public. Bypassing Gateway must fail. |
| Identity | **Microsoft Entra ID** OAuth/OIDC + PKCE + JWT. Roles only `Platform.Admin`, `Dealer.User`. Do not build a password table. Admin “issues an account” = bind `entra_oid` → `dealer_id` (unbind = soft deactivate). Spec PDF username/password is **superseded** — see [SCOPE-BASELINE.md](SCOPE-BASELINE.md) errata. **Authoritative design:** [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8 (product surface, JWT mapping, classroom SPA/API registration, `JWT_MODE` / `VITE_ENTRA_*` / `ENTRA_*`). |
| Data | **One MySQL** database `dealer_core`. Flyway owns tables. The AI service has no database. |
| AI | `ai-service` embeds `YUANDONG-YANG/ai-manager` **in-process**. Synchronous REST. The adapter guarantees a **15s** timeout. |
| Calls | Synchronous REST. |

The specification PDF describes username/password; **PPT forbids homemade auth**, so Entra wins. The specification has no Assistant page; **PPT requires a real-AI core feature**, so build the read-only assistant per v6/10/12.

---

## 2. Page and role matrix

| Page | Role | What they do | Landing |
|---|---|---|---|
| Login | Everyone | Only `Sign in with Microsoft`; no sidebar, no password box | `/login` (sole sign-in page) |
| Admin | Platform.Admin only | Open dealerships; bind/unbind staff. **Zero** vehicle/customer/ad data | After sign-in → `/admin` |
| DMS | Dealer.User only | This-dealership vehicle create/update/read; paired sale | After sign-in with `dealerId` → `/dms` |
| CRM | Dealer.User only | This-dealership customer create/update/read; link this-store in-stock unbound vehicles | — |
| Ad compliance | Dealer.User only | Pick a vehicle, write an ad, rules+AI, export TXT after pass | — |
| Assistant | Dealer.User only | This-dealership read-only Q&A, at most 5 resource cards | — |
| No access | Signed in, unbound / no business role | Shell with Sign out only; no business tables | `/` (not a third App Role) |

Multiple staff at one dealership see the same data. Dealership A cannot see dealership B. After opening a store, admin still cannot see business data. No KPI home page. Unauthorized routes are blocked directly. Classroom bind + isolation demos: [16-Acceptance-and-Test.md](16-Acceptance-and-Test.md) **CL-1** / **CL-2**. Full Entra classroom wiring: [15](15-Data-Auth-and-Gateway.md) §8.4.

---

## 3. Complete fields and enums

**Do not add or remove fields.** No mileage / color / fuel / buyer public page.

### Dealership `dealer`

`legalName*` `contactPhone*` `contactEmail*` `contactAddress*` `active` `version`

Ad “dealership name and contacts” use these four public fields; do not create another profile table.

### Users and members

`app_user`: `entraTenantId` `entraOid` `displayName` `role`=`Platform.Admin`\|`Dealer.User` `dealerId` (null for Admin) `active`  
`membership`: `dealerId` `entraOid` `active` `createdBy`  
Each staff request: JWT role + local membership. **Ignore any dealership ID sent by the frontend.**

### Vehicle DMS (specification required/optional)

Required: `make` `model` `modelYear` `vin` `source` `purchaseCost` `addedOn` `conditionCode`  
Optional: `repairCost` `carfaxUrl` `soldOn` `soldPrice`  
Derived: `status`=`IN_STOCK`\|`SOLD` `version` `dealerId`

| Enum | Values |
|---|---|
| `source` | `TRADE_IN` `AUCTION` `PRIVATE_PURCHASE` `OTHER` |
| `conditionCode` | `CERTIFIED` `AS_IS` `UNFIT` `IRREPARABLE` |

Rules: VIN unique per dealership. After sale, **purchase fields cannot change** (make/model/year/vin/source/purchaseCost/addedOn/repairCost/carfax). `soldOn` and `soldPrice` **must be filled together**. Selling sets `status` to `SOLD`.

### Customer CRM

Required: `name` `email` `phone` `homeAddress`  
Purchase link: `customer_vehicle(customerId, vehicleId)`; a vehicle is **globally unique to one customer**. Link only vehicles that are **this dealership + IN_STOCK + unbound**. One customer may have many vehicles.

### Ad listing (one per vehicle)

`title*` `body*` `adKind`=`CASH`\|`FINANCE`\|`LEASE` `medium`=`ONLINE`\|`RADIO_TV_BILLBOARD`  
`status`=`DRAFT`\|`READY` `contentVersion` `lastCheckId` `version`

OMVIC **checks look in ad copy + known vehicle/dealership fields**; do not add APR/term columns. Missing items Block or let AI mark them missing.

**Always check:** dealership name and contacts; prior use (if applicable: police/taxi/daily rental, etc., whether the copy discloses it); new/used/year (`modelYear` + copy); extended warranty (if the copy claims one); price; condition (`conditionCode`).  
**FINANCE additionally:** APR, term, cash price. `RADIO_TV_BILLBOARD` **is exempt** from “shown next to the rate.”  
**LEASE additionally:** lease statement, term, rent, APR, down payment; annual allowance under 20000 km needs excess-km fees (whether the copy states allowance/fees).

Changing vehicle **price-related public information or condition**, or changing ad title/body/kind/medium → `contentVersion++`, old check becomes Stale. There is no “public list price” column: condition change or listing change invalidates. Purchase-cost change is not by itself an ad-invalidation condition (sold purchase fields are already locked).

### Check `compliance_check`

`contentVersion` `ruleFindings` (JSON array) `aiStatus` `aiNotes` (JSON) `recommendation`

| Field | Values |
|---|---|
| `aiStatus` | `SKIPPED` `SUCCESS` `FAILED` `UNAVAILABLE` |
| `recommendation` | `BLOCKED` `NEEDS_AI` `PASSED` `UNAVAILABLE` |

### Audit `audit_event` (every DMS/CRM change)

`actorOid` `entityType`=`VEHICLE`\|`CUSTOMER`\|`CUSTOMER_VEHICLE` `entityId` `action`=`CREATE`\|`UPDATE`\|`SELL`\|`LINK`\|`UNLINK` `fieldSummary` (JSON, **do not** write full customer phone/email/address) `createdAt`  
Admin actions may record `DEALER`/`MEMBERSHIP`; `dealerId` may be null.

---

## 4. Table list (aligned with Flyway)

Follow the skeleton; **do not invent another table set**:

`dealer-core/src/main/resources/db/migration/V1__init.sql`

| Table | Purpose |
|---|---|
| `dealer` | Dealership |
| `app_user` | Entra user cache + role |
| `membership` | Staff binding |
| `vehicle` | DMS |
| `customer` | CRM |
| `customer_vehicle` | One vehicle, one customer `uk_cv_vehicle` |
| `listing` | One ad per vehicle `uk_listing_vehicle` |
| `compliance_check` | Check snapshot |
| `audit_event` | Audit |

Gaps (fill with entities/validation while coding; do not change SQL if possible; if unavoidable, use `V2__*.sql`):

- `vehicle.status` allows only `IN_STOCK`/`SOLD`.
- `listing` has no FK on `last_check_id` (the column exists in SQL without an FK) — application-layer maintenance is enough.
- No “prior use / warranty / APR” columns — that is correct.
- Indexes: `vehicle(dealer_id,status)`, `customer(dealer_id)` may be added in V2; they do not block start.

Flyway only; ban `ddl-auto=update`.

---

## 5. API list

The browser only hits Gateway `http://localhost:8080`, prefix `/api/v1`. core=`8081`, ai-service=`8082`; the browser must not call them directly.

Unified error body: `{"code":"VIN_DUP","message":"..."}`. Cross-dealership id → **404** (not 403; anti-probing). Admin hitting business URLs → **403** `FORBIDDEN`, response has no business fields. Staff without a valid membership → **403**. Optimistic lock: writes carry `version`, conflict `409 VERSION_CONFLICT`. JSON shapes in **14**.

| Method | Path | Who | Key checks | Error codes |
|---|---|---|---|---|
| GET | `/me` | Signed in | Returns `role`, `dealerId` (empty for Admin) | 401 |
| GET | `/admin/dealers` | Admin | — | 403 |
| POST | `/admin/dealers` | Admin | Four contact fields required | 400 VALIDATION |
| GET | `/admin/dealers/{id}/members` | Admin | — | 404 |
| POST | `/admin/dealers/{id}/members` | Admin | `{entraOid,displayName}`; write `membership`+`app_user` | 400 409 DUP_MEMBER |
| DELETE | `/admin/dealers/{id}/members/{entraOid}` | Admin | Unbind; do not delete the Entra account | 404 |
| GET | `/vehicles` | Staff | This dealership; query `q`(VIN/Make/Model) `status` `condition`; page size 10 | 403 |
| POST | `/vehicles` | Staff | Required fields; VIN unique in this dealership | 400 VIN_DUP |
| GET/PATCH | `/vehicles/{id}` | Staff | Sold forbids changing purchase fields | 404; `409 SOLD_LOCKED` |
| POST | `/vehicles/{id}/sell` | Staff | `{soldOn,soldPrice,version}` as a pair | 400 SOLD_PAIR_REQUIRED |
| GET | `/customers` | Staff | `q` + `linked` whether a vehicle is linked | 403 |
| POST | `/customers` | Staff | Four fields | 400 |
| GET/PATCH | `/customers/{id}` | Staff | This dealership | 404 |
| PUT | `/customers/{id}/vehicles/{vehicleId}` | Staff | Same store, not sold, not linked; sold cannot be newly linked | 409 VEHICLE_ALREADY_LINKED 400 WRONG_DEALER_OR_SOLD |
| DELETE | `/customers/{id}/vehicles/{vehicleId}` | Staff | Unlink → 204; sold cannot be unlinked | 404; `409 SOLD_LOCKED` |
| GET/PATCH | `/vehicles/{id}/listing` | Staff | GET with no row = virtual empty draft, not persisted; first PATCH uses `''` | 404 |
| POST | `/listings/{id}/checks` | Staff | This dealership + version; rules then AI; wait at most 15s | 404 409 502 AI_UNAVAILABLE |
| POST | `/listings/{id}/ready` | Staff | Only current check Passed and not Stale | 409 CHECK_STALE / NOT_PASSED |
| POST | `/listings/{id}/exports` | Staff | Same; `text/plain` TXT | 409 CHECK_STALE / NOT_PASSED |
| GET | `/audit?entityType=&entityId=` | Staff | This dealership only; Admin does not get business entities | 404 |
| POST | `/assistant/ask` | Staff | `{text}`; do not write business tables | 403 |

**Internal only (Gateway → ai-service; browser 404):**

| Method | Path | Caller | Body |
|---|---|---|---|
| POST | `/internal/v1/ad-check` | core via Gateway | `{listing,vehiclePublic,dealerPublic}` |
| POST | `/internal/v1/assistant` | core via Gateway | `{question,resources[]}` |

`vehiclePublic`: year/make/model/vin/condition/source, **no** purchase cost. `dealerPublic`: legal name + three contacts. Assistant `resources` are already filtered by core; no phone/email/address. Internal success/failure JSON **follows PROTOCOL** (see “Internal AI bodies” above).

---

## 6. Ad-check state machine + ai-manager

Page overall status **allows only** these five (English UI):

| UI | Server condition |
|---|---|
| **Blocked** | Fixed checklist has a hard miss (e.g. no price, FINANCE no APR) → `recommendation=BLOCKED`, `aiStatus=SKIPPED`, **do not call the model** |
| **Needs AI review** | Rules have no hard block; no successful AI yet, or a check was just submitted |
| **Passed** | Latest check `PASSED` and `check.contentVersion == listing.contentVersion` |
| **Stale** | Previously passed, but version has increased (ad or condition changed) |
| **AI unavailable** | Rules passed but AI timed out/failed → `UNAVAILABLE`, **must not treat as Pass** |

Ready / Export TXT only when **Passed and not Stale**. TXT content = dealership public info + vehicle public fields + title/body + check time; no cost/customer.

```
Staff POST /listings/{id}/checks
  → core validates this dealership + version
  → run the fixed checklist
  → if no hard block, core POSTs /internal/v1/ad-check via Gateway (≤15s)
  → write compliance_check, write back listing.last_check_id
  → failure: UNAVAILABLE; buttons cannot Pass
```

### Wiring ai-manager (verified)

- Repo: https://github.com/YUANDONG-YANG/ai-manager (private)  
- Pinned commit: `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a`  
- Maven: `com.aimanager:aimanager:1.0.0-SNAPSHOT` → **at implementation time, publish an immutable version from that commit and depend on it**  
- Package: GitHub Packages `https://maven.pkg.github.com/YUANDONG-YANG/ai-manager`  
- API: `com.manager.AiManager`: `request(String)`, `startConversation(id, systemMessage)`, `closeConversation`  
- Providers: groq / openai / claude / deepseek. **No mock provider.**

The adapter only:

1. Ads: `startConversation`, system=OMVIC checklist, user=ad JSON; `finally` `closeConversation`. Check `AIResponse.isSuccess()` before parsing content.  
2. Assistant: start a short conversation; accept only filtered this-dealership resources.

**Ban:** scanning/exposing `com.gateway` (`/api/ai/request` `/chat` `/credentials` `/runtime`); starting `AIApplication`; giving the component its own container; CI hitting paid endpoints (CI uses a stub).  
Key: `AIMANAGER_API_KEY` on ai-service only (environment / Key Vault). The library OpenAI path has no 15s guarantee → **the adapter sets its own connect/response timeouts**. Turn off the library rate-limit queue.

---

## 7. Frontend UI convention summary

- Stack: Vue 3 + **Element Plus**. English. 6 pages. Do not fork an entire dealer repo.  
- Login: centered single card, one Microsoft button.  
- Others: left menu + top bar (dealership name or `Platform Admin`, role, `Sign out`). Admin sees only Admin; staff see only DMS/CRM/Ad/Assistant.  
- Primary button top-right; sell/unlink require a second confirmation.  
- **Every page must** have loading / empty / error. Failures are not empty tables. AI failure cannot show Pass.  
- Tables: 10 rows per page. Status uses Tag. Actions column at most 3 text links. Sold rows fade; purchase fields read-only.  
- Filters in one row: search + 1–3 dropdowns + Search + Reset. No price sliders/maps.  
  - DMS: VIN/Make/Model; Status; Condition  
  - CRM: Name/Email/Phone; whether linked  
  - Admin: dealership name / staff email  
- Forms: drawer or Dialog; enums as Select. Sell dialog: Sold date + Sold price. CRM link: searchable Select, only this-store unbound in-stock; already taken disabled.  

**Table columns**

| Page | Columns |
|---|---|
| Admin dealerships | Name, Contact, Staff count, Actions |
| Admin members | Entra ID / email, Dealership, Status, Actions |
| DMS | Year Make Model, VIN, Source, Condition, Cost, Status, Actions |
| CRM | Name, Email, Phone, Linked vehicle, Actions |
| Ad | Vehicle, Type, Medium, Check status, Actions |

**Ad page:** form left, results right; checklist changes immediately with CASH/FINANCE/LEASE and medium.  
**Assistant:** one Q&A + at most 5 this-dealership resource cards (open a normal page). Cards have no phone/email/address. If the model is down, still show the retrieval list + `Smart summary unavailable`.

---

## 8. Five repositories, duties, Sprint done definitions

| Directory | Tech | Who | Duty |
|---|---|---|---|
| `dealer-web` | Vue3 + MSAL + Dockerfile + its own pipeline | **A** | 6 pages, sign-in, web pipeline |
| `dealer-gateway` | Spring Cloud Gateway + Dockerfile + pipeline | **C** (A reviews) | Route/verify JWT and forward only; block `/internal` from the browser |
| `dealer-core` | Boot + Flyway + one database + Dockerfile + pipeline | **C** | Tenant isolation, business API, call AI |
| `ai-service` | Boot, no database + embedded JAR + Dockerfile + pipeline | **B** | Adapter, OMVIC checklist copy, real model, ai pipeline can pull the private package |
| `dealer-platform` | Bicep, compose, pipeline YAML notes | **B** first draft / all certify | Does not run business code |

Team members A/B/C **names are still missing**; write cards by role for now.

**Sprint 1 (Review 1)**  
Four empty repos build independently; explain the 07 architecture diagram; Entra two roles configured; direct core fails, traffic only through Gateway. Maps to NN-01–03.

**Sprint 2 (Review 2)**  
On Azure: sign-in → Gateway → record one vehicle → **real AI** scans an ad. No plaintext secrets; HTTPS; Key Vault. NN-04–11, NN-15. Local-only demos do not count in class.

**Sprint 3 (Review 3)**  
Two-dealership isolation; CRM link; three ad-kind checklists; export; audit; Assistant. Feature freeze. NN-12–14, 16–20. Board + 1–2 post-class segments + each of three people presents evidence (NN-21–24, throughout).

Demo release needs a second-person approval. Do not publish apps by hand in the portal. Only the changed repo builds.

---

## 9. Environment variables

Copied from `dealer-platform/env.example`; split by repo while coding; **do not commit real values**.

| Variable | Who | Notes |
|---|---|---|
| `VITE_ENTRA_TENANT_ID` | web | |
| `VITE_ENTRA_CLIENT_ID` | web | SPA; no client secret |
| `VITE_ENTRA_API_SCOPE` | web | Default `api://dealer-api/access_as_user` |
| `VITE_GATEWAY_URL` | web | `http://localhost:8080` |
| `GATEWAY_PORT` | gateway | `8080` |
| `CORE_URL` | gateway | Local compose uses `http://host.docker.internal:8081` |
| `AI_URL` | gateway | `http://host.docker.internal:8082` |
| `CORE_PORT` | core | `8081` |
| `MYSQL_URL` | core | `jdbc:mysql://localhost:3306/dealer_core?...` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | core | Local sample `dealer` / `dealer_dev_only` |
| `AI_PORT` | ai | `8082` |
| `AIMANAGER_API_KEY` | **ai-service only** | Real key, in Key Vault |
| `AIMANAGER_GATEWAY_PROVIDER` | ai | `openai` and other providers the library already supports |
| `AIMANAGER_GATEWAY_MODEL` | ai | |
| `JWT_MODE` | gateway+core | `entra` for real Entra JWKS; `dev` for local HS256 ITs |
| `ENTRA_ISSUER` | gateway+core | `https://login.microsoftonline.com/<tenant>/v2.0` |
| `ENTRA_AUDIENCE` | gateway+core | `api://dealer-api` |

Classroom SPA + API registration and App Role assignment: [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8.4 (ops mirror: [README.md](../README.md) § Classroom Entra). Do not paste subscription passwords, secrets, or model-key bodies in chat.

---

## 10. Explicitly forbidden implementations

- Buyer site / public inventory site / OEM portal  
- Work orders, lead funnel, test drives, KPI dashboards, CSV import  
- Service Bus, outbox, DLQ, message queues, second database, vector store  
- Third-party auto-listing, payments, Image Studio, Cloudinary  
- Homemade model SDK / conversation engine; deploying ai-manager `com.gateway` or a fifth container  
- Homemade username/password, treating passwords as “simpler”  
- C#, standalone contracts repo, reviving `01`–`06` scope  
- Treating reference repos `references/carventory` and `car-dealer-crm` as running modules (you may study UX; do not copy buyer/work-order/PostgreSQL/password login)  
- CI hitting real paid models; treating SNAPSHOT as a release number without a pinned commit  
- Frontend sending `dealerId` as authority; Admin joining vehicles/customers  

---

## 11. Coding order (small tasks)

Each step can be its own PR. Do not jump to a “full frontend” before prior steps are done.

**Note:** This brief’s “empty repo” coding order is **historical**. The four apps and platform already exist in this checkout — agents must **not** re-scaffold them. Status below is only for tasks proven by present source/CI/compose; unmarked rows are not claimed done.

| # | Repo | Task | Status | Done when |
|---|---|---|---|---|
| 1 | Local machine | Raise JDK 17/21, set `JAVA_HOME` | | `java -version` is 17 or 21 |
| 2 | web/gateway/core/ai four repos | Empty projects + Dockerfile + `mvn/npm` builds | **done** | Each repo CI green (compile is enough) |
| 3 | core | Wire existing `V1__init.sql`, entities and enums | **done** | Flyway can create tables on an empty database; no extra business columns |
| 4 | gateway | Route `/api/v1/**`→core, `/internal/v1/**`→ai; reject browser internal; reject direct-access demo | **done** | 8080 works; 8081 fails for the browser |
| 5 | gateway+core | Entra JWT + two roles; `GET /me` | **done** | No token 401; fake dealerId has no effect |
| 6 | core | Admin open dealership / bind staff | **done** | Two stores and two staff can be verified in the database |
| 7 | core | Vehicle CRUD + sell + audit | **done** | VIN unique; sold locks purchase; sale as a pair; `audit_event` exists |
| 8 | core | Customers + link + audit | **done** | Cross-dealership 404; one vehicle one customer 409 |
| 9 | core | listing PATCH + **fixed rule engine** (no AI call) | **done** | Missing price / FINANCE missing APR → Blocked |
| 10 | ai-service | In-process AiManager adapter + 15s timeout + stub tests | **done** | Do not expose `com.gateway`; CI does not hit a real model |
| 11 | core+ai | `POST .../checks` via Gateway; failure UNAVAILABLE | **done** | After condition change, old check is Stale |
| 12 | core | ready + export TXT | **done** | Reject if not Passed or Stale |
| 13 | core+ai | `POST /assistant/ask`: at most 5, verify this-store IDs, no DB write | **done** | Invented paths discarded; model down returns list only |
| 14 | web | 6 pages per section 7; login routing | **done** | Admin cannot see DMS; empty/error/loading complete |
| 15 | platform | compose starts MySQL+four services; fill Bicep/pipeline after Azure permissions | **done** (local compose) | Local can record a vehicle end to end; cloud is a Sprint 2 item |

---

## 12. Pre-start blockers (real local gaps)

**Do not pretend these already exist.** Source: `PREP-CHECKLIST.md`.

| Item | Current | Who is blocked |
|---|---|---|
| JDK 17/21 | **Missing**; local JDK 11; Boot 3 will not compile | All Java repos |
| Docker Desktop | **Missing** | Local MySQL container, image builds |
| Team A/B/C names | **Missing** | Assignment cards, Review signatures |
| Azure subscription | **Missing** | Sprint 2 cloud demo (Container Apps, MySQL, ACR, Key Vault) |
| Entra permissions | **Missing** | Sign-in, two roles, bind users — [15](15-Data-Auth-and-Gateway.md) §8.4 |
| Model key | **Missing** | Sprint 2 real AI (`AIMANAGER_API_KEY`) |
| ai-manager fixed version | **Unpublished** | Publish an immutable version from `c07e1f2`, or local `mvn install` |

Already have: specification PDF, PPT, this brief, `SCOPE-BASELINE`, backend design **DEVELOPMENT-DESIGN**, **13/14/15**, packaging 18/19, acceptance 16, ad fixtures 17, Node 20, Maven 3.6, Git, `gh` signed in as `YUANDONG-YANG`, Flyway V1, API/env drafts.

Before Sprint 1, also preferably: two staff Entra accounts + one admin; callback `http://localhost:5173`; choose Azure DevOps or GitHub Actions; budget cap (MySQL + Container Apps bill continuously).

**Can write now without cloud:** tasks 2–9, task 10 stub, task 14 static pages. Skip task 1 and Java will not compile. Task 5 may use a test JWT, but Sprint 2 must switch to real Entra.

---

## Classroom acceptance checklist (can click in class)

1. Admin opens two dealerships and binds one person each.  
2. Dealership A records a vehicle, a customer, and a link; dealership B cannot see them.  
3. Admin hitting vehicle APIs is rejected with no fields.  
4. Missing price or finance missing APR → Blocked.  
5. Real ad copy goes through real AI once and can point out gaps.  
6. After changing price/condition/copy, the old check cannot be used to export.

Course six hard items: independent repos+pipelines; Gateway; Azure+containers+Bicep+CI/CD; Entra+JWT+RBAC+HTTPS+Key Vault; real model scanning ads; Scrum board and three all-hands Reviews.
