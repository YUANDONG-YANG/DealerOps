# API and integrations in the change document

Source: `requirements/update-cr/Changes Document.docx`.

Compared with the current HTTP contract in `design/14-Backend-API-Contract.md` and `dealer-platform/openapi.yaml`. Where those two differ, this note follows `design/14-Backend-API-Contract.md` (it owns HTTP JSON) and calls out the OpenAPI difference.

The change document does not name URLs, status codes, or payloads. Each item below is the document’s behavior, then the current contract, then one disposition:

| Disposition | Meaning |
|---|---|
| Existing | The current contract already returns or accepts what the document asks for. |
| Contract change | An existing path, body, query, response, or error must change. |
| New endpoint | No current path performs the action. The document does not name the path; any path in this note is **INFERRED**. |
| No API change | Presentation, confirmation, or client-side use of data the contract already returns. |
| Deferred | The same document says not to build this yet. |

**INFERRED** means the document does not state the API shape, and the shape is deduced from that behavior plus the current contract.

Browser traffic stays on `dealer-gateway` under `/api/v1/**`. `DealerOps.AiService` does not access the application database. New reads and writes in this note belong in core. The public error body stays `{ code, message, requestId?, fieldErrors? }` (`design/14-Backend-API-Contract.md` §1.2).

---

## 1. Summary

| Area | What the document requires | Disposition |
|---|---|---|
| DMS sold-by / sold-to / date sold | Seller, buyer, and sale day on the vehicle list | Date sold existing (`soldOn`). Sold-to partial (`linkedCustomer`). Sold-by is a contract change. |
| Sell menu figures | Cost, work-order spend, list price while selling | Existing vehicle fields. No new read. |
| Sale must name a buyer | Customer, or Other plus a typed name | Contract change on `POST /api/v1/vehicles/{id}/sell`. |
| Sales periods and employee metrics | Day, week, month, year, and per-employee sales | Contract change on `GET /api/v1/vehicles/report/sales`. |
| Manager promotes and edits staff | Managers promote staff and edit some employee fields; members show join date | New manager write. `joinedAt` is a contract change on `GET /api/v1/members`. |
| Home create-account | Remove the button for now. Dealership inquiry and a new signup flow are discussions. | No API change for the interim. Inquiry endpoint deferred. |
| Dealership admin / owner / regional manager | Optional extra role | Deferred. |
| Sortable columns | Named columns on DMS, leads, team, audit, ad rules, pending accounts, admin members | **INFERRED** server sort on paginated lists. Full lists can sort in the client once fields exist. |
| Duplicate full name | Same full name must be allowed | Contract change. Stop `409 DISPLAY_NAME_TAKEN`. |
| Join-request history | Current queue and a past approved/rejected table | Contract change. Today’s list is pending only. |
| Audit search | Search the change text; partial person search | Contract change on both audit logs. |
| Customer duplicates and phone | Warn on shared name, email, phone, or address; phone may be shared | Contract change. Customer `PHONE_TAKEN` goes away. Buyer-inquiry matching is affected. |
| Customer notes and lead column | Notes on the customer; CRM column becomes leads | Notes are a new resource. Lead count is a contract change. Add-lead from the customer screen is existing. |
| Lead reopen, duplicate lead, vehicle leads, sale closes leads | Reopen; block same customer+vehicle; show leads on the vehicle; close leads when that customer buys | Contract changes on leads and on sell. |
| VIN vs catalog; Carfax URL | Saved VIN data must match the vehicle; Carfax box must be a Carfax link | Contract change on vehicle write. Uses the existing vPIC integration. No Carfax API. |
| Platform admin bind | Admin sends a join request and does not bind directly | Contract change to admin membership create. **INFERRED** reuse of `JOIN_REQUEST`. |
| Pending accounts | Admin can edit and remove them | New endpoints. |
| Delete dealership; delete user; admin edits email/phone | Extra confirmation, then delete; admin edits contact fields | Confirmation is no API change. Delete dealership, delete user, and admin contact edit are new. Dealer deactivate already exists. |
| Public shop | Directory search, address and contact on each dealer, inventory search, inquiry length | Directory contact fields are a contract change. Inventory search and the 1,000-character inquiry limit are existing data. |
| AI, files, outbound events | — | Not in the change document. |

---

## 2. Vehicles and selling

### 2.1 DMS columns: sold by, sold to, date sold

The client wants three DMS columns: who sold the vehicle, the customer who bought it, and the day it was sold.

| Column | Current contract | Disposition |
|---|---|---|
| Date sold | `soldOn` on every vehicle list and detail item (`design/14-Backend-API-Contract.md` §4.1). Set by sell (§4.5). | Existing. |
| Sold to | `linkedCustomer` is `{ id, name }` when a customer is linked, otherwise null (§4.1). Contact fields are omitted. | Existing only for a linked customer. |
| Sold by | Sell accepts `soldOn`, `soldPrice`, and `version` only (§4.5, `VehicleSell` in `dealer-platform/openapi.yaml`). The vehicle DTO has no seller. A `VEHICLE` / `SELL` audit row stores `actorUsername` (§9). | Contract change. The list needs a seller field. Calling `GET /api/v1/audit` once per row is not a list contract. |

**INFERRED.** Persist the seller on the vehicle at sell time (the authenticated username). The document does not say whether a later reader may edit it. Sold-by is not in the sortable-column list in the document.

