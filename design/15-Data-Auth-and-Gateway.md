# 15 · Data-model rulings, auth, gateway, and minimal cloud deploy

Version: current (v6) · 2026-09-23  
Status: fills gaps for the `dealer-core` entity layer and `dealer-gateway` configuration; **not** OpenAPI, **not** a business implementation.  
**Dealer auth (admin-issued username/password)** is owned here in §8; keep [README.md](../README.md) § Sign-in (admin-issued username/password) consistent with it.

## Conflict order and SQL baseline

On conflict, decide in this order and **do not reverse it**:

1. Course PPT (independent repos, Gateway, JWT/RBAC, Azure hosting, infrastructure as code, HTTPS, Key Vault, real AI) — **except Auth**, where the client specification's username/password wins per [SCOPE-BASELINE.md](SCOPE-BASELINE.md) errata item 1 (reversed 2026-09-30) and §8 below
2. DealerOps spec PDF fields and enums (do not add or remove columns)
3. `IMPLEMENTATION-BRIEF.md` / `00`
4. **This document owns data, tenant, and gateway behavior**; **[14](14-Backend-API-Contract.md) owns HTTP JSON**; **[13](13-Frontend-Engineering.md) owns frontend engineering**
5. [12](12-Frontend-UI-Conventions.md) UI conventions

The SQL **landed baseline** is `dealer-core/src/main/resources/db/migration/V1__init.sql`.  
This document does not change V1. Where this document conflicts with V1 there are only two outs: **handle it in the application layer**, or later suggest `V2__*.sql` (indexes first; do not change columns if you can avoid it).  
Do not restore tickets / leads / password tables / Service Bus / a second database. Do not use `ddl-auto=update`.

Coding still starts from `IMPLEMENTATION-BRIEF.md`. Full paths and JSON still belong to **14**; frontend file split belongs to **13**. This document only covers table behavior, tenant, and Gateway **routes and entry**.

**403 vs 404 (same wording as 14):** cross-dealership / this id is not in this dealership → **404**. Wrong role, Admin hitting a business URL, staff with no `membership.active=1` → **403** `FORBIDDEN`. Missing/bad JWT → **401**. `SOLD_LOCKED` → **409**.

---

## 1. Empty listing draft vs `title`/`body` NOT NULL

**Ruling (locked): the application layer uses empty strings as placeholders; GET treats "no row or both blank" as an empty draft. Do not change V1 nullability.**

V1:

```sql
title VARCHAR(200) NOT NULL
body  TEXT NOT NULL
```

Handbook: `GET /vehicles/{id}/listing` "empty draft if none". These do not conflict; implement as follows.

| Scenario | Behavior |
|---|---|
| Vehicle has no `listing` row yet | GET **does not insert**, returns a virtual draft: `id=null`, `title=""`, `body=""`, `adKind=CASH`, `medium=ONLINE`, `status=DRAFT`, `contentVersion=1`, `lastCheckId=null`, `version=0` |
| First PATCH | INSERT; `title`/`body` use request values; if omitted or only whitespace, write `''` (satisfies NOT NULL) |
| Row exists and both `title` and `body` are empty after trim | GET treats it as an empty draft (blank UI form); `status` stays `DRAFT`; Ready / Export forbidden |
| Client sets `title`/`body` to `null` | Application layer stores `''`; do not let JDBC hit NOT NULL |

**Why not a V2 nullable change:** an empty draft is product semantics, not an "unknown title". V1 is already NOT NULL; making columns nullable would change columns, entities, and validation, and would fight the spec wording that title/body are required. Empty-string placeholders need zero migration, so Flyway can keep a single V1 while entities are written.

**V2 is not recommended (this item).**

Entity convention: `Listing.title` / `Listing.body` are non-null Java `String`s defaulting to `""`. Do not use `Optional` to mean draft.

---

## 2. `app_user.dealer_id` vs `membership` (tenant authority)

**Ruling: staff tenant authority is `membership` (the row with `active=1`). `app_user.dealer_id` is only a cache for `GET /me`; write paths must stay in sync with membership and must not be used as the isolation key.**

Column note: the person identifier is the admin-issued **username** (`app_user.username`, `membership.username`, `audit_event.actor_username`). There is no tenant-id column; see §8.3 for the migration that replaced the original V1 identity columns.

### 2.1 Division of labor

| Table | Authoritative for | Not authoritative for |
|---|---|---|
| JWT `roles` + `sub` (username) | whether the user is signed in, Admin vs staff | cannot tell you the dealership ID |
| `membership` | **whether this dealership may touch business data** | does not replace JWT roles |
| `app_user` | display name, role cache, `GET /me` `dealerId` | **forbidden** to use `WHERE vehicle.dealer_id = app_user.dealer_id` without checking membership |

Each staff request:

1. Map the JWT to `Dealer.User` (see section 8)
2. Find `app_user` by `username`; no row or `active=0` → **401** `UNAUTHORIZED` (accounts are only created by the admin, never provisioned from a token)
3. Load **exactly one** `membership.username = :username AND active = 1`
4. This request `tenantDealerId = membership.dealer_id`
5. Ignore any `dealerId` in body / query / header
6. If `app_user.dealer_id` disagrees with membership: membership wins; write back `app_user.dealer_id` (self-heal, not 500)

Admin:

- No membership required; `app_user.dealer_id` **must be NULL**
- Do not join vehicles / customers / ads; business URLs → **403** `FORBIDDEN` (same wording as 14); no business fields in the body. Do not use 404 pretending "that staff does not exist" to block Admin.

