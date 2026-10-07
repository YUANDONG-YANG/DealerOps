# DealerOps backend design

## Development phase: no test authoring

**Development is not complete. Do not write TEST code until the user confirms feature development is complete and explicitly authorizes test work.**

- Do not create, expand, modify, or refactor unit, integration, or end-to-end tests, empty test skeletons, assertions, test fixtures, mocks, or test-only helpers/configuration. This includes fixes made only to get existing tests to compile or pass.
- Requests to review requirements, inspect code, fix features, build, commit, or push do not authorize test authoring. Do not infer development completion from a successful build or existing coverage.
- Use source review, compilation/builds, and manual feature checks as appropriate. Running existing tests does not authorize editing them; obey any separate restriction on running tests. Report test failures without changing test code during development.
- Test-writing instructions elsewhere in this document or linked plans are deferred, including empty-class and sprint-based test tasks. Keep existing tests; do not delete or disable them to bypass failures.
- This is a student capstone: implement only required behavior and avoid unnecessary complexity.


Version: v1.2 · 2026-09-21

This is the **backend design document** (`dealer-gateway` / `dealer-core` / `ai-service`).  
It does not replace specification-PDF fields and enums; it does not replace the PPT six hard items.  
HTTP paths, DTOs, and OpenAPI details still live in **`14`** (and the repo OpenAPI). Data columns and Flyway behavior still align with **`15`**. Rule-engine regexes and internal prompts are in **`AI-PROTOCOL-AND-RULES.md`**.  
**Conflict order: PPT six hard items > specification PDF fields > this document + PROTOCOL > `14` / `15`.**  
Frontend still follows **`13`**. Scope aligns with `SCOPE-BASELINE.md` + `00` v6; `01`–`06` are not sources.  
Already ruled, no longer alternatives: cross-dealership **404**; `DUP_MEMBER`; internal failures **504/503/502**; public check **502 `AI_UNAVAILABLE`**; **Blocked does not call AI**.  
`aiStatus` allows only **`SKIPPED` `SUCCESS` `FAILED` `UNAVAILABLE`**. Ban `INVALID_RESPONSE` / `MOCK`.  
The four-repo skeleton already exists; this document only fills remaining business-implementation conventions.  
The browser talks only to Gateway; core / ai-service are not browser-facing.  
Do not implement work orders, leads, a buyer site, Service Bus, a standalone auth repo, a second database, or password login.

---

## 1. Course hard items (backend)

| Hard item | This document |
|---|---|
| Four repos | `dealer-web` / `dealer-gateway` / `dealer-core` / `ai-service` (IaC: `dealer-platform`). **Repos exist; business implementation is missing.** |
| Gateway | Browser only hits `:8080` `/api/v1`. Direct `:8081` / `:8082` must fail. |
| Auth | Admin-issued username/password (BCrypt). JWT roles only `Platform.Admin` / `Dealer.User`. Gateway and core both verify. |
| Real AI | `ai-service` embeds GitHub `ai-manager`. Failure must not Pass. CI does not hit paid models. |
| Multi-tenant + audit | Dealership A cannot see dealership B; Admin has zero business data; every DMS/CRM change records who/what/when. |
| Ads + TXT | Fixed rules run first; Ready / export TXT only when Passed and not Stale. |

Demo: two-dealership isolation; Admin hitting vehicles **403**; missing price / finance missing APR → **200 BLOCKED** and no AI call; one real-model run; after a price change the old check cannot be exported.

---

## 2. Ports and paths (short)

| Process | Port | Listens for |
|---|---|---|
| gateway | **8080** | `/api/v1/**` → core; `/internal/v1/**` → ai (internal header required). CORS only `http://localhost:5173`. No business logic. |
| core | **8081** | Business and transactions. No browser CORS. Outbound only to Gateway; never call 8082 directly. |
| ai-service | **8082** | No database. Do not deploy `ai-manager`'s `com.gateway`. |
| web | 5173 | Only hits 8080 `/api/v1`. |

Public family (JSON shapes in 14): `GET /me`; `/admin/dealers` + members; `/vehicles` + `.../sell`; `/customers`; `PUT\|DELETE /customers/{id}/vehicles/{vehicleId}`; `GET\|PATCH /vehicles/{id}/listing`; `POST /listings/{id}/checks\|ready\|exports`; `GET /audit`; `POST /assistant/ask`.  
Internal: `POST /internal/v1/ad-check`, `POST /internal/v1/assistant`. Browser hits on these two → **404**.

Envelope `{ items, page, size, total }` (size defaults to and caps at 10). Errors `{ code, message }`. Writes carry `version`. Ignore client `dealerId`.

---

## 3. Nine tables (V1, do not add or remove)

`dealer-core/src/main/resources/db/migration/V1__init.sql`:  
`dealer` · `app_user` · `membership` · `vehicle` · `customer` · `customer_vehicle` · `listing` · `compliance_check` · `audit_event`.  
Ban `ddl-auto=update`. Ban work-order / lead / password tables.

| Invariant | Pinned |
|---|---|
| Tenant | Staff = exactly one `membership.active=1` row. `app_user.dealer_id` is only a `/me` cache. |
| One person, one dealership | Any dealership already has an active membership → **409 `DUP_MEMBER`**. Previously unbound → reactivate. ≥2 active rows → reject business. |
| VIN / link | VIN unique per dealership. One vehicle, one customer. |
| Audit | Do not write full customer contact, secrets, or model stack traces. |

