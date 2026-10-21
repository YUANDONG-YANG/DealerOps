# Feature extensions after the v6 baseline

Version v1.4 · 2026-10-21 · Status: **implementation code complete; manual acceptance pending** (§9 added 2026-10-21)

## Development phase: no test authoring

**Development is not complete. Do not write TEST code until the user confirms feature development is complete and explicitly authorizes test work.** The acceptance cases below are manual checks, not test tasks.

## 0. Source and ground rules

Source: the client notes in `requirements/Dos Car dealership2.docx` and the original proposal text ("lead and customer lifecycle", "garage operations", "Image Studio"). Five items were raised. This document decides each one and gives the design for the ones that go ahead.

Ground rules for every item:

- **Add, do not rewrite.** The active stack is .NET 10 / ASP.NET Core, React 19 + TypeScript + Vite, one MySQL database, and Gateway-only browser traffic. The old Java/Vue wording is historical. The client notes' Firebase **database** stack is not adopted — MySQL stays the only application database — but Firebase **Auth** landed on 2026-10-16 as a third sign-in path; see SCOPE-BASELINE erratum 9.
- Every new table carries `dealer_id` and uses the existing tenant filter (`TenantOwned`, `TenantGuard.requireDealerUser()`); another dealership's id is **404**, as for vehicles and customers.
- Every new business write is audited in the same transaction through `AuditService`.
- New migrations follow the naming rule in `CLAUDE.md` (`V{YYYYMMDD}_{n}__{action}.sql`); never edit an applied migration.
- New external URLs and keys are configuration (`application.yml` placeholders + `dealer-platform/env.example` + `deploy/terraform`), never literals in code.
- When an item is implemented, the same change updates [14-Backend-API-Contract.md](14-Backend-API-Contract.md), `dealer-platform/openapi.yaml`, [13-Frontend-Engineering.md](13-Frontend-Engineering.md) §2, and [16-Acceptance-and-Test.md](16-Acceptance-and-Test.md).

## 1. Decisions and order

| # | Item | Decision | Phase | Requirement IDs |
|---|---|---|---|---|
| 1 | VIN decode | **Go** — already implemented in the working tree; finish the contract and acceptance | P1 | VIN-01–04 |
| 2 | Lead follow-up | **Go** | P2 | LEAD-01–09 |
| 3 | Reconditioning work orders | **Go** (vehicle-level, no garage billing) | P3 | WO-01–07 |
| 4 | Self sign-up and sign-in | **Go, constrained**: register with a username plus email and/or phone; sign in with any of them plus the password; new accounts start unbound; only the admin grants dealership access. Google sign-in added 2026-10-15 (AUTH-23), superseding the earlier "no social provider" constraint | P4 | AUTH-16–23 |
| 5 | Image Studio | **Go** — photo upload and automatic enhancement in dealer-core; photos stored in MySQL | P5 | IMG-01–05 |

All five items have backend and frontend implementation, database migrations, API contract entries, and Gateway coverage. Scope re-signing remains a course-administration risk, but does not block the user's implementation request. Source compilation and production frontend build pass; manual acceptance remains pending. See [Implementation Delivery Status](../project-plan/Implementation-Delivery-Status.md).

## 2. VIN decode (P1)

### Current state

DealerOps.Core proxies NHTSA vPIC for the DMS make/model options and provides `GET /api/v1/catalog/vin/{vin}` (`VinDecodeResponse`). Core and Gateway allow this single VIN endpoint anonymously. The public landing page and DMS create form use the same React API client and Gateway origin (`frontend/react/src/api/catalog.ts`).

### Requirements

| ID | Requirement | Priority |
|---|---|---|
| VIN-01 | `GET /api/v1/catalog/vin/{vin}` returns `vin, make, model, modelYear, bodyClass, engine, country, manufacturer`; blank vPIC values are `null` | Must |
| VIN-02 | Invalid VIN (not 17 characters, or contains I/O/Q) → **400** `VALIDATION`; vPIC has no make → **404** `NOT_FOUND`; vPIC down → **502** `CATALOG_UNAVAILABLE` | Must |
| VIN-03 | DMS create form: `Decode` fills make, model, year, and body type; the user can still edit them; nothing is saved until `Save`. Body type is stored as an **optional** field (`bodyType`, default `OTHER`) and is a list filter; engine, country, and manufacturer are shown, not stored. The specification's eight **required** fields do not change — see SCOPE-BASELINE erratum 8 | Must |
| VIN-04 | The endpoint is anonymous (landing page demo). It reads no tenant data and writes nothing. Successful decodes are cached in memory | Must |