### 2.2 One person, many dealerships?

**Only one `active=1` membership is allowed at a time.**  
V1 `uk_membership (dealer_id, username)` **cannot** stop the same username from hanging on two dealerships; the application layer must:

- `POST .../members`: if that `username` already has an active row at another dealership → `409 DUP_MEMBER` (or unbind first, then bind)
- `POST .../members`: if that `username` is an existing `Platform.Admin` account → `409 DUP_MEMBER`; never overwrite the admin's role or password
- The bind locks the existing `app_user` row (`SELECT ... FOR UPDATE`) before the active-membership check, so two concurrent binds of the same account cannot both succeed
- Do not build a "dealership switcher" in this Sprint

History rows: after unbind, `active=0` may remain for audit; binding the same `(dealer_id, username)` again reactivates that row — do not insert a second row (unique-key collision).

### 2.3 Clearing role after unbind

`DELETE /admin/dealers/{id}/members/{username}`:

1. Target row becomes `membership.active=0` (do not delete the `app_user` row or its password hash)
2. `app_user.dealer_id = NULL`
3. **`app_user.role` stays `Dealer.User`** (an already-issued JWT keeps its role until it expires)
4. `GET /me`: `role=Dealer.User`, `dealerId=null`
5. After that, business APIs: no active membership → **403** `FORBIDDEN` (signed in but no dealership). **Not** 401, **not** 404 (404 is only for "this id is not in this dealership / cross-dealership id")
6. If the JWT is still `Dealer.User` but unbound, that is "can enter the post-login empty shell"

Admin operations may write `audit_event`: `entityType=MEMBERSHIP`, `dealerId` may be empty or the unbound dealership.

### 2.4 JWT role × local membership

| JWT mapped role | active membership | Result |
|---|---|---|
| none / cannot map | — | Gateway 401; never reaches core business |
| `Platform.Admin` | present or absent, ignored | All `/api/v1/**` routes and `/me`; business reads are cross-dealer. Mutations that create a dealer-owned record still require an explicit dealer context |
| `Platform.Admin` and `Dealer.User` both present | — | **Admin wins** (when a staff token is accidentally elevated, trust Admin in the token) |
| `Dealer.User` | exactly 1 active | business allowed; tenant = that row's `dealer_id` |
| `Dealer.User` | 0 | **403** `FORBIDDEN`, no dealership (same wording as 14) |
| `Dealer.User` | ≥2 active | 500-class configuration error (bind API should never write this); reject business |

`app_user.role`: written back from the JWT at sign-in or bind; **authorization compares the current JWT**. An expired role in the database cannot elevate privileges.

**V2 is not recommended.** If a later change must enforce one person / one dealership in the database, use a generated-column unique index on active rows only; Sprint 1 is not blocked — the application layer is enough.

---

## 3. `vehicle.status`, sold lock, sell as a pair

**Ruling: the application-layer enum allows only `IN_STOCK` / `SOLD`. V1 has no CHECK; do not rely on the database to block dirty values.**

### 3.1 State machine

| Action | Result |
|---|---|
| POST new vehicle | force `IN_STOCK`; `sold_on`/`sold_price` must both be NULL |
| PATCH in-stock | must not change `status` to `SOLD` (sell only via `POST .../sell`) |
| POST sell | `{soldOn, soldPrice, version}` **missing either → 400 `SOLD_PAIR_REQUIRED`**; on success `status=SOLD` and both fields are written together |
| Sell again after sold | **409** `SOLD_LOCKED`; do not overwrite the original sale |

Illegal strings (`ACTIVE`, `DRAFT`, and similar) → 400; do not silently persist them.

### 3.2 Which fields the sold lock covers

Sold (`status=SOLD`) **forbids PATCH** of these purchase/identity fields (handbook text + `dealer_id`):

`make` `model` `modelYear` `vin` `source` `purchaseCost` `addedOn` `repairCost` `carfaxUrl` `dealerId`

Allowed: none (this course has no "change asking price after sold" column). A sold vehicle's listing may still GET/PATCH so stale-check demos work, but you **cannot** change purchase cost by editing the vehicle.  
Violation → **409** `SOLD_LOCKED` (same wording as 14; not 400).

`version` still uses optimistic locking; conflict `409 VERSION_CONFLICT`.

### 3.3 Sold date and price as a pair

Invariants (checked on every write path):

- `IN_STOCK` ⇔ `sold_on IS NULL AND sold_price IS NULL`
- `SOLD` ⇔ both are non-NULL
- Only one filled → `SOLD_PAIR_REQUIRED`
- Price must be `> 0` (spec is a sale price; 0/negative is 400)

**V2 CHECK is not recommended** (optional, not a start blocker). Entity enum + validation is enough.

---

## 4. `customer_vehicle`

**Ruling: one vehicle is linked to one customer globally (`uk_cv_vehicle`). Link only "this dealership + not already taken" (in stock or sold, so a sale recorded before linking can still reach its buyer). After sale the association is kept and cannot be unlinked.**

| Rule | Error |
|---|---|
| `vehicle.dealer_id == customer.dealer_id == tenantDealerId` | **cross-dealership id → 404** (not 403). Never use `WRONG_DEALER_OR_SOLD` for store mismatch |
| `uk_cv_vehicle`: a row already exists for that `vehicle_id` | 409 `VEHICLE_ALREADY_LINKED` |
| One customer, many vehicles | allowed |
| Sale (sell) | **do not delete** `customer_vehicle`; CRM still shows that vehicle |
| UNLINK (DELETE) after sold | reject **409** `SOLD_LOCKED` (sale record must not be erased; 14 DELETE must return this code) |
| UNLINK while in stock | allowed; delete the row or hard-delete per your entity choice (V1 has no soft-delete column); audit `UNLINK` |
| Link a sold vehicle that has no customer yet | allowed once; a second link → 409 `VEHICLE_ALREADY_LINKED` |

