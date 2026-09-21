# AI-CODING-TESTS · Coding-AI test task list

- Status: **implementation checklist** for the implementation team / coding AI (does not change contracts)
- **Write tasks only; do not put test code into this design repo.** The implementation team creates empty classes / empty specs at the listed paths in each application repo.
- Authority: paths / HTTP / error codes follow [14-Backend-API-Contract.md](14-Backend-API-Contract.md); tenant and rules follow [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md); routes and English copy follow [13-Frontend-Engineering.md](13-Frontend-Engineering.md); cases follow [16-Acceptance-and-Test.md](16-Acceptance-and-Test.md); ad copy follows [17-Ad-Check-Fixtures.md](17-Ad-Check-Fixtures.md); core test class names follow [18-Backend-Core-Engineering.md](18-Backend-Core-Engineering.md) **§9**.
- This document **does not change** 13–19, 16, 17 body text, BRIEF, or other AI-CODING files.
- Browser and product HTTP **only hit** Gateway `/api/v1/**` (local `8080`, cloud Gateway HTTPS). Do not point SPA tests at core `8081` / ai-service `8082`.

---

## 0. Sprint and environment (hard constraints)

| Sprint | What tests may be written as | Acceptance environment |
|---|---|---|
| **Sprint 1** | **Compilable empty tests** (JUnit / Vite spec with class names and `@Test`/`it` skeletons) **or** direct-access failure tests (see TEST-14 / BE-14). Two-store data and a real ad run-through are not required. | **Local allowed** Docker / localhost Gateway |
| **Sprint 2** | Cloud HTTPS + Entra → Gateway → business; ads use **real AI** (GitHub component; stubs do not count). Must at least support **CL-4 / CL-5** and BE-08 / BE-09. | **Must be cloud** |
| **Sprint 3** | BE-01–BE-16, FE-01–FE-10, CL-1–CL-6 on the same cloud Gateway; isolation / export / audit / assistant must not fall back to a local database. | **Must be cloud** |

**Local-only cannot count as Sprint 2 / Sprint 3 (Review 2 / Review 3).** Local HTTP, local stub AI, and “cloud only opened empty Containers while business still hits localhost” all fail.

core repo CI: JUnit + compile. **Automation must not hit a real paid model** (AI tests use stub / WireMock Gateway). **Classroom / Review 2–3 CL-5 and FX-10 must use a real cloud model**, separate from the CI stub.

Error bodies are always `{code,message}`; ban stack traces / SQL / raw model text. Cross-dealership **404 `NOT_FOUND`, not 403**.

---

## 1. Coverage map (16 ↔ 17 ↔ 18)

| 16 | 18 test class (or web file) | 17 fixture | This list |
|---|---|---|---|
| BE-01 | `CrossTenantIsolationIT` | — | TEST-01 |
| BE-02 | `NoMembershipForbiddenIT` (also `MeServiceTest`) | — | TEST-02 |
| BE-03 | `SoldLockedIT` | — | TEST-03 |
| BE-04 | `VinDuplicateIT` | — | TEST-04 |
| BE-05 | `CustomerVehicleLinkIT` | — | TEST-05 |
| BE-06 | `SoldUnlinkLockedIT` | — | TEST-06 |
| BE-07 | `CheckStaleIT` | **FX-11** | TEST-07 |
| BE-08 | `AiUnavailableIT` | **FX-12** | TEST-08 |
| BE-09 | `BlockedSkipsAiIT` (also `OmvicRuleEngineTest`) | **FX-01, FX-03** | TEST-09 |
| BE-10 | `ReadyExportGuardIT` | **FX-10** (pass); fail branches may use FX-01 / FX-03 / FX-12 | TEST-10 |
| BE-11 | `AuditNoPiiIT` | — | TEST-11 |
| BE-12 | `AssistantAskIT` | — (assistant is not in 17) | TEST-12 |
| BE-13 | `AdminForbiddenOnBusinessIT` | — | TEST-13 |
| BE-14 | `CoreNotPublicIT` | — | TEST-14 |
| BE-15 | `SellPairRequiredIT` | — | TEST-15 |
| BE-16 | `IgnoreClientDealerIdIT` (also `TenantFilterTest`) | — | TEST-16 |
| FE-01 | `dealer-web` guard spec | — | TEST-17 |
| FE-02 | Same | — | TEST-18 |
| FE-03 | Same | — | TEST-19 |
| FE-04 | Same | — | TEST-20 |
| FE-05 | Same | — | TEST-21 |
| FE-06 | Same | — | TEST-22 |
| FE-07 | Admin page spec | — | TEST-23 |
| FE-08 | CRM Unlink spec | — | TEST-24 |
| FE-09 | Six-page four-state spec | Ad-failure right rail uses **FX-12** semantics | TEST-25 |
| FE-10 | Assistant-failure spec | — | TEST-26 |
| **CL-4** | web e2e + reusable TEST-09 | **FX-01, FX-03** | TEST-27 |
| **CL-5** | web e2e (S2+ cloud real AI) | **FX-10** | TEST-28 |

