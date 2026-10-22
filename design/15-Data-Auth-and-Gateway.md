# 15 · Data-model rulings, auth, gateway, and minimal cloud deploy

Version: current (v6) · 2026-09-23  
Status: fills gaps for the `dealer-core` entity layer and `dealer-gateway` configuration; **not** OpenAPI, **not** a business implementation.  
**Current implementation note:** active services are .NET 10 / ASP.NET Core under `backend/dotnet/`; Java/Spring/Flyway snippets below are historical and must not be implemented. The public Swagger entry is the .NET Gateway at `/swagger/index.html`.
**Password auth (email, username, or phone as the sign-in name)** is owned here in §8; keep [README.md](../README.md) "Step 6. Sign in" consistent with it.

## Conflict order and SQL baseline

On conflict, decide in this order and **do not reverse it**:

1. Course PPT (independent repos, Gateway, JWT/RBAC, Azure hosting, infrastructure as code, HTTPS, Key Vault, real AI) — **except Auth**, where password-based authentication is retained from the client specification and the user-directed sign-in names (email, username, or phone) are defined in [SCOPE-BASELINE.md](SCOPE-BASELINE.md) errata item 1 and §8 below
2. DealerOps spec PDF fields and enums (do not add or remove columns)
3. `IMPLEMENTATION-BRIEF.md` / `00`
4. **This document owns data, tenant, and gateway behavior**; **[14](14-Backend-API-Contract.md) owns HTTP JSON**; **[13](13-Frontend-Engineering.md) owns frontend engineering**
5. [12](12-Frontend-UI-Conventions.md) UI conventions

The SQL **landed baseline** is now managed by the .NET backend in `backend/dotnet/DealerOps.Core` using EF Core. The old Java/Flyway path is historical only.
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

Entity convention: `Listing.title` / `Listing.body` are non-null C# `string` values defaulting to `""`. Do not use nullable values to mean draft.

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
| `Platform.Admin` | present or absent, ignored | `/me` and the `/admin/**` routes only. Every business URL (vehicles, customers, listings, checks, audit, assistant, vehicle catalog), read or write, returns **403** `FORBIDDEN` with no business fields |
| `Platform.Admin` and `Dealer.User` both present | — | **Admin wins** (when a staff token is accidentally elevated, trust Admin in the token) |
| `Dealer.User` | exactly 1 active | business allowed; tenant = that row's `dealer_id` |
| `Dealer.User` | 0 | **403** `FORBIDDEN`, no dealership (same wording as 14) |
| `Dealer.User` | ≥2 active | 500-class configuration error (bind API should never write this); reject business |

`app_user.role`: written back from the JWT at sign-in or bind; **authorization compares the current JWT**. An expired role in the database cannot elevate privileges.

### 2.5 Dealership role on the membership (manager / staff)

The organisation has three levels: the platform admin (`Platform.Admin`), a dealership's managers, and its staff. The last two are both `Dealer.User` in the JWT; the difference lives on the active membership row as `membership.dealer_role` (`manager` / `staff`, `VARCHAR(16) NOT NULL DEFAULT 'staff'`, wire `MANAGER` / `STAFF`). It is read per request with the tenant, so a promotion or demotion applies on the next request without a new token.

| Who | Can |
|---|---|
| `Platform.Admin` | Create dealerships, create and bind accounts, unbind members, reset passwords, and promote staff to manager or demote a manager (14 §3.7b). The only one who changes a role |
| Manager | Everything staff can, plus: the Team page, the join-request inbox, approving or rejecting join requests, removing staff, and editing the dealership profile (14 §5.7, §5.8); each record's audit history (`GET /audit`, AUD-17) and the dealership audit log (`GET /dealer/audit`, Team › Activity); the payment ledger of a sold vehicle (`GET /vehicles/{id}/payments`) and removing a payment (`DELETE …/payments/{paymentId}`) |
| Staff | All business data of the dealership (DMS, CRM, leads, ads, reports, work orders); may record a payment (`POST /vehicles/{id}/payments`, 201 with only the recorded payment item, PAY-05) but cannot read the ledger or remove a payment; no audit history or audit log, no Team page, no inbox. Every manager-only endpoint returns **403** `FORBIDDEN` to staff |

