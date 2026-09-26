# 16 · Acceptance and test design

- Status: **current (v6 acceptance)**
- **Conflict order (do not reverse):** course PPT hard items > spec PDF fields and enums > [IMPLEMENTATION-BRIEF.md](IMPLEMENTATION-BRIEF.md) / [00-Current-Development-Design.md](00-Current-Development-Design.md) > [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) / [14-Backend-API-Contract.md](14-Backend-API-Contract.md) / [13-Frontend-Engineering.md](13-Frontend-Engineering.md) > **this document**
- This document is **use cases and live scripts**. **It does not change the contract**: paths, HTTP, error codes, five states, tenant, and fields follow 14 / 15 / the spec; routes and English copy follow 13. On contradiction, decide in the order above; do not invent new DTOs / routes / error codes here.
- Out of scope: tickets, leads, consumer buyer site, password login, standalone Audit page, KPI, CSV import. The assistant only reuses the GitHub component and is read-only.
- **Local-only cannot pass Sprint 2 / Sprint 3 (Review 2 / Review 3) acceptance.** Sprint 1 may explain architecture and four-repo builds on a local machine; S2/S3 must be a **cloud demo** (Entra → Gateway → business → real AI on Azure). See section 5.

Numbering: classroom scripts `CL-*`, backend `BE-*` (may serve as [11](11-Requirements-Governance-and-Agile.md) **NN-19** key test table), frontend `FE-*`. Total **32** use cases + 6 classroom scripts (the scripts themselves are not counted in the 32).

---

## 1. Demo accounts and six-page paths (align 00 / 13)

Class uses Entra only; no password box. Routes are these six only (13):

| path | Who enters | Default landing |
|---|---|---|
| `/login` | not signed in | — |
| `/admin` | `Platform.Admin` | Admin |
| `/dms` | `Dealer.User` | staff |
| `/crm` | `Dealer.User` | — |
| `/ads` | `Dealer.User` (page title **Ad compliance**) | — |
| `/assistant` | `Dealer.User` | — |

Do not show `/tickets` `/leads` `/dashboard` `/audit` or buyer pages. Audit lives only at the bottom of the DMS/CRM detail drawer.

| Account (prepare for class) | Entra role | Bound dealership | Used to demo |
|---|---|---|---|
| Admin | `Platform.Admin` | no membership; `/me` `dealerId` is `null` | create dealerships, bind staff, business calls rejected |
| Staff A | `Dealer.User` | dealership A active only | DMS/CRM/ads/assistant, isolation "can see" |
| Staff B | `Dealer.User` | dealership B active only | isolation "cannot see" |

Browser HTTP **hits Gateway only** (local `http://localhost:8080`, cloud is Gateway HTTPS). Do not let judges see the SPA call core `8081` / ai-service `8082` directly.

---

## 2. Six classroom demo scripts (align 00 acceptance)

Each script states: who signs in, which page, what they must see / must not see. Admin creates both dealerships before scripts 2–6. S2 must run **CL-4 and CL-5** in the cloud; S3 reruns **CL-1–CL-6** entirely in the cloud.

### CL-1 · Admin creates two dealerships and binds one person each (00 item 1 · NN-12)

1. As **Admin**, open `/login` → `Sign in with Microsoft` → land on **`/admin`**.
2. **See:** top bar `Platform Admin`; menu is **Admin only**; two in-page Tabs: **Dealerships**, **Members**.
3. **Do not see:** DMS / CRM / Ad compliance / Assistant in the menu; any vehicle VIN, customer-name table, or ad body.
4. Dealerships: `New dealership` creates dealership A and dealership B (four contact fields non-empty).
5. Each dealership Staff drawer: `Bind staff` binds Staff A and Staff B `entraOid` + display name. Members Tab can flatten both people, each under one dealership.
6. **Failure shape (optional):** binding the same person again to the same dealership while active → in-page `Staff already bound` (`409 DUP_MEMBER`), not a silent second row.

### CL-2 · Dealership A records a vehicle and customer and links them; dealership B cannot see them (00 item 2 · NN-13/14)