Open risk: an anonymous endpoint lets anyone use the server as a vPIC proxy. The in-memory cache limits repeat calls; the gateway also limits anonymous callers per IP (NFR-07, [19](19-Gateway-and-AI-Engineering.md) §1.5.1).

### Delivery and acceptance

The contract is recorded in [14-Backend-API-Contract.md](14-Backend-API-Contract.md) §4.6.1, `dealer-platform/openapi.yaml`, and [SCOPE-BASELINE.md](SCOPE-BASELINE.md) errata item 6. Manual acceptance remains: valid VIN `1HGCM82633A004352` fills the form; a VIN with `I` shows the 400 copy; signed-out decode on `/` works; no other `/api/v1/**` path becomes anonymous.

## 3. Lead follow-up (P2)

A lead is one sales opportunity: a customer interested in (optionally) one vehicle, with an owner, a stage, a next follow-up date, and time-ordered notes. There is no public enquiry form (the buyer site stays out of scope); staff enter leads.

### Requirements

| ID | Requirement | Priority |
|---|---|---|
| LEAD-01 | Create a lead for an existing customer, or create the customer (the four required CRM fields) and the lead in one transaction | Must |
| LEAD-02 | A lead may reference one vehicle of the same dealership that is `IN_STOCK` at creation; otherwise **400** `WRONG_DEALER_OR_SOLD` | Must |
| LEAD-03 | Stages `NEW`, `CONTACTED`, `QUALIFIED`, `WON`, `LOST`; while open, any stage may be chosen (usual path `NEW → CONTACTED → QUALIFIED → WON`). `WON` and `LOST` are final; `LOST` requires a reason | Must |
| LEAD-04 | Owner is optional and must be an active member of the same dealership; otherwise **400** `VALIDATION` | Must |
| LEAD-05 | List: customer, vehicle of interest, stage, owner, next follow-up; filters stage, owner, overdue; 10 per page (NFR-01) | Must |
| LEAD-06 | Overdue = open stage and `nextFollowUpOn` before today (server date; dealerships have no time zone field) | Should |
| LEAD-07 | Notes are append-only, newest first, with author and time | Must |
| LEAD-08 | Create, stage/owner/date changes, and notes are audited (`LEAD`; `CREATE`, `UPDATE`, `NOTE`); note text is not copied into the audit | Must |
| LEAD-09 | Lead notes and lead data are never sent to AI; the assistant does not read leads in this version | Must |
| CRM-15 | Dealer users can view a tenant-scoped sales funnel report with the count and share of leads in each stage and the won rate | Must |

`WON` does not sell the vehicle. The sale stays the existing DMS sell action, and the customer link stays the existing CRM link.

### Data (`V20261008_1__add_sales_leads.sql`, or the date the script is actually added)

The tables are `sales_lead` and `sales_lead_note` because `LEAD` is a reserved word in MySQL 8.

```sql
CREATE TABLE sales_lead (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  vehicle_id BIGINT NULL,
  owner_username VARCHAR(64) NULL,
  stage VARCHAR(16) NOT NULL,
  next_follow_up_on DATE NULL,
  lost_reason VARCHAR(300) NULL,
  version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_lead_dealer_stage (dealer_id, stage),
  CONSTRAINT fk_lead_dealer FOREIGN KEY (dealer_id) REFERENCES dealer (id),
  CONSTRAINT fk_lead_customer FOREIGN KEY (customer_id) REFERENCES customer (id),
  CONSTRAINT fk_lead_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (id)
);

CREATE TABLE sales_lead_note (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  lead_id BIGINT NOT NULL,
  author_username VARCHAR(64) NOT NULL,
  body VARCHAR(2000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_lead_note_lead (lead_id),
  CONSTRAINT fk_lead_note_lead FOREIGN KEY (lead_id) REFERENCES sales_lead (id)
);
```

### API (Dealer.User; Admin → 403, as for CRM)

| Method and path | Body / query | Result |
|---|---|---|
| `GET /api/v1/leads` | `q, stage, owner, customerId, overdue, page, size` | `PageResponse` of list rows |
| `POST /api/v1/leads` | `customerId` **or** `newCustomer{name,email,phone,homeAddress}`; `vehicleId?, ownerUsername?, nextFollowUpOn?, note?` | 201 lead detail |
| `GET /api/v1/leads/{id}` | — | detail with customer brief, vehicle brief, notes |
| `PATCH /api/v1/leads/{id}` | full editable state: `stage, ownerUsername, nextFollowUpOn, vehicleId, lostReason, version` (null clears a field) | 200; stale `version` → **409** `VERSION_CONFLICT`; changing a final lead → **409** `LEAD_CLOSED` (new code) |
| `POST /api/v1/leads/{id}/notes` | `body` (1–2000) | 201 note; closed leads still accept notes |
| `GET /api/v1/members` | — | 200 `[{ username, displayName, source }]` of this dealership's active members, sorted by username; shared by the lead owner select/filter, the work-order assignee select, and the Team page Members tab (14 §5.6) |