Every bind, reactivation, and approved join request starts as `staff`. Existing members became `staff` when the column was added, so the admin appoints each dealership's first manager. A manager cannot remove another manager or themselves; only the admin does.

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

  // --- empty draft: no special case ---
  // The rules below already block it (price, name, and contact all missing). PROTOCOL §C.1.

  // --- price (always) ---
  hasPrice = match(text, /(?:cad|c\$|\$)\s*\d[\d,]*(?:\.\d{2})?|\d[\d,]*(?:\.\d{2})?\s*(?:cad|dollars?)\b/i)
  if !hasPrice:
      hard += PRICE_MISSING

  // --- dealership name and contact (always) ---
  if !containsNormalized(text, dealer.legalName):
      hard += DEALER_NAME_MISSING
  // The dealership's own phone and email must appear; another phone or email does not count.
  // Phones compare digits only (last ten), so "(403) 555-0100" matches "+1 403-555-0100".
  hasPhone = any phone-like run in text whose last 10 digits == last 10 digits(dealer.contactPhone)
  hasEmail = containsNormalized(text, dealer.contactEmail)
  hasAddr  = containsNormalized(text, dealer.contactAddress)
  if !(hasPhone AND hasEmail AND hasAddr):
      if !(hasPhone OR hasEmail OR hasAddr):
          hard += DEALER_CONTACT_MISSING
      else:
          soft += DEALER_CONTACT_INCOMPLETE   // only one contact shown: not a hard block; give to AI

  // --- year / new vs used (always) ---
  // No separate used/new status field (PROTOCOL §C.0a). Both new/used checks are soft.
  year = vehicle.modelYear
  if !match(text, /(?<!\d)<year>(?!\d)/):
      soft += YEAR_NOT_IN_COPY               // digit boundaries: "$32,019" is not model year 2019
  if brandNew(text) AND year <= currentYear - 2:
      soft += YEAR_NEW_USED_CONTRADICTION
  if !brandNew(text) AND !match(textNorm, /\b(used|pre[\s-]?owned|second[\s-]?hand|previously owned)\b/):
      soft += NEW_USED_NOT_STATED            // spec lists new/used as always required; erratum 4 keeps it advisory

  // --- conditionCode (always; compare to the vehicle, not an imagined stock tag) ---
  code = vehicle.conditionCode   // CERTIFIED | AS_IS | UNFIT | IRREPARABLE
  claimedCertified = match(strip(textNorm, /\b(not|never|non)[\s-]*certified\b/), /\b(certified|cpo)\b/)  // "not certified" is a denial, not a claim
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
  // A checklist category (listing.priorUse) also requires the disclosure; DAILY_RENTAL accepts
  // "rental" or "daily lease" wording.
  if (listing.priorUse OR mentionsPriorUseCue(textNorm)) AND !mentionsPriorUseDisclosure(textNorm, listing.priorUse):
      soft += PRIOR_USE_UNCLEAR

  // --- warranty (always "if offered") ---
  if match(textNorm, /\bwarrant(y|ies)\b/):  // any mention, including "no warranty"
      soft += WARRANTY_CLAIM_NEEDS_REVIEW    // not a hard block; AI reviews completeness of terms

  // --- FINANCE extras ---
  // spec §5: also when a CASH ad shows a rate or payment (e.g. "$299 per month", "0% financing")
  if listing.adKind == FINANCE OR (listing.adKind == CASH AND (showsRate(text) OR showsPayment(text))):
      hasApr = match(text, /\d+(\.\d+)?\s*%\s*(apr|annual percentage rate)|apr\s*[:=]?\s*\d+(\.\d+)?\s*%/i)
      if !hasApr:
          hard += FINANCE_APR_MISSING
      hasTerm = match(textNorm, /\d+\s*(month|months|mo)\b(?!\s*warrant)|term\s*[:=]?\s*\d+/)
      if !hasTerm:
          soft += FINANCE_TERM_MISSING
      // A payment amount alone satisfies PRICE_MISSING, so finance copy is checked separately
      // for a cash price or the cost of borrowing (PROTOCOL §C).
      // hasCashPrice ignores amounts followed by a payment cadence or by "down" / "due at signing".
      if !hasCashPrice(text) AND !match(textNorm, /cost of borrowing|total cost of credit|borrowing cost|finance charge/):
          hard += FINANCE_CASH_PRICE_MISSING
      if listing.medium != RADIO_TV_BILLBOARD AND hasApr AND showsPayment(text) AND !aprWithin80CharsOfPayment(text):
          // "APR as prominently as the payment": the APR must be printed next to the payment
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
      // Corrected 2026-10-16: the payment cadence alone. Pairing it with hasPrice made the rule
      // unreachable, so a lease quoting only a cash price never had its payment amount checked.
      hasRent = showsPayment(text)
      hasDown = statesUpfrontAmount(text)   // "$2,000 down", "down payment of $2,000", "$0 / zero down"
      if !hasTerm: soft += LEASE_TERM_MISSING
      if !hasRent: soft += LEASE_RENT_MISSING
      if !hasDown: soft += LEASE_DOWN_MISSING
      if match(textNorm, /(\d{1,5})\s*(km|kilometr).*\/\s*(year|yr|annual)/):
          allowance = capturedKm
          if allowance < 20000 AND !statesPerKmCost(text):   // "$0.12/km", "12 cents per extra km"
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