1. **Staff A** signs in → lands on **`/dms`**. Top-bar dealership name is dealership A's `dealerLegalName`.
2. **See:** menu DMS / CRM / Ad compliance / Assistant. `Add vehicle` fills one vehicle with spec-required fields (VIN unique in this dealership).
3. Open **`/crm`**: `Add customer` four fields; `Link vehicle` selects that unlinked vehicle in this dealership; after success the list `linkedVehicle` shows year/make/model.
4. **Do not see:** Admin menu; dealership B vehicles or customers; other-dealership VINs in the link-vehicle dropdown.
5. **Sign out**, **Staff B** signs in → `/dms`, `/crm`.
6. **See:** empty tables or only dealership B's own data (`No vehicles match.` / `No customers match.` if none were created).
7. **Do not see:** the VIN, customer, or link Staff A just recorded. Deep link `/dms?vehicleId=<dealership-A-id>` must not expose dealership A fields (backend 404, frontend `Vehicle not found` / empty detail — not treated as a dealership B vehicle).

### CL-3 · Admin hitting the vehicle API is rejected (00 item 3)

1. **Admin** is signed in. Change the address bar to **`/dms`** (and `/crm` `/ads` `/assistant`).
2. **See:** the guard immediately sends them back to **`/admin`**; the vehicle table is not rendered.
3. **Do not see:** VIN, purchase cost, customer phone.
4. Keep a second terminal (still using the Admin JWT): `GET {Gateway}/api/v1/vehicles` → **403 or 404**, body **must not** contain `vin` / cost or other business fields (14). Do not use "frontend hid the button" as the only evidence.

### CL-4 · Missing price or finance missing APR is blocked (00 item 4 · NN-15)

1. **Staff A** opens **`/ads`** and selects the CL-2 vehicle. With no listing row this is an empty draft (`Select a vehicle to start.` / blank form), **not** a Failed empty table.
2. Write a **CASH** ad: dealership name present but **no asking price in the body** → `Save draft` → `Run check`.
3. **See:** right-pane overall status **Blocked**; `ruleFindings` include a price-class hard miss; `Run check` can finish (HTTP **200**, not 4xx).
4. **Do not see:** **Passed**; the right side must not say it passed. The network panel **must not** show a browser request to `/internal/v1/ad-check` (Blocked **does not call AI**, see BE-09).
5. Change `adKind=FINANCE`, add a price but still **no APR** → check again → still **Blocked** (`FINANCE_APR_MISSING`), still no AI call.

### CL-5 · Real ad copy goes through real AI once (00 item 5 · NN-15/18)

1. Still on **`/ads`** (**must be cloud + real GitHub component**; stubs must not impersonate S2/S3).
2. Write copy that should pass the fixed checklist (dealership name, contact, price, condition wording, year; FINANCE includes APR), `Run check`, wait ≤15s.
3. **See:** overall status enters **Needs AI review** or **Passed** (depends on the model); `aiStatus` is not `SKIPPED`; `aiNotes` or the summary can **point out missing/risk items** (spec: a real call that can identify missing items).
4. **Do not see:** timeout/failure painted as Passed. If the model is down: right pane **AI unavailable**, check row already persisted (GET listing is still `AI_UNAVAILABLE`), **do not** treat `Mark ready` / `Export TXT` as a pass.

### CL-6 · After a price change the old check cannot export (00 item 6)

Spec / 00: changing vehicle price, condition, or ad body voids the old check. In class, **changing the asking-price digits in the ad body** is the most stable path (increments `contentVersion`; 14 explicitly voids).

1. When **Passed** and versions match, `Mark ready` should become Ready; then `Export TXT` can download plain text (dealership public four fields + vehicle public fields, **no purchase cost, no customer**).
2. `Save draft`: **change the price number in the body** (or change `conditionCode` and return to the ads page) → right pane becomes **Stale** (Stale is only "previously Passed, then invalidated").
3. Click `Mark ready` / `Export TXT` again: **see** `Check is stale. Run check again` (`409 CHECK_STALE`) or `Check has not passed` (`409 NOT_PASSED`).
4. **Do not see:** a successful export using the old check file / old `lastCheckId`. Must `Run check` again and still be **Passed and not Stale** before export.

