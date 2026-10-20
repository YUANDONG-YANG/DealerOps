# DealerOps Requirements Specification

This document is the English counterpart of [requirements/DealerOps-Requirements-zh.html](DealerOps-Requirements-zh.html) (v1.0, 2026-10-07). Requirement IDs are identical in both documents. Sources: [requirements/DealerOps-Specification.pdf](DealerOps-Specification.pdf) (2026-09-21, authoritative for fields and business rules), `requirements/Dos Car dealership.docx` (product vision only), and [design/SCOPE-BASELINE.md](../design/SCOPE-BASELINE.md) (course scope and errata; decides conflicts). Per-topic analysis lives in [requirements/analysis/](analysis/). Sign-off status: KAN-5 client/instructor confirmation is still open.

**Conflict priority:** course PPT hard items > specification PDF fields > v6 design > UI conventions. There are two exceptions. Authentication remains password-based, and on 2026-10-08 the user chose email, username, or phone as the sign-in name (erratum 1). Since 2026-10-07, the PPT containerization item has been dropped in favor of Terraform + App Service (erratum 5).

**Priority labels:** Must = explicitly required by a source. Should = needed by the implementation, not stated in the sources. Could = only if time allows. Won't = not in this release.

## 1. Overview and scope

Dealer Ops is a multi-tenant platform for independent used-car dealers in Ontario. One platform admin opens dealerships and issues logins. Every staff account of a dealership shares that dealership's data. DMS (vehicles), CRM (customers) and Ad Compliance are three front-end entry points on one back end and one database. Ad checks read DMS vehicle data and the dealer profile directly, so nothing is entered twice.

**In scope:**
- Tenant isolation, with the admin seeing no business data.
- The spec PDF vehicle fields, VIN unique per dealer, paired sell, and purchase fields locked after sale.
- CRM name / email / phone / address, with one customer per vehicle.
- OMVIC fixed rules plus a real AI review, then Ready + TXT export.
- An audit trail for DMS/CRM.
- A read-only AI assistant.
- Password sign-in (email, username, or phone) with two roles.
- Browser traffic only through the gateway.

**Feature extensions** ([design/21-Feature-Extensions.md](../design/21-Feature-Extensions.md)): VIN decode, lead follow-up, reconditioning work orders, email/phone self-registration and sign-in, Image Studio.

**Out of scope:**
- Sales funnel reports, vehicle archive states and garage/service billing.
- Buyer site, public inventory and inquiry forms.
- KPI dashboard and CSV import.
- Third-party ad publishing, payments and contracts.
- OCR.
- Extra vehicle fields such as mileage, color, fuel, stock number and list price.
- Message queues, a second database and vector stores.
- Rate limits, throughput SLOs and PIPEDA retention.

**Classroom demo storyline:**
1. Two dealers, each with one staff member, cannot see each other's data.
2. The admin is refused on the vehicle API.
3. An ad with a missing price, or a finance ad with no APR, is blocked.
4. One real ad goes through the real model.
5. After a price change, the old check can no longer be exported.

## 2. Roles, permissions and tenancy