core calls ai-service directly at `AiService:BaseUrl` with `POST /internal/v1/ad-check` and `X-Dealer-Internal` (≤15s) only after `hard` is empty. The Gateway still answers a browser call to that path with 404.  
AI success with no further hard miss → `PASSED` + `SUCCESS`.  
Timeout/failure → `UNAVAILABLE` + `UNAVAILABLE`; **never treat as Pass**.  
Page five states still follow the handbook only: Blocked / Needs AI review / Passed / Stale / AI unavailable.

---

## 7. Gateway route table

Browser-to-service HTTP **only** goes through `dealer-gateway`. core / ai-service have **no public entry**.

| Match | Upstream | Who may call | Failure shape |
|---|---|---|---|
| `/api/v1/**` | `CORE_URL` (local `http://localhost:8081`) | browser; email/phone login, registration, and public VIN decode are anonymous; other paths need a DealerOps JWT with a mapped role | missing/bad JWT or unmapped role → 401 |
| `/swagger-ui.html`, `/swagger-ui/**`, `/v3/api-docs`, `/v3/api-docs/**` | `CORE_URL` | browser with **no JWT** only when `dealerops.jwt.mode` is `dev` and every active Spring profile is local (`dev`, `local`, `test`, or `default`). Any other profile **denies** these paths | denied, not the schema |
| `/internal/v1/**` | `AI_URL` (local `http://localhost:8082`) | **core only** (see below) | browser → **404** (do not use 401, which would acknowledge the path) |
| other | — | — | 404 |

Swagger UI and its OpenAPI JSON are part of the Gateway origin. The current .NET entry is `http://localhost:8080/swagger/index.html`; do not send the browser to Core `8081` or AI `8082`. Business `/api/v1/**` stays authenticated. Java/Spring path names in older notes are historical.

The two internal paths (same as the handbook; this section only defines entry, not OpenAPI bodies):

- `POST /internal/v1/ad-check`
- `POST /internal/v1/assistant`

### Browser calls to internal must fail

Do all three; missing one will be torn apart in defense:

1. **Gateway predicate:** `/internal/v1/**` requires header `X-Dealer-Internal: <INTERNAL_TOKEN>` (value from env / Key Vault, **not** the user JWT). Browser without this header → Gateway **404** `{code, message}`. The well-known default `dealer-internal` is accepted only when `JWT_MODE=dev`. Any other mode must set a non-default `INTERNAL_TOKEN` shared by gateway, ai-service, and dealer-core. Gateway and ai-service refuse to start on that default.
2. **core outbound:** add that header when calling AI; **do not** forward the user JWT to ai-service (ai-service has no users and no database).
3. **ai-service:** every path, including health and OpenAPI, requires the header. Missing or wrong → **404** `{code, message}`. A direct connection to 8082 fails.
4. **core inbound:** every path, including health and OpenAPI, requires the same header. Missing or wrong → **404** `{code, message, requestId}`. The gateway adds the header on the outbound proxy and on its server-side health and OpenAPI calls. It still rejects a client-supplied header on any non-internal path.

`/api/v1/**` **must not** be forwarded to ai-service.  
core **must not** be configured with browser-reachable public Ingress.

Gateway responsibility ends here: routing, user-JWT validation, blocking internal, stamping `X-Dealer-Internal` on the outbound proxy only, and rejecting a client-supplied `X-Dealer-Internal` on any non-internal path with **404** (`InternalRouteFilter`). No business writes, no MySQL, no model SDK.