Lead history is readable with `GET /api/v1/audit?entityType=LEAD&entityId=`.

`GET /api/v1/leads/report/funnel` returns all five lead stages (including zero counts), `totalLeads`, `openLeads`, and `wonRatePercent`. Stage share uses all current dealership leads; won rate uses closed leads only (`WON / (WON + LOST)`), so open leads do not count as losses. The same page shows the vehicle sales summary from `GET /api/v1/vehicles/report/sales`. This is a current snapshot, not a date-range or historical trend report.

Backend placement: new package `com.dealerops.core.lead` following the `customer` package layout (controller, service, entity, repository, dto). Reuse `CustomerService` to create the customer and `MembershipRepository` to validate the owner; do not duplicate customer validation.

### UI

- New route `/leads` (`LeadsView`, `roles: ['Dealer.User']`) and menu item **Leads** after CRM. This lifts the old "do not register `/leads`" ban in 13 §2.
- List + right drawer, same pattern as CRM (`DataTable`, `FormDrawer`, `PageState`). Drawer: stage control, owner select (dealership members), follow-up date, notes timeline with an add box, audit at the bottom.
- CRM customer drawer: a small "Leads" list for that customer linking to `/leads?leadId=`.

## 4. Reconditioning work orders (P3)

A work order is one reconditioning task on one in-stock vehicle. It is not a service-garage job: no labour billing, parts, or service customers.

### Requirements

| ID | Requirement | Priority |
|---|---|---|
| WO-01 | Create a work order on an `IN_STOCK` vehicle: task (1–200), optional assignee (active member), optional due date | Must |
| WO-02 | Status `OPEN → IN_PROGRESS → DONE`, or `OPEN → DONE` for a quick job; `OPEN`/`IN_PROGRESS → CANCELLED`. `DONE` and `CANCELLED` are final | Must |
| WO-03 | `DONE` requires a completion note (1–500) and a cost ≥ 0 (CAD) | Must |
| WO-04 | Marking `DONE` adds the cost to the vehicle's `repairCost` in the same transaction, audited as a vehicle `UPDATE` of `repairCost` | Must |
| WO-05 | Selling a vehicle that has an `OPEN` or `IN_PROGRESS` work order → **409** `WORK_ORDERS_OPEN` (new code); work orders on a sold vehicle cannot be created or changed → **409** `SOLD_LOCKED` | Must |
| WO-06 | Create and status changes are audited (`WORK_ORDER`; `CREATE`, `UPDATE`) | Must |
| WO-07 | The DMS list shows an open work-order count per vehicle | Should |

The vehicle keeps its two states (`IN_STOCK`, `SOLD`); no `PREPARING` or `ARCHIVED` state is added.

### Data (`V20261008_2__add_work_orders.sql`, or the date the script is actually added)

```sql
CREATE TABLE work_order (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dealer_id BIGINT NOT NULL,
  vehicle_id BIGINT NOT NULL,
  task VARCHAR(200) NOT NULL,
  assignee_username VARCHAR(64) NULL,
  status VARCHAR(16) NOT NULL,
  due_on DATE NULL,
  cost DECIMAL(12,2) NULL,
  completion_note VARCHAR(500) NULL,
  completed_on DATE NULL,
  version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_work_order_vehicle (dealer_id, vehicle_id, status),
  CONSTRAINT fk_work_order_dealer FOREIGN KEY (dealer_id) REFERENCES dealer (id),
  CONSTRAINT fk_work_order_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle (id)
);
```

### API (Dealer.User)

| Method and path | Body | Result |
|---|---|---|
| `GET /api/v1/vehicles/{id}/work-orders` | — | list, open first, then newest |
| `POST /api/v1/vehicles/{id}/work-orders` | `task, assigneeUsername?, dueOn?` | 201 |
| `PATCH /api/v1/work-orders/{id}` | full editable state: `status, task, assigneeUsername, dueOn, cost, completionNote, version` (`cost` and `completionNote` read only for `DONE`) | 200; final → **409** `WORK_ORDER_CLOSED` (new code) |

Backend placement: new package `com.dealerops.core.workorder`. The `DONE` path calls `VehicleService` to change `repairCost` so the sold lock and the vehicle audit stay in one place; the sell path in `VehicleService` checks open work orders.