---

## 3. Backend use-case table (NN-19)

All APIs go through Gateway `/api/v1/**`. Staff tenant comes only from JWT `oid` → **active membership** (15); **ignore** client `dealerId`. Cross-dealership resources are **404 not 403**. Error body `{code,message}`; no stack/SQL/raw model text.

| ID | Name | Steps (who / which call) | Expect | Not |
|---|---|---|---|---|
| **BE-01** | Cross-dealership 404 | Staff A uses dealership B `vehicleId` / `customerId` / `listingId` for GET/PATCH/check | **404** `NOT_FOUND`; no VIN/cost/customer fields | **403** (anti-probing); 200 empty object that still carries the other dealership's data |
| **BE-02** | No membership | `Dealer.User` JWT, 0 `membership.active=1` rows (after unbind) | business APIs **403** (signed in, no dealership); `GET /me`: `role=Dealer.User`, `dealerId=null` | 401 (does not look unsigned-in); still returns dealership A lists |
| **BE-03** | SOLD lock | After in-stock `POST .../sell` succeeds as a pair, `PATCH` purchase fields (make/model/year/vin/source/cost/addedOn/repair/carfax) | **409** `SOLD_LOCKED`; purchase values in the database unchanged | use PATCH to change `status`/`soldOn`; sell again after sold and overwrite the original sale |
| **BE-04** | Duplicate VIN | Same dealership `POST /vehicles` again with the same VIN | **400** `VIN_DUP` | same VIN across dealerships is wrongly rejected; 200 duplicate rows |
| **BE-05** | Link-vehicle rules | `PUT /customers/{id}/vehicles/{vehicleId}`: ① same dealership + not taken (in stock or sold) → 200; ② already linked → **409** `VEHICLE_ALREADY_LINKED`; ③ cross-dealership id → **404** `NOT_FOUND` | one vehicle one customer (V1 unique key); one customer many vehicles allowed | client `dealerId` links to another dealership; a linked sold vehicle linked again; cross-store returned as 400 |
| **BE-06** | Sold cannot unlink | After linked and `SOLD`, `DELETE /customers/{id}/vehicles/{vehicleId}` | **409** `SOLD_LOCKED`; association remains (15: sale record not erased) | 204 then the sale association disappears. In-stock unlink should still be **204** + audit `UNLINK` |
| **BE-07** | `CHECK_STALE` | listing was Passed; after PATCH body/type/medium (or handbook-specified condition change) `POST .../ready` or `.../exports` | **409** `CHECK_STALE` (lastCheck version ≠ listing) | still 200 export; mark Blocked-then-edited copy as Stale (should be Needs AI) |
| **BE-08** | `AI_UNAVAILABLE` is not Pass | fixed rules passed, AI timeout/failure | HTTP **502** `AI_UNAVAILABLE`; `compliance_check` **already written** `recommendation=UNAVAILABLE`; `checkStatus=AI_UNAVAILABLE` | 200 + Passed; skip persist but let UI treat as pass; browser treats as Pass |
| **BE-09** | Blocked does not call AI | after hard miss (missing price / FINANCE missing APR / empty draft) `POST .../checks` | **200**; `recommendation=BLOCKED`, `aiStatus=SKIPPED`; core **does not** call Gateway `POST /internal/v1/ad-check` | use 4xx for missing price; Blocked still hits the model |
| **BE-10** | Ready/export only Passed and not Stale | call ready and export in Blocked / Needs AI / AI unavailable / no check / Stale | if not "current Passed and versions match" → **409** `NOT_PASSED` or `CHECK_STALE`; only the qualified path → ready 200, export **200** `text/plain` | Stale still READY; export includes purchase cost or customer |
| **BE-11** | Audit has no full PII | after changing customer phone/email/address `GET /audit?entityType=CUSTOMER&entityId=`; link/unlink `CUSTOMER_VEHICLE` | who/what/when present; `fieldSummary` has **no** full phone, email, or address; cross-dealership entity 404 | Admin querying `VEHICLE`/`CUSTOMER` returns a business summary |
| **BE-12** | Assistant at most 5 cards and read-only | Staff A `POST /assistant/ask`; Admin hits the same URL | staff: **200**, `cards.length≤5`, cards have no phone/email/address, ids must fall in this dealership's retrieval set; **do not write** vehicle/customer/listing/check tables. Admin: **403**. Model down: 200 + `summaryAvailable=false`, cards may still exist | 6+ cards; assistant changes inventory; treat AI failure as business 502 Pass |

