# Backend API development contract

Version v6.0 · 2026-09-21  
**Current.** Retired `01`–`06` (including archived `04-API-Contract.md` under [archive/](archive/)) are not the current API. Old DTOs may be used only for envelope shape; entities follow v6 / Flyway `V1__init.sql`.

**Conflict order:** course PPT hard items > spec PDF fields > [IMPLEMENTATION-BRIEF.md](IMPLEMENTATION-BRIEF.md) / `00` > **[15](15-Data-Auth-and-Gateway.md) owns data/tenant/gateway behavior**, **this document owns HTTP JSON** > [13](13-Frontend-Engineering.md) frontend engineering > [12](12-Frontend-UI-Conventions.md).  
**Entry:** browser-to-service traffic goes only through Gateway `http://localhost:8080`, prefix **`/api/v1/**`**. core=`8081`, ai-service=`8082` are not public. Bypassing Gateway must fail.  
**Internal:** Gateway → ai-service `/internal/v1/**` is **404** for the browser; this document writes those paths only for the core adapter.  
**PROTOCOL wins** over this document’s §11 response sketches and any OpenAPI internal sketches that still show `{failed,reason}`. Internal success/failure JSON and this-store sold-link codes follow [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md). Cross-dealership ids are always **404**; `WRONG_DEALER_OR_SOLD` is only for this-store sold / not `IN_STOCK` on PUT link.

Path-table summary is in `dealer-platform/API.md`. Coding follows this document's JSON and error codes.

---

## 0. New rulings in this document vs handbook restatement

Nullability of data columns, whether `membership` / `app_user` is authoritative, indexes, and V2 are all left to **document 15**. This document writes HTTP behavior only.

| Type | Content |
|---|---|
| **Handbook restatement only** | two roles; ignore frontend `dealerId`; cross-dealership **404 not 403**; Admin hitting business URLs gets no business fields; error body `{code,message}`; writes carry `version` → `409 VERSION_CONFLICT`; ad five-state conditions; check rules then AI (≤15s); Ready/Export only when Passed and not Stale; assistant does not write business tables; internal `vehiclePublic` has no purchase cost; assistant `resources` have no phone/email/address; lists default to 10 per page; VIN unique per dealership; sell as a pair; sold locks purchase fields; one vehicle one customer |
| **New rulings here** | pagination envelope `{items,page,size,total}` (handbook says 10 per page but not the envelope); **unlink** `DELETE /customers/{id}/vehicles/{vehicleId}` → 204; Admin **GET/PATCH** single dealership (handbook has list+create only); `SOLD_LOCKED` is always **409**; Blocked checks are **200**; `AI_UNAVAILABLE` is **502** and already persisted; derived fields `checkStatus` / `staffCount` / list `linkedVehicle`; 400 `VALIDATION` may include `fieldErrors`; JSON `id` is a number (do not use string ids from the retired draft); money is a JSON number; Admin↔business URL role mismatch is **403** `FORBIDDEN`; HTTP semantics of bind/unbind (whether the row is soft-deleted is left to 15) |
| **Aligned with 15** | GET listing with no row: **do not persist**, virtual empty draft; first PATCH uses `''` to satisfy `title`/`body` NOT NULL. Tenant authority is `membership.active=1`; ignore client `dealerId`. Cross-dealership id → **404**. Staff with no valid membership calling business APIs → **403** `FORBIDDEN` (signed in, no dealership — not 401/404). Sold vehicles: no new link (`400 WRONG_DEALER_OR_SOLD`), no unlink (`409 SOLD_LOCKED`) |

---

## 1. Uniform envelope and cross-cutting rules

### 1.1 Success

- Single object: return the DTO directly (no extra `data` wrapper).
- Pagination: `page` starts at **0**; `size` defaults to **10**, server cap **10** (aligns with handbook "10 per page").

```json
{
  "items": [],
  "page": 0,
  "size": 10,
  "total": 0
}
```

The handbook does not specify a list envelope; the shape matches retired `04`, **semantics follow v6 entities**, and this is not a restore of the old API.

- `POST` create: **201**.
- Update / action: **200**.
- Unbind member, unlink vehicle: **204** no body.
- Export: **200** `Content-Type: text/plain; charset=UTF-8`.

### 1.2 Errors

```json
{ "code": "VIN_DUP", "message": "VIN already exists in this dealership." }
```