---

## 8. Dealer auth (email, username, or phone + password) — product surface, JWT roles

**Source:** `DealerOps-Specification.pdf` §2–§8 (admin-provisioned accounts and server-side password hashing), plus the user's explicit 2026-10-08 direction: accounts register with a username and an email and/or phone, and sign in with any of the three plus the password. The username is also the key for membership, audit, and the JWT subject. See [SCOPE-BASELINE.md](SCOPE-BASELINE.md) **Specification errata** item 1. This section is the **authoritative dealer-auth design**. Frontend route details stay in [13](13-Frontend-Engineering.md); acceptance scripts stay in [16](16-Acceptance-and-Test.md).

### 8.1 Why this is still not a fifth microservice

Authentication uses a sign-in name (email, username, or phone) plus password (`POST /api/v1/auth/login` and `/register`), a Google ID token (`POST /api/v1/auth/google`, `AUTH-23`, added 2026-10-15), or a Firebase ID token (`POST /api/v1/auth/firebase`, added 2026-10-16). Firebase accepts unverified emails but links an existing email account only when `email_verified=true`; platform administrators cannot use Firebase sign-in. A new account from any path starts unbound, and tenancy is resolved per request from the membership table. Core issues DealerOps JWTs; the gateway and core validate those tokens (§8.3's `roles[]`-based RBAC, Gateway + core double validation, `TenantFilter`).

### Swagger authentication flow

The Gateway Swagger UI is the browser-facing API test entry point at `/swagger/index.html`; core port `8081` and AI port `8082` are not frontend or acceptance URLs. The Gateway is the only externally exposed Swagger origin and declares the `bearerAuth` HTTP Bearer/JWT security scheme for protected public operations. `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, and public VIN decode are the anonymous business operations and are marked without a security requirement in OpenAPI.

To test protected APIs in Swagger:

1. Execute `POST /api/v1/auth/login` with an email, username, or phone and the password.
2. Copy the `accessToken` value from the response.
3. Select **Authorize** in Swagger UI and paste only the token value. Swagger adds the `Bearer` prefix to the `Authorization` header.
4. Execute the protected `/api/v1/**` operation. The browser calls only the gateway; the gateway and core both validate the token.

Swagger UI and its OpenAPI JSON may be anonymous in the local `JWT_MODE=dev` classroom profile, but that does not make business APIs anonymous. Every public `/api/v1/**` operation except login, registration, and VIN decode still requires the token. The internal `/internal/v1/**` AI routes are core-to-AI routes protected by `X-Dealer-Internal`, not user-token endpoints and not browser Swagger operations.

### 8.2 Product surface

| Topic | Ruling |
|---|---|
| Login routes | `/login` accepts the account's email, username, or phone and the password. `/register` accepts a username, a display name, an email and/or phone (at least one), and a password. Contract: [14](14-Backend-API-Contract.md) §1.4–1.5; design: [21](21-Feature-Extensions.md) §5. |
| Identity | `dealer-core` verifies local passwords and issues the application's existing HS256 JWT. |
| Roles (`roles[]` in the JWT) | Exactly `Platform.Admin` and `Dealer.User`, same as before. Manager versus staff is the membership's `dealer_role`, not a JWT role (§2.5). |
| Issuing access | The platform admin alone grants dealership access. Self-registered accounts begin as unbound `Dealer.User` identities; `/admin` lists pending accounts and binds an existing account without replacing its credential. Admin-created accounts also need an email and/or phone (at least one); their username works for sign-in as well. |
| Revoking access | **Unbind** = soft deactivate: `membership.active=0`, `app_user.dealer_id=NULL`; keep the `app_user` row and its password hash (see §2.3), consistent with "do not delete the account." |
| Post-sign-in landings | **`Platform.Admin` → `/admin`**; **`Dealer.User` with `dealerId` set → `/dms`**; **signed-in but unbound → `/no-access`** ("waiting for a dealership" with the username). |

Role guards and redirect rules: [13](13-Frontend-Engineering.md) § routes / guards. Classroom demos: **[16](16-Acceptance-and-Test.md) CL-1** / **CL-2** (dealership isolation), unchanged.

### 8.3 Password storage and JWT issuance

- **Password hashing:** BCrypt (Spring Security `BCryptPasswordEncoder`), never plaintext, never logged. This satisfies the client spec's own §8 production note ("hash and salt passwords server-side") without adding a new dependency — `dealer-core` already depends on `spring-boot-starter-security`.
- **Schema:** identity columns are defined in `V1__init.sql`: `app_user.username` (unique key `uk_user_username`), `membership.username` (`uk_membership (dealer_id, username)`), `audit_event.actor_username`. Later migrations change the schema forward.
  - `V20260930_1__add_password_hash.sql` adds `app_user.password_hash VARCHAR(100) NOT NULL`.
  - `V20261007_2__widen_customer_email.sql` widens `customer.email` to `VARCHAR(254)`.
  - `V20261008_3__add_google_identity.sql` adds the `app_user.email` field used for account contact; `V20261008_6__add_email_phone_login_identifiers.sql` adds phone and unique nullable email/phone login identifiers. `V20261008_7__drop_user_identity.sql` removes the now-unused external-provider identity table after social sign-in was removed.
  - **One-time history repair (2026-10-07).** `V1__init.sql` and `V20260930_1` were rewritten once to define the username columns directly, and the separate rename script `V20261007_1` was removed. A database that already ran the old scripts already has the final schema; only its Flyway history must be realigned, or dealer-core fails Flyway validation at startup. Run once per such database (local, shared development, Azure):

    ```sql
    UPDATE flyway_schema_history SET checksum = -1940675249 WHERE version = '1';
    UPDATE flyway_schema_history SET checksum = -181900521 WHERE version = '20260930.1';
    DELETE FROM flyway_schema_history WHERE version = '20261007.1';
    ```

    A new, empty database needs nothing: Flyway builds it from the current scripts.
- **Token issuance:** `POST /api/v1/auth/login` resolves the sign-in name: a value with `@` is an email (case-insensitive); otherwise an active account with that exact username wins; otherwise a valid phone number with country code (spaces, dashes, and brackets ignored) is looked up. It then verifies the BCrypt password; every failure is `401` with one message. `POST /register` requires a username (3–64 letters, digits, `.`, `_`, `-`, with at least one letter so it can never be read as a phone number) and an email and/or phone, rejects any duplicate with 409 `USERNAME_TAKEN`, `DISPLAY_NAME_TAKEN`, `EMAIL_TAKEN`, or `PHONE_TAKEN` (one code per field, with `fieldErrors`), and creates an unbound Dealer.User. Admin-created staff need an email and/or phone; the seeded Platform.Admin needs only a username, with optional email/phone as extra sign-in names. Each path issues the same HS256 DealerOps JWT: `sub: app_user.username`, `name: app_user.display_name`, `roles: [app_user.role]`. `TenantFilter` reads the identity from `sub`; role mapping is unchanged.
- **Unique sign-in names:** `app_user.email` and `app_user.phone` are unique (`V20261008_6`). Every write and lookup goes through `dealer/LoginIdentifiers.java`: email is trimmed and lower-cased; phone keeps only digits and is stored as `+digits`, so `+1 (403) 555-0142`, `14035550142`, and `+14035550142` are the same number. Sign-up, admin-created users, and the admin seed all use it; `V20261008_8__canonicalize_login_identifiers.sql` rewrote existing rows into this form. A phone must already include its country code; digits without one are read as if they start with it.

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
| `ADMIN_USERNAME` / `ADMIN_PASSWORD`, optional `ADMIN_EMAIL` / `ADMIN_PHONE` | dealer-core only. Local: run configuration. Cloud: app settings; password references Key Vault `ADMIN-PASSWORD` | Seeds the platform admin account on first startup; the admin signs in with the username, or the email/phone when set |
| optional `Google__HostedDomain` | dealer-core. Local: run configuration. Cloud: plain app settings | Restricts Google sign-in to one Workspace domain (§8.5). Empty accepts any verified Google account |

Gateway anonymous permits for sign-in: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/google`, plus the public `GET /api/v1/catalog/*` and the buyer site's `GET`/`POST /api/v1/public/**` (design/14 §12a; Core checks each public route itself). Every other `/api/v1/**` path needs the bearer JWT. The Gateway is the only external API origin; the catch-all `/api/v1/{**}` route already covers the Google endpoint, so no new route is needed.

Azure Terraform continues to deploy the web app, gateway, core, and MySQL. Google sign-in needs no client secret and no callback setting, so it adds nothing to Key Vault.

### 8.5 Google sign-in (AUTH-23)

Added 2026-10-15, superseding the earlier "no social provider" constraint for Google only (`design/21-Feature-Extensions.md` §5). The decision that matters for this document: **Google is an authentication method, never an authorisation source.**

| Concern | Where it is decided |
|---|---|
| Who is this? | Google, via an ID token verified in `Security/GoogleIdTokenVerifier.cs` |
| What role do they have? | This application. Google sign-in only ever yields `Dealer.User`; `Platform.Admin` is refused and stays password-only, keeping the env-seeded admin boundary of §8.3 |
| Which dealership? | `membership`, resolved per request by `TenantMiddleware` exactly as before (§2.1). The token carries no dealership and cannot assert one |

Why this needed no change to tenancy, the Gateway, or the schema:

- The JWT this application issues is unchanged, so `TenantMiddleware`, the role gate, and the EF tenant filters are untouched. Google simply becomes a second way to prove an identity the system already keys by username.
- `email` is already unique on `app_user`, so it serves as the link between a Google account and a local one.
- A Google-provisioned account stores an **empty** `password_hash`. `AuthService.Login` already treats an empty hash as "no password sign-in", so the account cannot be entered with a password and no column had to become nullable — relevant because core creates its schema with `EnsureCreated()` and has no EF migrations.
- An unknown email produces the same unbound account as password self-registration, so the existing pending-account flow (§3.8 in the API contract, `MembershipService.Pending`) lists it for the admin, who binds it with no password.

Verification rules enforced server-side, never in the browser: RS256 only, issuer and audience checked, expiry checked, `email_verified` required, and an optional single Workspace domain via the token's `hd` claim. Every rejection returns one message so a caller cannot probe which check failed.

---

### 8.6 Data retention: nothing is deleted (NFR-07)

Dealer Ops keeps financial and sales records, so no business data is destroyed or overwritten. Every delete is a soft delete: the row stays and `deleted_at` hides it from active lists. This applies to customers (CRM-14), vehicles (DMS-17), customer-vehicle links (unlink), vehicle photos (both variants) and payments (PAY-03). Removed staff memberships keep their row with `active = false`.

| Data category | Retention |
|---|---|
| Active customer (name, email, phone, home address) | While the dealership keeps the record |
| Soft-deleted customer (CRM-14) | Row and personal fields kept unchanged for lead, link and audit history; never anonymized |
| Unlinked customer-vehicle link, deleted photo, deleted payment | Row kept with `deleted_at`; hidden from lists, the ledger and the buyer site |
| Audit events | Kept for the life of the database, append-only (AUD-05); they hold contact values, new and replaced, so every version is traceable (AUD-04). Readable only by managers and the admin |
| Staff accounts (`app_user`) | Until the user deletes the account (`DELETE /api/v1/me`) or an admin removes it |
| Database backups | 7 days (NFR-04) |

There is no retention job: the former `CustomerRetention` service, which anonymized deleted customers after 730 days, was removed on 2026-10-22 because the project must not delete data. A customer-vehicle link keeps one active row per vehicle through the generated column `active_vehicle_id` (the vehicle id while `deleted_at` is NULL), which carries the unique key `uk_cv_active_vehicle`, so a vehicle can be linked again after an unlink.

### 8.7 Database backup and restore (specification §8 hosting)

The Azure MySQL Flexible Server in `deploy/terraform/main.tf` keeps automatic backups for 7 days (`backup_retention_days`). Azure takes these itself; nothing in the application runs them.

To restore after data loss or a bad change:

1. Choose a UTC time before the problem, within the last 7 days.
2. Restore to a **new** server, because a restore never overwrites the running one:
   `az mysql flexible-server restore --resource-group <resource group> --name <new server name> --source-server <current server name> --restore-time <UTC time, ISO 8601>`
3. Check the restored `dealer_core` database. Then point Core at it: update the MySQL connection secret in Key Vault and restart the Core App Service.
4. Delete the old server only after the restored one has been checked.

Limits of this setup: backups stay in the server's region (no geo-redundant copy), and there is no long-term copy older than 7 days. For a copy that outlives the window, take a `mysqldump` of `dealer_core` before a risky change or a demo reset and store it outside the server.

### 8.8 Audit trail storage (AUD-10 to AUD-16, decided 2026-10-21)

DealerOps handles vehicle sales and payments, so the audit trail is held to a finance standard: every sign-in attempt and every create, update, delete and other state change writes one `audit_event` row in the same transaction as the business change (AUD-07). Core's startup schema patch adds two columns to `audit_event`:

| Column | Type | Content |
|---|---|---|
| `previous_values` | `JSON NULL` | changed field → replaced value, same keys and formatting as `field_summary` (which holds the new values). Set on updates and other state changes where the old value is known, so each row is one version step of the record (AUD-13). Contact fields are included (AUD-04) |
| `client_ip` | `VARCHAR(45) NULL` | the caller's IP (IPv6 fits). the gateway decides it once (its socket peer; outside `Development` the forwarded-headers middleware trusts only the single hop the Azure App Service front end appends), YARP's default `Set` transform forwards exactly that value, and Core reads it from `X-Forwarded-For`, falling back to the socket peer. A caller-supplied `X-Forwarded-For` never reaches Core; it is `NULL` for rows written outside a request, such as `CustomerRetention` (AUD-16) |

Rules:

- **Append-only.** No API or service updates or deletes an `audit_event` row; rows are kept under §8.6 and are covered by the 7-day backups of §8.7.
- **Closed vocabularies.** `entity_type` and `action` accept only the values listed in [14](14-Backend-API-Contract.md) §9; Core throws on any other value, so a wrong row is never written (AUD-16).
- **Sign-ins.** `LOGIN` / `LOGIN_FAILED` rows use `entity_type = APP_USER`. An identifier that matches no account is stored as actor `anonymous` with `entity_id = 0`; the typed identifier is never stored (AUD-12).
- **Reads.** Record history, the dealership log and the platform log all sort by `created_at` desc, then `id` desc (AUD-15). The existing `idx_audit_dealer (dealer_id)` suggestion (§5) serves the dealership log.

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
| dealer-web (Vite) | 5174 | static only; login posts to the gateway |
| dealer-gateway | **8080** (`GATEWAY_PORT`) | **sole API origin**, `VITE_GATEWAY_URL=http://localhost:8080` |
| dealer-core | **8081** (`CORE_PORT`) | must fail |
| ai-service | **8082** (`AI_PORT`) | must fail |
| MySQL | 3306 | not for the browser |

There is no orchestrator locally: each process is started by hand. Gateway binds `0.0.0.0:8080` and is the only browser origin. Core and ai-service reject every direct call that lacks `X-Dealer-Internal` with **404** `{code, message}` (core also includes `requestId`). The gateway adds that header on the outbound proxy only. Loopback binding is not the control: a client on the same machine still fails without the credential.

### 10.2 Configuration principles (demo-able in Sprint 1)

1. core / ai **do not** configure CORS for `http://localhost:5174`. Browser `fetch('http://localhost:8081/api/v1/vehicles')` from the page → browser blocks (no ACAO).
2. The same request via `http://localhost:8080/api/v1/vehicles` + Bearer → 200 or a business error.
3. Azure: the internal .NET services are restricted so the Gateway reaches them and a browser on the public internet is refused before the request reaches the service. The usable public origins are the Static Web App and Gateway only. Network restrictions are defense in depth; the Gateway route policy and JWT checks remain the real authorization.
4. Classroom backup: if `curl` 8081 still works, show "no CORS / no public DNS / needs intranet" and stress that **the product entry is not 8081**. Do not rely on "firewall off but we forgot" as the only evidence.

---

## 11. Minimal Azure resource list

Minimum set required by 07 (one demo resource group), written as Terraform in `deploy/terraform`:

| Resource | Count | Role |
|---|---|---|
| App Service plan (Linux, `B2`) | 1 | Hosts the three .NET apps |
| Linux Web App, .NET 10 | **3**: gateway, core, ai | `dotnet publish` artifacts. No image, no registry |
| Static Web App (Free) | 1 | The built SPA |
| MySQL Flexible Server | 1, database `dealer_core`, TLS required | EF Core in core owns the schema |
| Key Vault | 1 | `INTERNAL-TOKEN`, `MYSQL-PASSWORD`, `JWT-SIGNING-SECRET`, optional `AIMANAGER-API-KEY` and `ADMIN-PASSWORD` |
| User-assigned identity | 1 | Resolves the Key Vault references in app settings |
| Log Analytics + Application Insights | 1 each | Logs and telemetry |

There is **no container registry**: containers were removed from this project ([SCOPE-BASELINE.md](SCOPE-BASELINE.md) errata item 5). **Nothing in `deploy/terraform` is live until an operator runs `terraform apply`** — do not present the files as a deployed environment. Do not write a subscription id, `terraform.tfvars`, or `terraform.tfstate` into Git.

### Shared development database

**Ruling: the team may move the development database off the local container onto one shared hosted MySQL. The engine stays MySQL 8. Nothing else changes.**

`DealerOps.Core` reads every datasource value from the environment. Pointing at a hosted server is therefore an environment change; EF Core still owns the runtime schema and no Java/Flyway migration path is involved.

Connection string difference: a hosted server requires TLS, so the local `useSSL=false&allowPublicKeyRetrieval=true` pair is replaced by `sslMode=REQUIRED` (see `dealer-platform/env.example`). This is the same JDBC URL shape `deploy/terraform` writes into the `dealerops-core` app settings. The local MySQL server is then unused and can be stopped.

Host choice: prefer **Azure Database for MySQL Flexible Server**, the same resource the table above lists and `deploy/terraform` creates, so development and the graded deploy share one engine and one driver. Do not pick a "MySQL-compatible" store that does not enforce foreign keys: `V1__init.sql` defines nine tables whose tenant isolation rests on `FOREIGN KEY ... REFERENCES dealer(id)`, and `ddl-auto: validate` will not catch a silently ignored constraint.

Rules for a shared instance:

- **One Flyway history for the whole team.** A migration merged to `main` reaches everyone's next startup. A script that drops or rewrites data is not a local experiment any more; land schema changes the same way as code.
- **Credentials never enter Git.** Host, user, and password live in each member's local `.env` and, for cloud, in Key Vault as `MYSQL-PASSWORD` (core only, per the table below).
- **Not public.** Firewall the server to the team's addresses plus the App Service egress — in `deploy/terraform` that is `operator_ip_addresses` plus the Azure services rule. The "MySQL is not public" constraint below applies to the development instance too.
- **Shared dev data is not demo data.** Seed the graded demo from the committed scripts in `dealer-platform/seed/`. On Azure, `./deploy/deploy.sh --apply --seed` loads that seed after the apps are up. `terraform apply` alone does not. The load inserts missing seed rows and does not empty a database that already has data. Copying a local dump with `deploy/seed/import-to-azure.sh` replaces every Azure row and is only for a blank or reset demo environment.

**Why not Firestore or any document store.** Rejected, consistent with §9. Three reasons: (1) the single-commit ruling in §9 — locking sale fields, incrementing `contentVersion`, and writing `audit_event` in one transaction — has no equivalent across document collections, and §9 already rules out an outbox; (2) the browser never reaches the database directly in this architecture (§10), so `dealer-core` would hold the Admin SDK credential, which bypasses security rules and leaves tenancy entirely in application code; (3) it would delete the JPA and Flyway layer that `V1__init.sql` and the `V{YYYYMMDD}_{n}__` convention are built on, for no behavior the course requires. Hosted MySQL remains the database.

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
- Four Linux Web Apps (`web`, `gateway`, `core`, `ai`): core and ai denied to everything but Azure-internal callers, gateway and web public over HTTPS. The React app is the `web` App Service (`pm2 serve`), not a Static Web App
- Application Insights (gateway + core first is acceptable)
- Per-repo pipeline: compile and test. Release is the documented operator commands, not a CI job
- Demo release needs human approval; do not hand-click portal changes and call it a pipeline

**Sprint 3:** do not add a bus/second database; finish isolation, CRM, three ad kinds, export, and audit.

---

## 12. Runtime version (current implementation)

The active backend runtime is **.NET 10 / ASP.NET Core**. The active frontend runtime is **React 19 + TypeScript + Vite** on Node 20+. Java/Spring and Vue references in this document are historical course material and are not implementation instructions.

---

## 13. CORS, HTTPS, Key Vault references (no secrets in the repo)

### CORS

- Allow browser origins **only** on Gateway. The React dev server runs on `http://localhost:5174` during development.
- The allowed origin is `CORS_ALLOWED_ORIGIN`. The local default is `http://localhost:5174`. On Azure it is the Static Web App HTTPS origin. It stays a single origin.
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
