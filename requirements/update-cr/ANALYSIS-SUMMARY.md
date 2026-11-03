# Change-request synthesis

Source notes: `requirements/update-cr/analysis/01-change-inventory.md` through `requirements/update-cr/analysis/10-design-and-code-impact.md`.

Those notes read `requirements/update-cr/Changes Document.docx` (Jackson Warga, 2026-11-03). This file synthesizes them for a student capstone that must cut scope. It does not add requirements the notes do not support. Where the notes disagree, both readings are kept and named by file. No reading is chosen here.

## 1. Document identity

| Field | What file 01 records |
| --- | --- |
| File | `requirements/update-cr/Changes Document.docx` |
| Author | Jackson Warga, creator and last modifier in the core properties. The body does not name an author. It uses first person ("I"). |
| Date | Not in the body. Core properties: created 2026-11-03T10:54:00Z, modified 2026-11-03T14:34:00Z. |
| Title and version | Title is empty. Core property `revision` is 1, a file-revision count, not a document version. Subject, description, keywords, and company are empty. |
| Size | 27 pages, 1,926 words, 10,983 characters. Word application, template `Normal.dotm`. |
| Structure | Two Heading 1 sections and no Heading 2. Each heading is followed by a subtitle paragraph. No tables. 70 pictures. Screenshots illustrate current screens. They are not separate requirements. |
| Item count | 68 items, CR-001 through CR-068, assigned by file 01. The document does not number them and does not classify them as new, modified, removed, or clarified. |

**Client Requests** (CR-001–CR-020). Subtitle: the client requested these directly; they are urgent and must be completed first. Order in the body: DMS sold columns; sell-vehicle menu; sales report and dashboard; manager staff actions and a members column; home-page account creation; an optional dealership-admin role and a privilege order; sortable columns by screen.

**Site Fixes and Changes** (CR-021–CR-068). Subtitle: issues found on the site and things the author believes should change. Less urgent than the client requests, and still to be implemented, especially the fixes. Order in the body: full-name uniqueness; missing confirmations; join-request tables; activity-log labels, search, and column order; search-box adjustments; leads, CRM, and DMS behavior; profile and staff-account labels and errors; platform-admin account, audit, dealership, and user actions; home page, shop, and buyer-site changes.

The document never uses deprecate, sunset, migration, or out of scope (file 04). There is no deprecation window, feature flag, or data-migration step. The only interim instruction is the home-page Create account button.

## 2. How to read this pack

Read file 01 for what the document says, then use files 02–08 to see whether that sentence is new, a change, a removal, a stored fact, an auth rule, a screen, or an API. Use file 09 before estimating, and file 10 for design-doc and code impact. Do not treat an **INFERRED** note in files 05 or 08 as a client requirement. Do not treat a screenshot as a requirement unless a sentence states the same fact. File 09 says the figures are evidence of the current screens, not target mockups, and that the caption "Where columns should go" does not mark an insertion point.

| File | Question it answers |
| --- | --- |
| `requirements/update-cr/analysis/01-change-inventory.md` | What does the document say, item by item, with no comparison to the product? |
| `requirements/update-cr/analysis/02-new-capabilities.md` | Which statements are new capabilities, and are they already specified, in conflict, or silent? |
| `requirements/update-cr/analysis/03-modified-behavior.md` | Which existing behaviors does the document change, in its own words? |
| `requirements/update-cr/analysis/04-removals-and-deprecations.md` | What is removed, replaced, deferred, or optional? |
| `requirements/update-cr/analysis/05-data-model.md` | Which stored facts are implied, and which already exist? |
| `requirements/update-cr/analysis/06-auth-roles-tenancy.md` | Who may do what, against the current roles, tenancy, and auth rules? |
| `requirements/update-cr/analysis/07-workflows-and-ui.md` | Which existing screens change, and which UI conventions clash? |
| `requirements/update-cr/analysis/08-api-and-integrations.md` | What HTTP contract, integration, and gateway work follows? |
| `requirements/update-cr/analysis/09-gaps-risks-ambiguities.md` | What is ambiguous, contradictory, or too large to build before a decision? |
| `requirements/update-cr/analysis/10-design-and-code-impact.md` | Which design docs and code move, how large is each item, and in what order? |

## 3. Client requests versus author suggestions

Do the client section first. The author section is lower urgency. File 09 does not decide which of those sentences are acceptance criteria. Its C-01 and C-10 leave that as a question: section 1 says the client items must be completed first, and the same section defers two of them; section 2 says "especially the fixes," then writes most items as suggestions ("I suggest," "I feel," "If possible").

### Client requests (CR-001–CR-020)

Urgent, and named as client requests in file 01:

| Items | Request | What the notes already limit |
| --- | --- | --- |
| CR-001 | DMS columns: Sold by, Sold to, Date sold. | Sold by is new data. Sold to and Date sold are mostly columns on facts that exist. See §4 and §5. |
| CR-002 | Sell menu also shows cost, work-order spend, and list price. | The amounts exist. Which work-order figure to show is not settled. See §4. |
| CR-003, CR-004 | Sales report and the dashboard Sales section offer current day, week, month, and year. | No period parameter exists today. Measures are not named. |
| CR-005 | A list of all sales employees and their sales metrics. | Metrics, the employee set, and the page are not named. Not a new role (file 05). |
| CR-006 | A manager may promote other staff to managers. | Conflicts with platform-admin-only role changes. Demotion is not requested. |
| CR-007 | A manager may edit certain employee information. | Fields are not listed. Not specific enough to implement (file 02). |
| CR-008 | Members section shows when the member joined. | Sort list later says "Date Added (when added)." File 01 does not say those are the same column. |
| CR-009 | Home-page account creation should become a dealership inquiry. | **Interim scope:** removing the Create account button on the home page will suffice. A different account-creation method still needs a client discussion. Do not design the inquiry in this pass (files 01, 04, 08, 10). |
| CR-010 | A dealership-specific admin, owner, or regional-manager account, with some admin capabilities limited to one dealership. | **Optional.** The document says discuss it before full implementation. **Do not build this role until the client confirms it** (files 01, 04, 09, 10). Privilege order stated with it, most to least: platform admin; that dealership role; dealership manager; dealership staff; user not logged in. The ladder omits the unbound signed-in account, which exists today (file 06). |
| CR-011–CR-020 | Named columns are sortable on DMS, Leads, Team Members, Team Activity, Team Join Requests, platform audit, Ad Rules, Pending accounts, platform Members, and manager audit menus. | The client named DMS columns. The author added the other screens and wrote that further sortable columns may be added. That invitation is not a requirement (files 01, 02, 09). Sold by, Sold to, and Date sold are not in the DMS sort list. |