`400 VALIDATION` may add (new ruling):

```json
{
  "code": "VALIDATION",
  "message": "Request is invalid.",
  "fieldErrors": { "vin": "must not be blank" }
}
```

Do not return SQL, stack traces, or raw model text to the browser.

| HTTP | When |
|---|---|
| 400 | validation failure, `VIN_DUP`, `WRONG_DEALER_OR_SOLD`, `SOLD_PAIR_REQUIRED` |
| 401 | missing/bad JWT |
| 403 | insufficient role (Admin↔staff hitting the wrong prefix); **staff with no valid `membership.active=1` calling a business API** (signed in, no dealership). **Not** cross-dealership |
| 404 | this id is not in this dealership, **cross-dealership id** (anti-probing, not 403) |
| 409 | `VERSION_CONFLICT`, `DUP_MEMBER`, `VEHICLE_ALREADY_LINKED`, `SOLD_LOCKED`, `CHECK_STALE`, `NOT_PASSED` |
| 502 | `AI_UNAVAILABLE` (rules passed, model timeout/failure; check row already written) |

### 1.3 Identity, tenant, optimistic lock

- Roles are only `Platform.Admin` and `Dealer.User`. Staff tenant authority is **exactly one `membership.active=1` row** (15); `app_user.dealer_id` is only a `/me` cache.
- **Ignore** client `dealerId` in body / query / header. Staff tenant comes only from JWT `oid` → membership. Admin `dealerId` is always treated as empty.
- Cross-dealership resource id: **404**, not 403 (anti-probing).
- `Dealer.User` signed in with **0** active memberships: business APIs (`/vehicles` `/customers` `/listings` `/audit` `/assistant`) → **403** `FORBIDDEN`, not 401 and not 404. `GET /me` is still 200 (`dealerId=null`).
- Writes that carry `version`: `dealer`, `vehicle`, `customer`, `listing` (including checks/ready/export). Request `version` must equal the current row. Conflict **409** `VERSION_CONFLICT`.
- `customer_vehicle` has no `version` column: link/unlink do not use optimistic locking.
- Enums and required fields match handbook section 3; do not add or remove spec fields. Dates `YYYY-MM-DD`, timestamps ISO-8601 UTC. JSON camelCase.

---

## 2. `GET /api/v1/me`

| | |
|---|---|
| Who | signed in |
| Request | no body |
| Errors | `401` not signed in |

```json
{
  "entraOid": "11111111-1111-1111-1111-111111111111",
  "displayName": "Alex Dealer",
  "role": "Dealer.User",
  "dealerId": 1,
  "dealerLegalName": "Prairie Auto Ltd."
}
```

Admin: `dealerId` and `dealerLegalName` are `null`. `dealerLegalName` is a display-only derived field, not a second set of dealership data.

---

## 3. Admin: dealership CRUD and membership

Who: `Platform.Admin` only. Staff hitting these URLs → **403** `FORBIDDEN`.

### 3.1 `GET /api/v1/admin/dealers`

Query: `q` (matches `legalName`), `page`, `size`.