### 2.2 Sell menu: cost, work-order spend, list price

When Sell vehicle is opened, the menu shows cost, the total spent on work orders, and list price. No new input is described.

| Figure | Current contract | Disposition |
|---|---|---|
| Cost | `purchaseCost` on `GET /api/v1/vehicles/{id}` (§4.1, §4.3). | Existing. |
| List price | `listPrice` on the same object (§4.1). | Existing. |
| Work-order spend | Each done work order adds its `cost` to the vehicle `repairCost` in the same transaction (§4.7). `GET /api/v1/vehicles/{vehicleId}/work-orders` returns each order’s `cost`. | Existing data. |

The document’s phrase is “total number spend on work orders”. It does not say whether that is a sum or a count. `repairCost` is also directly editable on create and patch (§4.2, §4.4), so it is not guaranteed to equal the sum of work-order costs. **INFERRED** the menu shows `purchaseCost`, `listPrice`, and either `repairCost` or the sum of work-order `cost` values from the existing work-order list. No new endpoint is stated.

`GET /api/v1/work-orders/report/settlement` is dealership reconditioning totals (§4.7). It is not the sell-menu figure and it is not the employee sales report in §3.

### 2.3 Sale requires a customer, or Other plus a typed buyer

A vehicle sale must link to a customer before it can be sold. The user may pick Other and type the buyer.

Current sell body is only the date, price, and `version` (§4.5). Linking is a separate `PUT /api/v1/customers/{id}/vehicles/{vehicleId}` (§6.1). That link cannot store a buyer who is not a customer. `linkedCustomer` cannot represent Other.

**Contract change** on `POST /api/v1/vehicles/{id}/sell`: the body gains a customer id or an Other name. The document does not name fields or a new error code. Today a missing date or price is `400 SOLD_PAIR_REQUIRED`; a missing buyer has no code. **INFERRED** a missing buyer is `400 VALIDATION` with `fieldErrors`, and the sold-to column (§2.1) returns the customer name or the typed Other name.

Auth stays `Dealer.User`. Platform admin remains `403` on this URL (§1.3, §4).

### 2.4 VIN must match the vehicle record

The document says VINs should be forced to match vehicle information on the DMS page.

`POST` and `PATCH /api/v1/vehicles` accept make, model, year, and VIN together. Rules are format and per-dealer uniqueness (`400 VIN_DUP`), not a catalog match (§4.2, §4.4). `GET /api/v1/catalog/vin/{vin}` decodes through NHTSA vPIC and does not create a vehicle (§4.6.1). The DMS form may ignore the decode.

**Contract change** on vehicle create and patch: reject a save whose make, model, or year disagrees with the decode. **INFERRED** comparison fields are make, model, and `modelYear`, because those are what decode returns and what the form stores. The document does not say what happens when vPIC is down. The existing catalog failure is `502 CATALOG_UNAVAILABLE` (§4.6). Applying that code to a vehicle save is **INFERRED**.

This stays a core call to vPIC (`VPIC_BASE_URL`). The browser still calls only the gateway. Ai-service is not part of this check.

### 2.5 Carfax URL

The document says the Carfax URL box should be exclusive and should require an actual Carfax link before save.

Current rule: `carfaxUrl` is optional and, when present, must be `http` or `https` (§4.2). There is no host check and no uniqueness rule.

**Contract change** on create and patch. The clear requirement is that a non-empty value is a Carfax link. **INFERRED** “exclusive” means the value is a Carfax URL and other URLs are rejected (`400 VALIDATION` on `carfaxUrl`). A second reading, that the same URL cannot be saved twice, is **INFERRED** and not stated. The document does not name a Carfax product API, key, or fetch. Validation does not require calling Carfax.

### 2.6 DMS search and the add-vehicle catalog

| Document request | Current contract | Disposition |
|---|---|---|
| Remove the separate Make and Model boxes because “Search VIN, make, or model” covers them | `q` matches VIN, make, and model. `make` and `model` remain exact filters (§4.1). | No API change. The UI stops sending `make` and `model`. The query parameters can stay. |
| Stock number search | `design/14-Backend-API-Contract.md` §4.1 says `q` also matches `stockNumber`. `dealer-platform/openapi.yaml` `listVehicles` describes `q` as VIN, make, or model only. | Existing in the design contract. OpenAPI text is behind the design doc. A stock-number box can send `q`. A stock-number-only parameter is not required. |
| Year box should be typeable | `modelYear` is an exact integer query (§4.1). | No API change. |
| Search vehicles that have open work orders | `openWorkOrders` is a response count (§4.1). It is not a query parameter. | Contract change: a new filter on `GET /api/v1/vehicles`. The parameter name is not in the document. |
| Split Add Vehicle makes into major brands and every brand | `GET /api/v1/catalog/makes` returns one sorted array, anonymous, from vPIC car and MPV types (§4.6). | No API change. Grouping is client-side. The document cites Autotrader as a layout reference, not as an integration. |
| Model year lists only years that fit the selected vehicle; if that is too hard, only common vehicles | Catalog exposes makes and models, not years (§4.6). VIN decode returns one year (§4.6.1). | Optional catalog extension. **INFERRED** a year list keyed by make and model, still served by core’s vPIC client. The document allows skipping this. |
| Move the VIN box to the top | Field order. | No API change. |