**Must-hit fixtures:** FX-01 / FX-03 / FX-10 / FX-11 / FX-12 are all attached to the table above. FX-11 is **not** a standalone ad body; it must start from FX-10 `PASSED` then change the price.

Dealership / vehicle premise (17 §1, shared by ad-related tasks): dealership `Prairie Auto Ltd.`, vehicle **V-ASIS** (2020 Toyota Camry, `AS_IS`), unless a task says otherwise.

---

## 2. Backend tasks (dealer-core · via Gateway)

Package names follow 18: `com.dealerops.core`. ITs go in `src/test/java/com/dealerops/core/it/`; units go in the matching subpackage. Interfaces are all `/api/v1/**`. Staff tenant comes only from JWT `oid` → active membership; **ignore** client `dealerId`.

### TEST-01

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/CrossTenantIsolationIT.java`
- Maps to 16: `BE-01`
- Maps to 17: none
- Must assert: Staff A uses dealership B’s `vehicleId` / `customerId` / `listingId` for GET / PATCH / `POST .../checks` → HTTP **404**, `error.code=NOT_FOUND`; body has **no** `vin`, purchase cost, or customer phone/email/address.
- Ban: using **403 `FORBIDDEN`** for cross-dealership; a 200 empty object that still carries the other store’s fields.

### TEST-02

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/NoMembershipForbiddenIT.java`; unit `src/test/java/com/dealerops/core/security/MeServiceTest.java`
- Maps to 16: `BE-02`
- Maps to 17: none
- Must assert: `Dealer.User` JWT, 0 rows `membership.active=1`, business APIs (`/vehicles` `/customers` `/listings` `/audit` `/assistant`) → HTTP **403**, `error.code=FORBIDDEN`. `GET /me` → **200**, `role=Dealer.User`, `dealerId=null`.
- Ban: 401 (this is not “not signed in”); still leaking dealership A’s list; using this case for cross-dealership (that is TEST-01).

### TEST-03

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/SoldLockedIT.java`
- Maps to 16: `BE-03`
- Maps to 17: none
- Must assert: after a successful paired `POST .../sell` on an in-stock vehicle, `PATCH` purchase fields (make/model/year/vin/source/cost/addedOn/repair/carfax) → HTTP **409**, `error.code=SOLD_LOCKED`; purchase values in the database stay unchanged.
- Ban: using PATCH to change `status` / `soldOn`; selling again after sold to overwrite the original deal.

### TEST-04

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/VinDuplicateIT.java`
- Maps to 16: `BE-04`
- Maps to 17: none
- Must assert: same-store `POST /vehicles` again with the same VIN → HTTP **400**, `error.code=VIN_DUP`.
- Ban: punishing the same VIN across stores; 200 with two rows.

