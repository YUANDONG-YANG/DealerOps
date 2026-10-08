# Feature extensions after the v6 baseline

Version v1.3 · 2026-10-08 · Status: **implementation code complete; manual acceptance pending**

## Development phase: no test authoring

**Development is not complete. Do not write TEST code until the user confirms feature development is complete and explicitly authorizes test work.** The acceptance cases below are manual checks, not test tasks.

## 0. Source and ground rules

Source: the client notes in `requirements/Dos Car dealership2.docx` and the original proposal text ("lead and customer lifecycle", "garage operations", "Image Studio"). Five items were raised. This document decides each one and gives the design for the ones that go ahead.

Ground rules for every item:

- **Add, do not rewrite.** The stack stays Java 21 + Spring Boot, Vue 3 + Element Plus, one MySQL database, gateway-only browser traffic. The C#, React, and Firebase stack in the client notes is not adopted ([SCOPE-BASELINE.md](SCOPE-BASELINE.md) errata item 7).
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
| 4 | Self sign-up and sign-in | **Go, constrained**: register with a username plus email and/or phone; sign in with any of them plus the password; new accounts start unbound; only the admin grants dealership access; no social provider | P4 | AUTH-16–22 |
| 5 | Image Studio | **Go** — photo upload and automatic enhancement in dealer-core; photos stored in MySQL | P5 | IMG-01–05 |

All five items have backend and frontend implementation, database migrations, API contract entries, and Gateway coverage. Scope re-signing remains a course-administration risk, but does not block the user's implementation request. Source compilation and production frontend build pass; manual acceptance remains pending. See [Implementation Delivery Status](../project-plan/Implementation-Delivery-Status.md).

## 2. VIN decode (P1)

### Current state

dealer-core proxies NHTSA vPIC for the DMS make/model options (`catalog/VehicleCatalogService`, base URL `dealerops.vpic.base-url` / `VPIC_BASE_URL`) and provides `GET /api/v1/vehicle-catalog/vin/{vin}` (`VinDecodeResponse`). Core and Gateway allow this single VIN endpoint anonymously. The public landing page and DMS create form use the same browser API client and Gateway origin (`dealer-web/src/api/catalog.ts`).

### Requirements

| ID | Requirement | Priority |
|---|---|---|
| VIN-01 | `GET /api/v1/vehicle-catalog/vin/{vin}` returns `vin, make, model, modelYear, bodyClass, engine, country, manufacturer`; blank vPIC values are `null` | Must |
| VIN-02 | Invalid VIN (not 17 characters, or contains I/O/Q) → **400** `VALIDATION`; vPIC has no make → **404** `NOT_FOUND`; vPIC down → **502** `CATALOG_UNAVAILABLE` | Must |
| VIN-03 | DMS create form: `Decode` fills make, model, and year only; the user can still edit them; nothing is saved until `Save`. Body class, engine, country, and manufacturer are shown, not stored (the specification's eight vehicle fields do not change) | Must |
| VIN-04 | The endpoint is anonymous (landing page demo). It reads no tenant data and writes nothing. Successful decodes are cached in memory | Must |

Open risk: an anonymous endpoint lets anyone use the server as a vPIC proxy. The in-memory cache limits repeat calls; rate limiting stays out of scope (NFR-07 Won't). Revisit if the cloud demo shows abuse.

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
| `GET /api/v1/members` | — | 200 `[{ username, displayName }]` of this dealership's active members, sorted by username; shared by the lead owner select/filter and the work-order assignee select (14 §5.6) |

Lead history is readable with `GET /api/v1/audit?entityType=LEAD&entityId=`.

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

Users register with a username they choose plus an email and/or phone, and sign in with any of the three and the password. The username is also the stable key for memberships, audit, and the JWT subject. No third-party or social-provider sign-in is built: each provider requires official app registration and review, which a student demo does not have. Accounts remain unbound until a Platform.Admin assigns them to a dealership.

### Requirements

| ID | Requirement | Priority |
|---|---|---|
| AUTH-16 | `POST /api/v1/auth/register` accepts `username` (3–64 letters, digits, `.`, `_`, `-`, at least one letter), `displayName`, password, and at least one of a valid `email` or international phone number (country code required). A duplicate username, email, or phone → **409** `USERNAME_TAKEN` / `DISPLAY_NAME_TAKEN` / `EMAIL_TAKEN` / `PHONE_TAKEN`. Full names are unique (trimmed, case-insensitive). Every error names its field in `fieldErrors` with an English message. | Must |
| AUTH-17 | `POST /api/v1/auth/login` accepts `identifier` = email, username, or phone, and the password. Order: `@` → email; else username; else phone | Must |
| AUTH-18 | A new account is active but unbound and can access no dealership data until the admin binds it | Must |
| AUTH-19 | No social-provider login buttons, routes, credentials, or integrations are present | Must |
| AUTH-20 | Admin can create an account with a username and an email and/or phone and bind it; binding an existing account never replaces its credentials | Must |
| AUTH-21 | The platform admin is seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD`; `ADMIN_EMAIL` / `ADMIN_PHONE` are optional extra sign-in names | Must |
| AUTH-22 | Local registration and first admin-created account are audited (`APP_USER`, `CREATE`, actor = the username) | Should |

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
- `/no-access`: asks the user to contact their administrator and displays the username as support information.
- Admin Members tab: pending accounts show email and phone and can be bound without changing credentials.

## 6. Image Studio (P5)

Vehicle photos with automatic enhancement. `ai-manager` and ai-service handle text only, so enhancement is image processing in dealer-core (`java.awt` / `javax.imageio`, no new dependency), not a generative model. The original is always kept.

### Requirements

| ID | Requirement | Priority |
|---|---|---|
| IMG-01 | Upload JPEG or PNG photos to a vehicle: at most 2 MB each (else **400** `VALIDATION`), at most 10 per vehicle (else **400** `VALIDATION`); other types → **415** `UNSUPPORTED_MEDIA_TYPE` | Must |
| IMG-02 | Enhance a photo with a preset: `AUTO` (auto levels / contrast stretch), `BRIGHTEN`, `SHARPEN`. The result is a JPEG at most 1600 px on the long edge; a new enhancement replaces the previous enhanced copy; the original never changes | Must |
| IMG-03 | View the original or the enhanced copy; delete a photo with a second confirmation | Must |
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

## 7. Manual acceptance

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