| Role | Code | Count | Belongs to |
|---|---|---|---|
| Platform admin | `Platform.Admin` | One. It is seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD` on first start, and no API creates admins | No dealership |
| Dealer user | `Dealer.User` | N per dealership | Exactly one dealership |

All dealer users have the same permissions; the sources do not distinguish manager from sales. The two roles are mutually exclusive.

| Operation | Admin | Dealer user (own dealer) | Dealer user (other dealer) |
|---|---|---|---|
| Create and list dealerships | ✓ | ✗ | ✗ |
| Create, list and remove logins | ✓ | ✗ | ✗ |
| Vehicles: add, edit, view | ✗ | ✓ | ✗ (looks like not found) |
| Customers: add, edit, view | ✗ | ✓ | ✗ |
| Ad check and AI assistant | ✗ | ✓ | ✗ |
| Audit history | ✗ | ✓ | ✗ |

| ID | Requirement | Priority |
|---|---|---|
| AUTH-01 | Only two roles: platform admin and dealer user | Must |
| AUTH-02 | Admin creates a dealership with at least a registered name, phone, email and address. The ad rule for dealer name and contact uses these fields | Must |
| AUTH-03 | Admin creates a dealership login with username, display name, temporary password (at least 8 characters), and an email and/or phone. One login belongs to one dealership | Must |
| AUTH-04 | Admin lists a dealership's logins | Must |
| AUTH-05 | Admin removes a login, and its business access ends immediately. Removal is a soft unbind: the account and its history stay. A removed user can still sign in but sees only the no-access page | Must |
| AUTH-06 | All logins of one dealership read and write the same data. A vehicle added by staff A is visible to staff B at once | Must |
| AUTH-07 | A dealer user never sees another dealership's data. Another dealer's record id returns 404, so the response does not reveal whether the record exists | Must |
| AUTH-08 | The admin gets 403 on every business endpoint, and the response carries no business fields | Must |
| AUTH-09 | The server derives the dealership from the signed-in identity and ignores any client-supplied `dealerId` | Must |
| AUTH-10 | Dealer users cannot create or remove logins | Must |
| AUTH-11 | Each person signs in with their own email, username, or phone and password (one account per staff member); accounts are not shared | Must |
| AUTH-12 | Passwords are stored as salted BCrypt hashes. A successful login issues a JWT that carries the role | Must |
| AUTH-13 | A signed-in user with no dealership gets 403 on business endpoints | Should |
| AUTH-14 | A username has at most one active dealership binding. A duplicate binding, or a username that belongs to the admin, returns 409 `DUP_MEMBER` | Should |
| AUTH-15 | The platform-admin account is seeded from environment variables on first start; self-registration can only create Dealer.User accounts that await admin binding | Should |

**Account lifecycle:**
1. The admin creates a dealership.
2. The admin binds staff to it (username, email and/or phone, temporary password).
3. Staff sign in and use their dealership's data.
4. When the admin unbinds a staff member, that person gets 403 on business endpoints.

Rules that follow from this:
- Audit records keep the actor's username after the login is removed.
- Removing a dealership's last login keeps its data, and new logins can be bound later.
- Re-binding to the same dealership reactivates the existing binding and resets the temporary password. Binding to a different dealership creates a new binding row.

## 3. DMS (vehicles)

| # | Field | API code | Required | Validation |
|---|---|---|---|---|
| 1 | Make | `make` | ✓ | 1–50 characters, trimmed |
| 2 | Model | `model` | ✓ | 1–50 characters, trimmed |
| 3 | Year | `modelYear` | ✓ | Integer from 1900 to current year + 1 |
| 4 | VIN | `vin` | ✓ | 17 characters, upper case, no I/O/Q; unique per dealership |
| 5 | Source | `source` | ✓ | `TRADE_IN` / `AUCTION` / `PRIVATE_PURCHASE` / `OTHER` |
| 6 | Purchase cost | `purchaseCost` | ✓ | ≥ 0, two decimals, CAD |
| 7 | Date added | `addedOn` | ✓ | Not in the future |
| 8 | Condition | `conditionCode` | ✓ | `CERTIFIED` / `AS_IS` / `UNFIT` / `IRREPARABLE` |
| 9 | Repair cost | `repairCost` | — | ≥ 0 |
| 10 | Carfax URL | `carfaxUrl` | — | http(s), at most 500 characters |
| 11 | Sold date | `soldOn` | — | On or after the date added, not in the future |
| 12 | Sold price | `soldPrice` | — | > 0 |

System fields: `id`, `dealerId`, `status`, `version` (optimistic lock), `createdAt`, `updatedAt`. No other vehicle fields are added.

There are two statuses, `IN_STOCK` and `SOLD`, and the server derives them. A vehicle is `SOLD` when both sold fields are set. A sale cannot be undone in this release.

| ID | Requirement | Priority |
|---|---|---|
| DMS-01 | Add a vehicle. All 8 required fields must be present, with an error per field | Must |
| DMS-02 | Repair cost and Carfax URL are optional on create. Sold date and sold price are optional fields entered only through the sell action, and must be sent together (DMS-10) | Must |
| DMS-03 | VIN is unique per dealership; a duplicate returns `VIN_DUP`. Two dealerships may hold the same VIN | Must |
| DMS-04 | VIN is upper-cased and must be 17 letters or digits with no I/O/Q | Should |
| DMS-05 | Source and condition are drop-downs that accept only the enum values | Must |
| DMS-06 | The list is paged (10 per page), newest first | Must |
| DMS-07 | Keyword search on VIN / make / model, plus filters on status and condition | Should |
| DMS-08 | The detail view shows all fields, the linked customer and the audit history | Must |
| DMS-09 | Every non-sold field of an in-stock vehicle can be edited; the sold fields are set only by the sell action | Must |
| DMS-10 | Sold date and sold price are entered together. Sending only one returns `SOLD_PAIR_REQUIRED` | Must |
| DMS-11 | After sale, these purchase fields are locked: make, model, year, VIN, source, purchase cost, date added, repair cost and Carfax. A change returns `SOLD_LOCKED` | Must |
| DMS-12 | A sold vehicle cannot be sold again; a second sale returns `SOLD_LOCKED` | Must |
| DMS-13 | Writes carry `version`. A mismatch returns `VERSION_CONFLICT`, and the UI asks the user to refresh | Should |
| DMS-14 | Create, edit and sell each write an audit record | Must |
| DMS-15 | Changing the condition turns a passed ad check into Stale. Other vehicle or dealer fields do not | Must |
| DMS-16 | The detail view may show profit (sold price − purchase cost − repair cost). It is not stored | Could |
| DMS-17 | Soft delete vehicles from active inventory while retaining sales, work-order, and audit history | Must. Implemented through `DELETE /api/v1/vehicles/{id}` and the DMS detail flow. |

**Edge cases:**
- Year = current + 1 is accepted; current + 2 is rejected.
- A purchase cost of 0 is accepted.
- Selling below cost is allowed.
- An `IRREPARABLE` vehicle can be added and sold, but its ad must disclose the condition.

## 4. CRM (customers)

| # | Field | API code | Required | Validation |
|---|---|---|---|---|
| 1 | Name | `name` | ✓ | 1–100 characters |
| 2 | Email | `email` | ✓ | Email format, at most 254 characters, stored lower case |
| 3 | Phone | `phone` | ✓ | 7–20 digits; `+ - ( )` and spaces allowed; at most 40 characters in total |
| 4 | Home address | `homeAddress` | ✓ | 1–300 characters, one text box |
| 5 | Purchased vehicles | `linkedVehicles` (response; set via `/customers/{id}/vehicles`) | — | Multi-select links to this dealership's DMS vehicles (optional: a customer may be entered before buying) |

**Link rules:**
- One customer can have N vehicles, and one vehicle has at most one customer.
- Only vehicles of the same dealership can be linked. A vehicle can be in stock or sold, as long as no customer has it yet.
- A sold vehicle's link cannot be removed.

| ID | Requirement | Priority |
|---|---|---|
| CRM-01 | Add a customer. All four fields are required, with an error per field | Must |
| CRM-02 | Edit the four fields | Must |
| CRM-03 | The list shows 10 per page, with search on name / email / phone | Must |
| CRM-04 | The detail view shows the customer, the linked vehicles (year make model, VIN, status) and the audit history | Must |
| CRM-05 | Link an unlinked vehicle of this dealership (in stock or sold) from the customer detail | Must |
| CRM-06 | The link picker lists only vehicles that can be linked: none from other dealerships and none already linked | Must |
| CRM-07 | Linking a vehicle that belongs to another customer returns `VEHICLE_ALREADY_LINKED` | Must |
| CRM-08 | An in-stock vehicle can be unlinked. Unlinking a sold vehicle returns `SOLD_LOCKED` | Must |
| CRM-09 | Another dealership's customer or vehicle id returns 404. Unlinking a link that does not exist also returns 404 | Must |
| CRM-10 | Vehicle detail and customer detail link to each other | Should |
| CRM-11 | Create, edit, link and unlink each write an audit record | Must |
| CRM-12 | A customer's phone, email and address never reach AI prompts, audit summaries or assistant answers | Must |
| CRM-13 | A duplicate email in the same dealership shows a warning but is saved | Could |
| CRM-14 | Soft delete customers from active CRM lists while retaining sales and audit history | Must. Implemented through `DELETE /api/v1/customers/{id}` and the CRM detail flow. |
| CRM-15 | Sales funnel reports | Must. Implemented on `/reports/sales-funnel`: current stage distribution, open pipeline and won rate over closed leads, plus vehicle sales (units, revenue, gross profit, days to sell, last 12 sales months). Lead-stage history trends are not included. |

## 5. Ad compliance (OMVIC)

"Publish" means marking the ad Ready and exporting it as TXT. There is no external platform and no buyer page. The check reads the title, the body, the DMS vehicle, the public dealer profile and the salesperson's checklist answers (prior-use category, extended-warranty terms when offered, annual lease kilometre allowance; PDF §5). No vehicle fields are added.

The ad belongs to one vehicle of the dealership, and each vehicle has one ad. An empty draft can be saved but cannot pass. The kind is `CASH` / `FINANCE` / `LEASE`, and the medium is `ONLINE` / `RADIO_TV_BILLBOARD`.

The rule IDs are AD-R01 to R08, R10 to R14 and R20 to R25. There is no R09 and no R15–R19. BLOCK is a hard stop that prevents Ready and export. REVIEW is advisory only.

| ID | Check | Result |
|---|---|---|
| AD-R01 | Dealer registered name missing | BLOCK `DEALER_NAME_MISSING` |
| AD-R02 | Dealer contact | All missing: BLOCK `DEALER_CONTACT_MISSING`. Some missing: REVIEW `DEALER_CONTACT_INCOMPLETE` |
| AD-R03 | Hint of prior use (police / emergency, taxi / limousine, daily lease / rental) without a clear disclosure | REVIEW `PRIOR_USE_UNCLEAR` |
| AD-R04 | Copy says new (brand new / never used / 0 km / new car) but the model year is ≤ current year − 2 | REVIEW `YEAR_NEW_USED_CONTRADICTION` |
| AD-R05 | Year not in the copy | REVIEW `YEAR_NOT_IN_COPY` |
| AD-R06 | Warranty claim present (extended warranty, warranty included, free warranty) | REVIEW `WARRANTY_CLAIM_NEEDS_REVIEW` |
| AD-R07 | Price missing | BLOCK `PRICE_MISSING` |
| AD-R08 | Condition | "Certified" on a vehicle that is not certified: BLOCK `CONDITION_MISMATCH`. `AS_IS` / `UNFIT` / `IRREPARABLE` not stated: BLOCK `CONDITION_UNDISCLOSED`. Certified vehicle with no certified wording: REVIEW `CERTIFIED_NOT_IN_COPY` |
| AD-R10 | Finance-triggered ad without APR | BLOCK `FINANCE_APR_MISSING` |
| AD-R11 | APR placement (online) | REVIEW `FINANCE_APR_PROXIMITY`, raised on every online finance-triggered ad. Not checked for `RADIO_TV_BILLBOARD` |
| AD-R12 | Finance term missing | REVIEW `FINANCE_TERM_MISSING` |
| AD-R13 | Cash price / cost of borrowing | Covered by R07; there is no separate rule |
| AD-R14 | Broadcast exemption | Exempts R11 only. Price and APR are still required, and a missing term is still an R12 hint |
| AD-R20 | Lease ad does not say it is a lease | BLOCK `LEASE_STATEMENT_MISSING` |
| AD-R21 | Lease term missing | REVIEW `LEASE_TERM_MISSING` |
| AD-R22 | Lease payment missing | REVIEW `LEASE_RENT_MISSING` (R07 still applies) |
| AD-R23 | Lease APR missing | BLOCK `LEASE_APR_MISSING` |
| AD-R24 | Lease down payment missing | REVIEW `LEASE_DOWN_MISSING` |
| AD-R25 | Annual km allowance | Below 20,000 with no excess-km charge: BLOCK `LEASE_EXCESS_KM_MISSING`. 20,000 or more: nothing required. No allowance stated: REVIEW `LEASE_ALLOWANCE_UNSTATED` |

An ad is **finance-triggered** when its kind is `FINANCE`, or its kind is `CASH` and the title or body matches an APR or a payment amount pattern (an amount per month, bi-weekly or per week). `LEASE` ads use the lease rules instead.

**Check flow and states:**
- Before any check, the state is `NEEDS_AI`.
- When a check runs, any BLOCK hit makes the state `BLOCKED` (HTTP 200) and AI is not called.
- If there is no BLOCK hit, the real AI is called with a 15 s timeout.
  - On success, the state is `PASSED`, and the REVIEW hints and AI notes are kept.
  - On timeout or error, the state is `AI_UNAVAILABLE` and the public API returns 502.
- When something triggers invalidation, a `PASSED` check becomes `STALE`, and any other result goes back to `NEEDS_AI`.
- What triggers invalidation: a change to the ad title, body, kind or medium (a price edit in the body counts; in practice any saved ad edit bumps the content version), or a change to the vehicle condition.
- Ready and export require `PASSED` on the current content version. Otherwise they return `NOT_PASSED` or `CHECK_STALE`.
- `PASSED` means the demo hard rules passed and the AI answered. It is not legal or OMVIC approval, and AI notes never veto Ready.

| ID | Requirement | Priority |
|---|---|---|
| AD-01 | Create and edit one ad draft per vehicle of the dealership | Must |
| AD-02 | Show a checklist for the chosen kind and medium, and collect the salesperson's answers that the copy cannot prove: prior-use category, extended-warranty terms (when offered) and annual lease kilometre allowance. The answers are saved with the ad and feed the check | Must |
| AD-03 | Run the BLOCK / REVIEW rules and store results with reason codes | Must |
| AD-04 | Trigger the rules by kind, by medium and by APR / payment patterns in `CASH` copy. `LEASE` uses the lease rules | Must |
| AD-05 | Year and condition come from DMS | Must |
| AD-06 | Dealer name and contact come from the dealer profile | Must |
| AD-07 | A hard-rule hit skips AI and returns `BLOCKED` | Must |
| AD-08 | A real AI reviews the copy, and its notes do not block | Must |
| AD-09 | An AI timeout or failure is stored as `AI_UNAVAILABLE` and never shown as passed | Must |
| AD-10 | Store the time, the result and the checked content version of every check | Must |
| AD-11 | Editing the ad or changing the condition invalidates an earlier pass | Must |
| AD-12 | Ready and export require a pass on the current version | Must |
| AD-13 | The TXT file holds the dealer's name and contact, the vehicle's year / make / model / VIN / condition / source, the title, the body and the check time. It holds no customer data and no cost | Must |
| AD-14 | A dedicated disclaimer screen. It is deferred: the result panel shows a one-line disclaimer, and the limit is explained orally at the defense | Won't |
| AD-15 | Configurable rules or a rule editor; the rules stay in `OmvicRuleEngine` | Must. Platform admins can enable/disable rules, change severity and message; changes stale prior checks. |
| AD-16 | Marketplace publishing workflow | Must. For the student capstone, demonstrate target selection and publish/unpublish status using an explicitly labeled browser simulation; do not claim an external listing was created. A live connector requires an approved marketplace API/feed and dealer authorization. |
| AD-17 | Image Studio (superseded by IMG-01–05 in design/21-Feature-Extensions.md) | Must |

## 6. Read-only AI assistant

The spec PDF has no such page. It is added by scope erratum 2 to meet the course requirement for a real AI core feature.

| ID | Requirement | Priority |
|---|---|---|
| AI-01 | Ad compliance uses a real LLM review, not a simulated one | Must |
| AI-02 | AI calls time out after 15 s, and a failure is never shown as passed | Must |
| AI-03 | Read-only Q&A inside the dealership. It finds this dealership's vehicles, customers and ad listings (with check status) by keyword (make, VIN, customer name, and so on), supports deterministic aggregate counts for vehicles, customers and listing check statuses, and returns up to 5 resource cards with a short answer. Counts come from the complete tenant-scoped query, never from the truncated cards. When the model is unavailable, the cards are still returned. It never writes to the database | Must |
| AI-04 | The assistant sees only this dealership's data. Answers contain no purchase cost and no customer phone, email or address | Must |
| AI-05 | AI notes come back as an array, each with at least a `message`. Rule codes (`ruleId`) and severity (BLOCK / REVIEW) belong to rule results and are shown apart from AI notes | Should |

## 7. Cross-cutting requirements

| ID | Requirement | Priority |
|---|---|---|
| AUD-01 | Audit vehicle create, edit and sell | Must |
| AUD-02 | Audit customer create, edit, link and unlink | Must |
| AUD-03 | Each record holds the actor (username), the action (`CREATE` / `UPDATE` / `SELL` / `LINK` / `UNLINK`), the time (stored in UTC, shown in local time) and the entity type and id | Must |
| AUD-04 | Record a summary of the changed fields. For customer phone, email and address, record only the field name, never the value | Should |
| AUD-05 | The audit trail is append-only | Must |
| AUD-06 | Vehicle and customer detail views show their history, newest first | Must |
| AUD-07 | Audit and business writes happen in the same transaction | Must |
| AUD-08 | Admin dealership and account (membership) operations are audited (already implemented) | Could |
| AUD-09 | Ad check results are kept as check history (AD-10), not as audit records | Should |
| ARC-01 | DMS, CRM and ads are three front ends over one back end and one database | Must |
| ARC-02 | The ad check reads DMS and dealer data directly | Must |
| ARC-03 | The browser reaches the back end only through the gateway. Direct access to core or ai-service fails | Must |
| ARC-04 | Four apps: `dealer-web`, `dealer-gateway`, `dealer-core`, `ai-service` | Must |
| ARC-05 | Synchronous REST and one MySQL 8 database, with no message queue | Must |
| ARC-06 | APIs live under `/api/v1`, and the error body is `{code, message}` | Must |
| ARC-07 | Terraform deploys the three .NET 10 services as zip packages on Azure App Service and the built React front end on an App Service web app; CI compiles and validates, and `deploy/deploy.sh` publishes (optionally loading demo data with `--seed`). Course reviews 2 and 3 are demonstrated in the cloud. There are no containers (erratum 5) | Must |
| SEC-01 | Passwords are BCrypt-hashed on the server and never logged or exposed to the front end | Must |
| SEC-02 | The gateway and core both validate the JWT signature, issuer, audience and expiry. The gateway rejects unknown roles, and core authorizes by role (admin ↔ staff crossover returns 403) | Must |
| SEC-03 | HTTPS everywhere in the cloud | Must |
| SEC-04 | Secrets (database password, JWT signing key, AI key) stay out of the repository | Must |
| SEC-05 | Every business query is filtered by dealership in the data layer | Must |
| SEC-06 | Ad copy is passed to AI as data, so prompt injection cannot change the verdict | Should |
| SEC-07 | Customer personal data is never sent to AI and never written to audit as a value | Must |
| NFR-01 | Lists default to 10 per page | Must |
| NFR-02 | Money is shown in CAD with two decimals, and dates as `YYYY-MM-DD` | Should |
| NFR-03 | The UI language is English | Should |
| NFR-04 | Database backup policy (MySQL Flexible Server keeps backups for 7 days) | Should |
| NFR-05 | Custom domain. It is not configured yet; the default Azure host names are used | Should |
| NFR-06 | Desktop first, usable at phone width | Could |
| NFR-07 | Rate limits, throughput SLOs and PIPEDA retention | Must. Gateway per-client limits with 429 `RATE_LIMITED` (design/19 §1.5.1); SLO targets (design/20 §6); deleted-customer anonymization and retention table (design/15 §8.6). Default values are configurable and await the dealership's confirmation. |
| NFR-08 | After every deploy, the release time (UTC) of all four apps is visible. Each Java service logs one startup line. The Swagger description shows dealer-core's time. The bottom left of every web page lists web / gateway / core / ai, read from the gateway's anonymous `GET /actuator/release`. The deploy step stamps `PUBLISHED_AT`; without it, the build time is used ([design/20-Observability.md](../design/20-Observability.md) §5) | Must |

## 8. Pages

| Page | Route | Access | Key requirements |
|---|---|---|---|
| Landing | `/` | Public | Product landing with `Sign in`, `Create account`, and anonymous VIN decode; signed-in users go to their role landing |
| Login / registration | `/login`, `/register` | Public | Email, username, or phone + password; unbound accounts wait for admin binding |
| Admin | `/admin` | Admin | Dealership list: name, contact, staff count (UI-10). Create a dealership (UI-11). List and bind staff (username, display name, email and/or phone, temporary password), with confirmation before unbinding (UI-12). **Pending accounts** binds self sign-ups without a password. No vehicle, customer or ad entry points (UI-13) |
| DMS | `/dms` | Dealer user | List columns: year make model, VIN, source, condition, cost (CAD), date added, status, with search, filters and paging (UI-20). Add and edit with `*` on required fields, client-side validation and per-field server errors (UI-21). Detail with all fields, the customer, the ad check status and the history (UI-22). Sell as a separate action that takes the date and the price together (UI-23). Locked fields are read-only after sale (UI-24). VIN `Decode` prefills make/model/year; the drawer adds **Work orders** (open count in the list; selling is blocked while any are open) and **Image Studio** photos with Auto fix / Brighten / Sharpen ([design/21](../design/21-Feature-Extensions.md)) |
| CRM / leads | `/crm`, `/leads` | Dealer user | CRM retains customer management and adds customer-linked leads; `/leads` supports follow-up pipeline, assignments, due dates, and append-only notes |
| Ads | `/ads` | Dealer user | Pick a vehicle, edit title / body / kind / medium, and view the checklist and answer its prior-use, warranty and lease-kilometre fields (UI-40). DMS and dealer values shown (UI-41). A Check button with a loading state of up to 15 s (UI-42). A ✅ / ❌ / ⚠️ result per rule (UI-43). Status badges: Needs AI review / Blocked / AI unavailable / Passed / Stale (UI-44). Ready and Export TXT are enabled only when the ad is passed and not stale (UI-45). A one-line disclaimer, with the dedicated screen deferred (UI-46) |
| Assistant | floating panel on staff pages (no route) | Dealer user | An input box and answers with vehicle / customer cards (UI-50). A clear read-only notice (UI-51) |

## 9. Open items

- **Assumptions (Q-01..Q-15 in the Chinese document §11.2):**
  - The four fixed source values.
  - Purchased vehicles are optional.
  - Linking and selling are two separate steps.
  - A sale cannot be undone, and vehicles and customers cannot be deleted.
  - Price, new/used and prior use are judged from the ad copy only.
  - Exactly 20,000 km/year needs no excess-km disclosure.
  - One ad per vehicle.
  - Only changes are audited, not views.
  - One admin.
  - Rules live in code.
- **Questions waiting for the client or instructor:**
  - Should the sale be completed in CRM or in DMS?
  - May DMS add a list-price field and a new/used field?
  - Does a vehicle advertised both online and on a billboard need two ads?
  - Is an undo-sale demo needed?
  - Are the four dealer profile fields (legal name, phone, email, address) enough, and is an OMVIC registration number needed?
  - Written sign-off is still needed on password-based authentication with email, username, or phone sign-in names (KAN-5), and, per erratum 5 in the change log, on dropping containers.