---

## 3. Sales report and dashboard

The client wants sales for the current day, week, month, and year, each as an option, on the sales report page and in the dashboard sales section, plus a list of every sales employee and that person’s sales metrics.

`GET /api/v1/vehicles/report/sales` (`design/14-Backend-API-Contract.md` §4.3b, schema `SalesReport`) returns lifetime `soldCount`, `revenue`, `grossProfit`, `averageDaysToSell`, `inStockCount`, `inventoryCost`, and `months` (up to twelve `yyyy-MM` buckets). It has no query parameters in `dealer-platform/openapi.yaml`. The same payload is what §4.3b and §13 put on the sales report and the dashboard. `GET /api/v1/leads/report/funnel` is lead stages, not vehicle sales.

**Contract change** on `GET /api/v1/vehicles/report/sales`:

- A period option of current day, week, month, or year. **INFERRED** one selected period per request. The document does not define timezone or which day starts a week. Audit dates already use the viewer’s local day bounds (§9.2); reusing that for the sales period is **INFERRED**.
- An employee list with sales metrics. **INFERRED** metrics are the same measures the report already defines (`soldCount`, `revenue`, `grossProfit`), grouped by seller. That grouping depends on the sold-by field in §2.1. Past sales have no seller on the vehicle. The `SELL` audit actor is the only current identity, and the document does not say to backfill from it.

Auth is unchanged: any `Dealer.User` with a membership; admin and unbound accounts get `403` (§4.3b).

---

## 4. Leads

### 4.1 Existing lead API the document can use

| Document request | Current contract | Disposition |
|---|---|---|
| Add a lead from the customer screen | `POST /api/v1/leads` accepts `customerId` (§5.5). | Existing. |
| Owner defaults to the person creating the lead and stays editable | `ownerUsername` is optional. `GET /api/v1/me` returns `username`. | No API change. The client sends the current username. |
| Customer name suggestions refresh while typing | `GET /api/v1/leads?q=` matches customer name. `GET /api/v1/customers?q=` matches name, email, and phone (§5.1, §5.5). | No API change. |
| Confirm before closing a lead | Close is `PATCH /api/v1/leads/{id}` with stage `WON` or `LOST` (§5.5). | No API change. Confirmation is client-side. The contract already says a second confirmation for sell and unlink is frontend-only (§6). |

### 4.2 Search by vehicle name

The document asks for a vehicle-name search on leads. `q` on `GET /api/v1/leads` is customer name only (§5.5). The list row’s `vehicle` object has `make` and `model`.

**Contract change.** Extend lead search to the vehicle name. The document does not say whether `q` grows or a new parameter is added.

### 4.3 Reopen a closed lead

`WON` and `LOST` are final. A later `PATCH` returns `409 LEAD_CLOSED` (§5.5, §12). Notes still work on a closed lead.

**Contract change** on `PATCH /api/v1/leads/{id}`: a closed lead can be opened again. The document does not name the stage it returns to, or what happens to `lostReason`. **INFERRED** the target is an open stage (`NEW`, `CONTACTED`, or `QUALIFIED`).

### 4.4 Duplicate customer and vehicle

A lead with the same customer and the same vehicle must not be created. `POST /api/v1/leads` does not check that pair (§5.5). The error catalog has no duplicate-lead code (§12).

**Contract change.** The document does not say whether a closed lead still blocks a new one. That choice also affects reopen (§4.3) and the buyer-site inquiry, which creates a `NEW` lead for a phone-matched customer and vehicle (`design/14-Backend-API-Contract.md` §12a). **INFERRED** the rejection is `409`, consistent with other uniqueness conflicts. The code is not specified.

### 4.5 Leads on the vehicle

The document wants leads included in vehicle information, and possibly a column with the number of leads.

`GET /api/v1/leads` filters by `customerId`, not `vehicleId` (§5.5). The vehicle DTO has no lead count (§4.1).

**Contract change.** Add a vehicle filter on `GET /api/v1/leads` so vehicle detail can list leads. A count column is marked “possible” in the document; adding `leadCount` to the vehicle list is **INFERRED** from that column. The count column is not in the DMS sortable list.

### 4.6 Selling closes the customer’s leads

When a vehicle is sold to a customer, leads are closed and “the appropriate label” is applied to the customers tied to the lead.

Sell does not change leads. The contract says `WON` does not sell or link (§5.5). Stages are `NEW`, `CONTACTED`, `QUALIFIED`, `WON`, and `LOST`. There is no customer label field (§5.3).

**Contract change** on sell (§2.3): close matching leads in that action. **INFERRED** the lead stage becomes `WON`, because that is the only successful closed stage. **INFERRED** the match is open leads for the same customer and vehicle. The document does not say this. A label stored on the customer, rather than the lead stage, would be a new customer field; the contract has no such field.

Other plus a typed buyer has no customer id, so there is no lead to close. **INFERRED** auto-close runs only when the sale names a customer.

---

## 5. Customers

### 5.1 CRM column: vehicles purchased becomes leads

The document wants the vehicles-purchased column replaced with the customer’s leads.