```json
{
  "items": [
    {
      "id": 1,
      "legalName": "Prairie Auto Ltd.",
      "contactPhone": "403-555-0100",
      "contactEmail": "desk@prairie.example",
      "contactAddress": "100 1 Ave SW, Calgary",
      "active": true,
      "staffCount": 2,
      "version": 0
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

`staffCount`: count of that dealership's **active memberships** (derived; column definition is in 15).

### 3.2 `POST /api/v1/admin/dealers` → 201

```json
{
  "legalName": "Prairie Auto Ltd.",
  "contactPhone": "403-555-0100",
  "contactEmail": "desk@prairie.example",
  "contactAddress": "100 1 Ave SW, Calgary"
}
```

The four contact fields are non-empty. Response matches 3.3. Errors: `400 VALIDATION`, `403`.

### 3.3 `GET /api/v1/admin/dealers/{id}`

The handbook has no single-dealership GET. **New ruling:** add this read-only endpoint for Admin edit fill-back. 404 if the dealership does not exist. Response:

```json
{
  "id": 1,
  "legalName": "Prairie Auto Ltd.",
  "contactPhone": "403-555-0100",
  "contactEmail": "desk@prairie.example",
  "contactAddress": "100 1 Ave SW, Calgary",
  "active": true,
  "staffCount": 2,
  "version": 0
}
```

### 3.4 `PATCH /api/v1/admin/dealers/{id}`

The handbook has no update. **New ruling:** allow changing the four contact fields and `active`; `version` is required. Do not add `DELETE /admin/dealers/{id}` (the spec does not require deleting dealerships).

```json
{
  "version": 0,
  "legalName": "Prairie Auto Ltd.",
  "contactPhone": "403-555-0101",
  "contactEmail": "desk@prairie.example",
  "contactAddress": "100 1 Ave SW, Calgary",
  "active": true
}
```

Response matches 3.3. Errors: `400`, `404`, `409 VERSION_CONFLICT`. Ignore body.`id`.

### 3.5 `GET /api/v1/admin/dealers/{id}/members`

Dealership missing → 404. Paginated envelope (`page`/`size`/`q` matches `displayName` or `entraOid`).

```json
{
  "items": [
    {
      "entraOid": "22222222-2222-2222-2222-222222222222",
      "displayName": "Alex Dealer",
      "role": "Dealer.User",
      "active": true
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

The table has no staff-email column: the API **does not invent email**. The UI "staff email" filter can use `q` on existing columns.

### 3.6 `POST /api/v1/admin/dealers/{id}/members` → 201

```json
{ "entraOid": "22222222-2222-2222-2222-222222222222", "displayName": "Alex Dealer" }
```

Write `membership` + `app_user` (column authority is in 15). Response matches a member item.  
`400 VALIDATION`; dealership 404; already an **active** member of that dealership → **409** `DUP_MEMBER`.  
Binding an already-unbound person again is treated as **reactivation**, not 409 (whether the same row is updated is left to 15). Do not delete the Entra account.

### 3.7 `DELETE /api/v1/admin/dealers/{id}/members/{entraOid}` → 204

Unbind; do not delete Entra. No such binding → 404.

---

## 4. Vehicles DMS (Dealer.User)

Admin hitting any URL in this section → **403** `FORBIDDEN` (same as CRM/ads/assistant; the body must not contain vin/cost or other business fields). Staff sees this dealership only. Staff with no valid membership → **403** (see §1.3).

List query: `q` (VIN / make / model), `status`=`IN_STOCK`\|`SOLD`, `condition` (that is `conditionCode`), `page`, `size`. Default `createdAt` descending.

### 4.1 `GET /api/v1/vehicles`

```json
{
  "items": [
    {
      "id": 10,
      "vin": "1HGCM82633A004352",
      "make": "Toyota",
      "model": "Camry",
      "modelYear": 2020,
      "source": "AUCTION",
      "purchaseCost": 14200.00,
      "addedOn": "2026-09-01",
      "conditionCode": "AS_IS",
      "repairCost": 800.00,
      "carfaxUrl": null,
      "soldOn": null,
      "soldPrice": null,
      "status": "IN_STOCK",
      "version": 0
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

Errors: `401`, `403` (not staff).

### 4.2 `POST /api/v1/vehicles` → 201

```json
{
  "make": "Toyota",
  "model": "Camry",
  "modelYear": 2020,
  "vin": "1HGCM82633A004352",
  "source": "AUCTION",
  "purchaseCost": 14200.00,
  "addedOn": "2026-09-01",
  "conditionCode": "AS_IS",
  "repairCost": 800.00,
  "carfaxUrl": null
}
```

Required: make/model/modelYear/vin/source/purchaseCost/addedOn/conditionCode.  
**Ignore** `dealerId`, `status`, `soldOn`, `soldPrice`. Server sets `status=IN_STOCK`.  
Errors: `400 VALIDATION`, `400 VIN_DUP`. Response = detail. Audit `VEHICLE`/`CREATE`.

### 4.3 `GET /api/v1/vehicles/{id}`

Response matches a list item. Cross-dealership / no such vehicle → **404**.

### 4.4 `PATCH /api/v1/vehicles/{id}`

```json
{
  "version": 0,
  "make": "Toyota",
  "model": "Camry",
  "modelYear": 2020,
  "vin": "1HGCM82633A004352",
  "source": "AUCTION",
  "purchaseCost": 14200.00,
  "addedOn": "2026-09-01",
  "conditionCode": "CERTIFIED",
  "repairCost": 800.00,
  "carfaxUrl": "https://example.invalid/carfax/1"
}
```

Whitelist is the fields above only. Do not use PATCH to change `status` / `soldOn` / `soldPrice` (use `/sell`). Ignore `dealerId`.  
Changing purchase fields on a sold vehicle (make/model/year/vin/source/purchaseCost/addedOn/repairCost/carfax) → **409** `SOLD_LOCKED`.  
Changing VIN while unsold is still unique per dealership → `400 VIN_DUP`.  
Changing `conditionCode` (handbook: a condition change voids the old check) → increment the corresponding listing `contentVersion++` (if a listing exists). Changing purchase cost alone does not void the ad.  
Audit `VEHICLE`/`UPDATE`. Other errors: `404`, `409 VERSION_CONFLICT`.

### 4.5 `POST /api/v1/vehicles/{id}/sell`

```json
{ "soldOn": "2026-09-20", "soldPrice": 18900.00, "version": 1 }
```

Both values must be present together. Server sets `status=SOLD`. Response = detail.  
`400 SOLD_PAIR_REQUIRED`; selling again after sold → `409 SOLD_LOCKED`; `409 VERSION_CONFLICT`; `404`. Audit `VEHICLE`/`SELL`.

---

## 5. Customers CRM (Dealer.User)

Admin hitting any URL in this section → **403** `FORBIDDEN`. Staff with no valid membership → **403**. Cross-dealership **404**.

### 5.1 `GET /api/v1/customers`

Query: `q` (name/email/phone), `linked`=`true`\|`false` (whether at least one vehicle is linked), `page`, `size`.

```json
{
  "items": [
    {
      "id": 4,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "403-555-0199",
      "homeAddress": "12 Oak St",
      "linkedVehicle": { "id": 10, "modelYear": 2020, "make": "Toyota", "model": "Camry" },
      "version": 0
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

`linkedVehicle`: when multiple vehicles exist, take the most recent `linkedAt` for the CRM table column; detail is the full array in 5.3. Unlinked is `null`.

### 5.2 `POST /api/v1/customers` → 201

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "403-555-0199",
  "homeAddress": "12 Oak St"
}
```

Ignore `dealerId`. `400 VALIDATION`. Audit `CUSTOMER`/`CREATE`. Response = detail (`linkedVehicles: []`).

### 5.3 `GET /api/v1/customers/{id}`

```json
{
  "id": 4,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "403-555-0199",
  "homeAddress": "12 Oak St",
  "linkedVehicles": [
    {
      "id": 10,
      "vin": "1HGCM82633A004352",
      "modelYear": 2020,
      "make": "Toyota",
      "model": "Camry",
      "status": "IN_STOCK"
    }
  ],
  "version": 0
}
```

Cross-dealership **404**.

### 5.4 `PATCH /api/v1/customers/{id}`

```json
{
  "version": 0,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "403-555-0199",
  "homeAddress": "12 Oak St"
}
```

Ignore `dealerId`. `409 VERSION_CONFLICT`. Audit `CUSTOMER`/`UPDATE`. `fieldSummary` **must not** contain full phone/email/address text.

---

## 6. Link and unlink vehicles (design gap: UNLINK is required)

Handbook audit has `LINK` / `UNLINK`, and the UI (12) requires a second confirmation for sell/**unlink**, but the API table only had `PUT` to link.  
**Ruling: add DELETE; do not "reuse PUT as unlink" or pretend there is no requirement.** Second confirmation is frontend-only; the API deletes the association in one call.

### 6.1 `PUT /api/v1/customers/{id}/vehicles/{vehicleId}` → 200

No body (or ignore body). Constraints: customer and vehicle are **the same dealership**, and the vehicle is **not yet** linked to any customer. In-stock or sold both allowed (15 §4).

```json
{
  "id": 77,
  "customerId": 4,
  "vehicleId": 10,
  "linkedAt": "2026-09-21T21:00:00Z"
}
```

| Code | HTTP | When |
|---|---|---|
| `VEHICLE_ALREADY_LINKED` | 409 | that vehicle is already linked (including already linked to this customer) |
| `WRONG_DEALER_OR_SOLD` | 400 | **PROTOCOL A.1:** this-store vehicle on PUT link, but sold / not `IN_STOCK`. Cross-dealership ids are always **404**, not this code |
| — | 404 | customer or vehicle id does not exist for this dealership (cross-dealership is also 404) |

Audit `CUSTOMER_VEHICLE` / `LINK`. `entityId` = `customer_vehicle.id`; `fieldSummary` is only `{customerId,vehicleId}`.

### 6.2 `DELETE /api/v1/customers/{id}/vehicles/{vehicleId}` → 204

Remove the association between that customer and that vehicle. The vehicle returns to "unlinked" and can be linked again. Do not change vehicle `status`.  
**Sold vehicles cannot be unlinked** (15): vehicle `status=SOLD` → **409** `SOLD_LOCKED` (sale record must not be erased).  
No such association or cross-dealership → **404** (not 403). Audit `CUSTOMER_VEHICLE` / `UNLINK`.

---

## 7. Ad listing

One listing per vehicle. Paths use **vehicle id** to get/save draft (handbook); check/Ready/Export use **listing id**.

### 7.1 `GET /api/v1/vehicles/{id}/listing`

No row: **do not insert, do not persist**; return a virtual empty draft (align 15):

```json
{
  "id": null,
  "vehicleId": 10,
  "title": "",
  "body": "",
  "adKind": "CASH",
  "medium": "ONLINE",
  "status": "DRAFT",
  "contentVersion": 1,
  "lastCheckId": null,
  "lastCheck": null,
  "checkStatus": "NEEDS_AI",
  "version": 0
}
```

If a row exists, `id` has a value and `lastCheck` is the latest check summary or `null`. Cross-dealership vehicle **404**.

### 7.2 `PATCH /api/v1/vehicles/{id}/listing`

No row → **INSERT**. Increment `contentVersion`, return `status` to `DRAFT`, void old checks (shown as `checkStatus=STALE` or `NEEDS_AI`, see §8).  
V1 `title`/`body` are NOT NULL: when the request omits them or they are blank, write **`''`** (15); do not send SQL `null`.

First create may omit `version` or send `0`. Later requests must send the current `version`.

```json
{
  "version": 0,
  "title": "2020 Toyota Camry",
  "body": "Cash price $18900. Sold as-is by Prairie Auto Ltd. 403-555-0100 ...",
  "adKind": "CASH",
  "medium": "ONLINE"
}
```

`adKind`: `CASH`\|`FINANCE`\|`LEASE`. `medium`: `ONLINE`\|`RADIO_TV_BILLBOARD`.  
Response matches 7.1 (now persisted). `404` / `409 VERSION_CONFLICT` / `400 VALIDATION`.

---

## 8. Check results, five states, Ready / Export

Page overall status **may only** be the five English values (handbook §6). The API exposes derived enum `checkStatus` on listing and check responses:

`BLOCKED` | `NEEDS_AI` | `PASSED` | `STALE` | `AI_UNAVAILABLE`

| UI | `checkStatus` | Server condition |
|---|---|---|
| Blocked | `BLOCKED` | current `lastCheck` matches `listing.contentVersion`, and `recommendation=BLOCKED` (`aiStatus=SKIPPED`, model not called) |
| Needs AI review | `NEEDS_AI` | no successful non-stale terminal state: no check, or `recommendation=NEEDS_AI`, or version already incremented after a previous Blocked/Unavailable |
| Passed | `PASSED` | `recommendation=PASSED` and `check.contentVersion == listing.contentVersion` |
| Stale | `STALE` | **previously** `PASSED`, but listing version has incremented (title/body/type/medium changed, or handbook-specified items such as condition changed) |
| AI unavailable | `AI_UNAVAILABLE` | current-version check `recommendation=UNAVAILABLE` (rules passed but AI failed/timed out), **must not** be treated as Pass |

`STALE` is **only** for "passed, then invalidated". After Blocked, editing copy and checking again shows `NEEDS_AI`, not Stale.

### 8.1 Check-result JSON (`lastCheck` and POST response)

`ruleFindings`: JSON array (column already in SQL). Element shape (new ruling; handbook only says array):

```json
{
  "ruleId": "PRICE",
  "severity": "BLOCK",
  "passed": false,
  "message": "Advertised price not found in the ad body."
}
```

`severity`: `BLOCK` (hard miss → whole check Blocked) or `REVIEW` (hand to AI).  
`aiNotes`: structured model notes; elements are at least `{ "message": "..." }`; may be `[]` / `null`.  
`aiStatus`: `SKIPPED`\|`SUCCESS`\|`FAILED`\|`UNAVAILABLE`.  
`recommendation`: `BLOCKED`\|`NEEDS_AI`\|`PASSED`\|`UNAVAILABLE`.

Full check object:

```json
{
  "id": 99,
  "listingId": 8,
  "contentVersion": 3,
  "ruleFindings": [
    {
      "ruleId": "PRICE",
      "severity": "BLOCK",
      "passed": false,
      "message": "Advertised price not found in the ad body."
    }
  ],
  "aiStatus": "SKIPPED",
  "aiNotes": null,
  "recommendation": "BLOCKED",
  "checkStatus": "BLOCKED",
  "createdAt": "2026-09-21T21:05:00Z"
}
```

### 8.2 `POST /api/v1/listings/{id}/checks`

```json
{ "version": 2 }
```

`version` = listing optimistic lock. Flow restates the handbook: this-dealership validation → fixed checklist → if no hard block, via Gateway `POST /internal/v1/ad-check` (adapter timeout ≤15s) → write `compliance_check`, write back `listing.last_check_id`.

| Result | HTTP | body |
|---|---|---|
| Blocked / Needs AI / Passed | **200** | full check object (includes `checkStatus`) |
| Rules passed, AI timeout or failure | **502** `AI_UNAVAILABLE` | standard error body. Check row **already written** as `UNAVAILABLE`, listing already points to it. Client then GET listing |
| listing version mismatch | **409** `VERSION_CONFLICT` | error body |
| Cross-dealership / no listing | **404** | error body |

**Blocked is not an HTTP error.** Do not use 4xx to mean "missing price / FINANCE missing APR".

### 8.3 `POST /api/v1/listings/{id}/ready`

```json
{ "version": 3 }
```

Only when the current check is Passed **and** not Stale. Success 200, listing `status=READY`, response matches GET listing.

| Code | HTTP |
|---|---|
| `CHECK_STALE` | 409 (previously passed but version incremented, or lastCheck version ≠ listing) |
| `NOT_PASSED` | 409 (Blocked / Needs AI / AI unavailable / no check) |
| `VERSION_CONFLICT` | 409 |
| — | 404 |

### 8.4 `POST /api/v1/listings/{id}/exports`

Body same as ready: `{ "version": 3 }`. Same 409/404.  
Success: **200** plain text. Content = dealership public four fields + vehicle public fields (year/make/model/vin/condition/source, **no cost**) + title/body + check time. Do not write customers.

---

## 9. Audit

### `GET /api/v1/audit`

Query: `entityType`, `entityId` required; `page`, `size` optional.

Staff: this dealership only. Entity not in this dealership → **404**.  
Admin: **do not** serve business entities (`VEHICLE`/`CUSTOMER`/`CUSTOMER_VEHICLE`/`LISTING`) → **403** `FORBIDDEN`, no `fieldSummary` business content.

`entityType`: `VEHICLE`\|`CUSTOMER`\|`CUSTOMER_VEHICLE` (staff query). Admin writes may use `DEALER`/`MEMBERSHIP`; **this query API does not open those two types to staff** (avoid treating bind-staff as business browsing). If Admin queries their own dealership-creation audit, they may use only `DEALER`/`MEMBERSHIP` and `dealerId` may be empty — if no Admin audit page is built, a uniform 403 for that role is acceptable.

```json
{
  "items": [
    {
      "id": 501,
      "entityType": "CUSTOMER_VEHICLE",
      "entityId": 77,
      "action": "UNLINK",
      "fieldSummary": { "customerId": 4, "vehicleId": 10 },
      "actorOid": "22222222-2222-2222-2222-222222222222",
      "createdAt": "2026-09-21T21:10:00Z"
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

`action`: `CREATE`\|`UPDATE`\|`SELL`\|`LINK`\|`UNLINK`. `fieldSummary` has no full customer phone/email/address.

---

## 10. Assistant `POST /api/v1/assistant/ask`

`Dealer.User` only. Admin → 403. **Do not write** vehicle/customer/listing/check tables.

Request (handbook `{text}`):

```json
{ "text": "Which in-stock Toyotas do we have?" }
```

Empty `text` → `400 VALIDATION`.

Response: short summary + **at most 5** dealership resource cards. Cards have no phone, email, or address. Model-returned ids must fall in the set core just retrieved; otherwise drop them.

```json
{
  "summary": "Two in-stock Toyotas match. Open a card for DMS.",
  "summaryAvailable": true,
  "cards": [
    {
      "kind": "VEHICLE",
      "id": 10,
      "label": "2020 Toyota Camry",
      "status": "IN_STOCK"
    },
    {
      "kind": "CUSTOMER",
      "id": 4,
      "label": "Jane Doe"
    },
    {
      "kind": "LISTING",
      "id": 8,
      "vehicleId": 10,
      "label": "2020 Toyota Camry listing",
      "checkStatus": "STALE"
    }
  ]
}
```

`kind`: `VEHICLE`\|`CUSTOMER`\|`LISTING`. Vue routes are not specified here.  
Model down: `summary` is `null`, `summaryAvailable=false`, `cards` are still the retrieval list (at most 5). HTTP **200** (retrieval succeeded). 403 only when staff identity fails.  
core calls the internal assistant via Gateway; recent conversation context is at most 3 filtered text turns (handbook 10), **not persisted to business tables**.

---

## 11. Internal only (browser 404)

**Response bodies are not pinned here.** Use [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) §B: success `{success,notes[]}` / `{success,summary}`; failure `{success:false,code,message}` with **504** `AI_TIMEOUT` / **503** `AI_KEY_MISSING` / **502** `AI_PROVIDER_FAILED`.

Gateway forwards to ai-service. core calls these; the browser does not.

### `POST /internal/v1/ad-check`

```json
{
  "listing": {
    "title": "2020 Toyota Camry",
    "body": "...",
    "adKind": "FINANCE",
    "medium": "ONLINE"
  },
  "vehiclePublic": {
    "modelYear": 2020,
    "make": "Toyota",
    "model": "Camry",
    "vin": "1HGCM82633A004352",
    "conditionCode": "AS_IS",
    "source": "AUCTION"
  },
  "dealerPublic": {
    "legalName": "Prairie Auto Ltd.",
    "contactPhone": "403-555-0100",
    "contactEmail": "desk@prairie.example",
    "contactAddress": "100 1 Ave SW, Calgary"
  }
}
```

`vehiclePublic` has **no** purchase/repair/sold price. ai-service folds model output into notes for core to persist; transport failure is recorded by core as `UNAVAILABLE`.

### `POST /internal/v1/assistant`

```json
{
  "question": "Which in-stock Toyotas do we have?",
  "resources": [
    { "kind": "VEHICLE", "id": 10, "label": "2020 Toyota Camry", "status": "IN_STOCK" }
  ]
}
```

`resources` are already filtered by core. Return short text; core re-checks ids.

---

## 12. Error-code catalog

| code | HTTP | Meaning |
|---|---|---|
| `VALIDATION` | 400 | missing field, illegal enum, bad format |
| `VIN_DUP` | 400 | VIN already exists in this dealership |
| `SOLD_PAIR_REQUIRED` | 400 | sell missing date or price |
| `WRONG_DEALER_OR_SOLD` | 400 | **PROTOCOL A.1:** this-store vehicle on PUT link, but sold / not `IN_STOCK`. Cross-store ids are **404**, not this code. |
| `UNAUTHORIZED` | 401 | not signed in |
| `FORBIDDEN` | 403 | role not allowed for this URL; or staff has no valid membership |
| `NOT_FOUND` | 404 | no resource or cross-dealership |
| `VERSION_CONFLICT` | 409 | `version` mismatch |
| `DUP_MEMBER` | 409 | this dealership already has this active member |
| `VEHICLE_ALREADY_LINKED` | 409 | vehicle already linked to a customer |
| `SOLD_LOCKED` | 409 | sold purchase edit, sell again, or **unlink a sold vehicle** |
| `CHECK_STALE` | 409 | check expired at Ready/Export |
| `NOT_PASSED` | 409 | not Passed at Ready/Export |
| `AI_UNAVAILABLE` | 502 | ad-check AI failure/timeout |

---

## 13. Do not build (do not bring the retired draft back)

Password login, CSRF cookie sessions, tickets, leads, sales orders, KPI dashboard, buyer `/public/**`, Service Bus, arbitrary `dealerId` dealership switching, Admin reading/writing vehicles/customers/ads.