Link/unlink audit: `entityType=CUSTOMER_VEHICLE`, `action=LINK`/`UNLINK`, `fieldSummary` **must not** write full phone/email/address.

**V2 is not recommended.** The unique key is already in V1.

---

## 5. `listing.last_check_id` has no FK

**Ruling: do not add an FK (avoids a `listing` ↔ `compliance_check` cycle). The application layer guarantees "it only points at a check this listing itself inserted".**

Write order (already in the handbook):

1. INSERT `compliance_check` (with this `listing_id` and the then-current `content_version`)
2. Write the generated `id` back to `listing.last_check_id`
3. Same transaction; on failure roll the whole unit back. Do not leave a half-success of "check row exists, listing still points at the old id" (if AI was called but persist failed: the database wins; check again next time)

Read:

- `last_check_id` empty → no current check
- id present but row missing (dirty data) → treat as no check; do not 500
- row exists but `check.listing_id != listing.id` or `check.dealer_id != listing.dealer_id` → ignore, treat as no check
- Stale: `check.content_version != listing.content_version` (even if recommendation was once PASSED)

Clients **must not** PATCH `lastCheckId`. When incrementing `contentVersion`, **do not clear** `last_check_id` (UI uses version compare to show Stale).

### Suggested V2 indexes (not a start blocker)

Handbook-named priorities first:

```text
V2__indexes.sql (suggested; not landed in this document)
- KEY idx_vehicle_dealer_status (dealer_id, status)
- KEY idx_customer_dealer (dealer_id)
```

Additional suggestions in this document (still V2; may merge with the file above):

```text
- KEY idx_membership_username_active (username, active)
- KEY idx_listing_dealer (dealer_id)
- KEY idx_check_listing_ver (listing_id, content_version)
- KEY idx_audit_dealer (dealer_id)
```

**Do not** add a `last_check_id` FK in V2.  
**Do not** add columns for APR / extended warranty / prior use.

---

## 6. OMVIC fixed-checklist decision (pseudocode)

Fixed rules run in **core**, **before** any model call.  
Input: listing `title+body` (together `text`), `adKind`, `medium`, vehicle public fields, dealership four public fields.  
**Do not** use purchase cost as the "asking price". There is no APR column: search the body only.

The following is a decision procedure, **not** a keyword-blacklist product document. Matching is case-insensitive; amounts/rates use regex and allow `$`, `CAD`, `C$`.

