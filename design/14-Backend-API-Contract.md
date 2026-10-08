# Backend API development contract

Version v6.0 · 2026-09-21  
**Current.** Retired `01`–`06` (including archived `04-API-Contract.md` under [archive/](archive/)) are not the current API. Old DTOs may be used only for envelope shape; entities follow v6 / Flyway `V1__init.sql`.

**Conflict order:** course PPT hard items > spec PDF fields > [IMPLEMENTATION-BRIEF.md](IMPLEMENTATION-BRIEF.md) / `00` > **[15](15-Data-Auth-and-Gateway.md) owns data/tenant/gateway behavior**, **this document owns HTTP JSON** > [13](13-Frontend-Engineering.md) frontend engineering > [12](12-Frontend-UI-Conventions.md).  
**Entry:** browser-to-service traffic goes only through Gateway `http://localhost:8080`, prefix **`/api/v1/**`**. core=`8081`, ai-service=`8082` are not public. Bypassing Gateway must fail.  
**Internal:** Gateway → ai-service `/internal/v1/**` is **404** for the browser; this document writes those paths only for the core adapter.  
**PROTOCOL wins** over this document’s §11 response sketches and any OpenAPI internal sketches that still show `{failed,reason}`. Internal success/failure JSON follows [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md). Cross-dealership ids are always **404**. PUT link does not reject a same-store sold vehicle: `CustomerService.link` links an in-stock or sold vehicle that is not already linked, and it does not throw `WRONG_DEALER_OR_SOLD`.

Path-table summary is in `dealer-platform/API.md`. Coding follows this document's JSON and error codes.

---

## 0. New rulings in this document vs handbook restatement

Nullability of data columns, whether `membership` / `app_user` is authoritative, indexes, and V2 are all left to **document 15**. This document writes HTTP behavior only.