### Author suggestions (CR-021–CR-068)

Lower urgency. Fixes the author marks as fixes: shared full names must not block account create (CR-021, three named places, and "there may be more"); confirmation when a menu holds unsaved data or a change is saved, including dealership profile and closing a lead (CR-022–CR-024); label display name as full name (CR-053); a readable error for an illegal staff username (CR-054).

The rest of the section is the author's changes. Grouped so the team can cut them:

- **Search and form layout.** Remove DMS Make and Model boxes; typeable Year; Stock # box; split Add Vehicle brands; limit model years, or only common vehicles if full coverage is too hard; move the VIN box; search vehicles with open work orders; Customer and Vehicle of interest should work like the leads menu (the page is not named); partial user search on team activity; lead owner defaults to the creator; vehicle-name search on leads; customer-name list updates while typing.
- **Leads and CRM.** Reopen a closed lead; replace the CRM vehicles-purchased column with the customer's leads; add a lead from the customer menu; notes on the customer; confirm before creating a customer that matches name, email, phone, or address; customer phones are not exclusive; block a second lead for the same customer and vehicle; selling a vehicle closes the related leads with an unnamed label; show leads on the vehicle, with a possible lead-count column.
- **Vehicle checks and sale.** VIN must match vehicle information; Carfax URL is exclusive and must be a real Carfax link; a sale must link to a customer, or Other plus a typed buyer.
- **Platform admin.** Do not bind an account directly; send a join request instead. Remove pending accounts. Edit a pending account's email, phone, and username. Delete a dealership, and delete a user, each with at least one extra confirmation. Edit some account information, such as email or phone. Align admin-audit search with the team-activity search ideas.
- **Public pages.** Sample ads should link to sign-up. Say more prominently that the home page is for dealerships. Shop page should not say "used." Search dealerships and show address and some contact on each card. Back button and inventory search on the buyer site. Show the ask-about-vehicle character limit as the text gets closer.

File 01 records author caveats that keep this section unbounded: the confirmation screens and search boxes may be incomplete; extra sortable columns are invited; model-year filtering may be limited to common vehicles; the lead-count column is possible, not required. File 04 says new delete actions, reopen, and tighter sale rules are not removals of current features. No stored field is dropped by name. No existing role is removed.

## 4. Already modeled or already in the contract

Do not rebuild these. The change is a column, a label, a filter, or a rule on rows the design already stores. Citations are the design docs the analysis files cite.

| Request | Already stored or already returned | What is still missing |
| --- | --- | --- |
| Date sold | `sold_on` / `soldOn`, set by sell and returned on the vehicle (`design/14-Backend-API-Contract.md` §4.1; `design/15-Data-Auth-and-Gateway.md` §3.3; requirements DMS-02, DMS-10). | The DMS list does not show it (`design/12-Frontend-UI-Conventions.md` §2). |
| Cost | `purchase_cost` / `purchaseCost` on the vehicle (`design/14-Backend-API-Contract.md` §4.1). | Sell-menu display. The document does not rename the field. |
| List price | `list_price` / `listPrice` on the vehicle. | Sell-menu display. |
| Work-order spend | Each work order stores `cost`. Completing a work order adds that cost into vehicle `repairCost` (`design/21-Feature-Extensions.md` WO-04; `design/14-Backend-API-Contract.md` §4.7). The open-work-order count is already on the vehicle (`design/21-Feature-Extensions.md` WO-07). | Which figure the sell menu shows. See the disagreement below. No snapshot column (file 05). Selling stays blocked while a work order is `OPEN` or `IN_PROGRESS`; the document does not change that. |
| Member join date | `membership.created_at` is when the membership row was created (file 05). Pending "Registered" is account `created_at` (`design/14-Backend-API-Contract.md` §3.8). Role and Source are already on `GET /api/v1/members`. | The members list does not return a join time (`design/14-Backend-API-Contract.md` §5.6). |
| Join-request history | Notification kind `JOIN_REQUEST` already stores requested time, resolved time, resolver, and `resolved_action` of `APPROVED`, `REJECTED`, or `CANCELLED` (`design/14-Backend-API-Contract.md` §5.7). The pending list is `GET /api/v1/dealer/join-requests`. History is `GET /api/v1/dealer/notifications?includeResolved=true`. | A past table on Team > Join requests. The document's past list is approved or rejected only; `CANCELLED` is also stored (file 05). |
| Stock-number search | List search `q` matches `stockNumber` (`design/14-Backend-API-Contract.md` §4.1; `design/21-Feature-Extensions.md` DMS-18). | A separate box, if the team still wants one. It can send `q`. A stock-number-only parameter is not required (file 08). |
| Platform admin and dealership business data | Platform admins already cannot read or write dealership business data. Business URLs return **403** with no business fields (`design/14-Backend-API-Contract.md` §1.3 and §4; `design/15-Data-Auth-and-Gateway.md` §2.1 and §2.4; `design/00-Current-Development-Design.md`; `design/SCOPE-BASELINE.md`). | The document's remedy is different: stop direct bind and send a join request instead. That is new. The admin can still set or reset a password and then sign in as that dealer user (file 06). |

**Readings that disagree**

- **Join date.** File 05 treats the members column as `membership.created_at` (already modeled; the list column is missing). File 06 says the team must choose membership start or account `created_at`, and that pending "Registered" is registration time, not the membership start. File 09 A-05 asks the same question. This synthesis does not choose.
- **Join-request history.** File 02 says the pending list is already specified and that resolved history is already on the notification feed, so the second table is silent. File 06 says the Team page already loads that history (`design/13-Frontend-Engineering.md` §2) and that two tables only extend the layout. File 07 and file 10 say the Team page already renders one table with Status and Resolved, so a tab split can be React-only **if** that payload includes resolved rows. File 08 says `GET /api/v1/dealer/join-requests` is pending only, that the document's "lists every request" does not match the contract, and that the past table is a contract change. File 05 says this needs a history view, not a new table.
- **Work-order figure.** Files 02, 05, and 09 keep the document's phrase "total number spend": it can be a count or a sum, and it does not say which statuses count. File 07 paraphrases it as "total amount spent." Files 08 and 10 add that `repairCost` is also editable by hand, so it is not guaranteed to equal the sum of work-order costs. File 10 sizes a display of `purchaseCost`, `repairCost`, and `listPrice` as small, and a separate sum as medium.
- **Stock search and OpenAPI.** Files 05, 08, and 10 follow `design/14-Backend-API-Contract.md`: `q` already matches stock number. File 08 also says `dealer-platform/openapi.yaml` `listVehicles` still describes `q` as VIN, make, or model only.