`linkedVehicleCount` is the CRM “vehicles purchased” count (`design/14-Backend-API-Contract.md` §5.1). Customer detail returns `linkedVehicles` and no leads (§5.3). `GET /api/v1/leads?customerId=` can fill one customer. It is not a list-column field.

**Contract change** on `GET /api/v1/customers`: a lead count or lead summary on each row. The property name is **INFERRED**. `linkedVehicleCount` can remain for other callers; the document only changes the column.

### 5.2 Customer notes

The document wants notes on the customer. Lead notes are `POST /api/v1/leads/{id}/notes` with `body` of 1–2,000 characters (§5.5). Customers have no note field or note route (§5.2–§5.4).

**New endpoint.** **INFERRED** the same note shape as leads, on the customer, because the document asks for notes in the customer menu and the only note resource in the contract is the lead note. Length is not stated. Lead note text is never copied into the audit (`NOTE` stores `noteId` only). **INFERRED** customer notes follow that audit rule.

### 5.3 Duplicate warning, and phone is not exclusive

On create, if name, email, phone, or address matches an existing customer, show a confirmation before creating. Phone numbers must not be exclusive. This applies to customer create and to customer create from the leads page.

Current rules (§5.2, §5.4, and lead `newCustomer` in §5.5):

- Duplicate email is allowed. The save succeeds and the detail includes `emailWarning`.
- Duplicate phone is `409 PHONE_TAKEN`.
- Name and address have no uniqueness check.
- `GET /api/v1/customers?q=` matches name, email, and phone. It does not match address.

The warning must happen before create, and it must cover address. A client search cannot see address matches.

**Contract change** on `POST /api/v1/customers`, `PATCH /api/v1/customers/{id}`, and lead `newCustomer`:

- Do not reject a shared customer phone. Account `PHONE_TAKEN` (§1.5, §2.1, §3.6) is a different rule and the document does not lift it.
- Surface matches for name, email, phone, and address before the row is saved. Email’s current `emailWarning` is returned after save, so it does not meet the “before allowing creation” sentence.

The document does not define the handshake. **INFERRED** a first request returns the matches and does not persist, and a confirmed request persists. A preview path is the alternative. Either way it is a contract change, not the notification inbox (§8).

Buyer-site `POST /api/v1/public/dealers/{dealerId}/inquiries` reuses the active customer with the same phone, otherwise it creates one (§12a). If several customers may share a phone, that reuse rule no longer picks one row. The change document does not mention the buyer site here. **INFERRED** the inquiry matcher needs an explicit rule once customer phones are not unique. This note does not choose that rule.

---

## 6. Team, roles, and join requests

### 6.1 Managers promote staff and edit employee information

The client wants manager accounts to promote other staff to managers and to edit certain employee information.

Today only `Platform.Admin` can change `dealerRole`, via `PUT /api/v1/admin/dealers/{id}/members/{username}/role` (§3.7b). The contract says no dealer user can change a role. A manager may unbind a `STAFF` member with `DELETE /api/v1/dealer/members/{username}` and may not remove a manager (§5.8). There is no route for a manager to edit another account’s email, phone, or name. `PATCH /api/v1/me` updates only the caller, and it cannot change email (§2.1).

**New endpoint** for promotion, manager-only, same `403` rule as the other `/api/v1/dealer/**` manager routes (§5.7). **INFERRED** path shape `PUT /api/v1/dealer/members/{username}/role` with `{ dealerRole: "MANAGER" }`, mirroring §3.7b. The document does not say managers may demote. Demotion staying admin-only is **INFERRED**.

Editing “certain employee information” names no fields in that paragraph. Later, the document says platform admin edits email or phone (§7.4). Those examples are not repeated for the manager. **INFERRED** a manager write exists; its fields are unspecified, so this note does not list them. Auth is manager-only, by the subject of the request.

### 6.2 Date the member joined

The members section gets a column for when the member joined. The sortable list for Team > Members names Role, Source, and Date Added.

`GET /api/v1/members` returns `username`, `displayName`, `source`, and `dealerRole` only (§5.6). It is a full array, sorted by username, not paginated. Admin member items (§3.5) also omit a join timestamp.

**Contract change** on `GET /api/v1/members`: add the membership start time. **INFERRED** name `joinedAt` or `createdAt`. Role (`dealerRole`) and Source (`source`) already exist, so those two sortable columns are existing fields.

### 6.3 Join requests split into current and past

The document says the join-request screen lists every request, and asks for two tables: requests waiting for approve or reject, and past requests that were approved or rejected. Sortable columns: Requested, Status, Resolved. Who: a manager, Team > Join requests.

`GET /api/v1/dealer/join-requests` returns only pending requests: `username`, `displayName`, `email`, `createdAt`, `source` (§5.7). There is no status and no resolved time, because every row is pending. Approve and reject stay `POST .../approve` and `POST .../reject` (204).

`GET /api/v1/dealer/notifications?includeResolved=true` returns inbox history, including `JOIN_REQUEST` rows with `resolvedAt`, `resolvedBy`, and `resolvedAction` (`APPROVED`, `REJECTED`, `CANCELLED`). That inbox also contains other kinds, and staff do not receive `JOIN_REQUEST`. It is not the join-request table.

The document’s description of the current screen (every request in one list) does not match the contract (pending only). The requested past table is still missing from `GET /api/v1/dealer/join-requests`.