| Type | Content |
|---|---|
| **Handbook restatement only** | two roles; ignore frontend `dealerId`; cross-dealership **404 not 403**; Admin hitting business URLs gets no business fields; error body `{code,message}`; writes carry `version` → `409 VERSION_CONFLICT`; ad five-state conditions; check rules then AI (≤15s); Ready/Export only when Passed and not Stale; assistant does not write business tables; internal `vehiclePublic` has no purchase cost; assistant `resources` have no phone/email/address; lists default to 10 per page; VIN unique per dealership; sell as a pair; sold locks purchase fields; one vehicle one customer |
| **New rulings here** | pagination envelope `{items,page,size,total}` (handbook says 10 per page but not the envelope); **unlink** `DELETE /customers/{id}/vehicles/{vehicleId}` → 204; Admin **GET/PATCH** single dealership (handbook has list+create only); `SOLD_LOCKED` is always **409**; Blocked checks are **200**; `AI_UNAVAILABLE` is **502** and already persisted; derived fields `checkStatus` / `staffCount` / list `linkedVehicle`; 400 `VALIDATION` may include `fieldErrors`; JSON `id` is a number (do not use string ids from the retired draft); money is a JSON number; Admin↔business URL role mismatch is **403** `FORBIDDEN`; HTTP semantics of bind/unbind (whether the row is soft-deleted is left to 15) |
| **Extensions (design/21)** | self sign-up and sign-in by email, username, or phone (§1.4–1.5), pending accounts and binding without a password (§3.6, §3.8), staff member directory (§5.6), lead follow-up (§5.5), work orders (§4.7), Image Studio photos (§4.8), public VIN decode (§4.6.1), `openWorkOrders` on vehicles, sell blocked by open work orders. Requirement IDs and rationale live in [21](21-Feature-Extensions.md) |
| **Aligned with 15** | GET listing with no row: **do not persist**, virtual empty draft; first PATCH uses `''` to satisfy `title`/`body` NOT NULL. Tenant authority is `membership.active=1`; ignore client `dealerId`. Cross-dealership id → **404**. Staff with no valid membership calling business APIs → **403** `FORBIDDEN` (signed in, no dealership — not 401/404). Sold vehicles: a new link is allowed when the vehicle is not already linked; unlink stays **409** `SOLD_LOCKED` |

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
| 400 | validation failure, `VIN_DUP`, `SOLD_PAIR_REQUIRED` |
| 401 | missing/bad JWT |
| 403 | insufficient role (Admin↔staff hitting the wrong prefix); **staff with no valid `membership.active=1` calling a business API** (signed in, no dealership). **Not** cross-dealership |
| 404 | this id is not in this dealership, **cross-dealership id** (anti-probing, not 403) |
| 405 | `METHOD_NOT_ALLOWED` (HTTP method not supported on this path) |
| 409 | `VERSION_CONFLICT`, `DUP_MEMBER`, `VEHICLE_ALREADY_LINKED`, `SOLD_LOCKED`, `CHECK_STALE`, `NOT_PASSED` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` (body is not `application/json`) |
| 500 | `INTERNAL_ERROR` (unexpected error; details logged server-side only) |
| 502 | `AI_UNAVAILABLE` (rules passed, model timeout/failure; check row already written); `CATALOG_UNAVAILABLE` (vehicle catalog upstream failed, §4.6) |

### 1.3 Identity, tenant, optimistic lock

- Roles are only `Platform.Admin` and `Dealer.User`. Staff tenant authority is **exactly one `membership.active=1` row** (15); `app_user.dealer_id` is only a `/me` cache.
- **Ignore** client `dealerId` in body / query / header. Staff tenant comes only from JWT `sub` (the username) → membership. Admin `dealerId` is always treated as empty.
- Cross-dealership resource id: **404**, not 403 (anti-probing).
- `Dealer.User` signed in with **0** active memberships: business APIs (`/vehicles` `/customers` `/listings` `/audit` `/assistant`) → **403** `FORBIDDEN`, not 401 and not 404. `GET /me` is still 200 (`dealerId=null`).
- Writes that carry `version`: `dealer`, `vehicle`, `customer`, `listing` (including checks/ready/export). Request `version` must equal the current row. Conflict **409** `VERSION_CONFLICT`.
- `customer_vehicle` has no `version` column: link/unlink do not use optimistic locking.
- Enums and required fields match handbook section 3; do not add or remove spec fields. Dates `YYYY-MM-DD`, timestamps ISO-8601 UTC. JSON camelCase.

### 1.4 `POST /api/v1/auth/login` (anonymous)

One of the anonymous `/api/v1` operations. Auth design is owned by [15](15-Data-Auth-and-Gateway.md) §8. `identifier` is the account's email, username, or phone, paired with the password.

```json
{ "identifier": "alex@example.com", "password": "temporary-pass-1" }
```

Response **200**:

```json
{ "accessToken": "<HS256 JWT>", "role": "Dealer.User", "displayName": "Alex Dealer" }
```

The token carries `sub` (the username), `name`, and `roles`; send it as `Authorization: Bearer <accessToken>` on every other call. Resolution order: a value containing `@` is an email (case-insensitive); otherwise an active account with that exact username; otherwise, if it is a valid phone number with country code (spaces, dashes, and brackets ignored), the account with that phone. Blank identifier or password → `400 VALIDATION`. Unknown identifier, inactive account, or wrong password → `401 UNAUTHORIZED` with one message (`Invalid sign-in name or password`).

### 1.5 `POST /api/v1/auth/register` (anonymous)

Self sign-up (AUTH-16). Creates an active `Dealer.User` with **no dealership**; the platform admin must bind it (§3.6, §3.8) before any business API works (until then business calls return **403**). Requires `username` (3–64 of letters, digits, `.`, `_`, `-`, with at least one letter), `displayName` (1–120), at least one of a valid `email` (≤ 254) or an international `phone` with country code (both allowed), and `password` (8–72). The user can then sign in with any of username, email, or phone. Audited as `APP_USER` / `CREATE` (actor = the username, no `dealerId`).

```json
{ "username": "alex.dealer", "displayName": "Alex Dealer", "email": "alex@example.com", "phone": "+14035550100", "password": "temporary-pass-1" }
```

Response **201**: same `LoginResponse` as §1.4. Every error names its field in `fieldErrors` (keys `username`, `displayName`, `email`, `phone`, `password`; messages in English):

| Case | Status and code |
|---|---|
| Missing or malformed field; invalid email; phone without a valid country code; neither email nor phone (both keys set) | **400** `VALIDATION` |
| Username already used | **409** `USERNAME_TAKEN` |
| Full name already used (trimmed, case-insensitive; unique key `uk_app_user_display_name`) | **409** `DISPLAY_NAME_TAKEN` |
| Email already used (canonical lower case) | **409** `EMAIL_TAKEN` |
| Phone already used (canonical `+digits`) | **409** `PHONE_TAKEN` |

When several values are taken, `code` is the first in the order above and `fieldErrors` lists all of them. Admin bind of a new user (§3.6) applies the same rules.

---

## 2. `GET /api/v1/me`

| | |
|---|---|
| Who | signed in |
| Request | no body |
| Errors | `401` not signed in |

```json
{
  "username": "alex.dealer",
  "displayName": "Alex Dealer",
  "role": "Dealer.User",
  "dealerId": 1,
  "dealerLegalName": "Prairie Auto Ltd.",
  "dealerContactPhone": "403-555-0100",
  "dealerContactEmail": "sales@prairieauto.ca",
  "dealerContactAddress": "100 Main St, Calgary",
  "dealerLogoDataUrl": "data:image/png;base64,iVBORw0KGgo..."
}
```

Admin: `dealerId`, `dealerLegalName`, the three `dealerContact*` fields, and `dealerLogoDataUrl` are `null`. They are display-only derived fields (the ad page shows the contact fields, UI-41; the app header shows the legal name and logo), not a second set of dealership data. `dealerLogoDataUrl` is `null` when the dealership has no logo.

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
      "logoDataUrl": null,
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

`staffCount`: count of that dealership's **active memberships** (derived; column definition is in 15). `logoDataUrl`: the dealership logo as an image data URL, or `null` (set only through 3.4).

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
  "logoDataUrl": null,
  "active": true,
  "staffCount": 2,
  "version": 0
}
```