Also already present, so do not invent a second copy (files 02, 05, 08):

- Lead create for an existing customer (`POST /api/v1/leads` with `customerId`). Customer leads (`GET /api/v1/leads?customerId=`). Lead owner column. Lead notes (1–2,000 characters). Close is a stage change to `WON` or `LOST`.
- Duplicate email already saves with `emailWarning` (CRM-13). That warning is returned after save, which is weaker than the document's confirm-before-create.
- Username rules: 3–64 characters of letters, digits, `.`, `_`, and `-`, with at least one letter (`design/14-Backend-API-Contract.md` §1.5). The request is a readable message, not a new rule.
- Sales report already returns lifetime `soldCount`, `revenue`, `grossProfit`, `averageDaysToSell`, and up to twelve recent months (`design/14-Backend-API-Contract.md` §4.3b). The dashboard already shows sales this month and total sales (`design/21-Feature-Extensions.md` DASH-01). Neither takes a day, week, or year parameter, and neither breaks down by employee.
- Dealership address, phone, and email exist. The buyer inventory payload already returns them. The public directory does not (`design/14-Backend-API-Contract.md` §4.6.2 and §12a).
- Inquiry message length is already 1–1,000 characters (`design/21-Feature-Extensions.md` SHOP-04). The request is to show the limit as the writer nears it. The document does not restate the number.
- Ad-rule Enabled and Severity, audit When / Actor / Action / Record / Source IP / change text, sign-in method, and pending registration time are already stored. Sorting them does not add columns (file 05).
- Make, model, and year lists stay the NHTSA catalog. VIN decode prefills and does not save a vehicle (`design/14-Backend-API-Contract.md` §4.6). No Carfax product API is named.
- Deactivating a dealership (`active` false) and unbinding a member already exist. Self-delete already soft-deactivates the caller (`design/14-Backend-API-Contract.md` §2.2). None of those is the document's "delete."

## 5. Conflicts with the current design

Grouped. Each line cites the design doc the analysis files cite. Silent gaps that are not an opposite rule are in §6.

### Roles and binding

- Only the platform admin changes `dealer_role`. A dealer user cannot change a role (`design/15-Data-Auth-and-Gateway.md` §2.5; `design/21-Feature-Extensions.md` AUTH-26; `design/14-Backend-API-Contract.md` §3.7b). Manager promotion (CR-006) conflicts with that. A manager still cannot remove another manager (`design/14-Backend-API-Contract.md` §5.8). The document does not ask for demotion.
- Membership is only `MANAGER` or `STAFF`, both under JWT role `Dealer.User`. JWT roles are only `Platform.Admin` and `Dealer.User`. Do not invent a third JWT role (`design/13-Frontend-Engineering.md` §3; `design/15-Data-Auth-and-Gateway.md` §2.5). The optional dealership admin / owner / regional manager conflicts with that three-level model if it is added as specified (files 02, 06). "Like the platform admin" would include every dealership, global ad rules, the platform audit log, and pending accounts (`design/14-Backend-API-Contract.md` §3, §3.9, §9.2). Ad rules are global. File 06 says a single-dealership account must not receive that route. The one-dealership limit itself matches current tenancy (one active membership; a client `dealerId` is ignored).
- Direct bind is how the platform admin grants access, including bind-without-password of a pending account (`design/14-Backend-API-Contract.md` §3.6 and §3.8; AUTH-20; `design/15-Data-Auth-and-Gateway.md` §8.2). Replacing it with an admin-sent join request conflicts with that. The person who files a join request today is the unbound account (`POST /api/v1/me/join-request`); a manager approves it (AUTH-25).
- "Any user account" on Team > Members, Activity, and Join Requests conflicts with Team being manager-only (`design/13-Frontend-Engineering.md` §2; AUTH-27). Other sentences in the same document say "any manager account" for join requests, activity, and dealership profile, and those match. Staff may call `GET /api/v1/members` for pickers; that does not open Team. Staff must not gain an audit menu (AUD-17; `design/14-Backend-API-Contract.md` §9.1 and §9.3). File 09 C-03 asks which wording wins. This synthesis does not choose.
- Changing a pending account's username conflicts with username as the JWT subject, the membership key, and the audit actor (`design/15-Data-Auth-and-Gateway.md` §8.3). Email and phone edits are an extension, not that conflict. Account email and phone uniqueness stays.
- `design/SCOPE-BASELINE.md` erratum 10 (2026-10-16) still says any active member may approve a join request. AUTH-25, AUTH-27, `design/15-Data-Auth-and-Gateway.md` §2.5, and `design/14-Backend-API-Contract.md` §5.7 later limit that inbox to managers. File 06 says to follow the later ruling, and that a baseline edit belongs with the next auth change, not with this analysis.

### Sale and leads

- Linking a CRM buyer from the sell dialog is already optional (requirements DMS-10). Making it required conflicts with that wording (file 02). The sell body is `soldOn`, `soldPrice`, and `version` only (`design/14-Backend-API-Contract.md` §4.5). The bill of sale already tolerates no buyer (`design/21-Feature-Extensions.md` SALE-01).
- Other plus a typed buyer is silent in the contract. File 10 says an Other buyer who is not a CRM customer conflicts with one vehicle, one customer (`design/00-Current-Development-Design.md`). File 05 infers one nullable free-text name and does not infer a customer row. File 08 infers the sold-to column returns the customer name or the typed name, and that auto-close runs only when the sale names a customer. File 09 A-02 leaves the column, the storage, and the in-stock cell open.
- A won lead does not sell the vehicle, and the sale does not set the lead stage (`design/21-Feature-Extensions.md` §3; `design/14-Backend-API-Contract.md` §5.5). Auto-close on sale conflicts with that. `WON` and `LOST` are final (`design/21-Feature-Extensions.md` LEAD-03). A later change returns `409 LEAD_CLOSED`. Reopen conflicts with that. Notes on a closed lead are still allowed; that is not a reopen.
- **Label and match are not chosen.** File 05 infers the close uses an existing lead stage and says not to add a new label; it also says the document does not say whether a lead with no vehicle is included. File 08 infers the stage becomes `WON` and the match is open leads for the same customer and vehicle. File 09 A-08 asks whether "they" means the leads or the customer records, which leads match, and what is stored on the customer. Do not treat either inference as the requirement.
- A second lead for the same customer and vehicle is not forbidden today (`design/21-Feature-Extensions.md` LEAD-02; no unique key in file 05). That is a new rule, not an opposite rule. Whether a closed lead still blocks a new one is not stated. The same gap hits the buyer-site inquiry, which creates a `NEW` lead (file 08).