**Contract change** on that list: return decided requests as well, with status and resolved time. **INFERRED** a query such as pending versus resolved, so the two tables do not require two resources. Requested maps to `createdAt`. Status and Resolved map to `resolvedAction` and `resolvedAt`, which exist on the notification and not on `JoinRequest`. Approve and reject paths stay as they are.

### 6.4 Dealership profile confirmation

A large dealership-profile change should ask for confirmation before save. `PATCH /api/v1/dealer/profile` is the save (§5.8). **No API change.** The extra step is client-side, as with unlink (§6).

### 6.5 Optional dealership admin, owner, or regional manager

The document lists a privilege ladder: platform admin, then dealership admin/owner/regional manager, then dealership manager, then staff, then anonymous. It says this account is optional and should be discussed before implementation.

**Deferred.** No contract change in this pass.

The current contract has two JWT roles, `Platform.Admin` and `Dealer.User`, and `dealerRole` of `MANAGER` or `STAFF` (§1.3, §2). A later implementation would add a role or a `dealerRole` value and would change who may call `/api/v1/admin/**` and `/api/v1/dealer/**`. The document does not list those powers beyond “some admin capabilities” for a single dealership.

---

## 7. Accounts and platform administration

### 7.1 Home-page create account, and a dealership inquiry

Two statements:

- The client wants home-page create-account turned into a way for a dealership to inquire about using the service.
- Account creation by another method needs further discussion. For now, removing the home-page create-account button is enough.

**Interim: no API change.** `POST /api/v1/auth/register`, `POST /api/v1/auth/google`, and `POST /api/v1/auth/firebase` stay. The button removal does not delete those routes. Sample ads should link to the sign-up page instead of sign-in; that is a client route, not a new API.

**Deferred: new endpoint.** A dealership-use inquiry is not `POST /api/v1/public/dealers/{dealerId}/inquiries`. That route creates a CRM customer and a vehicle lead (§12a). A prospect dealership is not a buyer of a listed vehicle. The document gives no fields for the inquiry. Building it now would contradict the “for now, remove the button” decision.

### 7.2 Full name may be duplicated

An account cannot be created when the full name is already used. The document names three places and says there may be more: home-page create account, platform admin create staff, and Profile.

Those map to:

| Place | Contract |
|---|---|
| Home-page create account | `POST /api/v1/auth/register` returns `409 DISPLAY_NAME_TAKEN` when the trimmed full name matches, case-insensitive (§1.5). Firebase create does the same (§1.7). |
| Admin create staff | `POST /api/v1/admin/dealers/{id}/members` uses the same uniqueness rules (§3.6, §1.5). |
| Profile | `PATCH /api/v1/me` returns `409 DISPLAY_NAME_TAKEN` (§2.1). |

**Contract change.** Stop treating display name as unique on these writes, and stop returning `DISPLAY_NAME_TAKEN` for them. Username, email, and account phone stay unique (`USERNAME_TAKEN`, `EMAIL_TAKEN`, `PHONE_TAKEN`).

Google sign-in already avoids a collision by appending a numeric suffix to the display name (§1.6). That still changes the person’s name. **INFERRED** once display name is not unique, Google keeps the requested name too. The document does not name Google.

The UI label should say full name on Profile and on admin staff create. The JSON field remains `displayName` (§2, §3.6). **No API change** for the label. Renaming the JSON property is not requested.

### 7.3 Readable username error

Creating a staff account with illegal username characters returns an error that is hard to read. Who: platform admin, dealership staff screen.

The username rule is already specific: 3–64 characters from letters, digits, `.`, `_`, and `-`, with at least one letter (§1.5). Failures use `400 VALIDATION` and `fieldErrors.username` with an English message (§1.2, §1.5).

**Contract change** only if the published message text is still a raw pattern. The code stays `VALIDATION`. No new error code.

### 7.4 Platform admin must not bind a dealership directly

The platform admin must not bind accounts to a dealership. The admin may only send a join request. The stated reason is that a platform admin must not create an account and then use it to open a dealership’s customer and vehicle data.

Current bind is `POST /api/v1/admin/dealers/{id}/members` (§3.6). It creates or reactivates a `STAFF` membership and returns the member. Pending accounts are bound with that call and no password (§3.8). A platform admin who calls a business URL already receives `403` and no business fields (§1.3). The gap is the membership itself: after bind, that username is a dealer user.

**Contract change** to §3.6 for binding an existing account: the result is a join request, not a membership. Managers already approve those requests (§5.7). **INFERRED** the admin-originated request uses the existing `JOIN_REQUEST` notification so it appears in `GET /api/v1/dealer/notifications` and `GET /api/v1/dealer/join-requests`. The document does not name a new notification kind.

Creating a brand-new staff account is still in the document (§7.2 names that screen). **INFERRED** create-user can remain, and the dealership attachment becomes the join request rather than an active membership. Immediate bind would leave the hole the client described.

Join-request errors that already exist: unknown or inactive dealership `404`, already a member `403`, a second different dealership `400 VALIDATION` (§5.7). `409 DUP_MEMBER` remains the approve-time conflict when the account is active at another dealership.

### 7.5 Pending accounts: edit and remove

Platform admin can remove a pending account, and can edit it when signup data was wrong. Examples: email, phone, username.