### 3.4 `PATCH /api/v1/admin/dealers/{id}`

The handbook has no update. **New ruling:** allow changing the four contact fields, `active`, and the dealership logo; `version` is required. The Admin page uses this for its `Edit` dealership drawer (13 §5.3). Do not add `DELETE /admin/dealers/{id}` (the spec does not require deleting dealerships).

```json
{
  "version": 0,
  "legalName": "Prairie Auto Ltd.",
  "contactPhone": "403-555-0101",
  "contactEmail": "desk@prairie.example",
  "contactAddress": "100 1 Ave SW, Calgary",
  "active": true,
  "logoDataUrl": "data:image/png;base64,iVBORw0KGgo..."
}
```

Every field in the example except `logoDataUrl` is required (full replacement; the four strings are non-blank). `logoDataUrl` is optional: `null` or missing removes the logo. When present it must be a `data:image/(png|jpeg|webp);base64,...` URL of at most 200,000 characters, else `400 VALIDATION`. The logo is stored in the database (no file storage service); the web client downscales the uploaded file to at most 160 px on the long side and sends PNG. Response matches 3.3. Errors: `400`, `404`, `409 VERSION_CONFLICT`. Ignore body.`id`.

### 3.5 `GET /api/v1/admin/dealers/{id}/members`

Dealership missing → 404. Paginated envelope (`page`/`size`/`q` matches `displayName` or `username`).

```json
{
  "items": [
    {
      "username": "alex.dealer",
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
{ "username": "user_9d20…", "displayName": "Alex Dealer", "password": "temporary-pass-1", "email": "alex@example.com" }
```