### Uniqueness

- Full name is unique, trimmed and case-insensitive (`uk_app_user_display_name`, `409 DISPLAY_NAME_TAKEN`) on register, profile, and admin create (`design/14-Backend-API-Contract.md` §1.5 and §2.1; `design/15-Data-Auth-and-Gateway.md` §8.3; `design/21-Feature-Extensions.md` AUTH-16). The document says a shared full name must not block an account. Username, email, and account phone are not waived.
- **Google display name.** File 06 says Google sign-in already avoids a hard failure by adding a numeric suffix (`design/14-Backend-API-Contract.md` §1.6), while password register and profile reject the duplicate. File 10 says `NewAccountRules` rejects a matching display name on register, Google, Firebase, and admin create. File 08 infers that, once display name is not unique, Google would keep the requested name, and notes that the document does not name Google.
- Customer phone is unique in the dealership (`409 PHONE_TAKEN`, CRM-09; `design/14-Backend-API-Contract.md` §5.2). Allowing a shared phone conflicts with that. Buyer-site inquiries reuse the customer with the same phone (`design/21-Feature-Extensions.md` SHOP-04). If two customers may share a phone, that matcher no longer picks one row (files 05, 08, 09). Account `PHONE_TAKEN` is a different rule and stays (files 08, 10).
- `carfaxUrl` is optional and, when present, any http(s) URL up to the documented length (`design/14-Backend-API-Contract.md` §4.2; requirements DMS-02). Requiring an actual Carfax link conflicts with that. **What "exclusive" means is not agreed.** File 05 infers unique, in the same sense as a phone that cannot be shared, and says no URL pattern is given. File 08's first inference is that other URLs are rejected; uniqueness is a second inference and is not stated. File 10's heading says a unique Carfax link, and its body says host and uniqueness checks. File 09 A-12 asks scope, blank values, hosts, and whether a failure blocks the whole save.

### Deletes

- Do not add `DELETE /admin/dealers/{id}` (`design/14-Backend-API-Contract.md` §3.4). `design/18-Backend-Core-Engineering.md` also says no delete dealership. The admin sets `active` on patch. Inactive dealerships leave the public directory.
- Unbind does not delete `app_user` (`design/14-Backend-API-Contract.md` §3.7; `design/15-Data-Auth-and-Gateway.md` §2.3). There is no admin delete-user route. Self-delete refuses `Platform.Admin`.
- `design/15-Data-Auth-and-Gateway.md` §8.6 keeps business rows, uses soft delete, and keeps audit for the life of the database. A hard delete of a dealership, a user, or a pending account conflicts with that. File 05 infers that the document only requires a confirmed delete action and does not authorize erasing sales, customers, or audit rows. File 08 says deactivate does not satisfy the word "deleted," and it does not invent a cascade. File 10 sizes a second confirmation around the existing deactivate and unbind actions as small, and a true delete as large.

### Public shop and home

- The signed-out home page offers Sign in and Create account (`design/12-Frontend-UI-Conventions.md` §1; `design/13-Frontend-Engineering.md` §2; `design/SCOPE-BASELINE.md` erratum 6). `/register` is public self sign-up (AUTH-16). Classroom checks walk that route (`design/16-Acceptance-and-Test.md` FE-01 and EXT-05). Removing the home-page button conflicts with those descriptions. It does not, by itself, remove `POST /api/v1/auth/register`, Google, or Firebase (files 06, 08, 10). Login still links to register; the document does not mention the login page (file 07).
- Sample ads should link to the sign-up page. That assumes a sign-up page remains, which fights the interim removal (files 01, 02, 04, 06, 09). File 07 says the current sample cars open an inline ad-check, and the inner "Sign in to check your own ads" link goes to `/login`; the car itself is not a link to `/login`. File 10 says do not point that link at `/register` in the same change that hides Create account. Leave it on sign-in until an inquiry page exists.
- The shop heading in the React page is "Shop used vehicles" (files 07, 10). The document says the page should not say "used" and gives no replacement. That is copy. There is no new-versus-used column. `condition_code` is a disclosure code, not new versus used (file 05).
- Directory search and address on each card are silent on the directory payload. Contact is already public one level down, on the dealership shop page (file 06). A larger "this page is for dealerships" sentence matches the existing boundary between `/` and `/shop` and only extends copy (file 06). File 09 C-08 notes that the same document then expands the public shop.

### List sorting and audit search

- List order is fixed. Vehicles default to `createdAt` descending, leads are newest first, members are sorted by username, and audit reads are newest first. No list accepts `sort` (`design/14-Backend-API-Contract.md` §4.1, §5.5, §5.6, §9). `design/12-Frontend-UI-Conventions.md` does not specify column sorting. Lists are paged (10 rows, audit logs 20, cap 100). File 10 says sorting only the current page is the wrong fix. Ad rules and a full in-memory member table can sort in the browser (files 08, 10).
- Actor match is the exact username (`design/14-Backend-API-Contract.md` §9.2 and §9.3). Partial person search conflicts with that.
- Searching the word "password" to find login requests conflicts with the rule that a password is never logged or returned (`design/14-Backend-API-Contract.md` §3.7a). Sign-in rows do not store the typed identifier (`design/15-Data-Auth-and-Gateway.md` §8.8). `LOGIN` and `LOGIN_FAILED` exist as actions. The dealership log only returns rows for that dealership. Platform-wide sign-in rows stay on the admin log (file 06).
- Location is named on team activity and the admin audit log. `audit_event` has no location (file 05). Source IP is `clientIp`. File 08 infers Location is not a second label for the IP, because the team-activity list names both. File 10 says do not invent geocoding: drop Location or specify it before building it. The platform-admin sort list does not include Source IP; the column still exists on the shared table (file 05).

