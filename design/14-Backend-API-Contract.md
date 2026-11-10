# Backend API development contract

Version v6.1 · 2026-10-16  
**Current.** Retired `01`–`06` (including archived `04-API-Contract.md` under [archive/](archive/)) are not the current API. Old DTOs may be used only for envelope shape; entities follow v6 / Flyway `V1__init.sql`.

**Conflict order:** course PPT hard items > spec PDF fields > [IMPLEMENTATION-BRIEF.md](IMPLEMENTATION-BRIEF.md) / `00` > **[15](15-Data-Auth-and-Gateway.md) owns data/tenant/gateway behavior**, **this document owns HTTP JSON** > [13](13-Frontend-Engineering.md) frontend engineering > [12](12-Frontend-UI-Conventions.md).  
**Entry:** browser-to-service traffic goes only through Gateway `http://localhost:8080`, prefix **`/api/v1/**`**. core=`8081`, ai-service=`8082` are not public. Bypassing Gateway must fail. Core and ai-service answer **404** `{code, message}` when `X-Dealer-Internal` is missing or wrong (core also sends `requestId`). The one exception is `GET /actuator/health`, which is open for the App Service health probe and returns only a status. The gateway attaches that header only on the outbound proxy and on its own health and OpenAPI fetches. A browser that sends the header on `/api/v1` is still **404** at the gateway.
**Internal:** core → ai-service `/internal/v1/**` (direct, at `AiService:BaseUrl`, with the `X-Dealer-Internal` header) is **404** for the browser; this document writes those paths only for the core adapter.  
**PROTOCOL wins** over this document’s §11 response sketches and any OpenAPI internal sketches that still show `{failed,reason}`. Internal success/failure JSON follows [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md). Cross-dealership ids are always **404**. PUT link does not reject a same-store sold vehicle: `CustomerService.link` links an in-stock or sold vehicle that is not already linked, and it does not throw `WRONG_DEALER_OR_SOLD`.

Path-table summary is in `dealer-platform/API.md`. Coding follows this document's JSON and error codes.

---

## 0. New rulings in this document vs handbook restatement

Nullability of data columns, whether `membership` / `app_user` is authoritative, indexes, and V2 are all left to **document 15**. This document writes HTTP behavior only.

| Type | Content |
|---|---|
| **Handbook restatement only** | two roles; ignore frontend `dealerId`; cross-dealership **404 not 403**; Admin hitting business URLs gets no business fields; error body `{code,message}`; writes carry `version` → `409 VERSION_CONFLICT`; ad five-state conditions; check rules then AI (≤15s); Ready/Export only when Passed and not Stale; assistant does not write business tables; internal `vehiclePublic` has no purchase cost; assistant `resources` have no phone/email/address; lists default to 10 per page; VIN unique per dealership; sell as a pair; sold locks purchase fields; one vehicle one customer |
| **New rulings here** | pagination envelope `{items,page,size,totalElements}` (handbook says 10 per page but not the envelope); **unlink** `DELETE /customers/{id}/vehicles/{vehicleId}` → 204; Admin **GET/PATCH** single dealership (handbook has list+create only); `SOLD_LOCKED` is always **409**; Blocked checks are **200**; `AI_UNAVAILABLE` is **502** and already persisted; derived fields `checkStatus` / `staffCount` / list `linkedVehicle`; 400 `VALIDATION` may include `fieldErrors`; JSON `id` is a number (do not use string ids from the retired draft); money is a JSON number; Admin↔business URL role mismatch is **403** `FORBIDDEN`; HTTP semantics of bind/unbind (whether the row is soft-deleted is left to 15) |
| **Extensions (design/21)** | self sign-up and sign-in by email, username, or phone (§1.4–1.5), Google and Firebase sign-in (§1.6–1.7), self-service profile and account deletion (§2.1–2.2), Google join requests and the dealer inbox (§5.7), public catalog and dealer directory (§4.6), pending accounts and binding without a password (§3.6, §3.8), staff member directory (§5.6), lead follow-up (§5.5), work orders (§4.7), Image Studio photos (§4.8), public VIN decode (§4.6.1), `openWorkOrders` on vehicles, sell blocked by open work orders. Requirement IDs and rationale live in [21](21-Feature-Extensions.md) |
| **Aligned with 15** | GET listing with no row: **do not persist**, virtual empty draft; first PATCH uses `''` to satisfy `title`/`body` NOT NULL. Tenant authority is `membership.active=1`; ignore client `dealerId`. Cross-dealership id → **404**. Staff with no valid membership calling business APIs → **403** `FORBIDDEN` (signed in, no dealership — not 401/404). Sold vehicles: a new link is allowed when the vehicle is not already linked; unlink stays **409** `SOLD_LOCKED` |

---

## 1. Uniform envelope and cross-cutting rules

### 1.1 Success

- Single object: return the DTO directly (no extra `data` wrapper).
- Null properties are omitted from response bodies (`JsonIgnoreCondition.WhenWritingNull`). Examples in this document show them as `null` for readability; clients treat a missing property and `null` the same. Request bodies still accept explicit `null`.
- Pagination: `page` starts at **0**; `size` defaults to **10** (handbook "10 per page"), and the server cap is **100** so clients that need a full option list (for example the CRM link picker) can page through it quickly. A negative `page` is read as 0, a `size` ≤ 0 is read as 10, and a `size` > 100 is read as 100; the envelope echoes the values actually used. Screens still request 10 per page.

```json
{
  "items": [],
  "page": 0,
  "size": 10,
  "totalElements": 0
}
```

The handbook does not specify a list envelope; the shape matches retired `04`, **semantics follow v6 entities**, and this is not a restore of the old API.

- `POST` create: **201**.
- Update / action: **200**.
- Unbind member, unlink vehicle: **204** no body.
- Export: **200** `Content-Type: text/plain; charset=UTF-8`.

### 1.2 Errors

```json
{ "code": "VIN_DUP", "message": "VIN already exists in this dealership.", "requestId": "0HN7..." }
```

`requestId` is the core request correlation id (it matches the core log line; it may be empty). Errors written by the Gateway itself (401/403/404 before the request reaches core) carry only `code` and `message`. When the gateway cannot obtain a downstream response, it keeps that failure status (502 when the destination does not answer) and writes `{ "code": "INTERNAL_ERROR", "message": "Unexpected server error." }`. A downstream body, including **502** `AI_UNAVAILABLE`, is forwarded unchanged. Core authentication failures and unhandled errors use the same envelope (`UNAUTHORIZED` / `FORBIDDEN` / `INTERNAL_ERROR`) and still include `requestId`. Internal AI model failures stay `{success:false, code, message}` ([AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) §B), not this public envelope.

`400 VALIDATION` and the `*_TAKEN` conflicts may add `fieldErrors` (new ruling); it is omitted when no field is named:

```json
{
  "code": "VALIDATION",
  "message": "Request is invalid.",
  "requestId": "0HN7...",
  "fieldErrors": { "vin": "must not be blank" }
}
```

Do not return SQL, stack traces, or raw model text to the browser.