Write `membership` + `app_user` (column authority is in 15). Response matches a member item.  
**Existing account** (for example a self sign-up from §3.8): identify the account by its username for binding; `displayName`, `password`, and contact fields may be omitted, and they are never changed — the person keeps signing in with their own email, username, or phone and password. **New account:** the admin supplies a username, display name, temporary password, and an email and/or phone (at least one); the person can sign in with any of them. Missing or invalid details → `400 VALIDATION`.
`400 VALIDATION`; dealership 404; already an **active** member of that dealership, still active at another dealership, or the username belongs to a `Platform.Admin` account → **409** `DUP_MEMBER` (an admin account is never overwritten or demoted).  
Binding an already-unbound person again is treated as **reactivation**, not 409 (whether the same row is updated is left to 15). Do not delete the `app_user` account.

### 3.7 `DELETE /api/v1/admin/dealers/{id}/members/{username}` → 204

Unbind; do not delete the `app_user` account. No such binding → 404.

### 3.8 `GET /api/v1/admin/pending-users`

Platform.Admin only (staff → 403). Active `Dealer.User` accounts with no active membership — self sign-ups and unbound former staff — newest first. Query `q` (username, display name, email, or phone contains), `page`, `size`.

```json
{ "items": [ { "username": "user_9d20…", "displayName": "Ada Lee", "email": "ada@example.com", "phone": null, "createdAt": "2026-10-08T21:59:51Z" } ],
  "page": 0, "size": 10, "total": 1 }
```

The Admin Members tab lists these under **Pending accounts** with `Add to dealership`, which calls §3.6 without a password.

---

## 4. Vehicles DMS (Dealer.User)

Admin hitting any URL in this section → **403** `FORBIDDEN` (same as CRM/ads/assistant; the body must not contain vin/cost or other business fields). Staff sees this dealership only. Staff with no valid membership → **403** (see §1.3).

List query: `q` (substring of VIN / make / model), `make` and `model` (exact match, ignoring case), `modelYear` (exact), `status`=`IN_STOCK`\|`SOLD`, `condition` (that is `conditionCode`), `page`, `size`. Blank values are ignored and the filters combine with AND. Default `createdAt` descending.

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
      "linkedCustomer": null,
      "version": 0
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

`linkedCustomer` is `{ "id": 4, "name": "Jane Doe" }` when the vehicle is linked to a customer, otherwise `null` (DMS-08, CRM-10). It never carries customer contact fields (CRM-12).

Every vehicle response (list, detail, create, patch, sell) also carries `openWorkOrders`: the number of `OPEN` + `IN_PROGRESS` work orders (§4.7, WO-07), placed before `version`.

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
The server trims `make` / `model` (1-50 characters) and upper-cases `vin`. `400 VALIDATION` covers the field rules in requirements/analysis/02-DMS-Vehicles.md (VIN 17 chars without I/O/Q, 1900 ≤ `modelYear` ≤ next year, costs ≥ 0, `addedOn` not in the future, `carfaxUrl` http(s)); PATCH applies the same rules.  
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

Whitelist is the fields above only; all are required except `repairCost` and `carfaxUrl` (full replacement, same rules as 4.2). Do not use PATCH to change `status` / `soldOn` / `soldPrice` (use `/sell`). Ignore `dealerId`.  
Changing purchase fields on a sold vehicle (make/model/year/vin/source/purchaseCost/addedOn/repairCost/carfax) → **409** `SOLD_LOCKED`.  
Changing VIN while unsold is still unique per dealership → `400 VIN_DUP`.  
Changing `conditionCode` (handbook: a condition change voids the old check) → increment the corresponding listing `contentVersion++` (if a listing exists). Changing purchase cost alone does not void the ad.  
Audit `VEHICLE`/`UPDATE`. Other errors: `404`, `409 VERSION_CONFLICT`.

### 4.5 `POST /api/v1/vehicles/{id}/sell`

```json
{ "soldOn": "2026-09-20", "soldPrice": 18900.00, "version": 1 }
```