## 6. Net-new stored facts and API contract work

From file 05, these are the stored-fact changes. Deferred items have no fields to add.

**New stored facts**

- Who sold the vehicle. The `VEHICLE` / `SELL` audit actor is only a partial stand-in, and the list API does not return it. File 08 infers the authenticated username, stored at sell time. File 09 A-01 does not choose signed-in user, a chosen team member, or a typed name. File 05 does not choose username versus display name.
- Who the vehicle was sold to: a customer, or a typed Other name. `POST .../sell` does not write the customer link today. `customer_vehicle` is a separate optional link.
- Customer notes. There is no customer-note store. Lead notes are not customer notes. **Shape is not agreed.** File 05 says the document does not choose one text field versus a history, so no columns are inferred. File 08 infers the lead-note shape and the lead-note audit rule. File 10 says a new Core entity, and do not overload lead notes. Customer notes must not be sent to `DealerOps.AiService` (file 10, same rule as LEAD-09).
- Audit Location, only after that word is defined (a place name, a dealership, or something else). IP geolocation is not inferred (file 05).
- Drop unique `display_name`. Stop treating customer phone as unique. Add a uniqueness rule for one lead per customer and vehicle. Closed-lead scope is not stated.
- A Carfax link check, and uniqueness only if "exclusive" means unique. See §5.

**Not new tables:** day, week, month, and year are filters on `sold_on`. Employee metrics need the seller fact; the document does not name the measures, so it does not by itself add revenue, count, or profit columns (file 05). "Sales employees" is not a new role. Do not add a sales-employee flag. Lead count on a vehicle is a query on `sales_lead.vehicle_id`. The count column is possible, not mandatory. Admin-sent join requests can use the existing `JOIN_REQUEST` row (files 05, 08). File 08 marks that reuse as inferred.

**Deferred, with no fields:** home-page create-account becoming a dealership inquiry, and the dealership admin / owner / regional manager role.

**Contract work from file 08.** The document names no URLs, status codes, or payloads. Paths below are the current contract, not new paths invented as requirements. Inferred shapes stay marked.

| Area | Disposition in file 08 |
| --- | --- |
| Date sold on the list | Existing (`soldOn`). |
| Sold to | Existing only for `linkedCustomer`. Other is a contract change. |
| Sold by | Contract change. A seller field on the list. Do not call the audit API once per row. |
| Sell-menu cost, work-order spend, list price | Existing vehicle and work-order data. No new read if the dialog uses fields already returned. |
| Required buyer or Other | Contract change on `POST /api/v1/vehicles/{id}/sell`. |
| Day, week, month, year, and per-employee sales | Contract change on `GET /api/v1/vehicles/report/sales`. Past sales have no seller. The document does not say to backfill from the sell audit. |
| Manager promotion | New manager-only write. File 08 infers a dealer route mirroring the admin role route, and infers that demotion stays admin-only. Fields a manager may edit are not listed, so file 08 does not list them. |
| Member join time | Contract change on `GET /api/v1/members`. |
| Home Create account, interim | No API change. Register, Google, and Firebase stay. Inquiry endpoint is deferred. It is not the buyer inquiry `POST /api/v1/public/dealers/{dealerId}/inquiries`. |
| Dealership-admin role | Deferred. No contract change in this pass. |
| Sort | Inferred server `sort` on paginated lists. Full arrays can sort in the client once the column exists. |
| Shared full name | Contract change. Stop `409 DISPLAY_NAME_TAKEN` on the named writes. The JSON field stays `displayName`. |
| Join-request past table | Contract change on the join-request list if that list must return decided rows. Approve and reject paths stay. |
| Audit change search and partial actor | Contract change on both audit logs. |
| Customer match warning and shared phone | Contract change. Customer `PHONE_TAKEN` goes away. Confirm-before-create is not the current after-save `emailWarning`. The handshake is not defined. |
| Customer notes | New resource. |
| CRM leads column | Contract change on the customer list. `linkedVehicleCount` can remain for other callers. |
| Add lead from the customer | Existing `POST /api/v1/leads`. |
| Lead owner default and live customer-name search | No API change. |
| Vehicle-name search on leads | Contract change. `q` is customer name only today. |
| Reopen, duplicate lead, leads on the vehicle, close leads on sale | Contract changes on leads and on sell. |
| VIN versus catalog | Contract change on vehicle create and patch, using the existing vPIC decode. File 08 infers make, model, and year. File 09 says the compared fields are not stated. What happens when vPIC is down is not stated. |
| Carfax URL | Contract change on vehicle write. No Carfax API. |
| Admin bind becomes a join request | Contract change to admin membership create. Inferred reuse of `JOIN_REQUEST`. |
| Edit or remove a pending account | New admin endpoints. File 08 infers soft-delete as in self-delete. The document does not say hard delete. |
| Delete dealership, delete user, admin edit of email or phone | New. The extra confirmation is no API change. |
| Directory address and contact | Contract change on `GET /api/v1/catalog/dealers`. File 08 infers the existing `contactPhone`, `contactEmail`, and `contactAddress`. File 05 says the document does not name the fields. |
| Directory name search and one dealership's inventory search | No new endpoint. File 08 says the client can filter `legalName` and the inventory array already loaded. Do not add VIN to the public inventory payload. |
| Shop "used," back button, home-page audience, sample-ad link, inquiry counter, day-picker labels, search-control order, Make and Model boxes, typeable year, VIN field order, brand grouping | No API change. Grouping makes is client-side. Model years keyed by make and model are an optional catalog extension the document allows skipping. |
| Open-work-order filter | Contract change: a new filter on `GET /api/v1/vehicles`. The parameter name is not in the document. |

There is no AI work, no file import or export, and no event-bus work in the change document (file 08 §§12–14). Unchanged and not requested: listing ad-copy export, vehicle photo upload, dealership logo, the assistant, ad check, and photo enhancement. Do not add Service Bus. Side effects the notes describe (closing leads on a sale, an admin join request, VIN checked through vPIC) stay inside Core. `DealerOps.AiService` does not access the application database and is out of this change (files 08, 10).