### TEST-05

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/CustomerVehicleLinkIT.java`
- Maps to 16: `BE-05`
- Maps to 17: none
- Must assert: `PUT /customers/{id}/vehicles/{vehicleId}`: (1) same store + `IN_STOCK` + not taken → **200**; (2) already linked → **409** `VEHICLE_ALREADY_LINKED`; (3) sold → **400** `WRONG_DEALER_OR_SOLD`; other-store id → **404** `NOT_FOUND`. One vehicle one customer; one customer many vehicles is allowed.
- Ban: client sending `dealerId` to link into another store; newly linking a sold vehicle successfully; sending cross-store through `WRONG_DEALER_OR_SOLD` instead of 404.

### TEST-06

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/SoldUnlinkLockedIT.java`
- Maps to 16: `BE-06`
- Maps to 17: none
- Must assert: after linked and `SOLD`, `DELETE /customers/{id}/vehicles/{vehicleId}` → HTTP **409**, `error.code=SOLD_LOCKED`; the link remains. In-stock unlink → **204** + audit `UNLINK`.
- Ban: the sale link disappearing after 204; using empty PUT as a fake unlink.

### TEST-07

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/CheckStaleIT.java`
- Maps to 16: `BE-07`
- Maps to 17: **FX-11** (prerequisite: run **FX-10** to `PASSED` first)
- Must assert: per 17 FX-11: `PATCH` the copy price (e.g. `$17,900`) raises `contentVersion`, **do not** clear `lastCheckId`; then `POST .../ready` or `.../exports` → HTTP **409**, `error.code=CHECK_STALE`. GET listing: `checkStatus=STALE`.
- Ban: still 200 export; marking a post-Blocked edit as Stale (it should be Needs AI); treating a purchase-cost-only change as ad invalidation; writing FX-11 as a new ad body.

### TEST-08

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/AiUnavailableIT.java`
- Maps to 16: `BE-08`
- Maps to 17: **FX-12** (title/body **same as FX-10**; runtime disconnect AI / timeout / stub failure)
- Must assert: after fixed rules already pass (`hard[]` empty), AI call fails → HTTP **502**, `error.code=AI_UNAVAILABLE`; `compliance_check` **is written** `recommendation=UNAVAILABLE`; listing `checkStatus=AI_UNAVAILABLE`; Ready / Export → **409** `NOT_PASSED`.
- Ban: **using a hard-fail ad to impersonate FX-12** (missing price / missing APR are FX-01 / FX-03, go to TEST-09); 200 + Passed; passing without a database row.

### TEST-09

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/BlockedSkipsAiIT.java`; unit `src/test/java/com/dealerops/core/compliance/OmvicRuleEngineTest.java`
- Maps to 16: `BE-09` (classroom **CL-4**)
- Maps to 17: **FX-01** (`PRICE_MISSING`), **FX-03** (`FINANCE_APR_MISSING`)
- Must assert: `POST .../checks` → HTTP **200** (not 4xx); `recommendation=BLOCKED`, `aiStatus=SKIPPED`; `ruleFindings` contain a price-class hard miss or `FINANCE_APR_MISSING`; core **does not** call Gateway `POST /internal/v1/ad-check`. Ready / Export → **409** `NOT_PASSED`.
- Ban: using 4xx for missing price; still hitting the model when Blocked; using FX-01 copy to impersonate FX-10 / FX-12.

### TEST-10

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/ReadyExportGuardIT.java`
- Maps to 16: `BE-10`
- Maps to 17: pass path **FX-10**; fail paths FX-01 / FX-03 / FX-12 (and no check)
- Must assert: Blocked / Needs AI / AI unavailable / no check → ready and export **409** `NOT_PASSED`; Stale (FX-11) → **409** `CHECK_STALE`. Only current Passed with matching version → ready **200**; export **200** `Content-Type: text/plain` (dealership public four fields + vehicle public fields + title/body; **no** purchase cost, **no** customer).
- Ban: Stale still READY; export containing cost or customer; treating not-Ready as exportable.