Both values must be present together. Server sets `status=SOLD`. Response = detail.  
`400 SOLD_PAIR_REQUIRED` (date or price missing); `400 VALIDATION` (`soldOn` in the future or before `addedOn`, `soldPrice` ≤ 0); selling again after sold → `409 SOLD_LOCKED`; an `OPEN` or `IN_PROGRESS` work order exists → `409 WORK_ORDERS_OPEN` ("Finish or cancel open work orders before selling."); `409 VERSION_CONFLICT`; `404`. Audit `VEHICLE`/`SELL`.

### 4.6 Vehicle catalog: `GET /api/v1/vehicle-catalog/makes` and `GET /api/v1/vehicle-catalog/models?make=`

Option lists for the DMS Make → Model → Year filter (13 §5.4). Data comes from the free NHTSA vPIC API (no key). dealer-core calls it at `VPIC_BASE_URL` (default `https://vpic.nhtsa.dot.gov/api/vehicles`) so the browser still talks only to the Gateway. Makes are the union of the vPIC `car` and `mpv` vehicle types; models come from `GetModelsForMake`. Both return a JSON array of names, trimmed, de-duplicated ignoring case, and sorted:

```json
["Camry", "Corolla", "RAV4"]
```

Who: any user with business access (§1.3). Successful lookups are cached in memory until dealer-core restarts. Errors: missing `make` → `400 VALIDATION`; vPIC unreachable or malformed → `502 CATALOG_UNAVAILABLE` (the web filter then lets the user type a make and model).

#### 4.6.1 VIN decode: `GET /api/v1/vehicle-catalog/vin/{vin}` (public)

Decodes one VIN through vPIC `DecodeVinValues`. Used by the signed-out landing page VIN decoder and by the DMS **Add vehicle** form (`Decode` prefills make, model, and year). **Anonymous:** no JWT required; the gateway and core both permit `GET` on this path only. Response (blank vPIC values become `null`; `engine` is built from displacement, cylinders, and primary fuel):

```json
{ "vin": "1HGCM82633A004352", "make": "HONDA", "model": "Accord", "modelYear": 2003,
  "bodyClass": "Coupe", "engine": "3.0L 6-cyl Gasoline", "country": "UNITED STATES (USA)",
  "manufacturer": "AMERICAN HONDA MOTOR CO., INC." }
```

Successful decodes are cached in memory until dealer-core restarts. Errors: VIN not 17 characters or contains I/O/Q → `400 VALIDATION`; vPIC returns no make → `404 NOT_FOUND`; vPIC unreachable or malformed → `502 CATALOG_UNAVAILABLE`. Nothing is stored; the decode never creates a vehicle. The DMS form shows body class, engine, country, and manufacturer under the VIN field for reference; they are not saved (VIN-03).

### 4.7 Work orders (Dealer.User)

Reconditioning tasks on one vehicle ([21](21-Feature-Extensions.md) §4). Admin or unbound → 403; another dealership's vehicle or work order → 404.

```json
{ "id": 7, "vehicleId": 12, "task": "Replace front brake pads", "assigneeUsername": "a1",
  "status": "OPEN", "dueOn": "2026-10-20", "cost": null, "completionNote": null,
  "completedOn": null, "createdAt": "2026-10-08T21:40:00Z", "version": 0 }
```

| Method and path | Body | Result |
|---|---|---|
| `GET /api/v1/vehicles/{vehicleId}/work-orders` | — | 200 array: `OPEN`/`IN_PROGRESS` first, then closed, each newest first. Works for sold vehicles (history) |
| `POST /api/v1/vehicles/{vehicleId}/work-orders` | `task` (1–200), `assigneeUsername?`, `dueOn?` | 201. Sold vehicle → `409 SOLD_LOCKED`; assignee not an active member of this dealership → `400 VALIDATION` |
| `PATCH /api/v1/work-orders/{id}` | full editable state: `status`, `task`, `assigneeUsername`, `dueOn`, `cost` and `completionNote` (read for `DONE` only), `version` | 200 |