The gateway stays a proxy. It already allows anonymous login, register, Google, Firebase, `GET /api/v1/catalog/**`, and `GET`/`POST /api/v1/public/**`, and its role gate accepts only `Platform.Admin` and `Dealer.User` (file 10). It changes only if a new anonymous inquiry route is added, or if someone adds a JWT role. File 10 also says that if a dealership role is ever built, it should stay on `membership.dealer_role`, so the gateway does not learn a third role. That role is not in this pass.

## 7. UI

No new route is required now. File 07: no workflow in the document asks for a new route that is specified well enough to build. The only new-screen candidates are deferred (a dealership inquiry, and the dealership-scoped admin). Bill of sale, ad compliance, the assistant, disclaimer, login fields, and the no-access screen are not given new steps.

Existing screens the notes map to the document:

| Document location | Route and page |
| --- | --- |
| Home, sample ads, Create account links | `/` `frontend/react/src/pages/LandingPage.tsx`. Register stays `/register`. |
| Profile | `/profile` |
| DMS and Sell | `/dms` `frontend/react/src/pages/DmsPage.tsx` |
| CRM | `/crm` |
| Leads | `/leads` |
| Sales report and dashboard Sales | `/reports/sales-funnel` and `/dashboard` |
| Team Members, Activity, Join requests, Dealership profile | `/team` |
| Manager record audit | Drawers using `frontend/react/src/components/AuditTrail.tsx` |
| Platform admin | `/admin` plus pending accounts, audit log, and ad-rules panels |
| Shop directory, one dealership, ask about a vehicle | `/shop` and `/shop/:dealer` in `frontend/react/src/pages/ShopPage.tsx` |

`frontend/react/src/components/DataTable.tsx` has no sort control. Team and Admin tables are local markup, also unsorted. Confirms already use `frontend/react/src/components/ConfirmDialog.tsx` for sell and unbind. Drawers use `frontend/react/src/components/FormDrawer.tsx`, which closes without a dirty check (file 10).

**Convention clashes** (`design/12-Frontend-UI-Conventions.md` and `design/13-Frontend-Engineering.md`, as file 07 numbers them):

- **Two join-request tables.** UI §1: one table per view; a second list goes behind its own tab. Stacking two tables on Team > Join requests conflicts. Files 07 and 10 say use tabs (or one table plus a status filter).
- **Vehicles-purchased column.** UI §2 fixes that CRM column. Replacing it with the customer's leads is an explicit break. The customer drawer already lists that customer's leads and links to `/leads?leadId=` (files 02, 07). The document does not say whether the new column is a count, a list, or a link.
- **Shared phone.** UI §4: a matching email is a non-blocking warning and the save still proceeds; phone is unique and is rejected. The document wants a confirm-before-create for name, email, phone, or address, and shared phones allowed.
- **Create account.** UI §1 and engineering §2 put Sign in and Create account on the landing brand bar. Removing Create account conflicts with that page. Sample ads sent to sign-up conflict with the same page and with the interim removal (file 07 C8 and W32).
- **Dealership-admin role.** Engineering §3: do not invent a role other than `Platform.Admin` and `Dealer.User`. Team stays manager-only. No route, menu, or screen is specified. File 07 marks the screen Unknown and says not to add the page in this change.

Other clashes the same file records, if those items are built: the filter row is one search plus one to three dropdowns (DMS already names VIN/make/model, Status, and Condition); list search waits and filters on a picked suggestion or Enter, while the leads request asks for a live filter; a row has at most three action links; the sell dialog is sold date and sold price as a required pair; staff never see audit.

**Label disagreement.** File 07 says change the display-name label to full name on Profile and on admin staff create. File 10 says the visible labels on `ProfilePage.tsx` and the admin staff drawer already say "Full name," so no label change is required there. The JSON field remains `displayName` in both notes. The uniqueness fix is separate from the label (file 09 C-06).

Customer and Vehicle of interest: file 07 cannot name the screen. The only controls with those labels are on the leads page. If the screenshot is the leads form itself, the item has no separate target.

## 8. High gaps and open decisions

File 09 ranks a gap **High** when the team can ship the wrong behavior, or the item is too large and too undefined for a small capstone, until the question is answered. It does not choose the cut line. Answer these in writing before implementation. The five clusters below are the ones that block the most work. The short list after them is the rest of file 09's high questions.

### Seller and sales metrics

- Who is Sold by, and when is it stored (A-01)? Without that, Date sold and a linked Sold to can be shown from existing fields, and per-employee metrics cannot (files 05, 09, 10).
- Are cost, work-order spend, and list price read-only displays of data the vehicle already has, and which amounts are they (A-03)?
- Is the period control one period at a time or four sets at once? Which of the existing measures change? What starts a week, in which timezone? Who is a sales employee, which metrics, for which period (A-04, E-05)? File 09 R-03 says this is a new reporting model, larger than a control on the current cards, and asks whether this delivery stays on the measures the sales page and dashboard already show until seller and period rules exist.
- What do the three DMS cells show for an in-stock vehicle (M-05)? What does the employee list show when no seller was recorded (M-06)?

### Account-creation outcome

- For this delivery, is the only acceptance criterion that the home-page Create account control is hidden (A-07, C-01)?
- If sample ads must open a sign-up page, which page is that after the control is removed?
- If the inquiry stays in scope, what fields does it collect, and who receives it? It must not write a dealership's CRM (file 06). The document gives no fields. File 08 says building the inquiry now would contradict "for now, remove the button."
- Which account-creation paths remain after the button is hidden: `/register`, admin create-staff, Google, Firebase (M-03)? Which of those must allow a duplicate full name? Hiding the button and fixing creation are both in the document.
- Is the dealership-admin role out of this delivery (A-06, C-02)? The notes already say yes until the client confirms. File 09 R-02: building that role and also building manager promotion duplicates the same "who administers this dealership" decision.

### Sale versus lead rules

These sentences do not fit one story (file 09 C-04). One sale needs one written rule before the large Core transaction in file 10 item 17:

- What does Sold to show for Other, and does Other create a customer (A-02)?
- Which leads close, with which label, and is anything stored on the customer (A-08, M-01)? Who is the audit actor?
- Does a closed pair still block a new lead, including a second buyer-site inquiry (A-22)?
- Who may reopen a lead, from which outcomes, back to which stage, and what may that undo on a sale (A-23)?
- Which of open work orders, several leads, a closed lead, and a blank Other name block the sale (E-01)?

File 09 R-09 says auto-close, duplicate blocking, and reopen can each be deferred. It asks which single lead rule, if any, is worth doing in this delivery.