```
function runFixedOmvic(listing, vehicle, dealer) -> { hardBlocks[], softGaps[], recommendation, aiStatus }

  text     = listing.title + "\n" + listing.body
  textNorm = lower(text)
  hard[]   = []          // hard miss → BLOCKED, do not call AI
  soft[]   = []          // rules passed but still recommend AI review of fuzzy items

  // --- empty draft ---
  if blank(listing.title) AND blank(listing.body):
      hard += PRICE_MISSING, DEALER_NAME_MISSING, CONDITION_UNDISCLOSED
      return blocked(hard)

  // --- price (always) ---
  hasPrice = match(text, /(?:cad|c\$|\$)\s*\d[\d,]*(?:\.\d{2})?|\d[\d,]*(?:\.\d{2})?\s*(?:cad|dollars?)\b/i)
  if !hasPrice:
      hard += PRICE_MISSING

  // --- dealership name and contact (always) ---
  if !containsNormalized(text, dealer.legalName):
      hard += DEALER_NAME_MISSING
  hasPhone = containsNormalized(text, digits(dealer.contactPhone)) OR match(text, /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)
  hasEmail = containsNormalized(text, dealer.contactEmail) OR match(text, /\S+@\S+\.\S+/)
  hasAddr  = containsNormalized(text, dealer.contactAddress)
  if !(hasPhone AND hasEmail AND hasAddr):
      if !(hasPhone OR hasEmail OR hasAddr):
          hard += DEALER_CONTACT_MISSING
      else:
          soft += DEALER_CONTACT_INCOMPLETE   // only one contact shown: not a hard block; give to AI

  // --- year / new vs used (always) ---
  // No separate used/new status field (PROTOCOL §C.0a). Contradiction is soft only.
  year = vehicle.modelYear
  if !contains(text, str(year)):
      soft += YEAR_NOT_IN_COPY               // structured year exists, copy omitted it → not a hard block
  // contradictory "new/used" wording (copy says brand new but year <= currentYear-2) → soft, hand to AI

  // --- conditionCode (always; compare to the vehicle, not an imagined stock tag) ---
  code = vehicle.conditionCode   // CERTIFIED | AS_IS | UNFIT | IRREPARABLE
  claimedCertified = match(textNorm, /certified|cpo|certifi/)
  claimedAsIs      = match(textNorm, /as[\s-]?is|as is/)
  claimedUnfit     = match(textNorm, /unfit|not roadworthy|not fit/)
  claimedIrrep     = match(textNorm, /irreparable|salvage|write[\s-]?off/)

  if claimedCertified AND code != CERTIFIED:
      hard += CONDITION_MISMATCH             // ad claims better than the actual vehicle
  if code in {UNFIT, IRREPARABLE}:
      disclosed = (code==UNFIT AND claimedUnfit) OR (code==IRREPARABLE AND claimedIrrep)
      if !disclosed:
          hard += CONDITION_UNDISCLOSED      // unfit / irreparable must be stated
  if code == AS_IS AND !claimedAsIs:
      hard += CONDITION_UNDISCLOSED          // spec requires condition disclosure; AS_IS uses a fixed phrase
  if code == CERTIFIED AND !claimedCertified:
      soft += CERTIFIED_NOT_IN_COPY          // paraphrase is allowed; give to AI

  // --- prior use (always "if applicable") ---
  // no vehicle column. Cue regex includes police/taxi/limo(usine)/daily rental/lease return etc.
  // Cue without a disclosure phrase → soft (course: not a hard publish block; see PROTOCOL §C.0a)
  if mentionsPriorUseCue(textNorm) AND !mentionsPriorUseDisclosure(textNorm):
      soft += PRIOR_USE_UNCLEAR

  // --- extended warranty (always "if the copy claims one") ---
  if match(textNorm, /extended warranty|warranty included|free warranty/):
      soft += WARRANTY_CLAIM_NEEDS_REVIEW    // not a hard block; AI reviews completeness of terms

  // --- FINANCE extras ---
  // spec §5: also when a CASH ad shows a rate or payment (e.g. "$299 per month")
  if listing.adKind == FINANCE OR (listing.adKind == CASH AND (hasApr(text) OR showsPayment(text))):
      hasApr = match(text, /\d+(\.\d+)?\s*%\s*(apr|annual percentage rate)|apr\s*[:=]?\s*\d+(\.\d+)?\s*%/i)
      if !hasApr:
          hard += FINANCE_APR_MISSING
      hasTerm = match(textNorm, /\d+\s*(month|months|mo)\b|term\s*[:=]?\s*\d+/)
      if !hasTerm:
          soft += FINANCE_TERM_MISSING
      // cash price = hasPrice above (PRICE_MISSING hard). No separate "cost of borrowing" regex (PROTOCOL §C.0a).
      if listing.medium != RADIO_TV_BILLBOARD:
          // "interest rate shown next to APR" cannot be reliably regexed → not hard; soft so AI reviews layout
          soft += FINANCE_APR_PROXIMITY
      // RADIO_TV_BILLBOARD: proximity display waived; do not add FINANCE_APR_PROXIMITY

  // --- LEASE extras ---
  if listing.adKind == LEASE:
      hasApr = match(text, /\d+(\.\d+)?\s*%\s*(apr|annual percentage rate)|apr\s*[:=]?\s*\d+(\.\d+)?\s*%/i)
      if !hasApr:
          hard += LEASE_APR_MISSING
      if !match(textNorm, /lease|leasing|lessee/):
          hard += LEASE_STATEMENT_MISSING
      hasTerm = match(textNorm, /\d+\s*(month|months|mo)\b/)
      hasRent = hasPrice OR match(textNorm, /\$?\d+.*(per month|\/mo|monthly)/)
      hasDown = match(textNorm, /down payment|due at signing|\$\d+.down/)
      if !hasTerm: soft += LEASE_TERM_MISSING
      if !hasRent: soft += LEASE_RENT_MISSING
      if !hasDown: soft += LEASE_DOWN_MISSING
      if match(textNorm, /(\d{1,5})\s*(km|kilometr).*\/\s*(year|yr|annual)/):
          allowance = capturedKm
          if allowance < 20000 AND !match(textNorm, /excess|overage|additional.*(km|kilometr)/):
              hard += LEASE_EXCESS_KM_MISSING
      else:
          soft += LEASE_ALLOWANCE_UNSTATED

  // --- summarize (fixed rules before AI) ---
  if hard is not empty:
      return {
        ruleFindings: hard + soft,
        recommendation: BLOCKED,
        aiStatus: SKIPPED
        // caller: do not HTTP-call ai-service
      }

  return {
    ruleFindings: soft,
    recommendation: NEEDS_AI,          // no successful AI yet
    aiStatus: (will call AI)
  }
```

core calls Gateway `POST /internal/v1/ad-check` (≤15s) only after `hard` is empty.  
AI success with no further hard miss → `PASSED` + `SUCCESS`.  
Timeout/failure → `UNAVAILABLE` + `UNAVAILABLE`; **never treat as Pass**.  
Page five states still follow the handbook only: Blocked / Needs AI review / Passed / Stale / AI unavailable.

---

## 7. Gateway route table

Browser-to-service HTTP **only** goes through `dealer-gateway`. core / ai-service have **no public entry**.

| Match | Upstream | Who may call | Failure shape |
|---|---|---|---|
| `/api/v1/**` | `CORE_URL` (local `http://localhost:8081`) | browser; `POST /api/v1/auth/login` is anonymous, every other path needs the JWT that login issued, with a mapped role | missing/bad JWT or unmapped role → 401 |
| `/swagger-ui.html`, `/swagger-ui/**`, `/v3/api-docs`, `/v3/api-docs/**` | `CORE_URL` | browser with **no JWT** only when `dealerops.jwt.mode` is `dev` and every active Spring profile is local (`dev`, `local`, `test`, or `default`). Any other profile **denies** these paths | denied, not the schema |
| `/internal/v1/**` | `AI_URL` (local `http://localhost:8082`) | **core only** (see below) | browser → **404** (do not use 401, which would acknowledge the path) |
| other | — | — | 404 |