Transitions: `OPEN → IN_PROGRESS | DONE | CANCELLED`; `IN_PROGRESS → DONE | CANCELLED`; keeping the same status edits task, assignee, or due date. Errors: stale `version` → `409 VERSION_CONFLICT`; already `DONE`/`CANCELLED` → `409 WORK_ORDER_CLOSED`; other transitions → `400 VALIDATION`; `DONE` without a completion note (≤ 500) or a cost ≥ 0 → `400 VALIDATION`; sold vehicle → `409 SOLD_LOCKED`.
`DONE` sets `completedOn` to today and adds `cost` to the vehicle's `repairCost` in the same transaction (vehicle `version` increments, audit `VEHICLE`/`UPDATE` `{repairCost}`). Audit `WORK_ORDER`/`CREATE` and `WORK_ORDER`/`UPDATE` with the changed keys.

### 4.8 Image Studio photos (Dealer.User)

Vehicle photos with automatic enhancement ([21](21-Feature-Extensions.md) §6). Photos are stored in MySQL; the original never changes. Admin → 403; another dealership's vehicle or photo → 404. Sold vehicles may still have photos.

`PhotoItem`: `{ "id", "vehicleId", "contentType", "enhancement": null | "AUTO" | "BRIGHTEN" | "SHARPEN", "uploadedBy", "createdAt" }`.

| Method and path | Request | Result |
|---|---|---|
| `GET /api/v1/vehicles/{vehicleId}/photos` | — | 200 `PhotoItem[]`, oldest first, metadata only |
| `POST /api/v1/vehicles/{vehicleId}/photos` | `multipart/form-data`, part `file` | 201 `PhotoItem` |
| `GET /api/v1/vehicles/{vehicleId}/photos/{photoId}/content?variant=original\|enhanced` | — | 200 image bytes (`image/jpeg` or `image/png` for the original, always `image/jpeg` enhanced), `Cache-Control: no-store` |
| `POST /api/v1/vehicles/{vehicleId}/photos/{photoId}/enhance` | `{ "preset": "AUTO" \| "BRIGHTEN" \| "SHARPEN" }` | 200 `PhotoItem`; replaces the previous enhanced copy |
| `DELETE /api/v1/vehicles/{vehicleId}/photos/{photoId}` | — | 204 |

Errors: not JPEG/PNG (checked from the bytes, not the declared type) → `415 UNSUPPORTED_MEDIA_TYPE`; over 2 MB → `400 VALIDATION` "Photo must be 2 MB or smaller."; an 11th photo → `400 VALIDATION`; empty `file` → `400 VALIDATION`; image over 40 megapixels → `400 VALIDATION`; `variant=enhanced` before any enhancement → 404; other `variant` or missing `preset` → `400 VALIDATION`. Limits are configuration (`PHOTO_MAX_FILE_SIZE`, `PHOTO_MAX_REQUEST_SIZE`, `PHOTO_MAX_PER_VEHICLE`, `PHOTO_MAX_EDGE_PX`). Audit `VEHICLE_PHOTO`: `CREATE`, `UPDATE` (`enhancement`), `DELETE`.

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
      "linkedVehicleCount": 1,
      "version": 0
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

`linkedVehicle`: when multiple vehicles exist, take the most recent `linkedAt` for the CRM table column; detail is the full array in 5.3. Unlinked is `null`. `linkedVehicleCount` is the number of linked vehicles (CRM list "vehicles purchased", UI-30).