### Platform-admin powers after bind is removed

The security goal (a platform admin must not read a dealership's customers and vehicles) already matches the role gate (§4). The proposed remedy removes bind (file 06 decision 8, file 09 A-09).

- Does the admin still create the account and the temporary password?
- Does "send the join request" create a pending request a manager must approve?
- How does the first manager of a new dealership get access if nobody is left to approve the request (E-02, R-04)? File 09 says that is a tenancy change, not a button change, and asks whether the bind change waits until the client decides the first-manager case.
- Which added powers stay in scope: edit pending email, phone, and username; edit user email or phone; delete users; delete dealerships (C-05, A-10, A-24, M-04, S-04)? "Admins" is not always written as "platform admin."
- After a confirmed delete, what can each actor still open, and which history rows remain? File 09 R-05 asks whether both deletes are out of this delivery. File 10 will not implement them until the client confirms deactivate versus delete.

### Unbounded section 2 backlog

File 09 R-01: treating the whole document as one must-ship backlog is the volume risk. Counted as written, it includes the client items plus sort on about ten tables, confirms across "many menus," a search-box sweep, a brand and model-year catalog, lead and CRM changes, VIN and Carfax checks, admin bind, pending-account edit and remove, two deletes, and a public shop pass.

- Is the work limited to the screens and columns written in the document (S-01)? The author says there may be more full-name places, more boxes, and more sortable columns.
- Are non-DMS sort lists in this delivery (S-05)? The client sentence is about DMS columns.
- Does "especially the fixes" mean the "I suggest" items are optional (C-10, A-27)?
- Is confirm work limited to the named screens, and search work limited to the named boxes (R-06)? For each named screen, is the confirm a warning on leave, a dialog before save, or a message after save (A-14)?

### Other high questions from file 09

- Which employee fields may a manager change, and may a manager demote (A-05, M-02)? Password edits by a manager would recreate the sign-in-as-that-person path the client wants closed for the platform admin (file 06).
- Which VIN fields must match, on create, edit, or sell, and what happens when decode has no record or the user disagrees (A-11, E-09)? File 09 R-07 asks whether VIN work stays a clear save error when decode and the entered year, make, and model disagree, with the brand-list split deferred.
- Carfax exclusive, hosts, blank values, and whether the whole save is blocked (A-12).
- The buyer-site inventory search sentence ends at "vehicl" (A-13). Was text lost, and search by which values?
- Audit search: match on action and record labels, or on stored change text? Which rows should the word "password" return, without writing secrets into the audit (A-15)? File 09 R-08 asks whether search stays on the filters the screens already have, plus action and record type, until the searchable fields are named.
- If full names may be shared, which extra identifier keeps Members, audit Actor, and Sold by distinguishable (E-03)?
- If two customers share a phone, which customer does a buyer-site inquiry use (E-04)?

Medium and low items in file 09 (sort direction, join-request statuses including cancelled, partial-match length, day-picker label text, duplicate-customer match rules, public copy, username error text) can wait until the high questions are closed. File 09 S-08 says the copy and label items are small once the wording questions are answered, and they do not depend on a new role or a new sale model.

## 9. Suggested implementation order

This order is file 10's. Sizes are only the sizes that file states. Build so later work sits on a stable contract, Core remains the only writer of business data, and the gateway stays a proxy.

**Do not implement the dealership-admin role in this pass.** File 10 also says do not start a public dealership inquiry. Hide the Create account buttons only.

1. **Write the design deltas first for anything file 10 marks Yes**, in the same change as the code. Hide the create-account buttons and update `design/12-Frontend-UI-Conventions.md` and `design/16-Acceptance-and-Test.md` with that hide. Leave sample ads on `/login`. Size: small to hide the buttons (item 5). Large to replace registration with an inquiry, and large again for a fourth privilege level. Design update required even for the hide.
2. **React-only confirms and copy** (items 8, 9, and the small parts of 21): dirty-form and lead-close confirms (small), join-request tabs (small, React only, if the existing list includes resolved rows), shop wording, back link, inquiry counter, visible audit date labels. No Core deploy. File 08's reading of the join-request list is a contract change; file 10's small size is conditional. See §4.
3. **Account name uniqueness** (item 7), medium, in Core, then register, profile, and admin staff forms. Removes a false 409 before later account-edit work. Design update required.
4. **Sale record** (items 1, 2, and the buyer rule in 17) in `VehicleService.Sell` and the DMS page: persist the seller, require a CRM buyer or an explicit documented alternative, and show cost, work-order spend, and list price. Publish date sold, sold-to, and sold-by on the vehicle list. Item 1 is medium. Item 2 is small if the dialog shows purchase cost, repair cost, and list price already on the vehicle, and medium if work-order spend must be a separate sum. The four sale-and-lead behaviors together are large (item 17); the lead behaviors are step 6, not this step.
5. **Sales periods and salesperson totals** (item 3), large, on the existing Core sales report, then the dashboard and the sales report page. Depends on step 4. Both pages stay on the same endpoint. Design update required, including classroom report checks in `design/16-Acceptance-and-Test.md` if the demo numbers change.
6. **Lead rules that follow a sale** (items 13 and 17): reopen (medium), duplicate open lead, lead count on the vehicle, and auto-close when that customer buys that vehicle. The four behaviors in item 17 are large and belong in one Core transaction. Then the leads, DMS, and CRM pages.
7. **CRM warnings, shared phones, notes, and the lead column** (items 14 and 15). Small to replace the list column with a lead count and to add a lead through the existing create flow. Medium for customer notes. Medium for the phone and duplicate-warning change. Design update required.
8. **Team and admin authority** (items 4, 18, 19, and 20) only after the client confirms manager promotion, admin join-requests instead of bind, and deactivate-versus-delete. Joined-date column is medium. Promotion, and a manager editing another account's email or phone, are large. Username error text is small. Replacing bind is large. A second confirmation around existing deactivate and unbind is small. A true delete is large. Admin contact edits are medium. Implement in the membership service and the admin controllers. Reuse the existing confirm dialog. Do not add a JWT role.
9. **List sorting and richer search** (items 6, 10, 11, and 12) once the new columns exist. Sort is large as a program and small per endpoint if every list takes the same `sort` and `direction`. Audit text search and partial actor match are medium; visible date labels and column order are React-only. DMS search and the add-vehicle form are medium. Prefilling the lead owner is small. Letting lead search match the vehicle is small-to-medium and is an API change. The gateway does not parse these queries. Do not invent a location column.
10. **VIN and Carfax validation** (item 16), medium, after the add-vehicle form layout settles, still inside vehicle validation and the catalog decode path. File 10 says forcing make, model, and year to equal a vPIC decode is the larger part of that item, and the failure mode must be specified before coding it.

`DealerOps.Gateway` changes only if step 1 grows into a new anonymous inquiry route or someone adds a JWT role. `DealerOps.AiService` is not in this sequence.

## 10. Cut line

File 09 does not choose this line. The line below only separates what files 08, 09, and 10 already mark as safe, as a design-doc change, or as waiting on the client. It does not add work.

### Safe to do now without a design-rule change

File 10's "design update required" means authentication, tenancy, roles, API contracts, gateway behavior, or classroom acceptance. A UI-only change can still leave `design/12-Frontend-UI-Conventions.md` stale. File 10 says that stale-convention note is not by itself a "yes." These items are the ones it marks **No** under that rule:

- Show purchase cost, list price, and repair cost in the existing sell dialog, with no new API field (item 2, small). Update the sell-dialog section of `design/12-Frontend-UI-Conventions.md` so the spec matches. Do not add a new aggregate until A-03 is answered.
- Dirty-form confirm and confirm before a lead is closed, using the existing confirm dialog (item 8, small). Record that confirm in `design/12-Frontend-UI-Conventions.md` §4.
- Join-request tabs instead of two stacked tables, only if the payload already includes resolved rows (item 9, small). If it does not, this is the contract change in file 08, not this bucket.
- Visible audit date labels and putting search controls in the same order as columns. No new query.
- Default the lead owner to the signed-in user and leave it editable (item 12, small). No API change.
- A readable `fieldErrors.username` message. Do not change the allowed character set (item 18, small).
- An extra confirmation around the existing deactivate-dealership and unbind actions. That is not a delete (item 20, small). Describe the confirm in `design/12-Frontend-UI-Conventions.md`.
- Home-page audience sentence, stop saying "used," a back link to the directory, a character counter for the existing 1–1,000 inquiry limit, and a filter over inventory the page already loaded (item 21, small). Do not add VIN to the public payload.
- A Stock # box that sends the existing `q` parameter, a typeable year that sends the existing `modelYear`, moving the VIN box, and grouping catalog makes in the client (the no-API parts of item 11).

The full-name label is not in this bucket as new work. File 10 says those labels already say "Full name." File 07 still describes a label change. See §7.

### Needs a `design/` update in the same change

File 10 marks these Yes. Do not start the code without the design delta:

- Hiding home-page Create account, even though file 08 says the interim has no API change. Update `design/12-Frontend-UI-Conventions.md` §1 and `design/16-Acceptance-and-Test.md`. Leave `/register` and the register API in place unless the client says otherwise.
- Dropping display-name uniqueness (`design/14-Backend-API-Contract.md`, `design/15-Data-Auth-and-Gateway.md` §8, `design/21-Feature-Extensions.md` AUTH-16, and EXT-05).
- Seller, buyer-or-Other, and the vehicle list fields (`design/14-Backend-API-Contract.md`, DMS columns in `design/12-Frontend-UI-Conventions.md`).
- Sales periods and employee metrics (`design/14-Backend-API-Contract.md` §4.3, `design/21-Feature-Extensions.md` DASH-01, and classroom report checks if the numbers change).
- Member join time on the members API. Manager promotion, if the client confirms it (`design/14-Backend-API-Contract.md` §3.7b and §5.6–§5.8, `design/15-Data-Auth-and-Gateway.md` §2.5, AUTH-26, AUTH-27).
- Server sort parameters, audit text search, and partial actor match (`design/14-Backend-API-Contract.md`).
- Shared customer phone, the confirm-before-create handshake, customer notes, and the CRM column (`design/14-Backend-API-Contract.md` §5, `design/12-Frontend-UI-Conventions.md` §2 and §4, CRM-13).
- Lead reopen, duplicate lead, leads on the vehicle, and auto-close (`design/14-Backend-API-Contract.md` §4.5 and the lead section, LEAD-02, LEAD-03, SALE-01).
- VIN match and Carfax rules (`design/14-Backend-API-Contract.md` §4.2 and §4.6.1), after the failure mode is written down.
- Admin bind replaced by a join request, pending-account edit and remove, real delete, and admin edits of email or phone (`design/14-Backend-API-Contract.md` §3, `design/15-Data-Auth-and-Gateway.md` §8, AUTH-18, AUTH-20, AUTH-25, `design/16-Acceptance-and-Test.md`).
- Directory cards that need address or contact from `GET /api/v1/catalog/dealers` (`design/14-Backend-API-Contract.md` §4.6.2, SHOP-01).
- An open-work-order filter, or removing the Make and Model query parameters (`design/14-Backend-API-Contract.md` §4.1, `design/12-Frontend-UI-Conventions.md` §3).

### Wait for the client

- The dealership admin / owner / regional manager role. Optional, unspecified, and explicitly not to be built until the client confirms it. Do not add a JWT role in anticipation.
- The dealership inquiry, and account creation "done a different way." The only instructed interim action is hiding the home-page button.
- Sample ads pointing at sign-up. File 10 says leave them on sign-in until an inquiry page exists, because that link fights the interim removal.
- Manager promotion, replacing direct bind, and delete versus deactivate. File 10 step 8 waits for those confirmations. File 09 adds the first-manager question before bind is removed, and asks whether the two deletes are out of this delivery.
- Seller identity, period boundaries, and which sales metrics exist, before the large report (file 09 R-03). Showing Date sold and an already-linked customer does not require those answers. Per-employee metrics do.
- Which leads a sale closes, with which label, and whether a closed lead reopens or still blocks a duplicate (file 09 C-04 and R-09).
- Whether section 2 suggestions, non-DMS sort lists, and any screen the author did not name are in this delivery (file 09 S-01, S-05, C-10). Do not implement "feel free to add" or "there may be more" as scope.

File 09 R-10's small urgent set (three DMS columns, read-only sell-dialog context, a period control on measures the page already shows, a members date column, manager promotion with a named field list, and hiding Create account) still needs the high answers in §8, and several of those items are in the design-update bucket above. It is not a license to build the rest of the document.