### TEST-11

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/AuditNoPiiIT.java`
- Maps to 16: `BE-11`
- Maps to 17: none
- Must assert: after changing customer phone/email/address, `GET /audit?entityType=CUSTOMER&entityId=` → **200**, has who/what/when; `fieldSummary` has **no** full phone, email, or address. Link/unlink `CUSTOMER_VEHICLE` likewise. Cross-store entity → **404** `NOT_FOUND`.
- Ban: Admin querying `VEHICLE` / `CUSTOMER` and getting a business summary; writing numbers into audit JSON.

### TEST-12

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/AssistantAskIT.java`
- Maps to 16: `BE-12`
- Maps to 17: none (17 does not cover assistant)
- Must assert: Staff A `POST /assistant/ask` → **200**, `cards.length≤5`; cards have no phone/email/address; ids fall in this-store retrieval set; **does not write** vehicle / customer / listing / check tables. Admin hitting the same URL → **403** `FORBIDDEN`. Model down: still **200** + `summaryAvailable=false`, cards may still exist (not a business 502).
- Ban: 6+ cards; assistant changing inventory; treating AI failure as business 502 Pass.

### TEST-13

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/AdminForbiddenOnBusinessIT.java`
- Maps to 16: `BE-13` (API side of classroom CL-3)
- Maps to 17: none
- Must assert: Admin JWT hitting `/vehicles` `/customers` `/listings/**` `/assistant/ask` → **403** `FORBIDDEN` or **404** `NOT_FOUND`; body has **no** `vin` / cost / customer fields.
- Ban: hidden frontend buttons as the only evidence; 403 body still returning list items.

### TEST-14

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/CoreNotPublicIT.java` (config assertions are enough); optional counterpart `dealer-gateway` browser **404** for `/internal/v1/**`
- Maps to 16: `BE-14` (Sprint 1 evidence)
- Maps to 17: none
- Must assert: hitting core `8081`, ai `8082`, `/internal/v1/**` without the internal header → fail (no CORS / **404**). Product entry is only `/api/v1/**` via Gateway + user JWT. core **does not** configure `localhost:5173` CORS.
- Ban: treating a still-working local `curl 127.0.0.1:8081` as “public API already open”; using this item in Sprint 1 to pretend S2 cloud security already passed.

### TEST-15

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/SellPairRequiredIT.java`
- Maps to 16: `BE-15`
- Maps to 17: none
- Must assert: missing one of `soldOn` / `soldPrice` → HTTP **400**, `error.code=SOLD_PAIR_REQUIRED`; price `≤0` → **400** (`VALIDATION` or the same sell validation). Ignore PATCH changing sale fields.
- Ban: after a successful pair, still allowing PATCH to change `soldOn` / `soldPrice`; missing one yet 200.

### TEST-16

- Repo / file path: `dealer-core` / `src/test/java/com/dealerops/core/it/IgnoreClientDealerIdIT.java`; unit `src/test/java/com/dealerops/core/common/tenant/TenantFilterTest.java`
- Maps to 16: `BE-16`
- Maps to 17: none
- Must assert: Staff A spoofs dealership B’s `dealerId` in body / query / header when creating a vehicle → still written to **dealership A**; GET this store can see it, dealership B cannot.
- Ban: switching stores via a parameter; reading a cross-store id with 403.

**Remaining 18 §9 units (no extra 16 IDs; test with the mapping):** `ApiExceptionHandlerTest` → `src/test/java/com/dealerops/core/common/exception/ApiExceptionHandlerTest.java` (14 mapping table); `OmvicRuleEngineTest` empty-draft hard block per 17: `PRICE_MISSING` + `DEALER_NAME_MISSING` + `CONDITION_UNDISCLOSED`, not a standalone ad body.

---

## 3. Frontend tasks (dealer-web · copy aligned with 13)

UI in English. Failures **are not empty tables**. `409 VERSION_CONFLICT` → `Refresh and retry`. Guards live in `src/router/index.ts` `beforeEach`.

### TEST-17

- Repo / file path: `dealer-web` / `src/router/__tests__/fe01-login-guard.spec.ts`
- Maps to 16: `FE-01`
- Maps to 17: none
- Must assert: unauthenticated open `/dms` → `/login`; only button copy **`Sign in with Microsoft`**.
- Ban: password box, business table, direct 8081.

### TEST-18

- Repo / file path: `dealer-web` / `src/router/__tests__/fe02-admin-guard.spec.ts`
- Maps to 16: `FE-02`
- Maps to 17: none
- Must assert: Staff A open `/admin` → blocked back to `/dms`.
- Ban: seeing the Dealerships table or bind-staff button.

### TEST-19

- Repo / file path: `dealer-web` / `src/router/__tests__/fe03-dms-guard.spec.ts`
- Maps to 16: `FE-03`
- Maps to 17: none
- Must assert: Admin open `/dms` → blocked back to `/admin`.
- Ban: rendering the vehicle table (VIN / cost).

### TEST-20

- Repo / file path: `dealer-web` / `src/router/__tests__/fe04-crm-guard.spec.ts`
- Maps to 16: `FE-04`
- Maps to 17: none
- Must assert: Admin open `/crm` → blocked back to `/admin`.
- Ban: customer four-field table.

### TEST-21

- Repo / file path: `dealer-web` / `src/router/__tests__/fe05-ads-guard.spec.ts`
- Maps to 16: `FE-05`
- Maps to 17: none (this item tests the guard only; do not run fixtures)
- Must assert: Admin open `/ads` → blocked back to `/admin`.
- Ban: ad form / five states.

### TEST-22

- Repo / file path: `dealer-web` / `src/router/__tests__/fe06-assistant-guard.spec.ts`
- Maps to 16: `FE-06`
- Maps to 17: none
- Must assert: Admin open `/assistant` → blocked back to `/admin`.
- Ban: Ask, resource cards.

### TEST-23

- Repo / file path: `dealer-web` / `src/views/__tests__/AdminView.spec.ts`
- Maps to 16: `FE-07`
- Maps to 17: none
- Must assert: Admin on the **same** `/admin`: tab **Dealerships** (Name, Contact, Staff count, Actions; filter by store name; `New dealership`) and **Members** (Entra ID/email, Dealership, Status, Actions; filter by staff email). Data = dealership list + each store’s members. Staff / Unbind use Admin APIs already in 14.
- Ban: a second Admin child route `/admin/members`; this-course UI Edit dealership; vehicles tab.

### TEST-24

- Repo / file path: `dealer-web` / `src/views/__tests__/CrmUnlink.spec.ts` (component may test `src/components/ConfirmDialog.vue`)
- Maps to 16: `FE-08`
- Maps to 17: none
- Must assert: Staff A on `/crm` clicks `Unlink` → `ConfirmDialog` first; cancel **sends no** request; only after confirm `DELETE /api/v1/customers/{id}/vehicles/{vehicleId}`. Sold: copy **`Sold vehicles cannot be unlinked`** (maps to **409** `SOLD_LOCKED`). After in-stock success, list Linked vehicle is empty.
- Ban: click-to-delete; empty PUT as a fake unlink; copy stuck on “not yet provided.”

### TEST-25

- Repo / file path: `dealer-web` / `src/components/__tests__/PageState.spec.ts` and each `views/__tests__/*View.spec.ts`
- Maps to 16: `FE-09`
- Maps to 17: ad AI-failure right rail aligned with **FX-12** (not Pass)
- Must assert: six-page loading / empty / error / no-access copy per 13 §10, e.g. DMS: `Loading vehicles…` / `No vehicles match.` / `Could not load vehicles.` / `You do not have access to DMS.` Ads: `502` `AI_UNAVAILABLE` → right rail **AI unavailable**.
- Ban: drawing 403/502 as an empty table; drawing AI failure as Passed.

### TEST-26

- Repo / file path: `dealer-web` / `src/views/__tests__/AssistantView.spec.ts`
- Maps to 16: `FE-10`
- Maps to 17: none
- Must assert: model down but HTTP 200 (`summaryAvailable=false`, cards still present) → explanation **`Smart summary unavailable`**. Whole-page 5xx / network failure → **`Could not ask assistant`**. Cards ≤5, read-only, jump `/dms` `/crm` `/ads`.
- Ban: the Chinese assistant-failure sentence from document 10; phone / email / homeAddress on cards; changing data on this page.

---

## 4. Classroom scripts (cloud from S2; bound to fixtures)

### TEST-27

- Repo / file path: `dealer-web` / `e2e/cl4-ads-blocked.spec.ts` (may reuse TEST-09 API assertions)
- Maps to 16: **CL-4** (00 item 4 · NN-15)
- Maps to 17: **FX-01**, **FX-03**
- Must assert: Staff A on `/ads` picks the CL-2 / V-ASIS vehicle. With no listing row, empty-draft copy `Select a vehicle to start.`, **not** Failed. Paste FX-01 → `Save draft` → `Run check`: right-rail overall **Blocked**; HTTP **200**; network panel **must not** show a browser request to `/internal/v1/ad-check`. Then change `adKind=FINANCE` using FX-03 (has price, no APR) → still **Blocked** (`FINANCE_APR_MISSING`), still no AI call.
- Ban: seeing **Passed**; using 4xx for missing price; using FX-10 copy to impersonate this item; **local-only impersonating Review 2**.

### TEST-28

- Repo / file path: `dealer-web` / `e2e/cl5-ads-real-ai.spec.ts`
- Maps to 16: **CL-5** (00 item 5 · NN-15/18)
- Maps to 17: **FX-10**
- Must assert: **must be cloud + real GitHub component**. Paste FX-10 full text, `Run check`, wait ≤15s. Overall **Needs AI review** or **Passed**; `aiStatus` is not `SKIPPED`; `aiNotes` or explanation can point at missing/risk items (expect Pass when there is no hard miss). Timeout/failure: right rail **AI unavailable**, GET listing still `AI_UNAVAILABLE`, **ban** treating `Mark ready` / `Export TXT` as pass.
- Ban: stub / local model impersonating S2/S3; drawing timeout as Passed; using FX-01 hard miss to impersonate “AI already ran”; mixing FX-10 with **FX-12** (FX-12 must pass rules first, then disconnect the model).

---

## 5. Fixture quick reference (suggested classroom order)

| FX | Used in | HTTP / code / UI |
|---|---|---|
| FX-01 | TEST-09, TEST-27, TEST-10 fail branch | 200 + `BLOCKED` / `SKIPPED`; UI **Blocked** |
| FX-03 | TEST-09, TEST-27 | Same; `FINANCE_APR_MISSING` |
| FX-10 | TEST-10 pass, TEST-28, TEST-07 prerequisite | Real AI: **200** `PASSED`; then Ready / `text/plain` |
| FX-11 | TEST-07 | Do not run a check; Ready/Export **409** `CHECK_STALE`; UI **Stale** |
| FX-12 | TEST-08, TEST-25 ad failure | **502** `AI_UNAVAILABLE`; UI **AI unavailable**; **ban hard-miss impersonation** |

Suggested classroom order (17 §4): FX-01 → FX-03 → FX-10 (real AI) → export TXT → FX-11 cannot export → (optional contrast) FX-12.

---

## 6. Counts and completeness

| Group | This list | 16 / 17 |
|---|---|---|
| BE-01–BE-16 | TEST-01–TEST-16 (16 items) | 16 backend fully covered; class names = 18 §9 |
| FE-01–FE-10 | TEST-17–TEST-26 (10 items) | 16 frontend fully covered |
| CL-4 / CL-5 | TEST-27 / TEST-28 | Required live in S2; S3 also includes CL-1–3, CL-6 (demo; no extra TEST numbers) |
| FX-01 / 03 / 10 / 11 / 12 | See §1 and §5 | All five must-hit fixtures are mapped |

**Test task count: 28** (16 BE + 10 FE + 2 classroom). Complete against 16 BE-01–BE-16, FE-01–FE-10, CL-4/5; complete against 17 FX-01/03/10/11/12. Classroom CL-1/2/3/6 still follow 16 live scripts and are not counted again as items 29–32.

Do not: land JUnit / spec source in this file; restore work orders / leads / buyer site; invent new error codes.