### UI

No new route. The DMS vehicle drawer gets a **Work orders** section above the audit: list, `Add work order`, and per-row actions `Start`, `Done` (dialog for note and cost), `Cancel` (second confirmation, as for Sell).

## 5. Self sign-up and sign-in by email, username, or phone (P4)

Users register with a username they choose plus an email and/or phone, and sign in with any of the three and the password. The username is also the stable key for memberships, audit, and the JWT subject. Accounts remain unbound until a Platform.Admin assigns them to a dealership.

**Google sign-in, added 2026-10-15.** The original constraint ruled out every social provider on the grounds that each needs official app registration and review. That holds for sensitive or restricted scopes, but Google's ID-token sign-in uses only the default `openid email profile` scopes, which an unverified app in testing mode serves without review. It also needs no client secret, so it adds no new stored credential. The constraint is therefore lifted for Google only, and `AUTH-19` is superseded by `AUTH-23`. No other provider is built.

Google authenticates an email address and nothing more. It grants no role and no dealership: a Google sign-in for an unknown email creates the same unbound `Dealer.User` that password self-registration creates, so an admin still has to bind it (`AUTH-18`). Tenancy continues to be resolved per request from the membership table, never from the identity provider, which is what keeps the multi-tenant boundary intact.

### Requirements