Swagger UI and its OpenAPI JSON are part of the gateway origin. Anonymous access is only the local classroom case above. Any active profile other than `dev`, `local`, `test`, or `default`, denies `/swagger-ui.html`, `/swagger-ui/**`, `/v3/api-docs`, and `/v3/api-docs/**`. When that case is open, acceptance uses `http://localhost:8080/swagger-ui/index.html`, or the same path on a public HTTPS gateway. Do not send the browser to core port `8081`. The info description still reads `Published <PUBLISHED_AT>` from dealer-core. Business `/api/v1/**` stays authenticated. The gateway preserves the browser `Host` so Swagger's script and spec URLs stay on the gateway.

The two internal paths (same as the handbook; this section only defines entry, not OpenAPI bodies):

- `POST /internal/v1/ad-check`
- `POST /internal/v1/assistant`

### Browser calls to internal must fail

Do all three; missing one will be torn apart in defense:

1. **Gateway predicate:** `/internal/v1/**` requires header `X-Dealer-Internal: <INTERNAL_TOKEN>` (value from env / Key Vault, **not** the user JWT). Browser without this header → Gateway **404**. The well-known default `dealer-internal` is accepted only when the Spring profile is `dev` or `local`. Any other profile must set a non-default `INTERNAL_TOKEN` shared by gateway, ai-service, and dealer-core. Gateway and ai-service refuse to start on that default.
2. **core outbound:** add that header when calling AI; **do not** forward the user JWT to ai-service (ai-service has no users and no database).
3. **ai-service:** bind in-cluster only; missing internal header → 404. Even a direct 8082 connection fails.

`/api/v1/**` **must not** be forwarded to ai-service.  
core **must not** be configured with browser-reachable public Ingress.

Gateway responsibility ends here: routing, user-JWT validation, blocking internal, and rejecting a client-supplied `X-Dealer-Internal` on any non-internal path with **404** (`InternalRouteFilter`; a `RemoveRequestHeader` route filter fails on read-only headers in Spring Cloud Gateway 4.1.5 with Spring Framework 6.1.14). No business writes, no MySQL, no model SDK.

---

## 8. Dealer auth (client spec: admin-issued username/password) — product surface, JWT roles

**Source:** `DealerOps-Specification.pdf` §2 ("platform admin... issues login credentials"; "every dealer user signs in with their own username and password") and §8 ("hash and salt passwords server-side"). See [SCOPE-BASELINE.md](SCOPE-BASELINE.md) **Specification errata** item 1. This section is the **authoritative dealer-auth design**. Frontend route details stay in [13](13-Frontend-Engineering.md); acceptance scripts stay in [16](16-Acceptance-and-Test.md).

### 8.1 Why this is still not a fifth microservice