### NN-19 extras (often asked in class / PPT)

| ID | Name | Expect |
|---|---|---|
| **BE-13** | Admin hitting business URLs | `/vehicles` `/customers` `/listings/**` `/assistant/ask` → **403** or **404**, body has no business fields |
| **BE-14** | Bypass Gateway | browser or no internal header hitting core `8081`, ai `8082`, `/internal/v1/**` → fail (no CORS / **404**, 15). Gateway + user JWT `/api/v1/**` is the product entry |
| **BE-15** | Sell as a pair | missing either `soldOn`/`soldPrice` → **400** `SOLD_PAIR_REQUIRED`; price `≤0` → 400. Ignore PATCH of sale fields |
| **BE-16** | Ignore client `dealerId` | Staff A creates a vehicle while spoofing dealership B `dealerId` in body/query/header | still written to **dealership A**; cannot switch dealerships via parameters |

---

## 4. Frontend use cases (align 13 routes and copy)

UI is English. Failures **must not look like empty tables**. Optimistic lock `409 VERSION_CONFLICT` → `Refresh and retry`.

| ID | Name | Steps | Expect to see | Expect not to see |
|---|---|---|---|---|
| **FE-01** | Guard `/login` | unsigned-in open `/dms` | go to `/login`, `Sign in with Microsoft` only | password box, business tables |
| **FE-02** | Guard `/admin` | Staff A opens `/admin` | sent back to `/dms` | Dealerships table, bind-staff buttons |
| **FE-03** | Guard `/dms` | Admin opens `/dms` | sent back to `/admin` | vehicle table |
| **FE-04** | Guard `/crm` | Admin opens `/crm` | sent back to `/admin` | customer four-field table |
| **FE-05** | Guard `/ads` | Admin opens `/ads` | sent back to `/admin` | ad form / five states |
| **FE-06** | Guard `/assistant` | Admin opens `/assistant` | sent back to `/admin` | Ask, resource cards |
| **FE-07** | Admin dual Tabs | Admin on `/admin` | one route, two Tabs: Dealerships (Name, Contact, Staff count, Actions; filter dealership name; `New dealership`); Members (Entra ID/email, Dealership, Status, Actions; filter staff email; data = dealer list + each dealer's members, **no** invented `/admin/members`). Staff / Unbind use the same API set | second Admin sub-route; Edit dealership (this course UI does not); Vehicles tab |
| **FE-08** | Unlink second confirmation | Staff A clicks `Unlink` on `/crm` detail | `ConfirmDialog` first; cancel sends no request; confirm then `DELETE .../vehicles/{vehicleId}`. Sold: `Sold vehicles cannot be unlinked`. In stock: list Linked vehicle clears | click-to-delete; empty PUT pretending to unlink; copy still says "not provided yet" even though 14 DELETE exists |
| **FE-09** | Empty / error / loading states | walk all six pages through loading, empty list, API failure, no access | copy follows 13 §10: e.g. `Loading vehicles…` / `No vehicles match.` / `Could not load vehicles.` / `You do not have access to DMS.`; ad AI failure uses the right pane **AI unavailable** | paint 403/502 as empty tables; paint AI failure as Passed |
| **FE-10** | Assistant failure English | `/assistant`: model down but HTTP 200 (`summaryAvailable=false`, cards still present); whole-page 5xx/network failure | summary area fixed **`Smart summary unavailable`**; whole-page failure **`Could not ask assistant`**; cards ≤5, read-only, navigate `/dms` `/crm` `/ads` | document 10 Chinese wording; phone/email/homeAddress on cards; mutate data on this page |

FE-01–FE-06 match the menu: Admin **renders** Admin only; staff **renders** the four business pages only. Unauthorized access is blocked by the route first, not by hiding buttons.

---

## 5. Three Reviews: which items must be live-demoed (align 08 + cloud demo)

Align [08](08-DevOps-and-Implementation.md) Sprint definition of done and [11](11-Requirements-Governance-and-Agile.md) NN table. Each person must present their own running evidence; one person must not present everything.

| Review / Sprint | Definition of done (08) | Must demo live | Matching IDs | Environment |
|---|---|---|---|---|
| **Review 1 · Sprint 1** | four repos build independently; architecture diagram; two Entra roles configured | four repos, four pipelines can ship ai-service alone; requests go through Gateway only, direct access fails; explain figure 07; Entra already has `Platform.Admin` / `Dealer.User`. **Local is allowed.** Two-dealership data and a real ad run are not required | NN-01, NN-02, NN-03; evidence toward BE-14 | **local allowed** |
| **Review 2 · Sprint 2** | **On Azure** sign-in → Gateway → record one vehicle → **real AI** scans one ad; no plaintext secrets | open web over cloud HTTPS; Entra sign-in; record one vehicle on `/dms` via Gateway; `/ads` runs **CL-4** (Blocked does not call AI) + **CL-5** (real model); Bicep/Container Apps/Docker; pipeline release (human approval, no portal image click); KV with no secrets in the repo; core/ai **internal** | NN-04–07, NN-08–11, NN-15/18 (S2+); CL-4, CL-5; BE-08, BE-09 | **must be cloud** |
| **Review 3 · Sprint 3** | two-dealership isolation, CRM links, three-kind checklist ads, export, audit; freeze features | **CL-1–CL-6 full set in the cloud**; CASH / FINANCE / LEASE checklist at least once each (FINANCE missing APR still Blocked; LEASE has statement/APR per 15 pseudocode); `/crm` link + Unlink confirm; export TXT; DMS/CRM drawer audit (no full PII); `/assistant` this-dealership Q&A, at most 5 read-only cards. Customer walkthrough signed (NN-20) | NN-12, NN-13, NN-14, NN-16, NN-17, NN-19/20; CL-1–6; BE-01–BE-16; FE-01–FE-10 | **must be cloud** |

### Local-only cannot pass Sprint 2 / 3 acceptance

- Sprint 1: local Docker / localhost Gateway **may** pass Review 1 (15: do not force a subscription just for Review 1).
- Sprint 2 / 3: **local HTTP only, local stub AI, or "cloud opened empty Containers while business still hits localhost" all fail.**
- Review 2 must not treat "local HTTP" as a cloud security item (15). No plaintext secrets, HTTPS, and Key Vault references must be pointed out to judges on the **Azure demo resource group**.
- Review 3 isolation / export / audit / assistant must hit **the same cloud Gateway**; do not switch back to a local database "because the cloud has no data".

---

## 6. Explicitly out of scope (anti-regression)

- Do not restore tickets, leads, buyer `/public/**`, password tables, CSRF sessions, Service Bus, a second database, or a dealership switcher.
- This document does not add test-code files; the implementation group may land `BE-*` as JUnit / a frontend manual list, using codes from 14.
- Retired `01`–`06` (including old archived `06-Delivery-and-Test-Plan.md` under [archive/](archive/)) are not current acceptance.

---

## 7. Count check (for the implementation group)

| Group | Count | Primarily serves which Review |
|---|---|---|
| Classroom scripts CL-1–CL-6 | 6 | S2 first CL-4/5; S3 full set |
| Backend BE-01–BE-12 | 12 | NN-19 core; S3 live sample, S2 samples BE-08/09 |
| Backend extras BE-13–BE-16 | 4 | S1 leans BE-14; S3 leans BE-13/16 |
| Frontend FE-01–FE-10 | 10 | S3 guards and six pages; S2 at least `/login`+`/dms`+`/ads` four states |

**32 use cases total** (16 backend + 10 frontend; the 6 classroom items are demo scripts, matched against the table above at acceptance, and are not counted again as items 33–38).