### 5.2 `POST /api/v1/customers` → 201

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "403-555-0199",
  "homeAddress": "12 Oak St"
}
```

Field rules: `name` ≤ 100, `email` valid, ≤ 254, trimmed and stored lower-case (`customer.email` is `VARCHAR(254)` since `V20261007_2`), `phone` 7–20 digits using only digits, `+`, `-`, `(`, `)`, spaces (≤ 40 chars), `homeAddress` ≤ 300; all non-blank. Ignore `dealerId`. `400 VALIDATION`. Audit `CUSTOMER`/`CREATE`. Response = detail (`linkedVehicles: []`).

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

All fields are required (full replacement, same rules as 5.2). Ignore `dealerId`. `400 VALIDATION`, `409 VERSION_CONFLICT`. Audit `CUSTOMER`/`UPDATE`. `fieldSummary` **must not** contain full phone/email/address text.

---

### 5.5 Leads (Dealer.User)

Lead follow-up ([21](21-Feature-Extensions.md) §3). Admin or unbound → 403; another dealership's lead or customer → 404.

| Method and path | Body / query | Result |
|---|---|---|
| `GET /api/v1/leads` | `q` (customer name contains), `stage`, `owner` (exact username), `customerId`, `overdue` (`true` = open stage and `nextFollowUpOn` before today, server date), `page`, `size` | page of list rows, newest first |
| `POST /api/v1/leads` | exactly one of `customerId` or `newCustomer{name,email,phone,homeAddress}` (same rules as §5.2; the customer is created and audited in the same transaction); `vehicleId?`, `ownerUsername?`, `nextFollowUpOn?`, `note?` (first note) | 201 detail; stage starts `NEW` |
| `GET /api/v1/leads/{id}` | — | detail with notes newest first |
| `PATCH /api/v1/leads/{id}` | full editable state: `stage`, `ownerUsername`, `nextFollowUpOn`, `vehicleId`, `lostReason`, `version` (null clears a field) | 200 detail |
| `POST /api/v1/leads/{id}/notes` | `{ "body": "1–2000 chars" }` | 201 `{ id, authorUsername, body, createdAt }`; closed leads still accept notes |

List row: `{ id, customerId, customerName, vehicle: { id, vin, modelYear, make, model, status } | null, stage, ownerUsername, nextFollowUpOn, overdue, version }`. Detail adds `lostReason`, `notes`, `createdAt`.
Stages `NEW`, `CONTACTED`, `QUALIFIED`, `WON`, `LOST`; any stage may be chosen while the lead is open; `WON` and `LOST` are final. `WON` does not sell the vehicle or link it — those stay §4.5 and §6.
Errors: both or neither customer source → `400 VALIDATION`; owner not an active member → `400 VALIDATION`; vehicle not `IN_STOCK` in this dealership → `400 WRONG_DEALER_OR_SOLD`; `LOST` without a reason → `400 VALIDATION` (`lostReason` is cleared for other stages); changing a `WON`/`LOST` lead → `409 LEAD_CLOSED`; stale `version` → `409 VERSION_CONFLICT`.
Audit `LEAD`: `CREATE` (`customerId`, `stage`, `vehicleId?`), `UPDATE` (changed keys), `NOTE` (`noteId` only — note text is never copied into the audit). Lead data is never sent to AI.

### 5.6 `GET /api/v1/members` (Dealer.User)

The caller's dealership's active members, sorted by username, for the lead owner and work-order assignee pickers. Admin or unbound → 403. `displayName` falls back to the username.

```json
[ { "username": "a1", "displayName": "Alice Staff" }, { "username": "a2", "displayName": "a2" } ]
```

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
| — | 404 | customer or vehicle id does not exist for this dealership (cross-dealership is also 404) |

`CustomerService.link` does not read `vehicle.status` and does not throw `WRONG_DEALER_OR_SOLD`. A same-store `SOLD` vehicle with no existing `customer_vehicle` row is linked the same way as an `IN_STOCK` vehicle.

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

`entityType`: `VEHICLE`\|`CUSTOMER`\|`CUSTOMER_VEHICLE`\|`LEAD`\|`WORK_ORDER`\|`VEHICLE_PHOTO` (staff query). A deleted photo's id stays queryable while its audit rows exist in this dealership. Admin writes may use `DEALER`/`MEMBERSHIP`; **this query API does not open those two types to staff** (avoid treating bind-staff as business browsing). If Admin queries their own dealership-creation audit, they may use only `DEALER`/`MEMBERSHIP` and `dealerId` may be empty — if no Admin audit page is built, a uniform 403 for that role is acceptable.

```json
{
  "items": [
    {
      "id": 501,
      "entityType": "CUSTOMER_VEHICLE",
      "entityId": 77,
      "action": "UNLINK",
      "fieldSummary": { "customerId": 4, "vehicleId": 10 },
      "actorUsername": "alex.dealer",
      "createdAt": "2026-09-21T21:10:00Z"
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

`action`: `CREATE`\|`UPDATE`\|`SELL`\|`LINK`\|`UNLINK`\|`NOTE`\|`DELETE`. `fieldSummary` has no full customer phone/email/address.

---

## 10. Assistant `POST /api/v1/assistant/ask`

`Dealer.User` only. Admin → 403. **Do not write** vehicle/customer/listing/check tables.

Request (handbook `{text}`):

```json
{ "text": "Which in-stock Toyotas do we have?" }
```

Empty `text` → `400 VALIDATION`.

Response: short summary + **at most 5** dealership resource cards. Cards have no phone, email, or address. Model-returned ids must fall in the set core just retrieved; otherwise drop them. When the summary names one or more retrieved ids, `cards` holds only those; when it names none, `cards` is the whole retrieval list. An id counts as named only when written as an id (`#12`, `id 12`, `vehicle 12`, `customer id 12`); a bare number such as a count ("2 Toyotas match") or a model year is not a reference.

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
core calls the internal assistant via Gateway with the question and the retrieved resources only. A three-turn cap, if kept, limits only what may be sent and is not a `ConcurrentHashMap` or deque. Per-user turns are not retained in memory, because that history is not sent and must not grow for the life of the JVM. It is **not persisted to business tables**.

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
| `WRONG_DEALER_OR_SOLD` | 400 | Declared on `ErrorCode`. `CustomerService.link` does not throw it. A same-store sold vehicle may be linked. A missing or cross-dealership id is `NOT_FOUND` (404). An existing link is `VEHICLE_ALREADY_LINKED` (409). |
| `UNAUTHORIZED` | 401 | not signed in |
| `FORBIDDEN` | 403 | role not allowed for this URL; or staff has no valid membership |
| `NOT_FOUND` | 404 | no resource or cross-dealership; also an unknown API path |
| `METHOD_NOT_ALLOWED` | 405 | HTTP method not supported on this path |
| `VERSION_CONFLICT` | 409 | `version` mismatch |
| `DUP_MEMBER` | 409 | this dealership already has this active member |
| `USERNAME_TAKEN` | 409 | self sign-up (§1.5) or new member (§3.6) with a username already in use |
| `DISPLAY_NAME_TAKEN` | 409 | same, with a full name already in use (trimmed, case-insensitive) |
| `EMAIL_TAKEN` | 409 | same, with an email already in use |
| `PHONE_TAKEN` | 409 | same, with a phone number already in use |
| `LEAD_CLOSED` | 409 | change to a `WON` or `LOST` lead (§5.5) |
| `WORK_ORDER_CLOSED` | 409 | change to a `DONE` or `CANCELLED` work order (§4.7) |
| `WORK_ORDERS_OPEN` | 409 | sell while `OPEN`/`IN_PROGRESS` work orders exist (§4.5) |
| `VEHICLE_ALREADY_LINKED` | 409 | vehicle already linked to a customer |
| `SOLD_LOCKED` | 409 | sold purchase edit, sell again, or **unlink a sold vehicle** |
| `CHECK_STALE` | 409 | check expired at Ready/Export |
| `NOT_PASSED` | 409 | not Passed at Ready/Export |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | request body is not `application/json`; or an uploaded photo is not JPEG/PNG (§4.8) |
| `INTERNAL_ERROR` | 500 | unexpected server error; details are logged server-side only |
| `AI_UNAVAILABLE` | 502 | ad-check AI failure/timeout |
| `CATALOG_UNAVAILABLE` | 502 | NHTSA vPIC vehicle catalog unreachable or malformed (§4.6) |

---

## 13. Do not build (do not bring the retired draft back)

Social-provider authentication, tickets, sales orders, sales-funnel reports, KPI dashboard, buyer `/public/**`, Service Bus, arbitrary `dealerId` dealership switching, Admin reading/writing vehicles/customers/ads.