`GET /api/v1/admin/pending-users` is the list (`username`, `displayName`, `email`, `phone`, `createdAt`), with `q`, `page`, and `size` (§3.8). There is no admin update and no admin delete. The person can `PATCH /api/v1/me` or `DELETE /api/v1/me` (§2.1, §2.2). Admin bind does not change contact fields (§3.6).

**New endpoints.** **INFERRED** they sit under the pending-user resource, platform admin only, same `403` as §3.8:

- Update email, phone, and username. Existing conflicts apply: `EMAIL_TAKEN`, `PHONE_TAKEN`, `USERNAME_TAKEN`, plus `400 VALIDATION` for the §1.5 formats.
- Remove the account. `DELETE /api/v1/me` soft-deletes, deactivates memberships, cancels a pending join request, and suffixes email, phone, and Google subject (§2.2). **INFERRED** admin remove follows that soft-delete. The document does not say hard delete.

### 7.6 Delete a dealership

Platform admin can delete a dealership. The decision needs at least one extra confirmation step. Screen: Dealerships > Edit.

§3.4 says not to add `DELETE /api/v1/admin/dealers/{id}`. `PATCH` can set `active` to false, which hides the dealership from the public directory (§4.6.2) and is not a delete.

**New endpoint.** The confirmation is **no API change** (one delete call after the UI step, same pattern as §6). Cascade for members, vehicles, leads, and the public slug is not in the document. This note does not invent it. Deactivate remains the existing alternative and does not satisfy the word “deleted”.

### 7.7 Delete a user, and edit email or phone

Platform admin can delete users, with at least one extra confirmation, and can edit account information such as email or phone.

`DELETE /api/v1/admin/dealers/{id}/members/{username}` unbinds and does not delete `app_user` (§3.7). Self-delete is §2.2. No admin route edits email or phone on an existing account.

| Action | Disposition |
|---|---|
| Extra confirmation | No API change. |
| Delete the user account | New endpoint. Distinct from unbind. **INFERRED** soft-delete as in §2.2. |
| Edit email or phone | New endpoint, or a contract change that adds those fields to an admin write. §3.6 currently refuses to change them on an existing account. Uniqueness stays `EMAIL_TAKEN` and `PHONE_TAKEN`. |

The document does not say a manager can delete users. Manager unbind of `STAFF` stays §5.8.

### 7.8 Admin member columns

Sortable columns on platform admin > Members: Dealership, Role, Sign-in, Status.

`GET /api/v1/admin/dealers/{id}/members` is one dealership. Each item has `role`, `dealerRole`, `signInMethod`, and `active` (§3.5). It has no dealership name, because the dealership is the path id. There is no platform-wide members list.

Role, sign-in method, and active status exist on that per-dealership list. A Dealership column whose value changes per row is not in the contract. **INFERRED** either the column is the dealership already selected in the UI, which is no API change, or the screen is a cross-dealership directory, which would be a new list. The document does not say which screen layout it means.

---

## 8. Audit and activity search

### 8.1 What already exists

| Screen in the document | Contract | Who |
|---|---|---|
| Team > Activity | `GET /api/v1/dealer/audit` (§9.3) | Manager. Staff `403`. |
| Platform admin > Audit log | `GET /api/v1/admin/audit` (§9.2) | `Platform.Admin`. |
| Any manager menu with an audit trail | `GET /api/v1/audit?entityType=&entityId=` (§9.1) | Manager. One entity. `clientIp` is null on this route. |

Both logs take optional `entityType`, `entityId`, `action`, `actor` (exact username), `from`, and `to`. Admin audit also takes `dealerId`. Order is `createdAt` descending. Rows are append-only; there is no audit write API (§9).

Day-picker labels on team activity and the admin audit log are **no API change**. `from` is inclusive and `to` is exclusive; the UI already sends the viewer’s local day bounds (§9.2, OpenAPI `AuditLogFrom` / `AuditLogTo`).

Putting search controls in the same order as columns is **no API change**.

### 8.2 Search the change, and partial person search

The document wants activity search by the change itself. The example is searching “password” to find login requests that used passwords. It also asks for partial person search on team activity. The admin audit log should gain the same change search, and partial search should return results. Admin column order is the UI item in §8.1.

| Need | Current contract | Disposition |
|---|---|---|
| Free-text search of the change | No `q` over `fieldSummary`, `previous`, or `action`. | Contract change on `GET /api/v1/admin/audit` and `GET /api/v1/dealer/audit`. |
| Partial person match | `actor` is an exact username (OpenAPI `AuditLogActor`; §9.2). | Contract change. **INFERRED** `actor` becomes a substring match, or a separate contains parameter is added. Changing exact match is a behavior change for current callers. |
| Login rows | `LOGIN` and `LOGIN_FAILED` are audited on `APP_USER` (§1.4). The password is never logged (§3.7a, §1.4). A failed unknown identifier is actor `anonymous`. | Existing events. A search for the word “password” finds a row only when the stored summary or action contains that word. The document uses that word as the example of change search. |

**INFERRED** the search text is matched against `action` and `fieldSummary`. The document does not name those properties.

Entity history `GET /api/v1/audit` is not the activity log. The document’s activity and admin audit screens are §9.2 and §9.3.

### 8.3 Location

Team activity columns include Source IP and Location. Platform audit columns include Location and do not list Source IP.