Login is one endpoint on `dealer-core` (`POST /api/v1/auth/login`): it checks the password hash and signs the JWT itself. The gateway and core then validate that token (§8.3's `roles[]`-based RBAC, Gateway + core double validation, `TenantFilter`). No second database, no fifth repo, no fifth pipeline.

### Swagger authentication flow

The local gateway Swagger UI is the browser-facing API test entry point at `/swagger-ui/index.html`; core port `8081` is not a frontend or acceptance URL. The gateway proxies the core-generated OpenAPI document, which declares the `bearerAuth` HTTP Bearer/JWT security scheme for protected public operations. `POST /api/v1/auth/login` is the only anonymous business operation and is marked without a security requirement in OpenAPI.

To test protected APIs in Swagger:

1. Execute `POST /api/v1/auth/login` with the configured local username and password.
2. Copy the `accessToken` value from the response.
3. Select **Authorize** in Swagger UI and paste only the token value. Swagger adds the `Bearer` prefix to the `Authorization` header.
4. Execute the protected `/api/v1/**` operation. The browser calls only the gateway; the gateway and core both validate the token.

Swagger UI and its OpenAPI JSON may be anonymous in the local `JWT_MODE=dev` classroom profile, but that does not make business APIs anonymous. Every public `/api/v1/**` operation except login still requires the token. The internal `/internal/v1/**` AI routes are core-to-AI routes protected by `X-Dealer-Internal`, not user-token endpoints and not browser Swagger operations.

### 8.2 Product surface (locked)

| Topic | Ruling |
|---|---|
| Login route | **One** public page: `/login`. Username + password fields, **Sign in** button. |
| Identity | `dealer-core` verifies the password and issues an HS256 JWT (existing `JWT_MODE=dev` signing path in [18](18-Backend-Core-Engineering.md), now the **only** mode: gateway and core refuse to start unless `JWT_MODE=dev`). |
| Roles (`roles[]` in the JWT) | Exactly `Platform.Admin` and `Dealer.User`, same as before. |
| Issuing access | Per spec §2, **only the platform admin** creates dealer businesses and issues each staff login (username + a temporary password the admin sets and communicates out of band). Staff cannot self-register (matches spec "Dealer users cannot create or remove logins"). Admin on `/admin` **creates** a staff credential (`POST .../members` with `username`, `displayName`, and the temporary `password`; see [14](14-Backend-API-Contract.md) §3.6) bound to a dealership; that creates/reactivates `membership` and `app_user`, same flow as the old "bind," except it also sets `password_hash`. |
| Revoking access | **Unbind** = soft deactivate: `membership.active=0`, `app_user.dealer_id=NULL`; keep the `app_user` row and its password hash (see §2.3), consistent with "do not delete the account." |
| Post-sign-in landings | Unchanged: **`Platform.Admin` → `/admin`**; **`Dealer.User` with `dealerId` set → `/dms`**; **signed-in but unbound → `/` no-access shell**. |

Role guards and redirect rules: [13](13-Frontend-Engineering.md) § routes / guards. Classroom demos: **[16](16-Acceptance-and-Test.md) CL-1** / **CL-2** (dealership isolation), unchanged.

### 8.3 Password storage and JWT issuance (locked)

- **Password hashing:** BCrypt (Spring Security `BCryptPasswordEncoder`), never plaintext, never logged. This satisfies the client spec's own §8 production note ("hash and salt passwords server-side") without adding a new dependency — `dealer-core` already depends on `spring-boot-starter-security`.
- **Schema:** identity columns are defined in `V1__init.sql`: `app_user.username` (unique key `uk_user_username`), `membership.username` (`uk_membership (dealer_id, username)`), `audit_event.actor_username`. Later migrations change the schema forward.
  - `V20260930_1__add_password_hash.sql` adds `app_user.password_hash VARCHAR(100) NOT NULL`.
  - `V20261007_2__widen_customer_email.sql` widens `customer.email` to `VARCHAR(254)`.
  - **One-time history repair (2026-10-07).** `V1__init.sql` and `V20260930_1` were rewritten once to define the username columns directly, and the separate rename script `V20261007_1` was removed. A database that already ran the old scripts already has the final schema; only its Flyway history must be realigned, or dealer-core fails Flyway validation at startup. Run once per such database (local, shared development, Azure):

    ```sql
    UPDATE flyway_schema_history SET checksum = -1940675249 WHERE version = '1';
    UPDATE flyway_schema_history SET checksum = -181900521 WHERE version = '20260930.1';
    DELETE FROM flyway_schema_history WHERE version = '20261007.1';
    ```

    A new, empty database needs nothing: Flyway builds it from the current scripts.
- **Token issuance:** `POST /api/v1/auth/login` takes `{username, password}`, loads `app_user` by `username`, verifies the BCrypt hash, then issues an HS256 JWT: `sub: app_user.username`, `name: app_user.display_name`, `roles: [app_user.role]`. There are no `oid` or `tid` claims. `TenantFilter` reads the identity from `sub`; role mapping is unchanged. API fields follow the column names: `username` in `/me`, members, and the member path; `actorUsername` in audit items.

```
function mapRole(claims):
  roles = claims.roles or []
  if "Platform.Admin" in roles: return Platform.Admin
  if "Dealer.User" in roles:    return Dealer.User
  return NONE          // Gateway 401, or 403 everywhere except core /me
```

- **Secret:** the JWT signing secret (`DEV_JWT_SECRET`, ≥32 UTF-8 bytes) becomes the one and only signing secret for every environment, not a classroom-only fallback. Generate a real secret per environment (local `.env` or run configuration, and the Azure Key Vault secret `JWT-SIGNING-SECRET` created by `deploy/terraform`); do not ship the committed placeholder `dealer-dev-jwt-secret-change-me` past local development.

### 8.4 Env wiring

| Variable | Where | Notes |
|---|---|---|
| `DEV_JWT_SECRET` (the only signing-secret variable in every environment) | Local: the gateway and core run configurations. Cloud: app setting referencing Key Vault `JWT-SIGNING-SECRET` | ≥32 UTF-8 bytes; unique per environment, never committed |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | dealer-core only. Local: run configuration. Cloud: app setting; the password references Key Vault `ADMIN-PASSWORD` | Seeds the platform admin account on first startup (no self-registration); no-op once that username exists |

No external identity provider, app registration, or Microsoft account is part of this auth path.

---

## 9. Why not Service Bus (versus the proposal)

Early proposals / retired `01`–`06` easily treat DMS, CRM, and ads as async domain events: vehicle sold → queue → void ads, notify CRM. Course **v6 already rejected** that.

Against current constraints:

- **One MySQL `dealer_core`.** Vehicles, customers, ads, and checks share one database and one transaction. Locking sale fields, incrementing `contentVersion`, and writing `audit_event` can be one commit; no outbox is needed.
- **AI is stateless, synchronous REST, 15s.** Staff click "check" and wait for a result; wrapping Service Bus + poll adds another failure mode, and there is no class time for DLQ.
- **PPT hard items are independent microservices + Gateway + containers, not a message bus.** A bus cannot replace the demo that "bypassing Gateway must fail".
- **No ticket/lead funnel.** There is no long workflow to decouple.
- **Three-person Sprint, one demo environment.** Service Bus is money, identity, and a second observability stack, and the handbook "explicitly forbids implementing it".

One defense sentence: the proposal's async was scope creep; this course uses synchronous REST + single-database transactions for consistency and **deliberately does not use** Service Bus / outbox / DLQ / a second database.

---

## 10. Proving "direct core access fails"

### 10.1 Local ports (aligned with `env.example`)

| Process | Port | Browser |
|---|---|---|
| dealer-web (Vite) | 5173 | static only; login posts to the gateway |
| dealer-gateway | **8080** (`GATEWAY_PORT`) | **sole API origin**, `VITE_GATEWAY_URL=http://localhost:8080` |
| dealer-core | **8081** (`CORE_PORT`) | must fail |
| ai-service | **8082** (`AI_PORT`) | must fail |
| MySQL | 3306 | not for the browser |

There is no orchestrator locally: each process is started by hand. Gateway binds `0.0.0.0:8080`; core and ai set `SERVER_ADDRESS=127.0.0.1` so they are **not** on `0.0.0.0` for the whole class to scan. Loopback-only still counts as "browser cross-origin fail".

### 10.2 Configuration principles (demo-able in Sprint 1)

1. core / ai **do not** configure CORS for `http://localhost:5173`. Browser `fetch('http://localhost:8081/api/v1/vehicles')` from the page → browser blocks (no ACAO).
2. The same request via `http://localhost:8080/api/v1/vehicles` + Bearer → 200 or a business error.
3. Azure: `dealerops-core` and `dealerops-ai` set `ip_restriction_default_action = "Deny"` and allow only the `AzureCloud` service tag (`deploy/terraform/main.tf`), so `dealerops-gateway` reaches them and a browser on the public internet is refused by the platform before the request reaches the JVM. The usable public origins are the Static Web App and `dealerops-gateway` only. This is coarser than a private ingress — any Azure-hosted caller passes the network rule — so `X-Dealer-Internal` and the JWT checks remain the real authorization, exactly as they are locally.
4. Classroom backup: if `curl` 8081 still works, show "no CORS / no public DNS / needs intranet" and stress that **the product entry is not 8081**. Do not rely on "firewall off but we forgot" as the only evidence.

---

## 11. Minimal Azure resource list

Minimum set required by 07 (one demo resource group), written as Terraform in `deploy/terraform`:

| Resource | Count | Role |
|---|---|---|
| App Service plan (Linux, `B2`) | 1 | Hosts the three Java apps |
| Linux Web App, Java 21 SE | **3**: gateway, core, ai | `az webapp deploy --type jar`. No image, no registry |
| Static Web App (Free) | 1 | The built SPA |
| MySQL Flexible Server | 1, database `dealer_core`, TLS required | Flyway in core owns the schema |
| Key Vault | 1 | `INTERNAL-TOKEN`, `MYSQL-PASSWORD`, `JWT-SIGNING-SECRET`, optional `AIMANAGER-API-KEY` and `ADMIN-PASSWORD` |
| User-assigned identity | 1 | Resolves the Key Vault references in app settings |
| Log Analytics + Application Insights | 1 each | Logs and telemetry |

There is **no container registry**: containers were removed from this project ([SCOPE-BASELINE.md](SCOPE-BASELINE.md) errata item 5). **Nothing in `deploy/terraform` is live until an operator runs `terraform apply`** — do not present the files as a deployed environment. Do not write a subscription id, `terraform.tfvars`, or `terraform.tfstate` into Git.

### Shared development database

**Ruling: the team may move the development database off the local container onto one shared hosted MySQL. The engine stays MySQL 8. Nothing else changes.**

`dealer-core` reads every datasource value from the environment (`application.yml`: `MYSQL_URL`, `MYSQL_USER`, `MYSQL_PASSWORD`). Pointing at a hosted server is therefore an environment change: no Java change, no entity change, no new migration. Flyway still owns the schema, so `V1__init.sql` plus the dated scripts build the shared database exactly as they build the local one.

Connection string difference: a hosted server requires TLS, so the local `useSSL=false&allowPublicKeyRetrieval=true` pair is replaced by `sslMode=REQUIRED` (see `dealer-platform/env.example`). This is the same JDBC URL shape `deploy/terraform` writes into the `dealerops-core` app settings. The local MySQL server is then unused and can be stopped.

Host choice: prefer **Azure Database for MySQL Flexible Server**, the same resource the table above lists and `deploy/terraform` creates, so development and the graded deploy share one engine and one driver. Do not pick a "MySQL-compatible" store that does not enforce foreign keys: `V1__init.sql` defines nine tables whose tenant isolation rests on `FOREIGN KEY ... REFERENCES dealer(id)`, and `ddl-auto: validate` will not catch a silently ignored constraint.

Rules for a shared instance:

- **One Flyway history for the whole team.** A migration merged to `main` reaches everyone's next startup. A script that drops or rewrites data is not a local experiment any more; land schema changes the same way as code.
- **Credentials never enter Git.** Host, user, and password live in each member's local `.env` and, for cloud, in Key Vault as `MYSQL-PASSWORD` (core only, per the table below).
- **Not public.** Firewall the server to the team's addresses plus the App Service egress — in `deploy/terraform` that is `operator_ip_addresses` plus the Azure services rule. The "MySQL is not public" constraint below applies to the development instance too.
- **Shared dev data is not demo data.** Seed the graded demo from a known state; do not rely on whatever the team left in the shared schema.

**Why not Firestore / Firebase, or any document store.** Rejected, consistent with §9. Three reasons: (1) the single-commit ruling in §9 — locking sale fields, incrementing `contentVersion`, and writing `audit_event` in one transaction — has no equivalent across document collections, and §9 already rules out an outbox; (2) the browser never reaches the database directly in this architecture (§10), so `dealer-core` would hold the Admin SDK credential, which bypasses security rules and leaves tenancy entirely in application code; (3) it would delete the JPA and Flyway layer that `V1__init.sql` and the `V{YYYYMMDD}_{n}__` convention are built on, for no behavior the course requires. "A cloud database" is a hosting question, and hosted MySQL answers it.

### Who holds which key / secret

| Secret (suggested KV name) | Who reads | Who does not |
|---|---|---|
| `AIMANAGER-API-KEY` | **ai-service only** | web / gateway / core |
| `MYSQL-PASSWORD` (or connection string) | **core only** | everyone else |
| `INTERNAL-TOKEN` (Gateway↔AI) | gateway + **core** (outbound) + ai-service | web |
| `JWT-SIGNING-SECRET` (app setting `DEV_JWT_SECRET`) | gateway + core | web, ai-service |
| `ADMIN-PASSWORD` (optional first-admin seed, app setting `ADMIN_PASSWORD`) | core | everyone else |

Platform disk encryption may use defaults. MySQL is not open to the internet: the course stack has no VNet, so the firewall admits only Azure services plus named operator addresses, and TLS is required. State that limit in Review.

### What each Sprint should add (Terraform / pipeline)

**Sprint 1 (pass the NN architecture oral; may stay local):**

- Explain the four apps, the Gateway, the two roles, and direct-core failure
- Do not force a subscription just for Review 1

**Sprint 2 (real cloud path; must add):**

- `terraform apply` run against a real subscription, with the state held by one operator
- Key Vault + access policy, and every secret reaching an app as a Key Vault reference, never as an app-setting value
- MySQL Flexible Server + database + core-only credentials
- Three Linux Web Apps plus the Static Web App: core and ai denied to everything but Azure-internal callers, gateway and web public over HTTPS
- Application Insights (gateway + core first is acceptable)
- Per-repo pipeline: compile and test. Release is the documented operator commands, not a CI job
- Demo release needs human approval; do not hand-click portal changes and call it a pipeline

**Sprint 3:** do not add a bus/second database; finish isolation, CRM, three ad kinds, export, and audit.

---

## 12. Java version (unified across the four course repos)

**Ruling: the four course repos (the three Java repos excluding web + any shared tests) use JDK 21 uniformly. Prefer 21; do not mix 17/21 per repo.**

| Repo | Version |
|---|---|
| dealer-gateway / dealer-core / ai-service | **Java 21** (matches handbook default and 07 "Java 21") |
| dealer-web | Node 20 toolchain, no JDK |
| ai-manager (private GitHub repo) | upstream is **Java 17** + Boot 3.2.5; **this course does not change that repo's source** |

A 21 runtime can depend on **17 bytecode** `aimanager` JARs, so you **need not** drop the three repos to 17, and you **need not** upgrade ai-manager to 21.

The handbook allows "align with ai-manager on 17" only as a fallback when the machine has only 17: **if you fall back, all three Java repos fall back to 17 together; do not run core 21 and ai-service 17.**

**Immutable version (plan only, do not change code here):** pin commit `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a`, then cut a **non-SNAPSHOT** immutable version for `ai-service` to consume (GitHub Packages). Local `mvn install` before that version exists is for development only. CI uses a stub and does not hit paid endpoints.

---

## 13. CORS, HTTPS, Key Vault references (no secrets in the repo)

### CORS

- Allow browser origins **only** on Gateway, in `CorsConfig`'s `CorsWebFilter` (and the web dev server for 5173 during development). `spring.cloud.gateway.globalcors` and `DedupeResponseHeader` are not used.
- The allowed origin is `CORS_ALLOWED_ORIGIN`. The local default is `http://localhost:5173`. On Azure allow only the web HTTPS origin.
- core / ai-service: **do not** configure browser CORS (or configure empty). This is part of section 10 "direct access fails".
- Preflight: allow `Authorization`, `Content-Type`; **do not** expose `X-Dealer-Internal` to the browser (do not list it in `Access-Control-Allow-Headers`).

### HTTPS

- On Azure, gateway / web must be HTTPS (the default App Service and Static Web Apps certificates are fine; `https_only` is set in Terraform).
- Local HTTP is localhost only; Review 2 must not treat "local HTTP" as a cloud security item.
- Cookies are not this course's approach; the SPA keeps the login `accessToken` in `sessionStorage` and sends it as `Authorization: Bearer`.

### Key Vault reference principles

- The repo has only empty `env.example` values and Terraform variable names. `.env`, `terraform.tfvars`, `terraform.tfstate`, real connection strings, and `AIMANAGER_API_KEY` **do not enter Git**.
- App settings use `@Microsoft.KeyVault(SecretUri=...)` resolved through the user-assigned identity; do not write a secret value into an app setting or a `.tf` file.
- Chat, boards, and screenshots are redacted. Rotating a key = change the Key Vault secret only; no rebuild and no redeploy.
- Flyway uses the core data-plane account; do not put a subscription Owner key into the app.

---

## Entity-layer landing notes (still no business code)

When writing JPA/enums, follow V1 column names and add no extra columns:

`dealer` · `app_user` · `membership` · `vehicle` · `customer` · `customer_vehicle` · `listing` · `compliance_check` · `audit_event`

Enums (application layer):

- `AppRole`: `Platform.Admin` / `Dealer.User`
- `VehicleStatus`: `IN_STOCK` / `SOLD`
- `VehicleSource`: `TRADE_IN` / `AUCTION` / `PRIVATE_PURCHASE` / `OTHER`
- `ConditionCode`: `CERTIFIED` / `AS_IS` / `UNFIT` / `IRREPARABLE`
- `AdKind`: `CASH` / `FINANCE` / `LEASE`
- `AdMedium`: `ONLINE` / `RADIO_TV_BILLBOARD`
- `ListingStatus`: `DRAFT` / `READY`
- `AiStatus`: `SKIPPED` / `SUCCESS` / `FAILED` / `UNAVAILABLE`
- `Recommendation`: `BLOCKED` / `NEEDS_AI` / `PASSED` / `UNAVAILABLE`

---

## V2 summary table

| Item | V2? |
|---|---|
| listing empty draft | **No** (empty string + virtual GET) |
| tenant authority / one person one dealership | **No** (application layer) |
| vehicle.status values | **No** (enum); CHECK optional later |
| customer_vehicle kept after sale | **No** |
| last_check_id FK | **No** |
| indexes `vehicle(dealer_id,status)`, `customer(dealer_id)`, etc. | **Suggested, not a start blocker** |
| APR/warranty/asking-price columns | **No (forbidden)** |
| password table / second database | **No (forbidden)** |