---

## 4. Coding hard points (short table)

| Point | Pinned |
|---|---|
| Cross-dealership | Load by this dealership first. Id not in this dealership (including a real id from another store) → **404**, not 403. Admin hitting business URLs → **403**. Missing/bad JWT → **401**. Staff with no dealership → business **403**; `GET /me` still 200 with `dealerId=null`. |
| Empty draft | `GET /vehicles/{id}/listing` with no row: **do not insert**. Virtual draft `id=null`, `title`/`body`=`""`, `adKind=CASH`, `medium=ONLINE`, `DRAFT`, `contentVersion=1`, `lastCheckId=null`, `version=0`. PATCH coerces `null` to `''`. |
| SOLD | Only via `POST /vehicles/{id}/sell`: `soldOn` + `soldPrice` + `version`. Missing one, illegal date, or `soldPrice <= 0` → **400 `SOLD_PAIR_REQUIRED`** (not `VALIDATION`). `IN_STOCK` ⇔ both sale fields NULL; `SOLD` ⇔ both present and price > 0. Sold locks purchase fields. PATCH does not change `status`/`soldOn`/`soldPrice`. Sell again → **409 `SOLD_LOCKED`**. |
| Link PUT | No dealership **403**. A missing customer or vehicle, including a cross-store id, is **404** `NOT_FOUND`. An existing link is **409** `VEHICLE_ALREADY_LINKED`. A same-dealer `SOLD` vehicle can be linked. `CustomerService.link` must not throw `WRONG_DEALER_OR_SOLD`. |
| Unlink DELETE | Same path → **204**. No link or cross-store → **404**. This-store vehicle `SOLD` → **409 `SOLD_LOCKED`**. Do not change vehicle `status`. |
| Internal header | `X-Dealer-Internal` = `INTERNAL_TOKEN`. The well-known local default **`dealer-internal`** is accepted only when the Spring profile is **`dev`** or **`local`**. Any other profile must set a non-default `INTERNAL_TOKEN` shared by gateway, ai-service, and dealer-core. Gateway and ai-service refuse to start on that default. Missing or wrong header → **404**. Do not forward the user JWT. CORS `allowedHeaders` does not list this header. |
| Blocked skips AI | `hard[]` non-empty or empty draft → persist `recommendation=BLOCKED`, `aiStatus=SKIPPED`, HTTP **200**, `AiGatewayClient` **zero calls**. Empty draft immediately hard: `PRICE_MISSING`, `DEALER_NAME_MISSING`, `CONDITION_UNDISCLOSED`. Missing price / `FINANCE` without APR is likewise hard. |

Remaining HTTP codes are in 14. Already absorbed: `DUP_MEMBER` includes another dealership still active.

---

## 5. Checks, AI states, TXT

`POST /listings/{id}/checks` `{ "version" }`: this dealership + optimistic lock → build public input (vehicle without purchase/repair/sold price) → core fixed rules → then decide whether to call AI. The system prompt **does not** embed the OMVIC hard checklist again.

| `aiStatus` | When |
|---|---|
| `SKIPPED` | Hard fail; model not called |
| `SUCCESS` | Internal 200 and `success=true` |
| `FAILED` / `UNAVAILABLE` | Rules passed but model/transport failed. Treat both as unavailable publicly; **must not Pass**. Do not reintroduce `MOCK` / `INVALID_RESPONSE` |

`recommendation`: `BLOCKED` \| `NEEDS_AI` \| `PASSED` \| `UNAVAILABLE`.  
Page `checkStatus` (14): `BLOCKED` \| `NEEDS_AI` \| `PASSED` \| `STALE` \| `AI_UNAVAILABLE`.

| Step | DB + HTTP |
|---|---|
| hard non-empty | `BLOCKED` + `SKIPPED`, **200**, no AI call |
| AI success | `PASSED` + `SUCCESS`, **200** |
| AI failure | Still persist `UNAVAILABLE` (or `FAILED`), write back `last_check_id`, public **502 `AI_UNAVAILABLE`** |

Internal failures (PROTOCOL, not for the browser): timeout **504 `AI_TIMEOUT`**; missing Key **503 `AI_KEY_MISSING`** (return immediately, do not wait 15s); otherwise **502 `AI_PROVIDER_FAILED`**. Body `{ success:false, code, message }`. Successful ad-check `{ success:true, notes:[{message}] }`; assistant `{ success:true, summary }`.

Timeout on both ends: **connect 2s + response 13s = 15s**. Core outbound goes through Gateway with header `X-Dealer-Internal`.

Changing listing or vehicle price/condition → `contentVersion++`, `DRAFT`, **do not** clear `lastCheckId` → if previously Passed, derive **STALE**. Ready / Export only when Passed and not Stale; otherwise **409**. Export `text/plain; charset=UTF-8`.

Assistant: AI failure is still public **200** (`summary=null`, `summaryAvailable=false`, `cards` keep this retrieval). No DB write. Resources have no phone/email/address.

---

## 6. What is still missing

The three Java repos and V1 already exist; **still missing** JWT/membership business, DMS/CRM/link, check+AI adapters, and audit write paths. Do not generate the entire suite in one pass. Do not bring back work orders/bus/second database.