`clientIp` is returned on §9.2 and §9.3 and is omitted on §9.1. The contract has no location, city, or geocoding field, and it names no geo provider.

Source IP is the existing `clientIp`. Location is a **contract change** if it is a stored or resolved place. **INFERRED** it is not a second label for the IP, because the team-activity list names both columns. No external geo integration is stated, so this note does not add one.

---

## 9. Sort

The document lists sortable columns and allows more. It does not mention query parameters. List endpoints use a fixed order (`design/14-Backend-API-Contract.md` §1.1, §4.1, §5.5, §9). None accept `sort`.

Paginated screens show a default page of 10 (audit logs default to 20) with a cap of 100 (§1.1, §9.2). Sorting only the current page would leave the rest of the result set unordered. **INFERRED** paginated resources gain a sort parameter. Full arrays can be sorted in the client after the response includes the column.

| Screen | Contract list | Sortable columns named in the document | API effect |
|---|---|---|---|
| DMS | `GET /api/v1/vehicles` | Stock number, body, source, condition, cost, list price, date added, open work orders, status | **INFERRED** server sort. Fields exist: `stockNumber`, `bodyType`, `source`, `conditionCode`, `purchaseCost`, `listPrice`, `addedOn`, `openWorkOrders`, `status`. |
| Leads | `GET /api/v1/leads` | All columns | **INFERRED** server sort on the list-row fields (§5.5). |
| Team > Members | `GET /api/v1/members` | Role, source, date added | Client sort once §6.2 adds the date. Role and source exist. |
| Team > Activity | `GET /api/v1/dealer/audit` | When, actor, action, record (type and number), source IP, location | **INFERRED** server sort. When, actor, action, `entityType`+`entityId`, and `clientIp` exist. Location depends on §8.3. |
| Team > Join requests | `GET /api/v1/dealer/join-requests` | Requested, status, resolved | Client sort once §6.3 returns status and resolved time. The list is not paginated. |
| Platform audit | `GET /api/v1/admin/audit` | When, actor, action, record, location | Same as team activity, without a source-IP column in the document. `clientIp` is already on the row. |
| Ad rules | `GET /api/v1/admin/compliance-rules` | Enabled, severity | No API change. The route returns the full catalog (§3.9). |
| Pending accounts | `GET /api/v1/admin/pending-users` | Registered | `createdAt` exists and the list is newest first. **INFERRED** server sort only for the opposite direction. |
| Platform admin > Members | `GET /api/v1/admin/dealers/{id}/members` | Dealership, role, sign-in, status | **INFERRED** server sort for role, sign-in method, and status. Dealership depends on §7.8. |

Manager audit menus name Action, Actor, and When. Those are `action`, `actorUsername`, and `createdAt` on §9.1 and §9.3. **INFERRED** server sort on the paginated calls.

---

## 10. Public shop and buyer inquiry

Anonymous routes. The gateway allows `GET /api/v1/catalog/**` and `GET`/`POST /api/v1/public/**` without a JWT (§1.3, §12a).

| Document request | Current contract | Disposition |
|---|---|---|
| Shop page should not say “used” | Public inventory is in-stock vehicles with a ready, passed ad (§12a). `conditionCode` is returned. There is no used-only filter. | No API change. Copy only. |
| Search dealerships on the shop page | `GET /api/v1/catalog/dealers` returns every active dealership, sorted by legal name, with no query (§4.6.2). | No new endpoint. The array includes `legalName`, so a name search can run in the client. |
| Address and some contact information on each dealership | `PublicDealer` is `id`, `legalName`, `slug`, `hasLogo`, `inStockCount`, `soldCount` (§4.6.2). Phone, email, and address are on `GET /api/v1/public/dealers/{dealer}/inventory`, not on the directory. | Contract change on `GET /api/v1/catalog/dealers`: add the public contact fields. They are already public on the inventory payload. **INFERRED** “some contact information” means those existing fields (`contactPhone`, `contactEmail`, `contactAddress`), not a new contact type. The same payload feeds the Google dealership picker (§1.6, §4.6.2); extra fields do not change that call. |
| Back button on a dealership’s buyer page | Navigation. | No API change. |
| Search that dealership’s inventory | `GET /api/v1/public/dealers/{dealer}/inventory` returns the full listed array, newest `addedOn` first, with year, make, model, title, and other public fields. No VIN, cost, list price, or customer (§12a). | No contract change required. **INFERRED** the client filters that array. The document does not ask for a server query. Search must not add VIN to this public payload; the contract withholds it. |
| Show the character limit on “Ask about this vehicle” as the writer nears it | `message` is 1–1,000 characters. Errors are `400 VALIDATION`. Rate limit is `429 RATE_LIMITED` (§12a, schema `Inquiry`). | No API change. The limit is already 1,000. |
| Home page should say it is for dealerships | Copy. | No API change. |
| Sample ads go to sign-up | Client route. | No API change. See §7.1. |

---

## 11. Notifications

The contract’s inbox is `GET /api/v1/dealer/notifications` (§5.7). Kinds in the contract are `JOIN_REQUEST` and `BUYER_INQUIRY`.