| ID | Requirement | Priority |
|---|---|---|
| AUTH-16 | `POST /api/v1/auth/register` accepts `username` (3–64 letters, digits, `.`, `_`, `-`, at least one letter), `displayName`, password, and at least one of a valid `email` or phone number (ten digits without `+` are a local North American number stored as `+1` plus the digits; any other number needs its country code). A duplicate username, email, or phone → **409** `USERNAME_TAKEN` / `DISPLAY_NAME_TAKEN` / `EMAIL_TAKEN` / `PHONE_TAKEN`. Full names are unique (trimmed, case-insensitive). Every error names its field in `fieldErrors` with an English message. | Must |
| AUTH-17 | `POST /api/v1/auth/login` accepts `identifier` = email, username, or phone, and the password. Order: `@` → email; else username; else phone | Must |
| AUTH-18 | A new account is active but unbound and can access no dealership data until the admin binds it or a manager of the requested dealership approves its join request (`AUTH-25`) | Must |
| AUTH-19 | ~~No social-provider login buttons, routes, credentials, or integrations are present~~ **Superseded 2026-10-15 by AUTH-23.** Still binding for every provider other than Google | Must |
| AUTH-20 | Admin can create an account with a username and an email and/or phone and bind it; binding an existing account never replaces its credentials | Must |
| AUTH-21 | The platform admin is seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD`; `ADMIN_EMAIL` / `ADMIN_PHONE` are optional extra sign-in names | Must |
| AUTH-22 | Local registration and first admin-created account are audited (`APP_USER`, `CREATE`, actor = the username) | Should |
| AUTH-23 | `POST /api/v1/auth/google` accepts a Google ID token, verifies it server-side (RS256 against Google's published keys, issuer, audience = the configured client id, expiry, and `email_verified` true), then signs in the account holding that email or creates a new unbound `Dealer.User` for it. The account gets no password, so it can only return through Google. A `Platform.Admin` account is refused and keeps password-only sign-in. An optional `Google:HostedDomain` restricts sign-in to one Google Workspace domain. The button is hidden when no client id is configured. An optional `dealerId` records the join request; an unknown or inactive one → **404** `NOT_FOUND` and nothing is recorded. Audited as `APP_USER` / `CREATE` with `registration = google` | Must |
| AUTH-24 | `POST /api/v1/auth/firebase` accepts a Firebase ID token (SCOPE erratum 9) and signs in the account linked to that Firebase uid, else the account holding that email, else creates an unbound `Dealer.User` (`registration = firebase`). Unverified emails are accepted, but an existing email account is linked to a new uid only when `email_verified` is true (otherwise 409 `EMAIL_TAKEN`). A `Platform.Admin` is refused | Must |
| AUTH-25 | An unbound account may request to join one dealership. A manager of that dealership (AUTH-27) sees the request on `/team` and in the header inbox (`GET /api/v1/dealer/join-requests`) and may approve it (creates the membership as staff, audited `MEMBERSHIP` / `CREATE`) or reject it (SCOPE erratum 10). An account already active at another dealership cannot be approved (**409** `DUP_MEMBER`, one login, one dealership). The request is shown to that dealership only | Must |
| AUTH-26 | Each active membership carries a dealership role, `MANAGER` or `STAFF` (design/15 §2.5). Every new member starts as staff. Only the platform admin promotes staff to manager or demotes a manager (`PUT /api/v1/admin/dealers/{id}/members/{username}/role`, audited `MEMBERSHIP` / `UPDATE`). Business data access is the same for both | Must |
| AUTH-27 | Only a manager sees `/team` and the join-request inbox, approves or rejects join requests, removes staff (`DELETE /api/v1/dealer/members/{username}`; not managers), and edits the dealership profile (`GET`/`PATCH /api/v1/dealer/profile`). Staff calling these → **403** | Must |

### Flow and API

| Step | What happens |
|---|---|
| 1 | `/register` collects username, display name, email and/or phone, and a password; frontend and backend validate the formats |
| 2 | dealer-core normalizes email and phone, rejects a duplicate username, email, or phone, hashes the password, and issues the DealerOps JWT |
| 3 | `/login` accepts the email, username, or phone and the password; the server resolves it and returns the same JWT response |
| 4 | Unbound accounts land on `/no-access`; the admin can bind a pending account without changing its sign-in names or password |

Both `POST /api/v1/auth/login` and `POST /api/v1/auth/register` are anonymous through Gateway. No social auth discovery, authorization, or callback routes exist. The Gateway continues to proxy all API routes through its authenticated catch-all; only login, registration, and public VIN decode are anonymous.

The `app_user` table keeps the unique `username` and adds nullable `phone`; unique nullable email and phone constraints prevent duplicate sign-in names. Usernames must contain a letter, so a username can never be mistaken for a phone number. Email is normalized to lowercase; phone formatting separators are removed and an international country code is required. Passwords use BCrypt. The app does not send verification codes or email/SMS: possession verification is not part of this feature.

### UI

- `/login`: one "Email, username or phone number" field + password; no social sign-in buttons.
- `/register`: username, display name, email and/or phone, and password.
- Admin-created staff accounts need an email and/or phone; the seeded platform admin needs only a username.
- `/no-access`: a signed-in user with no dealership, including Google, sees that the account is not provisioned yet, the username, and a way to request one dealership. A member of that dealership approves or rejects it on `/team`. Profile stays closed until that approval; the screen does not link to `/profile`.
- Admin Pending accounts tab: pending accounts show email and phone and can be bound without changing credentials.

## 6. Image Studio (P5)

Vehicle photos with automatic enhancement. The panel opens from the DMS vehicle drawer and, for the selected vehicle, from the Ad compliance page. `ai-manager` and ai-service handle text only, so enhancement is image processing in dealer-core (`java.awt` / `javax.imageio`, no new dependency), not a generative model. The original is always kept.

### Requirements

| ID | Requirement | Priority |
|---|---|---|
| IMG-01 | Upload JPEG or PNG photos to a vehicle: at most 2 MB each (else **400** `VALIDATION`), at most 10 per vehicle (else **400** `VALIDATION`); other types → **415** `UNSUPPORTED_MEDIA_TYPE` | Must |
| IMG-02 | Enhance a photo with a preset: `AUTO` (auto levels / contrast stretch), `BRIGHTEN`, `SHARPEN`. The result is a JPEG at most 1600 px on the long edge; a new enhancement replaces the previous enhanced copy; the original never changes | Must |
| IMG-03 | View the original or the enhanced copy; delete a photo with a second confirmation. Image Studio is reachable from the DMS vehicle drawer and from the Ad compliance page | Must |
| IMG-04 | Upload, enhance, and delete are audited (`VEHICLE_PHOTO`; `CREATE`, `UPDATE`, `DELETE`) | Must |
| IMG-05 | Photos are tenant data: another dealership's vehicle or photo id → **404**. Photos are never sent to AI | Must |

### Data and storage

`V20261008_4__add_vehicle_photos.sql` adds `vehicle_photo` with `original_data` and `enhanced_data` as `MEDIUMBLOB`. Storing bytes in MySQL keeps the single-database rule and needs no new Azure resource; with 2 MB and 10 photos per vehicle the classroom data set stays small. Blob Storage is the upgrade path if volume grows.

### API (Dealer.User)

| Method and path | Result |
|---|---|
| `GET /api/v1/vehicles/{id}/photos` | metadata list, no bytes |
| `POST /api/v1/vehicles/{id}/photos` | multipart field `file`; 201 metadata |
| `GET /api/v1/vehicles/{id}/photos/{photoId}/content?variant=original\|enhanced` | image bytes |
| `POST /api/v1/vehicles/{id}/photos/{photoId}/enhance` | body `{ preset }`; 200 metadata |
| `DELETE /api/v1/vehicles/{id}/photos/{photoId}` | 204 |

The file type is sniffed from the bytes, not the client `Content-Type`. Presets: `AUTO` stretches contrast between the 1st and 99th luminance percentiles, `BRIGHTEN` applies gamma 0.8, `SHARPEN` applies a 3×3 sharpen kernel; output is JPEG quality 0.9 and PNG transparency becomes white. Images above 40 megapixels are refused before decoding (**400** `VALIDATION`). `variant=enhanced` before any enhancement → **404**. Sold vehicles keep their photos (photos are not acquisition fields).

| Config key | Env | Default |
|---|---|---|
| `spring.servlet.multipart.max-file-size` | `PHOTO_MAX_FILE_SIZE` | 2MB |
| `spring.servlet.multipart.max-request-size` | `PHOTO_MAX_REQUEST_SIZE` | 3MB |
| `dealerops.photos.max-per-vehicle` | `PHOTO_MAX_PER_VEHICLE` | 10 |
| `dealerops.photos.max-edge-px` | `PHOTO_MAX_EDGE_PX` | 1600 |

Gateway: the photo paths use their own route `dealer-core-photos` without `CacheRequestBody`, because that filter buffers request bodies as text for logging and is capped at 256 KB ([19-Gateway-and-AI-Engineering.md](19-Gateway-and-AI-Engineering.md)). The browser loads images through the authenticated HTTP client as blobs, because an `<img>` tag cannot send the bearer token.

### UI

An **Image Studio** section in the DMS vehicle drawer, between Work orders and Audit: `Upload photo` (JPEG/PNG and 2 MB checked in the browser first), a large preview with an Original / Enhanced toggle, preset buttons `Auto fix` / `Brighten` / `Sharpen`, `Delete` with a second confirmation, and a thumbnail strip.

## 7. Configurable ad compliance rules

AD-15 is implemented as a platform-admin editor for the existing OMVIC rule catalog. Each rule can be enabled or disabled, changed between `BLOCK` and `REVIEW`, and given a custom finding message. Rule configuration is global and stored in `compliance_rule_override`; dealer users cannot read or modify it. Any saved change increments listing content versions across dealerships, so every prior check becomes stale and must be rerun before Ready or export. The engine retains ownership of the rule logic; this editor only controls how a failed rule is applied and presented.

| Method and path | Result |
|---|---|
| `GET /api/v1/admin/compliance-rules` | Platform-admin catalog with effective settings |
| `PUT /api/v1/admin/compliance-rules/{ruleId}` | Save `enabled`, `severity`, and `message`; unknown rule → 404, invalid severity → 400 |

## 8. Manual acceptance

The full, current steps are [16-Acceptance-and-Test.md](16-Acceptance-and-Test.md) §5a (EXT-01–EXT-10); this table is the summary.

| Case | Steps | Expected |
|---|---|---|
| EXT-01 VIN | Signed out on `/`, decode `1HGCM82633A004352`; then on `/dms` Add vehicle, decode the same VIN | Facts shown; form gets make/model/year; nothing saved before `Save` |
| EXT-02 Lead | Staff A creates a lead with a new customer and an in-stock vehicle, adds a note, sets `QUALIFIED`, then `LOST` with a reason | Customer appears in CRM; notes newest first; further stage change → `LEAD_CLOSED`; audit rows present |
| EXT-03 Lead isolation | Staff B (other dealership) opens Staff A's lead id | 404 |
| EXT-04 Work order | On an in-stock vehicle, add a work order, start it, try to sell the vehicle, then mark it done with cost 150 | Sell → `WORK_ORDERS_OPEN`; after done, `repairCost` increased by 150 with a vehicle audit row |
| EXT-05 Sign-up | Register with username, name, email and phone, and password; sign in three times, with the email, the username, and the phone | All three sign in and land on `/no-access`; no business API works (403); duplicate username/email/phone → `USERNAME_TAKEN` / `DISPLAY_NAME_TAKEN` / `EMAIL_TAKEN` / `PHONE_TAKEN` |
| EXT-06 Binding | Admin binds the registered user from Pending accounts without a password | User signs in with the original password (by email, username, or phone) and lands on `/dms` |
| EXT-07 Sign-in name rules | Register with neither email nor phone, a digits-only username, a malformed email or phone, and a duplicate username; sign in with a phone written with spaces and dashes | Missing contact, digits-only username, malformed values → 400; duplicate → 409; the formatted phone signs in |
| EXT-08 Photo upload | Staff A uploads a 1 MB JPEG and a PNG to an in-stock vehicle, then a 3 MB file, then a text file renamed `.jpg`, then an 11th photo | First two appear; 3 MB → "Photo must be 2 MB or smaller."; fake JPEG → 415; 11th → 400 |
| EXT-09 Photo enhance | Select the JPEG, `Auto fix`, toggle Original / Enhanced, then `Sharpen` | Enhanced differs; original unchanged; `Sharpen` replaces the enhanced copy |
| EXT-10 Photo isolation | Staff B requests Staff A's photo content through the gateway; Staff A deletes a photo | B → 404; after delete the thumbnail disappears and its content → 404 |

## 9. Delivery extensions (2026-10-21)

The user asked for every feasible item from the earlier out-of-scope list: buyer site, real marketplace publishing, payments, contracts, OCR, extra vehicle fields, queues, a second database, a KPI home page, lead stage history, workshop settlement, and a dedicated disclaimer page. Each was decided as follows.

| Item | Decision | Requirement IDs |
|---|---|---|
| Mileage, exterior colour, fuel type, stock number, list price | **Go** — optional vehicle fields; the specification's eight required fields do not change | DMS-18 |
| Payments | **Go, as a ledger** — record payments already taken at the dealership against a sold vehicle; no card processing | PAY-01–04 |
| Contracts | **Go, as a template** — printable bill of sale from the DMS, CRM, and payment records | SALE-01 |
| KPI home page | **Go** — `/dashboard`; `/dms` stays the post-login page | DASH-01 |
| Lead stage history | **Go** — monthly stage entries from the lead audit trail on the sales report | CRM-16 |
| Workshop settlement | **Go** — work-order cost report by month and assignee | WO-08 |
| Dedicated disclaimer page | **Go** — public `/disclaimer` | AD-14 |
| Buyer site | **Go** — public inventory of ready, passed ads and an inquiry form that files a lead | SHOP-01–05 |
| Real marketplace publishing | **No.** Kijiji and AutoTrader.ca need a partner agreement, a dealer account, and API or feed credentials, which this project does not have. AD-16 keeps the labelled browser simulation; the buyer site is the real publication channel | — |
| Real payment processing | **No.** Charging cards needs a merchant account and a PCI-scoped processor. PAY-01–04 record payments only | — |
| OCR | **No.** The configured AI model reads text only, and no requirement says which document to read (registration, bill of sale, odometer photo). VIN entry already has the vPIC decode | — |
| Message queue, second database | **No.** No requirement needs asynchronous work or a separate store; both would add infrastructure and failure modes to a single-database design (SCOPE-BASELINE: sync REST + one MySQL database) | — |

### Requirements

| ID | Requirement | Priority |
|---|---|---|
| DMS-18 | A vehicle has optional `mileageKm` (0–2,000,000), `exteriorColor` (≤ 40), `fuelType` (`GASOLINE`, `DIESEL`, `HYBRID`, `PLUGIN_HYBRID`, `ELECTRIC`, `OTHER`), `stockNumber` (≤ 20, unique among the dealership's active vehicles, else **400** `VALIDATION` on `stockNumber`), and `listPrice` (≥ 0, two decimals). Patch replaces them (null clears). They are audited like other vehicle fields, locked on a sold vehicle (**409** `SOLD_LOCKED`), and the list search `q` also matches the stock number. The DMS list shows Stock # and List price | Must |
| PAY-01 | `POST /api/v1/vehicles/{id}/payments` records `amount` (> 0, two decimals), `method` (`CASH`, `DEBIT`, `CREDIT_CARD`, `CHEQUE`, `BANK_TRANSFER`, `FINANCING`, `OTHER`), `paidOn`, and an optional `note` (≤ 200) on a sold vehicle. An in-stock vehicle → **400** `VALIDATION` | Must |
| PAY-02 | The paid total cannot exceed the sold price, and `paidOn` must be between the sold date and today; each violation → **400** `VALIDATION` with the field | Must |
| PAY-03 | `GET` returns `soldPrice`, `paidTotal`, `balanceDue`, and the payments newest first; `DELETE …/payments/{paymentId}` removes a mistaken payment | Must |
| PAY-04 | Adding and removing a payment write a `VEHICLE` / `UPDATE` audit row (`paymentAdded` or `paymentRemoved`, `paidOn`), so the vehicle history shows them | Must |
| SALE-01 | A sold vehicle's drawer links to `/dms/{id}/bill-of-sale`: dealer, linked buyer, vehicle (VIN, condition, odometer, colour), sale price, payments, balance due, signature lines, and a notice that it is a template, not a reviewed contract. Printing hides the app chrome | Must |
| DASH-01 | `/dashboard` (Dealer.User) shows in-stock count and invested cost, outstanding work orders, settled workshop cost, sales this month, total sales, gross profit, average days to sell, open pipeline, overdue follow-ups, and win rate, from the existing report endpoints | Must |
| CRM-16 | The funnel report adds `months`: for each of the twelve most recent months with a lead create or stage change, how many leads entered each stage. Source: `LEAD` audit rows carrying `stage` | Must |
| WO-08 | `GET /api/v1/work-orders/report/settlement` returns open, in-progress, and done counts, the settled cost of done work orders, cost by completion month, and per assignee (outstanding, done, settled cost). Cancelled work orders are not counted | Must |
| AD-14 | Public `/disclaimer` explains the limits of the ad check, the AI review, simulated publishing, the bill of sale template, the payment ledger, buyer-site listings, and VIN data. The ad result panel, the buyer site, the landing page, and the bill of sale link to it | Must |
| SHOP-01 | Public `/shop` lists active dealerships; `/shop/{dealerId}` shows the dealership's contact details and every vehicle that is in stock, not deleted, and whose ad is `READY` with a passed check for the current content version | Must |
| SHOP-02 | `GET /api/v1/public/dealers/{dealerId}/inventory` is anonymous. A vehicle exposes year, make, model, body type, condition, mileage, colour, fuel type, the ad title and body, and whether it has a photo. No VIN, cost, list price, or customer data | Must |
| SHOP-03 | `GET …/vehicles/{vehicleId}/photo` returns the vehicle's first photo (enhanced copy when present), only while the vehicle is listed; otherwise **404** | Must |
| SHOP-04 | `POST …/inquiries` takes `vehicleId`, `contact` (the four CRM customer fields and their rules), and `message` (1–1000). It reuses the customer with the same phone or creates one, then creates a `NEW` lead on the vehicle due today with the message as the first note. Rows are written by actor `buyer-site`; contact values are not copied into the audit (AUD-04). An unlisted vehicle → **404** | Must |
| SHOP-05 | The Gateway lets `GET`/`POST /api/v1/public/**` through without a token; inquiries have their own per-IP limit (`dealerops:rateLimits:inquiryPerMinute`, default 5) | Must |

### Data

`vehicle` gains `mileage_km INT NULL`, `exterior_color VARCHAR(40) NULL`, `fuel_type VARCHAR(16) NULL`, `stock_number VARCHAR(20) NULL`, `list_price DECIMAL(12,2) NULL`. New table `vehicle_payment (id, dealer_id, vehicle_id, amount DECIMAL(12,2), method VARCHAR(16), paid_on DATE, note VARCHAR(200) NULL, recorded_by VARCHAR(64), created_at)` with `idx_vehicle_payment_vehicle (dealer_id, vehicle_id)` and foreign keys to `dealer` and `vehicle`. Core adds both at start-up with the idempotent schema patches in `Program.cs`.

### Acceptance

| Case | Steps | Expected |
|---|---|---|
| EXT-11 Listing details | Add a vehicle with stock number, mileage, colour, fuel type, and list price; add a second with the same stock number; search by the stock number | Values saved and audited; duplicate → "Stock number is already used by another vehicle."; search finds one |
| EXT-12 Payments | Sell the vehicle for 21,000; pay 25,000; pay 6,000 and 15,000; remove one; open the bill of sale and print | 25,000 → "Amount is more than the balance due."; balance 15,000 → 0 → 15,000; audit rows; bill of sale shows the payments and prints without the app chrome |
| EXT-13 Reports | Finish a work order with cost 120.50; open the sales report and the dashboard | Workshop settlement shows 120.50 by month and assignee; stage history shows this month's lead entries; dashboard KPIs match the reports |
| EXT-14 Buyer site | Pass and mark ready an ad; open `/shop/{dealerId}` signed out; send an empty inquiry, then a complete one | The vehicle is listed without VIN or cost; empty form → field errors; complete form → a `NEW` lead with the message as its note |
| EXT-15 Buyer-site limits | Sell the listed vehicle or edit its ad; request its photo; send an inquiry for it | It leaves the inventory; photo and inquiry → 404 |
| EXT-16 Manager and staff | Admin binds two accounts to a dealership and makes one a manager; each signs in; the staff member calls the join-request and profile routes; a registered account requests to join and the manager approves it; the manager edits the profile and removes the new staff member; the admin demotes the manager | Only the manager sees Team and the inbox; staff → 403 and `/team` redirects to `/dms`; the approved account joins as staff; the profile change shows in the header; removing a manager → 403; after the demotion Team disappears |