| HTTP | When |
|---|---|
| 400 | validation failure, `VIN_DUP`, `SOLD_PAIR_REQUIRED`, `WRONG_DEALER_OR_SOLD` (lead vehicle, §5.5) |
| 401 | missing/bad JWT |
| 403 | insufficient role (Admin↔staff hitting the wrong prefix); **staff with no valid `membership.active=1` calling a business API** (signed in, no dealership). **Not** cross-dealership |
| 404 | this id is not in this dealership, **cross-dealership id** (anti-probing, not 403) |
| 405 | `METHOD_NOT_ALLOWED` (HTTP method not supported on this path) |
| 409 | `VERSION_CONFLICT`, `DUP_MEMBER`, `LAST_OWNER`, `USERNAME_TAKEN`, `EMAIL_TAKEN`, `PHONE_TAKEN`, `VEHICLE_ALREADY_LINKED`, `SOLD_LOCKED`, `CHECK_STALE`, `NOT_PASSED`, `LEAD_CLOSED`, `LEAD_DUPLICATE`, `WORK_ORDER_CLOSED`, `WORK_ORDERS_OPEN` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` (body is not `application/json`) |
| 429 | `RATE_LIMITED` (written by the gateway with `Retry-After: 60`; per-client limits in [19](19-Gateway-and-AI-Engineering.md) §1.5.1) |
| 500 | `INTERNAL_ERROR` (unexpected error; details logged server-side only) |
| 502 | `AI_UNAVAILABLE` (rules passed, model timeout/failure; check row already written); `CATALOG_UNAVAILABLE` (vehicle catalog upstream failed, §4.6) |

### 1.3 Identity, tenant, optimistic lock

- Roles are only `Platform.Admin` and `Dealer.User`. Staff tenant authority is **exactly one `membership.active=1` row** (15); `app_user.dealer_id` is only a `/me` cache.
- **Ignore** client `dealerId` in body / query / header. Staff tenant comes only from JWT `sub` (the username) → membership. Admin `dealerId` is always treated as empty.
- Cross-dealership resource id: **404**, not 403 (anti-probing).
- Anonymous routes: `POST /api/v1/auth/login|register|google|firebase`, every `GET /api/v1/catalog/**` (§4.6), and the Gateway's own `GET /actuator/release`. Gateway and core both permit exactly these without a JWT.
- `Platform.Admin` may call only `GET`/`PATCH /me`, `/api/v1/admin/**`, and the anonymous routes. Every business URL (§4.1–§4.5, §4.7–§10, including `/members`, `/dealer/**`, and `/audit`) returns **403** `FORBIDDEN` for Admin; Admin never reads business rows across dealerships; the one exception is the platform audit log (§9.2), whose rows hold field summaries, contact values included (AUD-04). `Dealer.User` calling `/api/v1/admin/**` → **403**.
- `Dealer.User` signed in with **0** active memberships: every authenticated route except `/me` → **403** `FORBIDDEN`, not 401 and not 404. `GET /me` is still 200 (`dealerId=null`), and `PATCH`/`DELETE /me` (§2.1–2.2) work so a pending account can edit or cancel itself.
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

The token carries `sub` (the username), `name`, and `roles`; send it as `Authorization: Bearer <accessToken>` on every other call. Resolution order: a value containing `@` is an email (case-insensitive); otherwise an active account with that exact username; otherwise, if it is a valid phone number (spaces, dashes, and brackets ignored), the account with that phone. Ten digits without `+` are a local North American number and read as `+1` plus the ten digits; an account stored before that rule as `+` plus the ten digits still matches. Blank identifier or password → `400 VALIDATION`. Unknown identifier, inactive account, or wrong password → `401 UNAUTHORIZED` with one message (`Invalid sign-in name or password`).

Every attempt is audited on `APP_USER` (AUD-12): success → `LOGIN`, failure → `LOGIN_FAILED`, each with the sign-in method and, on failure, the reason. When the identifier matches no account the row has actor `anonymous` and `entityId` `0`; the typed identifier is never stored. The Google and Firebase sign-ins (§1.6–1.7) are audited the same way.

### 1.5 `POST /api/v1/auth/register` (anonymous)

Self sign-up (AUTH-16). Creates an active `Dealer.User` with **no dealership**; the platform admin must bind it (§3.6, §3.8) before any business API works (until then business calls return **403**). Requires `username` (3–64 of letters, digits, `.`, `_`, `-`, with at least one letter), `displayName` (1–120), at least one of a valid `email` (≤ 254) or a `phone` (both allowed). The phone is stored as `+` and its digits; ten digits without `+` are a local North American number and are stored as `+1` plus the ten digits, and `password` (8–72). The user can then sign in with any of username, email, or phone. Audited as `APP_USER` / `CREATE` (actor = the username, no `dealerId`).

```json
{ "username": "alex.dealer", "displayName": "Alex Dealer", "email": "alex@example.com", "phone": "+14035550100", "password": "temporary-pass-1" }
```

Response **201**: same `LoginResponse` as §1.4. Every error names its field in `fieldErrors` (keys `username`, `displayName`, `email`, `phone`, `password`; messages in English):

| Case | Status and code |
|---|---|
| Missing or malformed field; invalid email; phone without a valid country code; neither email nor phone (both keys set) | **400** `VALIDATION` |
| Username already used | **409** `USERNAME_TAKEN` |
| Email already used (canonical lower case) | **409** `EMAIL_TAKEN` |
| Phone already used (canonical `+digits`) | **409** `PHONE_TAKEN` |

The full name is not unique: two accounts may share one (CR D1). When several values are taken, `code` is the first in the order above and `fieldErrors` lists all of them. Admin bind of a new user (§3.6) applies the same rules.

### 1.6 `POST /api/v1/auth/google` (anonymous)

Google sign-in (AUTH-23). Takes the ID token that Google Identity Services returns in the browser and exchanges it for this application's own session token. Google proves the email address only — it grants no role and no dealership, so the tenant is still resolved per request from the membership table.

```json
{ "idToken": "<Google ID token>", "dealerId": 1 }
```

`dealerId` is omitted on the first call and set on the second call, after the user picks a dealership from `GET /api/v1/catalog/dealers` (§4.6.2).

The server verifies the token before trusting any claim: RS256 signature against Google's published keys (fetched from its OpenID metadata and cached), issuer `https://accounts.google.com` or `accounts.google.com`, audience equal to `GoogleIdTokenVerifier.ClientId`, expiry, and `email_verified` true. The algorithm is pinned so a token signed with another algorithm cannot be substituted.

The account is matched by the stored Google subject, then by email (canonical lower case). The stored Google profile claims (`givenName`, `familyName`, `avatarUrl`, `locale`) are refreshed on every sign-in. A dealer user always receives a session, including when the account is unbound, so the client lands on the no-access screen (UI-03) and can file one join request (`POST /api/v1/me/join-request`, §5.7). Response **200**:

```json
{ "status": "ok", "login": { "accessToken": "<HS256 JWT>", "role": "Dealer.User", "displayName": "Alex Dealer" } }
```

| Account state | `status` | `login` |
|---|---|---|
| A `Dealer.User`, bound or unbound | `ok` | `LoginResponse` as §1.4. A missing account is created **unbound** with no password hash, a username derived from the email local part, and the Google display name. An optional `dealerId` records that join request in the same call |
| A `Platform.Admin` holds that email | **403** `FORBIDDEN` — the admin is seeded from the environment and keeps password-only sign-in | — |

Because the created account has an empty password hash, `POST /api/v1/auth/login` can never authenticate it. A derived username that is already taken gets a numeric suffix, since the column is unique; the display name is used as is. The account is bound when a member of the requested dealership approves the join request (§5.7) or when the platform admin binds it (§3.6).

| Case | Status and code |
|---|---|
| Missing or oversized `idToken` | **400** `VALIDATION` |
| Invalid signature, wrong audience or issuer, expired token | **401** `UNAUTHORIZED` |
| `email_verified` is false | **401** `UNAUTHORIZED` |
| `Google:HostedDomain` is set and the token's `hd` does not match | **403** `FORBIDDEN` |
| `dealerId` unknown or inactive | **404** `NOT_FOUND` |
| Google's signing keys are unreachable | **500** `INTERNAL_ERROR` |

Audited as `APP_USER` / `CREATE` with `registration = google` and `requestedDealerId` (actor = the derived username, no `dealerId`); a later dealership change on an existing account is `APP_USER` / `UPDATE` `{requestedDealerId}`.

The client id is a public identifier of the DealerOps application rather than of any one environment, and there is no client secret, so it is compiled in on both sides instead of being configured per deployment: `GoogleIdTokenVerifier.ClientId` in dealer-core and `googleClientId` in `frontend/react/src/auth/google.ts`. The two must stay equal, because the backend checks the ID token audience against its copy. This adds no stored credential and nothing to set up per environment. The one remaining per-deployment setting is the optional `Google__HostedDomain`. Adding a new browser origin (a new port or a custom domain) still requires adding it to the OAuth client's authorized JavaScript origins in Google Cloud; see `deploy/GOOGLE-OAUTH-AZURE.md`.

### 1.7 `POST /api/v1/auth/firebase` (anonymous)

Firebase email/password sign-in and sign-up. Firebase owns the password; DealerOps still owns the account, role, membership, and every authorization decision.

```json
{ "idToken": "<Firebase ID token>", "username": "alex.dealer", "displayName": "Alex Dealer", "phone": "+14035550100" }
```

Only `idToken` (≤ 4096) is required; `username` (≤ 64), `displayName` (≤ 120), and `phone` (≤ 40) are read only when a new account is created. The account is matched by Firebase uid, then by email. An unverified Firebase email is accepted for now (decided 2026-10-16), but an existing email account is linked to the uid on first use only when the token has `email_verified=true`; otherwise the request is refused so an unverified address cannot take over that account. No match creates an active **unbound** `Dealer.User` with no password hash (username derived from the email when omitted; audited `APP_USER` / `CREATE` with `registration = firebase`). Response **200** `LoginResponse` as §1.4.

| Case | Status and code |
|---|---|
| Missing or oversized `idToken` | **400** `VALIDATION` |
| Token rejected or no email on the token | **401** `UNAUTHORIZED` |
| Unverified email matches an existing account not yet linked to this Firebase uid | **409** `EMAIL_TAKEN` |
| A `Platform.Admin` matches | **403** `FORBIDDEN` |
| New account collides on username, email, or phone | **409** `USERNAME_TAKEN` / `EMAIL_TAKEN` / `PHONE_TAKEN` |
| Firebase signing keys unreachable | **500** `INTERNAL_ERROR` |

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
  "dealerLogoDataUrl": "data:image/png;base64,iVBORw0KGgo...",
  "email": "alex@example.com",
  "phone": "+14035550100",
  "signInMethod": "password",
  "givenName": null,
  "familyName": null,
  "avatarUrl": null,
  "locale": null,
  "dealerRole": "MANAGER"
}
```

`dealerRole` is `OWNER`, `MANAGER` or `SALES` inside the bound dealership (design/15 §2.5, design/21 AUTH-26) and `null` for the admin and unbound accounts.

Admin: `dealerId`, `dealerLegalName`, the three `dealerContact*` fields, and `dealerLogoDataUrl` are `null`. They are display-only derived fields (the ad page shows the contact fields, UI-41; the app header shows the legal name and logo), not a second set of dealership data. `dealerLogoDataUrl` is `null` when the dealership has no logo.

`email` and `phone` are the caller's own contact values. `signInMethod` is `google` when the account has no password hash (Google- or Firebase-provisioned) and `password` otherwise. `givenName`, `familyName`, `avatarUrl`, and `locale` come from the Google ID token and are `null` for other accounts.

### 2.1 `PATCH /api/v1/me`

Updates the caller's own profile. Username, role, email, and dealership stay fixed.

```json
{ "displayName": "Alex Dealer", "phone": "+14035550100" }
```

`displayName` is required (1–120); `phone` is optional (≤ 40) and blank or `null` clears it. Response **200** is the §2 shape. Errors: `400 VALIDATION`; `404` when the account is no longer active; `409 PHONE_TAKEN` against any other account, with `fieldErrors`. The full name need not be unique. Audit `APP_USER` / `UPDATE` `{self:true}`.

### 2.2 `DELETE /api/v1/me` → 204

Soft-deletes the caller's own account in one transaction: memberships are deactivated, a pending `JOIN_REQUEST` notification is resolved as `CANCELLED`, the account is flipped inactive, and the email, phone, and Google subject are suffixed with `:deleted:<id>` so the same person can sign up again. The username and audit history stay. The client must discard its token. `Platform.Admin` → **403**. A caller who is their dealership's `OWNER` while another active member remains → **409** `LAST_OWNER` ("You are this dealership's only owner. Ask the platform admin to appoint another owner before deleting your account."); an owner who is the last active member deletes as usual. Audit `APP_USER` / `DELETE` `{self:true}`.

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
  "totalElements": 1
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

The handbook has no update. **New ruling:** allow changing the four contact fields, `active`, and the dealership logo; `version` is required. The Admin page uses this for its `Edit` dealership drawer (13 §5.3). Deleting a dealership is §3.4a.

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

### 3.4a `DELETE /api/v1/admin/dealers/{id}` → 204

Change request A5. Soft delete: the row keeps its id and gets `deleted_at` and `active = false`, so vehicles, sales, customers and audit rows keep their dealership. In the same transaction every active membership is unbound (as §3.7), each member's `app_user.dealer_id` is cleared, and pending join requests to the dealership (`requested_dealer_id`) are cleared; the unbound members appear under §3.8 and can be bound elsewhere. A deleted dealership is absent from §3.1, the public dealership list and buyer site, join-request targets and sign-in tenancy; §3.3, §3.4, §3.4a and every `/admin/dealers/{id}/members` route answer `404 NOT_FOUND` for it. Already deleted or missing → 404. Audit `DEALER`/`DELETE` `{legalName, deleted:true, unboundMembers}` plus one `MEMBERSHIP`/`UPDATE` `{username, unbound:true}` per member. There is no undelete. The Admin page asks for the dealership name to be typed before it sends the request; the server does not require it.

### 3.5 `GET /api/v1/admin/dealers/{id}/members`

Dealership missing → 404. Paginated envelope (`page`/`size`/`q` matches `displayName`, `username`, `email`, or `phone`).

```json
{
  "items": [
    {
      "username": "alex.dealer",
      "displayName": "Alex Dealer",
      "role": "Dealer.User",
      "active": true,
      "signInMethod": "password",
      "email": "alex@example.com",
      "phone": null,
      "dealerRole": "SALES"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 1
}
```

`signInMethod` is `password` when the account has a DealerOps password hash (even if Google or Firebase sign-in was linked later), otherwise `firebase` when it has a Firebase UID, otherwise `google`. Only `password` accounts can be reset through 3.7a.

`email` and `phone` are the account's own sign-in contact values from `app_user`, each `null` when not set (UI-12). Admin-only: the dealer-side member directory (§5.6) is unchanged.

### 3.6 `POST /api/v1/admin/dealers/{id}/members` → 201 or 202

```json
{ "username": "user_9d20…", "displayName": "Alex Dealer", "password": "temporary-pass-1", "email": "alex@example.com" }
```

Write `membership` + `app_user` (column authority is in 15). Response matches a member item.  
**Existing account** (for example a self sign-up from §3.8): identify the account by its username for binding; `displayName`, `password`, and contact fields may be omitted, and they are never changed — the person keeps signing in with their own email, username, or phone and password. **New account:** the admin supplies a username, display name, temporary password, and an email and/or phone (at least one); the person can sign in with any of them. Missing or invalid details → `400 VALIDATION`.
`400 VALIDATION`; dealership 404; already an **active** member of that dealership, still active at another dealership, or the username belongs to a `Platform.Admin` account → **409** `DUP_MEMBER` (an admin account is never overwritten or demoted).  
Binding an already-unbound person again is treated as **reactivation**, not 409 (whether the same row is updated is left to 15). Do not delete the `app_user` account.

**Direct bind or join request (design/21 AUTH-28, decided 2026-11-03).** The admin binds directly only while the dealership has **no active owner**: the response is **201** with the member item, the member starts as `OWNER` (the dealership's first owner), and Audit `MEMBERSHIP`/`CREATE` carries `dealerRole`. An empty dealership has nobody to approve a join request, so this bootstrap cannot become a join request. Once the dealership has an active owner, the same call binds nothing: it creates the login when the username is new (same validation as above) and files a join request for that dealership (`app_user.requested_dealer_id`, a `JOIN_REQUEST` inbox notification, Audit `APP_USER`/`UPDATE` `{requestedDealerId}`), replacing a request the account had pending at another dealership. The dealership owner approves or rejects it in Team › Join Requests (§5.7), and an approved member joins as `SALES`. Repeating the call for the same dealership is a no-op. Response **202**:

```json
{ "username": "alex", "dealerId": 3, "joinRequested": true,
  "message": "Join request sent to the dealership. The owner approves it in Team > Join Requests." }
```

### 3.7 `DELETE /api/v1/admin/dealers/{id}/members/{username}` → 204

Unbind; do not delete the `app_user` account. No such binding → 404. The dealership's only active `OWNER` cannot be unbound while another active member remains → **409** `LAST_OWNER` ("This is the dealership's only owner. Appoint another owner before demoting or removing this member."); an owner who is the last active member is unbound as usual, which empties the dealership so §3.6 can bind its next owner directly.

### 3.7a `PUT /api/v1/admin/dealers/{id}/members/{username}/password` → 204

```json
{ "password": "temporary-pass-2" }
```

Platform.Admin sets a new password for an active member who forgot theirs, and tells the person out of band. `password` is 8-72 characters, else `400 VALIDATION`. No active binding of that username at this dealership → 404. A `google` or `firebase` account (see 3.5) → `400 VALIDATION` with a `password` field error: that provider owns the password, so the person resets it there. Audit `APP_USER`/`UPDATE` `{username, passwordReset:true}`; the password is never logged or returned. Existing session tokens stay valid until they expire.

### 3.7b `PUT /api/v1/admin/dealers/{id}/members/{username}/role` → 204

```json
{ "dealerRole": "OWNER" }
```

`dealerRole` is `OWNER`, `MANAGER` or `SALES` (design/15 §2.5, design/21 AUTH-26). Platform.Admin sets any of the three on any active member of any dealership, which is the only way an owner is appointed after the bootstrap bind (§3.6) or replaced when one leaves; the dealership's own owner and managers set the lower roles for their own dealership through §5.8, and never `OWNER`. Missing or unknown `dealerRole` → `400 VALIDATION`. No active binding of that username at this dealership → 404. Setting the current role again is a no-op. Audit `MEMBERSHIP`/`UPDATE` `{username, dealerRole}`. The change applies on the member's next request; no new token is needed.

A dealership has exactly one active owner (design/15 §2.5), so this endpoint enforces both halves of that rule in one transaction:

- `"OWNER"` on another member **transfers** the office: the dealership's sitting owner is demoted to `MANAGER` and the target is promoted together, and both rows are audited `MEMBERSHIP`/`UPDATE` `{username, dealerRole}` with their previous role, so the handover is traceable. The target already being the owner stays a no-op.
- Any other role on the dealership's only active owner → **409** `LAST_OWNER`: a demotion keeps the member active, so the dealership would be left with staff and no owner. Appoint the next owner, which transfers the office, instead of demoting this one.

### 3.7c `PATCH /api/v1/admin/dealers/{id}/members/{username}` → 200

```json
{ "email": "alex@example.com", "phone": "+14165550123" }
```

Change request A6. Platform.Admin edits the sign-in email and phone of an account listed at this dealership, active or unbound. Same rules as registration (§1.5): at least one of the two (both blank → `400 VALIDATION` with `email` and `phone` field errors), canonical form, and each value unique across accounts other than this one → `409 EMAIL_TAKEN` / `PHONE_TAKEN` with a field error. A blank value clears that field. No membership row of that username at this dealership, or the account is deleted → 404. Response matches a §3.5 member item. Audit `APP_USER`/`UPDATE` with the changed fields and their previous values; no change → no audit row.

### 3.7d `DELETE /api/v1/admin/dealers/{id}/members/{username}/account` → 204

Change request A6. Platform.Admin deletes the account with the same soft delete as §2.2: active memberships are unbound, a pending join request is cancelled, `app_user.active` becomes false, and the email, phone and Google link get a `:deleted:<id>` suffix so they are free for a new sign-up. The username and audit trail stay; the account leaves §3.5 and §3.8 and can no longer sign in. No membership row of that username at this dealership, or the account is already deleted → 404. A `Platform.Admin` account, including the caller → `403 FORBIDDEN`. The dealership's only active owner while another active member remains → **409** `LAST_OWNER`, as in §3.7. Audit `APP_USER`/`DELETE` `{username, active:false}` with the previous `email` and `phone`, plus `MEMBERSHIP`/`UPDATE` `{username, unbound:true}` for each unbound membership. The Admin Members tab asks for the username to be typed before it sends the request.

### 3.8 `GET /api/v1/admin/pending-users`

Platform.Admin only (staff → 403). Active `Dealer.User` accounts with no active membership — self sign-ups and unbound former staff — newest first. Query `q` (username or display name contains; unlike the admin members list, it does not match email or phone), `sort=createdAt,asc|desc` (direction defaults to `asc`; orders the whole queue before paging, with the account id in the same direction breaking ties; CR-018; omitted → newest first; any other field or direction → `400 VALIDATION` with a `sort` field error), `page`, `size`. The Registered column of the Pending accounts tab sorts through this parameter and pages with the response `totalElements`.

```json
{ "items": [ { "username": "user_9d20…", "displayName": "Ada Lee", "email": "ada@example.com", "phone": null, "createdAt": "2026-10-08T21:59:51Z",
               "requestedDealerId": 3, "requestedDealerName": "Maple Motors" } ],
  "page": 0, "size": 10, "totalElements": 1 }
```

`requestedDealerId` / `requestedDealerName` name the dealership the account has a pending join request at, or are `null`. The Admin **Pending accounts** tab lists these with `Bind without password` (§3.6 without a password: a direct bind or a join request), `Edit` (§3.8a) and `Delete` (§3.8b).

### 3.8a `PATCH /api/v1/admin/pending-users/{username}` → 200

```json
{ "username": "ada.lee", "email": "ada@example.com", "phone": null }
```

Platform.Admin only (design/21 AUTH-28). Edits a pending account's username, email and phone with the registration rules (§1.5): the same username format, an email and/or phone is required, both are canonicalized, and a blank one clears it → else `400 VALIDATION`. A value already used by another account → **409** `USERNAME_TAKEN`, `EMAIL_TAKEN` or `PHONE_TAKEN` with the field error. Not a pending account (unknown, inactive, platform admin, or active staff) → 404. A rename also renames the account's inactive membership rows; a pending join request's inbox entry is re-posted under the new values. Audit `APP_USER`/`UPDATE` with the changed fields and their previous values. Response: the updated pending-user item. A signed-in account that is renamed must sign in again.

### 3.8b `DELETE /api/v1/admin/pending-users/{username}` → 204

Platform.Admin only (design/21 AUTH-28). Soft delete, same as `DELETE /me` (§2.2): the row and its audit history stay, `active=false`, and the email, phone and Google link get a `:deleted:{id}` suffix so they are free for a new sign-up; the username stays taken. A pending join request is cancelled. Not a pending account → 404. Audit `APP_USER`/`DELETE`.

### 3.9 Compliance rule configuration

Platform.Admin only; dealer users and unbound accounts receive **403**. `GET /api/v1/admin/compliance-rules` returns the built-in catalog with effective `enabled`, `severity`, and message values. `PUT /api/v1/admin/compliance-rules/{ruleId}` accepts `{enabled, severity?, message?}`; severity is `BLOCK` or `REVIEW`, and message is at most 500 characters. The listed default severity is the one the engine raises; the default message summarizes the rule, and the engine may word individual findings more specifically. A submitted severity or message equal to the default is not stored, so the engine's own value and wording keep applying. A successful update invalidates prior compliance checks across dealerships; ads must be checked again before Ready or export. Only `contentVersion` is incremented; each listing's `version` is unchanged, so an ad page that is already open can run the new check without `409 VERSION_CONFLICT`. Rule logic remains in the OMVIC engine. Each update is audited `RULE_OVERRIDE` / `UPDATE` by the admin with the changed keys and their previous values (AUD-14).

---

## 4. Vehicles DMS (Dealer.User)

Admin hitting any URL in this section → **403** `FORBIDDEN` (same as CRM/ads/assistant; the body must not contain vin/cost or other business fields). Staff sees this dealership only. Staff with no valid membership → **403** (see §1.3).

List query: `q` (substring of VIN / make / model / stock number), `make` and `model` (exact match, ignoring case), `modelYear` (exact), `status`=`IN_STOCK`\|`SOLD`, `condition` (that is `conditionCode`), `bodyType` (exact), `source` (exact), `sourceOther` (only `OTHER`-source vehicles whose custom source equals the value, ignoring case; design/21 DMS-19), `unlinkedOnly`=`true` (exclude vehicles linked to any customer), `openWorkOrdersOnly`=`true` (only vehicles with at least one `OPEN` or `IN_PROGRESS` work order, the same count as `openWorkOrders`; D-4), the Ad compliance filters `adKind`=`CASH`\|`FINANCE`\|`LEASE`, `medium`=`ONLINE`\|`RADIO_TV_BILLBOARD`, `checkStatus` (one of the five §8 values, derived exactly as there; anything else → `400 VALIDATION`) and `buyerSite`=`LISTED`\|`NOT_LISTED`\|`TAKEN_DOWN` (`LISTED` by the §12a listing rule; `TAKEN_DOWN` is a sold vehicle whose ad is `READY`; `NOT_LISTED` is the rest), `page`, `size`. A vehicle with no saved ad counts as its virtual draft (§7.1): `CASH`, `ONLINE`, `NEEDS_AI`, not listed. Blank values are ignored and the filters combine with AND. Default `createdAt` descending. Optional `sort=field,asc|desc` (direction defaults to `asc`; CR C7) orders the whole result before paging, with newest first breaking ties; `field` is one of `stockNumber`, `bodyType`, `source`, `conditionCode`, `purchaseCost`, `listPrice`, `addedOn`, `openWorkOrders`, `leadCount`, `status`, `soldOn`, `soldBy`, `soldToName` (the linked customer's name, else the typed buyer name). Any other field or direction → `400 VALIDATION` with a `sort` field error. Blank values (null or empty) sort last in both directions.

### 4.1 `GET /api/v1/vehicles`

```json
{
  "items": [
    {
      "id": 10,
      "vin": "1HGCM82633A004352",
      "make": "Honda",
      "model": "Accord",
      "modelYear": 2003,
      "source": "AUCTION",
      "sourceOther": null,
      "acquiredFromName": "Metro Auto Auction",
      "acquiredFromAddress": "120 Industrial Rd, Hamilton, ON",
      "purchaseCost": 14200.00,
      "addedOn": "2026-09-01",
      "conditionCode": "AS_IS",
      "bodyType": "SEDAN",
      "repairCost": 800.00,
      "carfaxUrl": null,
      "mileageKm": 45210,
      "exteriorColor": "Blue",
      "fuelType": "GASOLINE",
      "stockNumber": "A-1024",
      "listPrice": 18995.00,
      "soldOn": null,
      "soldPrice": null,
      "status": "IN_STOCK",
      "linkedCustomer": null,
      "openWorkOrders": 0,
      "leadCount": 0,
      "version": 0
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 1
}
```

`linkedCustomer` is `{ "id": 4, "name": "Jane Doe" }` when the vehicle is linked to a customer, otherwise `null` (DMS-08, CRM-10). It never carries customer contact fields (CRM-12).

Every vehicle response also carries `soldBy` (username who recorded the sale) and `soldToName` (typed buyer name for an "Other" sale), both placed after `soldPrice` and `null` until sold (§4.5).

Every vehicle response (list, detail, create, patch, sell) also carries `openWorkOrders`: the number of `OPEN` + `IN_PROGRESS` work orders (§4.7, WO-07), placed before `version`, followed by `leadCount`: the number of the vehicle's leads in any stage (CR D-11; shown in the DMS **Leads** column, and the vehicle drawer lists those leads through `GET /api/v1/leads?vehicleId=`). `bodyType` is `SEDAN`\|`SUV`\|`TRUCK`\|`MOTORCYCLE`\|`COUPE`\|`HATCHBACK`\|`VAN`\|`OTHER`; it is optional on create (default `OTHER`) and on PATCH (omitted keeps the stored value).

The listing details (design/21 DMS-18) are optional and nullable: `mileageKm` (integer 0–2,000,000), `exteriorColor` (≤ 40), `fuelType` (`GASOLINE`\|`DIESEL`\|`HYBRID`\|`PLUGIN_HYBRID`\|`ELECTRIC`\|`OTHER`), `stockNumber` (≤ 20, unique among the dealership's active vehicles, else `400 VALIDATION` on `stockNumber`), and `listPrice` (≥ 0, at most two decimals). The list search `q` also matches `stockNumber`.

`sourceOther` (design/21 DMS-19) is the user's own category-style name for an `OTHER` source, for example `Lease return`. The value is trimmed first and its length is checked after trimming: at most 100 characters, else `400 VALIDATION` "At most 100 characters." on `sourceOther` (a 100-character value wrapped in spaces is accepted and stored as 100 characters). When `source` is `OTHER` it is required: omitted, `null`, empty and whitespace-only all count as missing → `400 VALIDATION` "Enter the source when Other is selected." on `sourceOther`. For any other source it is ignored and stored as `null`. PATCH replaces the field, so a caller editing a named `OTHER` vehicle must resend `sourceOther`; omitting it is the missing-value error above. The one exception is a legacy record: an `OTHER` vehicle stored without a custom source (saved before DMS-19) may keep it blank on PATCH while it stays `OTHER`. The exception depends only on the stored vehicle: once a custom source is saved it cannot be cleared while the source stays `OTHER`, and after a change to another source is saved, a later change back to `OTHER` requires a custom source. It is audited with the vehicle and locked on a sold vehicle like `source`. Clients show a blank legacy record as `Other` (no colon), and the list filter `source=OTHER` without `sourceOther` ("All other") includes it.

`acquiredFromName` (≤ 120) and `acquiredFromAddress` (≤ 255) (design/21 DMS-20) record who the vehicle was acquired from (a person or business) and their address, for any source. Both are optional and nullable, trimmed first and length-checked after trimming (else `400 VALIDATION` "At most 120 characters." / "At most 255 characters." on that field), and a blank value is stored as `null`. PATCH replaces them like the other optional fields: omitted, `null`, empty or whitespace-only clears the stored value. They are audited on create and PATCH and locked on a sold vehicle like `source`.

Errors: `401`, `403` (not staff).

### 4.1a `GET /api/v1/vehicles/source-other-options`

Dealer.User; admin or unbound → 403. Returns a JSON array of the `sourceOther` values of this dealership's `OTHER`-source vehicles (in stock or sold, not deleted; blank values are left out; independent of the `status` filter), for the DMS second-level source filter and the form's suggestions. Values that differ only in case are one entry, spelled as on the most recently added vehicle, sorted ignoring case. Example: `["Fleet sale", "Lease return"]`.

### 4.2 `POST /api/v1/vehicles` → 201

```json
{
  "make": "Honda",
  "model": "Accord",
  "modelYear": 2003,
  "vin": "1HGCM82633A004352",
  "source": "AUCTION",
  "purchaseCost": 14200.00,
  "addedOn": "2026-09-01",
  "conditionCode": "AS_IS",
  "repairCost": 800.00,
  "carfaxUrl": null,
  "mileageKm": 45210,
  "exteriorColor": "Blue",
  "fuelType": "GASOLINE",
  "stockNumber": "A-1024",
  "listPrice": 18995.00
}
```

Required: make/model/modelYear/vin/source/purchaseCost/addedOn/conditionCode.  
**Ignore** `dealerId`, `status`, `soldOn`, `soldPrice`. Server sets `status=IN_STOCK`.  
The server trims `make` / `model` (1-50 characters) and upper-cases `vin`. `400 VALIDATION` covers the field rules in requirements/analysis/02-DMS-Vehicles.md (VIN 17 chars without I/O/Q, 1900 ≤ `modelYear` ≤ next year, costs ≥ 0 with at most two decimals (a third decimal is refused, never rounded; the same applies to `soldPrice` on sell), `addedOn` not in the future, `carfaxUrl` an https link on `carfax.com` or `carfax.ca` or a subdomain (D-9), and from model year 1980 on the VIN's 10th character, the model-year code, must match `modelYear`; the code repeats every 30 years, so `F` accepts 1985 or 2015 (D-8)). Both D-8 and D-9 put the readable message under `fieldErrors.vin` / `fieldErrors.carfaxUrl`. PATCH applies the same rules, but re-checks D-8 only when `vin` or `modelYear` changes and D-9 only when `carfaxUrl` changes, so older records stay editable.

**VIN must match the vehicle information (CR-047).** Before the D-8 check, the server decodes the VIN through the §4.6.1 vPIC client and compares the decoded `make`, `model` and `modelYear` with the values being saved. A disagreement is `400 VALIDATION` with the message under `fieldErrors.make`, `fieldErrors.model` or `fieldErrors.modelYear`, naming the field and the decoded value, for example `Make does not match the VIN: the VIN decodes to "Toyota", not "Honda". Correct the make or the VIN.` and `Model year does not match the VIN: the VIN decodes to 2020, not 2019. Correct the model year or the VIN.` Make and model are compared on letters and digits only, ignoring case, spacing and punctuation, so `Mercedes Benz` is accepted for the decoder's `Mercedes-Benz`. A field vPIC returns blank is not checked. PATCH re-checks CR-047 when `vin`, `make`, `model` or `modelYear` changes.

**Graceful degradation.** The decode never fails a save by itself: if vPIC is unreachable, times out (the client's 5-second timeout), returns malformed data, or knows no vehicle for the VIN, the server logs a warning and falls back to the D-8 model-year character check, and the save proceeds. The same fallback covers the model year alone when the decode succeeds without a `modelYear`. The write endpoints therefore never return `502 CATALOG_UNAVAILABLE`.  
Errors: `400 VALIDATION`, `400 VIN_DUP`. Response = detail. Audit `VEHICLE`/`CREATE`.

### 4.3 `GET /api/v1/vehicles/{id}`

Response matches a list item. Cross-dealership / no such vehicle → **404**.

### 4.4 `PATCH /api/v1/vehicles/{id}`

```json
{
  "version": 0,
  "make": "Honda",
  "model": "Accord",
  "modelYear": 2003,
  "vin": "1HGCM82633A004352",
  "source": "AUCTION",
  "purchaseCost": 14200.00,
  "addedOn": "2026-09-01",
  "conditionCode": "CERTIFIED",
  "repairCost": 800.00,
  "carfaxUrl": "https://example.invalid/carfax/1"
}
```

Whitelist is the fields above only, plus `bodyType`, the listing details, `sourceOther`, `acquiredFromName` and `acquiredFromAddress` of §4.1 (the last three follow the PATCH rules stated there); all are required except `bodyType`, `repairCost`, `carfaxUrl`, and the listing details (full replacement, same rules as 4.2: an omitted or null listing detail clears it). Do not use PATCH to change `status` / `soldOn` / `soldPrice` (use `/sell`). Ignore `dealerId`.  
Changing purchase fields on a sold vehicle (make/model/year/vin/source/sourceOther/acquiredFromName/acquiredFromAddress/purchaseCost/addedOn/repairCost/carfax, body type, or a listing detail) → **409** `SOLD_LOCKED`.  
Changing VIN while unsold is still unique per dealership → `400 VIN_DUP`.  
Changing `vin`, `make`, `model` or `modelYear` re-runs the CR-047 VIN decode match of §4.2 (with the same fallback when the decoder is unavailable).  
Changing `conditionCode` (handbook: a condition change voids the old check) → increment the corresponding listing `contentVersion++` (if a listing exists). Changing purchase cost alone does not void the ad.  
Audit `VEHICLE`/`UPDATE`. Other errors: `404`, `409 VERSION_CONFLICT`.

### 4.3a `DELETE /api/v1/vehicles/{id}`

Soft-deletes the vehicle from active DMS and picker queries, returns **204**, and records `VEHICLE`/`DELETE`. The vehicle row and foreign-key relationships remain so sold data, work orders, listings, and audit history are preserved. A deleted vehicle is unavailable to normal detail/edit flows; unknown or cross-dealership ids return **404**.

The purchase record and live work must be settled first: a sold vehicle → **409** `SOLD_LOCKED`; a vehicle linked to a customer → **409** `VEHICLE_ALREADY_LINKED` (unlink first); open work orders → **409** `WORK_ORDERS_OPEN`. A deleted vehicle keeps its VIN under the dealership's unique key, so creating or editing another vehicle to that VIN returns **400** `VIN_DUP`. Leads keep showing a deleted vehicle or customer.

### 4.3b `GET /api/v1/vehicles/report/sales`

Dealer.User; admin or unbound → 403. Monitors vehicle sales for the dealership (client brief: "monitor sales"). Returns `soldCount`, `revenue` (sum of sold prices), `grossProfit` (sold price − purchase cost − repair cost), `averageDaysToSell` (`soldOn − addedOn`, null with no sales), `inStockCount`, `inventoryCost` (purchase + repair cost of in-stock vehicles), and `months`: the twelve most recent months with a sale, newest first, each `{ month: "yyyy-MM", soldCount, revenue, grossProfit }`. Shown with the lead funnel on `/reports/sales-funnel` and on `/dashboard`.

Optional query `period` = `TODAY`\|`WEEK`\|`MONTH`\|`YEAR` (an unknown value → `400 VALIDATION`). Periods are calendar periods ending today (UTC date): today, this ISO week from Monday, this month, this year. With a period the response adds `period: { period, from, to, soldCount, revenue, grossProfit }` (sales with `soldOn` in `from..to`, inclusive); without one `period` is `null`. `salespeople` always lists one row per active dealership member plus anyone else recorded as `soldBy` on a sale in the period (`activeMember: false`): `{ username, displayName, activeMember, soldCount, revenue, grossProfit, openLeads, wonLeads }`, ordered by revenue then name. Sales figures use `vehicle.sold_by` and cover the period (all time without one); `openLeads` is the member's currently open owned leads; `wonLeads` counts owned WON leads last updated in the period. The all-time fields above are unchanged. Both `/reports/sales-funnel` and `/dashboard` show a **Sales period** selector (Today, This week, This month, This year; default This month).

### 4.3c Payments on a sold vehicle (Dealer.User)

A ledger of payments the dealership has already received (design/21 PAY-01–04). It records money; it does not charge a card. Admin → 403; another dealership's vehicle or payment → 404.

A sales member may only record payments (PAY-05): reading the ledger and removing a payment are for the dealership owner or a manager (§5.8); a sales member → **403** `FORBIDDEN` (`Only a dealership owner or manager can do this.`).

`PaymentLedger`: `{ "soldPrice": 21000.00, "paidTotal": 6000.00, "balanceDue": 15000.00, "items": [ PaymentItem ] }`, items newest `paidOn` first (then newest `id`). `PaymentItem`: `{ "id", "amount", "method", "paidOn", "note", "recordedBy", "createdAt" }`. `method` is `CASH`\|`DEBIT`\|`CREDIT_CARD`\|`CHEQUE`\|`BANK_TRANSFER`\|`FINANCING`\|`OTHER`.

| Method and path | Body | Result |
|---|---|---|
| `GET /api/v1/vehicles/{vehicleId}/payments` | — | Owner or manager only. 200 ledger; `soldPrice` and `balanceDue` are null while the vehicle is in stock |
| `POST /api/v1/vehicles/{vehicleId}/payments` | `amount` (> 0, two decimals), `method`, `paidOn`, `note?` (≤ 200) | Every dealer user. 201: an owner or a manager gets the updated ledger; a sales member gets only the recorded `PaymentItem` (PAY-05). In-stock vehicle → `400 VALIDATION` "Record the sale before adding payments."; more than the balance due → `400 VALIDATION` on `amount`; `paidOn` after today or before `soldOn` → `400 VALIDATION` on `paidOn` |
| `DELETE /api/v1/vehicles/{vehicleId}/payments/{paymentId}` | — | Owner or manager only. 200 ledger. The payment is soft-deleted (row kept, `deleted_at` set) and leaves the ledger totals |

Creating a payment locks the vehicle row (`SELECT … FOR UPDATE`) before the balance check, so concurrent payments on the same vehicle cannot together exceed the balance due.

Adding and removing write `VEHICLE`/`UPDATE` audit rows `{paymentAdded, paymentMethod, paidOn}` and `{paymentRemoved, paidOn}`. The removal row's `previous` keeps the removed payment as `{amount, paymentMethod, paidOn, hasNote}`; the note body is never copied into the audit.

### 4.5 `POST /api/v1/vehicles/{id}/sell`

```json
{ "soldOn": "2026-09-20", "soldPrice": 18900.00, "version": 1, "buyerCustomerId": 4, "buyerName": null }
```

Both values must be present together. Server sets `status=SOLD` and `soldBy` (the acting username). Response = detail.  
The buyer is required (CR D-10): `buyerCustomerId` (a customer of this dealership) or, for "Other", a typed `buyerName` (≤ 120, stored as `soldToName`). With a customer, the sale links that customer to the vehicle in the same transaction (`CUSTOMER_VEHICLE`/`LINK` audit), replacing the separate `PUT` link call; a vehicle already linked must be sold to that customer. On sale, every open lead on the vehicle closes (CR L6): the buyer customer's leads become `WON`, all others `LOST` with `lostReason` "Vehicle sold" (`LEAD`/`UPDATE` audit rows).  
`400 SOLD_PAIR_REQUIRED` (date or price missing, or `soldPrice` ≤ 0); `400 VALIDATION` (`soldOn` in the future or before `addedOn`; no buyer → field `buyerName`; unknown customer → field `buyerCustomerId`); vehicle linked to another customer → `409 VEHICLE_ALREADY_LINKED`; selling again after sold → `409 SOLD_LOCKED`; an `OPEN` or `IN_PROGRESS` work order exists → `409 WORK_ORDERS_OPEN` ("Finish or cancel open work orders before selling."); `409 VERSION_CONFLICT`; `404`. Audit `VEHICLE`/`SELL` (adds `soldBy`, and `buyerCustomerId` or `soldToName: true`; the typed name is not copied).

### 4.6 Vehicle catalog: `GET /api/v1/catalog/makes` and `GET /api/v1/catalog/models?make=`

Option lists for the DMS Make → Model → Year filter (13 §5.4). Data comes from the free NHTSA vPIC API (no key). dealer-core calls it at `VPIC_BASE_URL` (default `https://vpic.nhtsa.dot.gov/api/vehicles`) so the browser still talks only to the Gateway. Makes are the union of the vPIC `car` and `mpv` vehicle types; models come from `GetModelsForMake`. Both return a JSON array of names, trimmed, de-duplicated ignoring case, and sorted:

```json
["Camry", "Corolla", "RAV4"]
```

Who: **anonymous**. The Gateway and core permit every `GET /api/v1/catalog/**` without a JWT, so the signed-out landing page can use the same lists. Results are cached in dealer-core's in-memory cache for 12 hours; an empty model list is cached too, so an unknown make cannot be replayed against vPIC. Errors: missing `make` → `400 VALIDATION`; vPIC has no models for that make → `404 NOT_FOUND`; vPIC unreachable or malformed → `502 CATALOG_UNAVAILABLE` (the web filter then lets the user type a make and model).

#### 4.6.1 VIN decode: `GET /api/v1/catalog/vin/{vin}` (public)

Decodes one VIN through vPIC `DecodeVinValues`. Used by the signed-out landing page VIN decoder and by the DMS **Add vehicle** form (`Decode` prefills make, model, year, and body type). **Anonymous:** no JWT required (§4.6). Response (blank vPIC values become `null`; `engine` is built from displacement, cylinders, and primary fuel):

```json
{ "vin": "1HGCM82633A004352", "make": "HONDA", "model": "Accord", "modelYear": 2003,
  "bodyClass": "Coupe", "bodyType": "COUPE", "engine": "3.0L 6-cyl Gasoline", "country": "UNITED STATES (USA)",
  "manufacturer": "AMERICAN HONDA MOTOR CO., INC." }
```

`bodyType` maps vPIC's free-text body class onto the DMS enum (SUV / utility / crossover → `SUV`, pickup / truck → `TRUCK`, van → `VAN`, hatchback / liftback → `HATCHBACK`, coupe → `COUPE`, sedan / saloon → `SEDAN`, motorcycle / scooter → `MOTORCYCLE`, anything else → `OTHER`); it is `null` when vPIC returns no body class.

Successful decodes are cached in memory for 12 hours. Errors: VIN not 17 characters or contains I/O/Q → `400 VALIDATION`; vPIC returns no make → `404 NOT_FOUND`; vPIC unreachable or malformed → `502 CATALOG_UNAVAILABLE`. Nothing is stored; the decode never creates a vehicle. The DMS form shows body class, engine, country, and manufacturer under the VIN field for reference; they are not saved. Only the mapped `bodyType` is stored, as the vehicle's optional body type once the user saves (VIN-03).

#### 4.6.2 Public dealer directory: `GET /api/v1/catalog/dealers` (public)

Anonymous. Active dealerships sorted by legal name, for the Google sign-in dealership picker (§1.6) and the buyer-site directory (§12a). Returns only the id, the legal name, which ads already publish, the buyer-site `slug` derived from it, `hasLogo` (whether `GET /api/v1/public/dealers/{id}/logo` returns an image, §12a), the dealership's `inStockCount` and `soldCount` (vehicles not deleted), and its public contact card `contactPhone`, `contactEmail` and `contactAddress` (the same values the buyer-site inventory returns, §12a), which the buyer-site directory cards show and search (CR H4, 2026-11-03):

```json
[ { "id": 1, "legalName": "Prairie Auto Ltd.", "slug": "prairie-auto-ltd", "hasLogo": true, "inStockCount": 42, "soldCount": 118,
    "contactPhone": "+1 306 555 0100", "contactEmail": "sales@prairie-auto.example", "contactAddress": "12 Main St, Regina, SK" } ]
```

`slug` is computed, not stored: the legal name lowercased, with each run of characters other than letters and digits replaced by one hyphen. When active dealerships share a slug, the lowest id keeps it and each later one gets `-{id}`; a name with no letters or digits becomes `dealer-{id}`. Renaming a dealership changes its slug.

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

Transitions: `OPEN → IN_PROGRESS | DONE | CANCELLED`; `IN_PROGRESS → DONE | CANCELLED`; keeping the same status edits task, assignee, or due date. Errors: stale `version` → `409 VERSION_CONFLICT`; already `DONE`/`CANCELLED` → `409 WORK_ORDER_CLOSED`; other transitions → `400 VALIDATION`; `DONE` without a completion note (≤ 500) or a cost ≥ 0 → `400 VALIDATION`; a `cost` with more than two decimals → `400 VALIDATION` on `cost` (refused, never rounded, because it is added to the vehicle's two-decimal `repairCost`); sold vehicle → `409 SOLD_LOCKED`.
`DONE` sets `completedOn` to today and adds `cost` to the vehicle's `repairCost` in the same transaction (vehicle `version` increments, audit `VEHICLE`/`UPDATE` `{repairCost}`). Audit `WORK_ORDER`/`CREATE` and `WORK_ORDER`/`UPDATE` with the changed keys.

`GET /api/v1/work-orders/report/settlement` (design/21 WO-08) returns `openCount`, `inProgressCount`, `doneCount`, `settledCost` (sum of done costs), `months` (twelve most recent completion months, newest first: `{ month: "yyyy-MM", doneCount, settledCost }`), and `assignees` (`{ assigneeUsername | null, outstandingCount, doneCount, settledCost }`, highest settled cost first). Cancelled work orders are not counted.

### 4.8 Image Studio photos (Dealer.User)

Vehicle photos with automatic enhancement ([21](21-Feature-Extensions.md) §6). Photos are stored in MySQL; the original never changes. Admin → 403; another dealership's vehicle or photo → 404. Sold vehicles may still have photos.

`PhotoItem`: `{ "id", "vehicleId", "contentType", "enhancement": null | "AUTO" | "BRIGHTEN" | "SHARPEN", "uploadedBy", "createdAt" }`.

| Method and path | Request | Result |
|---|---|---|
| `GET /api/v1/vehicles/{vehicleId}/photos` | — | 200 `PhotoItem[]`, oldest first, metadata only |
| `POST /api/v1/vehicles/{vehicleId}/photos` | `multipart/form-data`, part `file` | 201 `PhotoItem` |
| `GET /api/v1/vehicles/{vehicleId}/photos/{photoId}/content?variant=original\|enhanced` | — | 200 image bytes (`image/jpeg` or `image/png` for the original, always `image/jpeg` enhanced), `Cache-Control: no-store` |
| `POST /api/v1/vehicles/{vehicleId}/photos/{photoId}/enhance` | `{ "preset": "AUTO" \| "BRIGHTEN" \| "SHARPEN" }` | 200 `PhotoItem`; replaces the previous enhanced copy |
| `DELETE /api/v1/vehicles/{vehicleId}/photos/{photoId}` | — | 204. The photo is soft-deleted (row and both variants kept, `deleted_at` set); its content then returns 404 |

Errors: not JPEG/PNG (checked from the bytes, not the declared type) → `415 UNSUPPORTED_MEDIA_TYPE`; over 2 MB → `400 VALIDATION` "Photo must be 2 MB or smaller."; an 11th photo → `400 VALIDATION`; empty `file` → `400 VALIDATION`; image over 40 megapixels → `400 VALIDATION`; `variant=enhanced` before any enhancement → 404; other `variant` or missing `preset` → `400 VALIDATION`. Limits are configuration (`PHOTO_MAX_FILE_SIZE`, `PHOTO_MAX_REQUEST_SIZE`, `PHOTO_MAX_PER_VEHICLE`, `PHOTO_MAX_EDGE_PX`). Audit `VEHICLE_PHOTO`: `CREATE`, `UPDATE` (`enhancement`), `DELETE`.

---

## 5. Customers CRM (Dealer.User)

Admin hitting any URL in this section → **403** `FORBIDDEN`. Staff with no valid membership → **403**. Cross-dealership **404**.

### 5.1 `GET /api/v1/customers`

Query: `q` (name/email/phone; a phone-like term (only digits, spaces, `-`, `(`, `)`, `+`, `.`) with 3 or more digits also matches the phone ignoring spaces, `-`, `(`, `)` and `+`, so `4035550123` finds `403-555-0123`), `linked`=`true`\|`false` (whether at least one vehicle is linked), `page`, `size`.

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
      "leadCount": 2,
      "version": 0
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 1
}
```

`linkedVehicle`: when multiple vehicles exist, take the most recent `linkedAt` for the CRM table column; detail is the full array in 5.3. Unlinked is `null`. `linkedVehicleCount` is the number of linked vehicles (the "+N more" hint in the Linked vehicles column). `leadCount` is the number of the customer's leads in any stage; the CRM list shows it in the **Leads** column, which replaced "Vehicles purchased" (CR R1).

### 5.2 `POST /api/v1/customers` → 201

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "403-555-0199",
  "homeAddress": "12 Oak St",
  "notes": "Prefers text messages."
}
```

Field rules: `name` ≤ 100, `email` valid, ≤ 254, trimmed and stored lower-case (`customer.email` is `VARCHAR(254)` since `V20261007_2`), `phone` 7–20 digits using only digits, `+`, `-`, `(`, `)`, spaces (≤ 40 chars), `homeAddress` ≤ 300; all non-blank. `notes` is optional free text ≤ 2000 (`customer.notes VARCHAR(2000)`, CR R3), stored trimmed; blank is stored as `null`. No customer field is unique (CR R4). Before saving, the client calls §5.2a and, when any field matches another customer, asks "A customer with this <field> already exists. Create anyway?" ("Save anyway?" on an edit) and saves only after the user confirms. A duplicate email still sets `emailWarning` with an English sentence in the detail (CRM-13). Ignore `dealerId`. `400 VALIDATION`. Audit `CUSTOMER`/`CREATE`. Response = detail (`linkedVehicles: []`).

### 5.2a `GET /api/v1/customers/duplicates`

Query: `name`, `email`, `phone`, `homeAddress` (all optional) and `excludeId` (the customer being edited). Returns **200** `{"fields":["name","phone"]}`, the fields that match another active customer of this dealership, in the order `name`, `email`, `phone`, `homeAddress`; empty when nothing matches. Name and address compare trimmed, email lower-case, and phone on digits only. Read-only, no audit. Used by CRM add/edit and by lead creation with a new customer (§6) before they save.

### 5.3 `GET /api/v1/customers/{id}`

```json
{
  "id": 4,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "403-555-0199",
  "homeAddress": "12 Oak St",
  "notes": "Prefers text messages.",
  "linkedVehicles": [
    {
      "id": 10,
      "vin": "1HGCM82633A004352",
      "modelYear": 2003,
      "make": "Honda",
      "model": "Accord",
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
  "homeAddress": "12 Oak St",
  "notes": "Prefers text messages."
}
```

All fields except `notes` are required (full replacement, same rules as 5.2; no field is unique). An omitted or blank `notes` clears the notes. A notes change is audited as the `notes` field. A duplicate email still saves and sets `emailWarning` (CRM-13). Ignore `dealerId`. `400 VALIDATION`, `409 VERSION_CONFLICT`. Audit `CUSTOMER`/`UPDATE`. `fieldSummary` **must not** contain full phone/email/address text.

### 5.4a `DELETE /api/v1/customers/{id}`

Soft-deletes the customer from active CRM queries, returns **204**, and records `CUSTOMER`/`DELETE`. Customer rows and lead/link relationships remain for history. A customer linked to a vehicle with `status=SOLD` is the buyer of that sale and **cannot be deleted** → **409** `SOLD_LOCKED` (same rule as unlink in §6.2: the DMS "Sold to" column reads the linked customer's name). Unknown or cross-dealership ids return **404**.

---

### 5.5 Leads (Dealer.User)

Lead follow-up ([21](21-Feature-Extensions.md) §3). Admin or unbound → 403; another dealership's lead or customer → 404.

| Method and path | Body / query | Result |
|---|---|---|
| `GET /api/v1/leads` | `q` (customer name contains), `vehicle` (contains, on "year make model" or VIN; CR L2), `vehicleId` (exact; CR D-11), `stage`, `owner` (exact username), `customerId`, `overdue` (`true` = open stage and `nextFollowUpOn` before today, server date), `sort` (CR-012: `field,asc\|desc` over all pages, newest first breaking ties; `customerName`, `vehicle` ("year make model", as the column displays it), `stage` (pipeline order), `ownerUsername`, `nextFollowUpOn` (won and lost leads sort as blank); blank values sort last in both directions; other values → 400 `VALIDATION`), `page`, `size` | page of list rows, newest first unless `sort` is given |
| `POST /api/v1/leads` | exactly one of `customerId` or `newCustomer{name,email,phone,homeAddress}` (same rules as §5.2; the customer is created and audited in the same transaction); `vehicleId?`, `ownerUsername?`, `nextFollowUpOn?`, `note?` (first note) | 201 detail; stage starts `NEW` |
| `GET /api/v1/leads/{id}` | — | detail with notes newest first |
| `PATCH /api/v1/leads/{id}` | full editable state: `stage`, `ownerUsername`, `nextFollowUpOn`, `vehicleId`, `lostReason`, `version` (null clears a field) | 200 detail |
| `POST /api/v1/leads/{id}/reopen` | `{ "stage": "NEW"\|"CONTACTED"\|"QUALIFIED", "version" }` (CR L4) | 200 detail; `lostReason` is cleared |
| `POST /api/v1/leads/{id}/notes` | `{ "body": "1–2000 chars" }` | 201 `{ id, authorUsername, body, createdAt }`; closed leads still accept notes |
| `GET /api/v1/leads/report/funnel` | — | Current tenant-scoped counts and share for all five stages, total and open (`NEW`/`CONTACTED`/`QUALIFIED`) lead counts, and won rate over closed leads (`WON / (WON + LOST)`, 0 when none are closed). `months` (design/21 CRM-16): the twelve most recent UTC months with a lead create or stage change, newest first, each `{ month: "yyyy-MM", stages: [{ stage, count, percentOfTotal }] }` counting the leads that entered each stage that month, from `LEAD` audit rows |

List row: `{ id, customerId, customerName, vehicle: { id, vin, modelYear, make, model, status } | null, stage, ownerUsername, nextFollowUpOn, overdue, version }`. Detail adds `lostReason`, `notes`, `createdAt`.
Stages `NEW`, `CONTACTED`, `QUALIFIED`, `WON`, `LOST`; any stage may be chosen while the lead is open; `WON` and `LOST` are closed and change only through reopen (CR L4, decision D7): a `LOST` lead can always be reopened, a `WON` lead only while its vehicle is not `SOLD` and linked to the lead's customer. Reopening also requires what a create requires: a lead that has a vehicle reopens only while that vehicle is still `IN_STOCK` in this dealership, so no open lead can point at a sold car; a lead with no vehicle always reopens. Only one open lead may exist per customer and vehicle (CR L5); a lead without a vehicle is never a duplicate. `WON` does not sell the vehicle or link it — those stay §4.5 and §6. Selling a vehicle (§4.5) closes its open leads: the buyer's as `WON`, others as `LOST` ("Vehicle sold").
Errors: both or neither customer source → `400 VALIDATION`; owner not an active member → `400 VALIDATION`; vehicle not `IN_STOCK` in this dealership, on create, vehicle change or reopen → `400 WRONG_DEALER_OR_SOLD`; `LOST` without a reason → `400 VALIDATION` (`lostReason` is cleared for other stages); changing a `WON`/`LOST` lead, or reopening a `WON` lead whose vehicle was sold to its customer → `409 LEAD_CLOSED`; reopening an open lead or to a closed stage → `400 VALIDATION`; create, vehicle change or reopen that would give the customer a second open lead on the same vehicle → `409 LEAD_DUPLICATE`; stale `version` → `409 VERSION_CONFLICT`.
Audit `LEAD`: `CREATE` (`customerId`, `stage`, `vehicleId?`, `ownerUsername?`, `nextFollowUpOn?`; an optional key is left out when not set), `UPDATE` (changed keys; a reopen records `stage`, `reopened: true` and, when a lost reason was cleared, `lostReason: false`), `NOTE` (`noteId` only — note text is never copied into the audit). Lead data is never sent to AI.

### 5.6 `GET /api/v1/members` (Dealer.User)

The caller's dealership's active members, sorted by username, for the lead owner and work-order assignee pickers and the Team page. Admin or unbound → 403. `displayName` falls back to the username.

The list itself stays open to every member, including sales, because the lead owner and work-order assignee pickers need it; only the Team page's administration actions are restricted (§5.8). The caller's `dealerRole` therefore decides the **payload**, in two shapes:

- **Picker fields**, for every bound member: `username` and `displayName` only. The record fields are omitted from the row, not sent as `null`.
- **Full record**, for a caller with team access (`OWNER` or `MANAGER`): the picker fields plus `source`, `dealerRole`, `phone` and `joinedAt`. `source` is how the account was created (below). `phone` is the account's own phone, omitted when the account has no phone. `joinedAt` is the membership's `created_at` (UTC), shown as Team › Members › Joined.

Full record, as the owner or a manager sees it:

```json
[ { "username": "a1", "displayName": "Alice Owner", "source": "admin", "dealerRole": "OWNER", "phone": "+14165550100", "joinedAt": "2026-10-01T14:00:00Z" },
  { "username": "a2", "displayName": "a2", "dealerRole": "SALES", "joinedAt": "2026-10-20T09:30:00Z" } ]
```

Picker fields, as a sales member sees the same dealership:

```json
[ { "username": "a1", "displayName": "Alice Owner" },
  { "username": "a2", "displayName": "a2" } ]
```

`dealerRole` is `OWNER`, `MANAGER` or `SALES` (design/15 §2.5). A sales member never receives another member's role, phone or joined date, so the Team members table reads this route only as the owner or a manager.

Account `source` values: `google` (Google sign-in), `firebase` (email sign-up), `password` (registration form), `admin` (added by a platform admin). It is read from the account's `APP_USER`/`CREATE` audit `registration` key; an account without that row falls back to `google` or `firebase` from its linked identity, otherwise the source is unknown and `source` is omitted (such as seed data). Every unset field of the full record is omitted from the JSON rather than sent as `null`, as the example above shows for `a2`.

### 5.7 Join requests and dealer inbox (dealership owner)

Accounts that asked to join this dealership (§1.6), or that the platform admin sent a join request for (§3.6), wait here for its owner (design/21 AUTH-27). Approving or rejecting a join request is an owner power: the `/api/v1/dealer/join-requests/**` routes below need an active membership with `dealerRole` `OWNER`; a manager, a sales member, the admin, or an unbound account → 403. The two `/me/join-request` routes are the applicant's own and need no dealership. Neither list is paginated.

| Method and path | Result |
|---|---|
| `GET /api/v1/me/join-request` | Signed-in account, including unbound. **204** when none is pending. **200** `{ "dealerId", "legalName" }` for the one pending request |
| `POST /api/v1/me/join-request` | Body `{ "dealerId" }`. An unbound account requests one active dealership. **200** `{ "dealerId", "legalName" }`. A second, different dealership → **400** `VALIDATION`. Unknown or inactive dealership → **404**. Already a member → **403** |
| `GET /api/v1/dealer/join-requests` | 200 `[{ "username", "displayName", "email", "createdAt", "source" }]`: active unbound accounts that requested this dealership, newest first |
| `POST /api/v1/dealer/join-requests/{username}/approve` | 204. Creates or reactivates the membership as `SALES`, binds the account, resolves the notification as `APPROVED`. Audit `MEMBERSHIP`/`CREATE` `{username, source:"join_request"}`. The account already active at another dealership → **409** `DUP_MEMBER`, as for the admin bind (one login, one dealership) |
| `POST /api/v1/dealer/join-requests/{username}/reject` | 204. Clears the requested dealership (the account stays, unbound), resolves the notification as `REJECTED`. Audit `APP_USER`/`UPDATE` `{username, rejected:true}` |
| `GET /api/v1/dealer/notifications?includeResolved=false` | Any member (the one exception to the owner-only rule above). 200 array, newest first; only the owner gets `JOIN_REQUEST` rows, because only the owner acts on them — managers and sales members get every other kind. Default returns unresolved rows only; `includeResolved=true` returns the history. A `JOIN_REQUEST` payload also carries the applicant's account `source`, read at request time. A `BUYER_INQUIRY` payload is `{ leadId, customerName, vehicle }` (design/21 SHOP-04) |

No pending request from that username to this dealership → **404**. Notification item:

```json
{ "id": 3, "kind": "JOIN_REQUEST", "createdAt": "2026-10-16T18:00:00Z",
  "payload": { "username": "ada.lee", "displayName": "Ada Lee", "email": "ada@example.com", "source": "google" },
  "resolvedAt": null, "resolvedBy": null, "resolvedAction": null }
```

`resolvedAction` is `APPROVED`, `REJECTED`, or `CANCELLED` (the requester deleted the account, §2.2). Acting on the request resolves the row, so it leaves the owner's inbox.

### 5.8 Own dealership: profile and members (owner and manager)

Design/21 AUTH-27 and design/15 §2.5. The dealership is the caller's own, never taken from the route. The dealership profile is **owner only**; the member routes are open to the **owner or a manager**, each with the scope rules below. A sales member, the admin, or an unbound account → **403** `FORBIDDEN`, as does a manager on the profile routes.

| Method and path | Body | Result |
|---|---|---|
| `GET /api/v1/dealer/profile` | — | Owner only. 200, the §3.3 dealership shape |
| `PATCH /api/v1/dealer/profile` | `version`, `legalName`, `contactPhone`, `contactEmail`, `contactAddress`, `logoDataUrl` (same rules as §3.4; `active` stays with the admin) | Owner only. 200 dealership. Stale `version` → `409 VERSION_CONFLICT`. Audit `DEALER`/`UPDATE` with the changed keys |
| `DELETE /api/v1/dealer/members/{username}` | — | 204, unbinds exactly as §3.7. An owner removes a `MANAGER` or a `SALES` member; a manager removes `SALES` members only. The `OWNER`, the caller included → **403** `FORBIDDEN` (only the admin removes an owner); a manager targeting another `MANAGER` → **403** `FORBIDDEN`; no active member of that name → 404 |
| `PUT /api/v1/dealer/members/{username}/role` | `{ "dealerRole": "MANAGER" \| "SALES" }` | 204. Sets another active member of the caller's dealership, as §3.7b. An owner sets any member below owner to `MANAGER` or `SALES`; a manager may only promote a `SALES` member to `MANAGER`. `"OWNER"` from inside the dealership → **403** `FORBIDDEN` (only the platform admin appoints an owner, §3.7b); the `OWNER` as target → **403** `FORBIDDEN`; a manager targeting another `MANAGER` → **403** `FORBIDDEN`; the caller's own username → **403** `FORBIDDEN` ("You cannot change your own role."); missing or unknown `dealerRole` → `400 VALIDATION`; no active member of that name in this dealership → 404. Same role again is a no-op. Audit `MEMBERSHIP`/`UPDATE` `{username, dealerRole}` with the previous role |
| `PATCH /api/v1/dealer/members/{username}` | `{ "displayName", "phone" }` (`displayName` required, at most 120 characters; `phone` optional, at most 40, blank or `null` clears it) | 204. Edits an active member's full name and phone: an owner edits any member below owner, a manager edits `SALES` members only. The `OWNER` as target → **403** `FORBIDDEN` (the owner's own details are edited in Profile); a manager targeting a `MANAGER` → **403** `FORBIDDEN`. The phone is stored in canonical `+digits` form; an invalid phone → `400 VALIDATION` (`phone`); a phone used by another account → `409 PHONE_TAKEN`; no active member of that name in this dealership → 404. Nothing changed → no audit row. Otherwise audit `APP_USER`/`UPDATE` `{username, displayName?, phone?}` with the previous values |

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

Remove the association between that customer and that vehicle. The link row is soft-deleted (`deleted_at` set, row kept; design/15 §8.6). The vehicle returns to "unlinked" and can be linked again. Do not change vehicle `status`.  
**Sold vehicles cannot be unlinked** (15): vehicle `status=SOLD` → **409** `SOLD_LOCKED` (sale record must not be erased).  
No such association or cross-dealership → **404** (not 403). Audit `CUSTOMER_VEHICLE` / `UNLINK`.

---

## 7. Ad listing

One listing per vehicle. Paths use **vehicle id** to get/save draft (handbook); check/Ready/Export use **listing id**.

### 7.1 `GET /api/v1/vehicles/{id}/listing`

No row: **do not insert, do not persist**; return a virtual empty draft (align 15):

```json
{
  "id": 0,
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

`id` **0** marks the unsaved virtual draft (no listing row exists yet); clients must save it before calling check/ready/export. If a row exists, `id` is its positive id and `lastCheck` is the latest check summary or `null`. Cross-dealership vehicle **404**.

### 7.2 `PATCH /api/v1/vehicles/{id}/listing`

No row → **INSERT**. Increment `contentVersion`, return `status` to `DRAFT`, void old checks (shown as `checkStatus=STALE` or `NEEDS_AI`, see §8).  
V1 `title`/`body` are NOT NULL: on the first save (INSERT) an omitted or blank `title`/`body` is written as **`''`** (15), and an omitted `adKind`/`medium` defaults to `CASH`/`ONLINE`. On a later save the body/title/kind/medium follow merge-patch semantics. Checklist properties (`priorUse`, `warrantyTerms`, `annualKmAllowance`) are sent on every form save; `null` clears the saved answer. This ensures answer edits invalidate the existing check. `title` ≤ 200 characters; warranty terms ≤ 2,000; annual allowance 1–1,000,000 km.

First create may omit `version` or send `0`. Later requests must send the current `version`.

```json
{
  "version": 0,
  "title": "2020 Toyota Camry",
  "body": "Cash price $18900. Sold as-is by Prairie Auto Ltd. 403-555-0100 ...",
  "adKind": "CASH",
  "medium": "ONLINE",
  "priorUse": null,
  "warrantyTerms": null,
  "annualKmAllowance": null
}
```

`adKind`: `CASH`\|`FINANCE`\|`LEASE`. `medium`: `ONLINE`\|`RADIO_TV_BILLBOARD`. `priorUse`: `POLICE_EMERGENCY`\|`TAXI_LIMO`\|`DAILY_RENTAL`\|`OTHER` or `null`.
Response matches 7.1 (now persisted). `404` / `409 VERSION_CONFLICT` / `400 VALIDATION`. The first save is audited `LISTING` / `CREATE`, later saves `LISTING` / `UPDATE` with the changed keys and their previous values (AUD-14).

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
`aiNotes`: structured model notes. Each element is `{ "code", "severity", "explanation", "message" }`. `severity` is `REVIEW` or `INFO` only: AI notes are advisory and never block (AD-08), so any other model value, including `BLOCK`, is stored as `REVIEW`. `message` is the human-readable note. Rule findings stay `{ ruleId, severity, passed, message }` and are not given these issue codes. Notes may be `[]` / `null`. A failed or timed-out model call is `UNAVAILABLE`, never `PASSED`.
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

`version` = listing optimistic lock. Flow restates the handbook: this-dealership validation → fixed checklist → if no hard block, ai-service `POST /internal/v1/ad-check` (adapter timeout ≤15s) → write `compliance_check`, write back `listing.last_check_id`.

| Result | HTTP | body |
|---|---|---|
| Blocked / Needs AI / Passed | **200** | full check object (includes `checkStatus`) |
| Rules passed, AI timeout or failure | **502** `AI_UNAVAILABLE` | standard error body. Check row **already written** as `UNAVAILABLE`, listing already points to it. Client then GET listing |
| listing version mismatch | **409** `VERSION_CONFLICT` | error body |
| Cross-dealership / no listing | **404** | error body |

**Blocked is not an HTTP error.** Do not use 4xx to mean "missing price / FINANCE missing APR".

Each written check row is also audited `LISTING` / `CHECK` with its result; the check history (`compliance_check`) stays the source of check details (AUD-14).

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
Success: **200** plain text. Content = dealership public four fields + vehicle public fields (year/make/model/vin/condition/source, **no cost**) + title/body + check time, then a closing disclaimer line: "This check is not legal advice and is not an OMVIC approval. Confirm current disclosure requirements with OMVIC before publishing." (AD-14, specification §8). Do not write customers. Each successful export is audited `LISTING` / `EXPORT` (AUD-14).

---

## 9. Audit

All audit reads are newest first (`createdAt` desc, then `id` desc) unless a `sort` is given, which also breaks ties, and use the §1.1 page envelope. Audit rows are append-only; there is no write, edit or delete endpoint.

### 9.1 `GET /api/v1/audit`

Query: `entityType`, `entityId` required; `page`, `size` optional; `sort=field,asc|desc` optional with `field` one of `createdAt`, `actorUsername`, `action` (default newest first). The sort orders the whole history, related rows included, before paging (CR-020). An unknown `sort` → `400 VALIDATION`.

The dealership owner or a manager (§5.8) only; a sales member → **403** `FORBIDDEN` (`Only a dealership owner or manager can do this.`) (AUD-17). Entity not in this dealership → **404**.  
Admin → **403** `FORBIDDEN` for every `entityType`, no `fieldSummary` content; the admin reads audit through §9.2.

`entityType`: `VEHICLE`\|`CUSTOMER`\|`CUSTOMER_VEHICLE`\|`LEAD`\|`WORK_ORDER`\|`VEHICLE_PHOTO`\|`LISTING` (owner or manager query; a `LISTING` `entityId` is the listing id). A deleted photo's id or an unlinked `CUSTOMER_VEHICLE` id stays queryable while its audit rows exist in this dealership. `CUSTOMER` history also includes the `CUSTOMER_VEHICLE` `LINK`/`UNLINK` events whose `fieldSummary.customerId` is that customer, newest first. `VEHICLE` history likewise includes the `CUSTOMER_VEHICLE` `LINK`/`UNLINK` events and the `VEHICLE_PHOTO` events whose `fieldSummary.vehicleId` is that vehicle (AUD-06). Admin writes use `DEALER`/`MEMBERSHIP`; **this query API does not open those two types to dealer users** (→ **403**). Any other type (for example `APP_USER`) or a missing `entityType`/`entityId` → `400 VALIDATION`.

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
      "createdAt": "2026-09-21T21:10:00Z",
      "previous": null,
      "dealerId": null,
      "clientIp": null,
      "clientLocation": null
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 1
}
```

`action`: `CREATE`\|`UPDATE`\|`SELL`\|`LINK`\|`UNLINK`\|`NOTE`\|`DELETE`\|`LOGIN`\|`LOGIN_FAILED`\|`CHECK`\|`EXPORT`. Stored `entityType` values: `VEHICLE`\|`CUSTOMER`\|`CUSTOMER_VEHICLE`\|`DEALER`\|`MEMBERSHIP`\|`LEAD`\|`WORK_ORDER`\|`VEHICLE_PHOTO`\|`APP_USER`\|`LISTING`\|`RULE_OVERRIDE`. Core rejects an unknown type or action at write time, so no such row exists (AUD-16).

`AuditItem` fields:

| Field | Meaning |
|---|---|
| `fieldSummary` | changed field → **new** value; `null` when there is nothing to record |
| `previous` | changed field → **replaced** value, same keys and formatting as `fieldSummary`, on updates and other state changes where the old value is known; otherwise `null`. Each row is one version step of the record (AUD-13) |
| `dealerId` | the row's dealership (`null` when the row has none); returned only by §9.2 and §9.3, `null` here |
| `clientIp` | the caller's IP (AUD-16); returned only by §9.2 and §9.3, `null` here |
| `clientLocation` | place name stored with the row (design/15 §8.8): neighborhood, city with quadrant (`Calgary SW`), region, and country. `Local or private network` for a non-routable address. `null` when the lookup did not return a place. Returned only by §9.2 and §9.3, `null` here |

Contact fields (`email`, `phone`, `address`, `homeAddress`, `contact*`) are recorded by value like every other field: the new value in `fieldSummary` and the replaced value in `previous` (AUD-04, changed 2026-10-21). Only the dealership owner, its managers and the admin can read audit rows (AUD-17). Application logs still never carry contact values.

### 9.2 `GET /api/v1/admin/audit`

Platform audit log (AUD-10). `Platform.Admin` only; any other caller → **403** `FORBIDDEN`. Returns every audit row across dealerships, including sign-ins and admin operations.

Query (all optional): `entityType`, `entityId`, `action`, `actor` (any part of the username, ignoring case; `anonymous` for unknown sign-in identifiers), `dealerId`, `q` (free text, ignoring case, matched against the action, the record type and the stored change values in `fieldSummary` and `previous`, for example `password`; spaces match the underscores of wire names such as `WORK_ORDER`; CR T3, T5), `from` (inclusive) and `to` (exclusive) as ISO 8601 instants, so the UI can filter by the viewer's local days, `sort=field,asc|desc` with `field` one of `createdAt`, `actorUsername`, `action`, `entityType` (then `entityId`), `dealerId`, `clientIp`, `clientLocation` (default newest first, which also breaks ties; CR C7; blank values sort last in both directions), `page`, `size` (default **20**, at most 100). An unknown `entityType`, `action` or `sort` → `400 VALIDATION`. Each item carries `dealerId`, `clientIp`, and `clientLocation`, plus `actorDisplayName`, `actorRole` (`PLATFORM_ADMIN`, `OWNER`, `MANAGER`, `SALES`, or `null`), and `dealerName`: the actor's name and role and the dealership's legal name stored when the row was written (design/15 §8.8), `null` on rows written before 2026-11-09. Sign-ins (`LOGIN`, `LOGIN_FAILED`) and other operations are the same rows; filter `action` to separate them.

### 9.3 `GET /api/v1/dealer/audit`

Dealership audit log (AUD-11). The dealership owner or a manager (§5.8) only; a sales member → **403** `FORBIDDEN` (`Only a dealership owner or manager can do this.`); Admin → **403**. Returns every row whose `dealerId` is the caller's dealership. Same query as §9.2 except that `dealerId` is ignored. Each item carries the same fields as §9.2.

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

`kind`: `VEHICLE`\|`CUSTOMER`\|`LISTING`. Frontend routes are not specified here. Card fields that do not apply are omitted, not `null`.  
`count` is `null` unless the question asks how many; then core computes it (never the model) as `{ "count": 2, "singularLabel": "in-stock vehicle", "pluralLabel": "in-stock vehicles", "summary": "There are 2 in-stock vehicles." }`. A question that names more than one of vehicles, customers, and listings gets one count whose `summary` states each total (a full-dealership total when no extra search words remain).
Model down: `summary` is `null`, `summaryAvailable=false`, `cards` are still the retrieval list (at most 5). HTTP **200** (retrieval succeeded). 403 only when staff identity fails.  
core calls the internal assistant (ai-service) with the question and the retrieved resources only. A three-turn cap, if kept, limits only what may be sent and is not a `ConcurrentHashMap` or deque. Per-user turns are not retained in memory, because that history is not sent and must not grow for the life of the JVM. It is **not persisted to business tables**.

---

## 11. Internal only (browser 404)

**Response bodies are not pinned here.** Use [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) §B: success `{success,notes[]}` / `{success,summary}`; failure `{success:false,code,message}` with **504** `AI_TIMEOUT` / **503** `AI_KEY_MISSING` / **502** `AI_PROVIDER_FAILED`.

core calls these on ai-service directly; the browser does not.

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
| `SOLD_PAIR_REQUIRED` | 400 | sell missing date or price, or price ≤ 0 |
| `WRONG_DEALER_OR_SOLD` | 400 | Lead create/patch with a `vehicleId` that is not `IN_STOCK` in this dealership (§5.5). `CustomerService.link` does not throw it. A same-store sold vehicle may be linked. A missing or cross-dealership id is `NOT_FOUND` (404). An existing link is `VEHICLE_ALREADY_LINKED` (409). |
| `UNAUTHORIZED` | 401 | not signed in |
| `FORBIDDEN` | 403 | role not allowed for this URL; or staff has no valid membership |
| `NOT_FOUND` | 404 | no resource or cross-dealership; also an unknown API path |
| `METHOD_NOT_ALLOWED` | 405 | HTTP method not supported on this path |
| `VERSION_CONFLICT` | 409 | `version` mismatch |
| `DUP_MEMBER` | 409 | this dealership already has this active member |
| `LAST_OWNER` | 409 | demote, unbind or delete the dealership's only active owner while it still has another active member (§2.2, §3.7, §3.7b, §3.7d) |
| `USERNAME_TAKEN` | 409 | sign-up (§1.5–1.7) or new member (§3.6) with a username already in use |
| `EMAIL_TAKEN` | 409 | same, with an email already in use. A customer email shared inside a dealership is not rejected; it returns `emailWarning` (§5.2) |
| `PHONE_TAKEN` | 409 | same (including `PATCH /me`), with a phone number already in use |
| `LEAD_CLOSED` | 409 | change to a `WON` or `LOST` lead, or reopen of a won lead whose vehicle was sold to its customer (§5.5) |
| `LEAD_DUPLICATE` | 409 | a second open lead for the same customer and vehicle (§5.5) |
| `WORK_ORDER_CLOSED` | 409 | change to a `DONE` or `CANCELLED` work order (§4.7) |
| `WORK_ORDERS_OPEN` | 409 | sell while `OPEN`/`IN_PROGRESS` work orders exist (§4.5) |
| `VEHICLE_ALREADY_LINKED` | 409 | vehicle already linked to a customer |
| `SOLD_LOCKED` | 409 | sold purchase edit, sell again, **unlink a sold vehicle**, or delete the buyer of a sold vehicle (§5.4a) |
| `CHECK_STALE` | 409 | check expired at Ready/Export |
| `NOT_PASSED` | 409 | not Passed at Ready/Export |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | request body is not `application/json`; or an uploaded photo is not JPEG/PNG (§4.8) |
| `INTERNAL_ERROR` | 500 | unexpected server error, or Google/Firebase signing keys unreachable; details are logged server-side only |
| `AI_UNAVAILABLE` | 502 | ad-check AI failure/timeout |
| `CATALOG_UNAVAILABLE` | 502 | NHTSA vPIC vehicle catalog unreachable or malformed (§4.6) |

---

## 12a. Buyer site (anonymous)

Public routes for `/shop` (design/21 SHOP-01–05). The Gateway passes `GET` and `POST /api/v1/public/**` without a token; Core reads no tenant from the caller and names the dealership in the path. A vehicle is listed while it is `IN_STOCK`, not deleted, and its listing is `READY` with a `PASSED` check for the current `contentVersion`. Unknown or inactive dealership, or an unlisted vehicle → **404**.

| Method and path | Body | Result |
|---|---|---|
| `GET /api/v1/public/dealers/{dealer}/inventory` | — | `dealer` is the dealership's slug (§4.6.2) or its numeric id (older links). 200 `{ dealerId, slug, legalName, contactPhone, contactEmail, contactAddress, vehicles: [{ vehicleId, modelYear, make, model, bodyType, conditionCode, mileageKm, exteriorColor, fuelType, title, body, hasPhoto }] }`, newest `addedOn` first. No VIN, cost, list price, or customer data |
| `GET /api/v1/public/dealers/{dealerId}/logo` | — | 200 image: the dealership logo decoded from its stored data URL (PNG, JPEG or WebP); `Cache-Control: public, max-age=300`. No logo → 404. The `/shop` directory cards use it as their artwork |
| `GET /api/v1/public/dealers/{dealerId}/vehicles/{vehicleId}/photo` | — | 200 image: the first photo, enhanced copy when present; `Cache-Control: public, max-age=300`. No photo → 404 |
| `POST /api/v1/public/dealers/{dealerId}/inquiries` | `{ vehicleId, contact: { name, email, phone, homeAddress }, message }` | 204. `contact` follows §5.2; `message` 1–1000; errors are `400 VALIDATION` with `contact.name`-style keys. Reuses the most recently updated active customer whose phone **and** name both match (phone compared digits only, so `(403) 555-0123` and `4035550123` are one number; name trimmed and case-insensitive), else creates one. Phone alone is never enough: people who share a phone keep separate profiles. The email is never part of the match — a different or newly typed email neither prevents the match nor overwrites the stored one. When that customer already has an open (not `WON`/`LOST`) lead on the vehicle, the message is added to that lead as a note and no lead is created (CR-051); otherwise creates a `NEW` lead on the vehicle due today with the message as its first note. Only a created lead posts a `BUYER_INQUIRY` notification to the dealership, because that notification is resolved when the lead gets an owner or leaves `NEW`. Actor `buyer-site` on the customer, lead, note, and audit rows. Rate-limited per IP (`inquiryPerMinute`, default 5) → `429 RATE_LIMITED` |

## 13. Do not build (do not bring the retired draft back)

Social providers beyond Google and Firebase (§1.6–1.7), tickets, sales orders, Service Bus, arbitrary `dealerId` dealership switching, Admin reading/writing vehicles/customers/ads. The buyer routes are limited to §12a and the KPI dashboard to `/dashboard` over the existing report endpoints.