| Document wording | Disposition |
|---|---|
| Popup before creating a customer who matches an existing name, email, phone, or address | Not an inbox item. It is the confirm-before-save behavior in §5.3. |
| Admin sends a join request instead of binding | **INFERRED** a `JOIN_REQUEST` notification, so managers see it in the existing inbox and the join-request list (§7.4). No new kind is named. |
| Buyer asks about a vehicle | Existing. The inquiry already posts `BUYER_INQUIRY` (§12a). No change except the phone-match implication in §5.3. |
| Email, SMS, or push | Not in the change document. |

---

## 12. File import and export

The change document does not mention file import, file export, CSV, or download.

Unchanged, and not requested here:

- `POST /api/v1/listings/{id}/exports` returns `text/plain` ad copy (§8.4).
- Vehicle photos are multipart upload and image bytes (§4.8).
- The dealership logo is a data URL on the dealership write (§3.4, §5.8).

---

## 13. Events and external integrations

The change document does not mention webhooks, a message bus, or Service Bus. §13 of the contract says not to add Service Bus. Nothing in this change adds one.

Side effects inside an existing request, not new event channels:

| Behavior | Where it runs |
|---|---|
| Closing leads when a named customer buys the vehicle | Core, inside sell (§4.6). |
| Admin join request appearing for managers | Core notification row (§7.4). **INFERRED.** |
| VIN checked against decoded vehicle data | Core calling NHTSA vPIC, which the catalog already uses (§2.4). |
| Carfax value checked as a link | Core validation only (§2.5). |

No new vendor is named. vPIC remains the catalog upstream (`VPIC_BASE_URL`, §4.6). Google and Firebase stay the sign-in providers (§1.6, §1.7); the display-name rule in §7.2 is the only account-provider implication.

---

## 14. AI behavior

The change document does not mention the assistant, ad check, image enhancement, model prompts, or ai-service.

These stay as they are, and this change does not call them:

| Path | Role |
|---|---|
| `POST /api/v1/assistant/ask` | Dealer user. Core retrieves rows and calls ai-service. The assistant does not write business tables (§10). |
| `POST /api/v1/listings/{id}/checks` | Core calls `POST /internal/v1/ad-check`. The browser cannot call `/internal/v1/**` (§11). |
| `POST /api/v1/vehicles/{vehicleId}/photos/{photoId}/enhance` | Photo enhancement (§4.8). |

Lead data is never sent to AI (§5.5). Assistant cards omit phone, email, and address (§10). **INFERRED** customer notes from §5.2 follow those two exclusions. Auto-close on sell is core business logic, not an AI call.

VIN matching, sales aggregates, audit search, and customer duplicate checks read the application database or vPIC. They stay in core. `DealerOps.AiService` does not receive a database connection for them.

---

## 15. Auth and error implications

Only where the document or the current contract supports the implication.

| Topic | Implication |
|---|---|
| Who may sell, list vehicles, report sales, edit customers and leads | `Dealer.User` with an active membership. The document says “any user account” for those screens and does not split manager from staff. Admin remains `403` on business URLs (§1.3). |
| Promote staff, join-request history, dealership activity | Manager `dealerRole`, matching §5.7 and §9.3. Staff remain `403`. |
| Pending accounts, dealership delete, user delete, admin audit, ad rules | `Platform.Admin`, matching §3 and §9.2. |
| Public directory, inventory, and vehicle inquiry | Anonymous, matching §4.6 and §12a. |
| `DISPLAY_NAME_TAKEN` | Stops applying to register, profile, Firebase create, and new admin staff (§7.2). |
| Customer `PHONE_TAKEN` | Stops applying (§5.3). Account `PHONE_TAKEN` stays. |
| `LEAD_CLOSED` | Cannot stay a blanket block if closed leads reopen (§4.3). |
| `SOLD_PAIR_REQUIRED` | Still the missing date or price. A missing buyer is a separate validation; the document does not name the code (§2.3). |
| Duplicate lead | New conflict. Code not specified (§4.4). |
| Username characters | Existing `400 VALIDATION` / `fieldErrors.username` (§7.3). |
| Catalog mismatch on save | No code today. `CATALOG_UNAVAILABLE` exists for vPIC failure on catalog reads (§2.4). |
| Direct admin bind | Replaced by join-request outcomes already defined in §5.7 (`400`, `403`, `404`), instead of creating a membership (§7.4). |

---

## 16. Unspecified contract details

The document requires the behavior and does not specify these. They are listed so a later contract edit does not invent them silently.

- Sell-menu work-order figure: sum versus count, and whether `repairCost` is that figure (§2.2).
- Typed Other buyer: max length, and whether it is required to be non-empty (§2.3).
- Which decoded fields a VIN must match, and save behavior when vPIC is unavailable (§2.4).
- Whether a Carfax URL must also be unique (§2.5).
- Sales period timezone and week start; which metrics an employee row contains; how sales made before a seller field existed are counted (§3).
- Stage used when a lead is reopened, and whether a closed pair still blocks a new lead (§4.3, §4.4).
- Whether “label applied to the customers” is the lead stage `WON` or a new customer attribute (§4.6).
- Customer-note length and whether notes are one field or a list (§5.2).
- Confirm-before-create handshake for duplicate customers (§5.3).
- Which employee fields a manager may edit (§6.1).
- Dealership-delete cascade (§7.6).
- Whether user delete is the §2.2 soft-delete (§7.5, §7.7).
- What the Location column contains (§8.3).
- Sort parameter names (§9).
