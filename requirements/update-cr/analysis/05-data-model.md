# Data model implied by the change document

Source: the written text of `requirements/update-cr/Changes Document.docx`. Embedded screenshots have no text alternatives, so a label that appears only in a picture is not listed here.

Comparison baseline (active persistence is the .NET model; Java Flyway is out of scope):

- `design/15-Data-Auth-and-Gateway.md` — tenancy, roles, sale lock, retention, audit storage
- `design/14-Backend-API-Contract.md` — field rules, statuses, and report shapes
- `design/21-Feature-Extensions.md` — leads, work orders, members, dashboard

**Explicit** means the change document states it. **INFERRED** is used only where a stored fact is required and the document does not name the column. Those notes are kept short.

Comparison words: **already modeled**, **needs a column or table**, **conflict**.

## 1. Vehicle and sale

Table `vehicle` (`design/15` §3, `design/14` §4, `design/21` DMS-18).

### Fields the document uses that already exist

| Document name | Stored fact | Comparison |
| --- | --- | --- |
| Stock # | `stock_number` | Already modeled. A Stock # search box is a query. `q` already matches the stock number (`design/21` DMS-18). |
| Body | `body_type` | Already modeled. |
| Source | `source` | Already modeled. |
| Condition | `condition_code` | Already modeled. Values are `CERTIFIED`, `AS_IS`, `UNFIT`, `IRREPARABLE` (`design/14` §4). |
| Cost | `purchase_cost` | Already modeled. The document says "cost" in the DMS list and in the sell menu. It does not rename the field. |
| List price | `list_price` | Already modeled. |
| Date added | `added_on` | Already modeled. |
| Open WOS | Count of work orders in `OPEN` or `IN_PROGRESS` | Already modeled (`design/14` §4, `design/21` WO-07). A search for vehicles with open work orders is a filter on that count. |
| Status | `status` `IN_STOCK` or `SOLD` | Already modeled (`design/15` §3.1). |
| Date sold | `sold_on` | Already modeled (`design/15` §3.3). The document asks for it as a DMS column. |
| VIN, make, model, model year | `vin`, `make`, `model`, `model_year` | Already modeled. New validation is in §8. Make, model, and year option lists stay the external NHTSA catalog (`design/14` §4.6), not a local table. |

The shop page must not say the inventory is only "used", because dealerships sell new vehicles. That is page copy. The document does not define a new-versus-used column. `condition_code` is a disclosure code, not new versus used.

### Fields the sale must record

Explicit DMS columns that are not on `vehicle` today:

- **Sold by** — who sold the vehicle. The `VEHICLE` / `SELL` audit actor (`design/14` §4.5, `design/15` §8.8) is the closest existing fact, and the list API does not return it. Needs a seller on the vehicle, or a defined join to that audit row. The document does not say username versus display name.
- **Sold to** — the customer who bought the vehicle. `customer_vehicle` already allows one active customer per vehicle (`design/15` §4), including a link made after the sale, but `POST .../sell` does not write that link. Needs the sale to record the buyer.
- **Other buyer** — the seller may pick "other" and type the buyer instead of choosing a customer. That person is not a customer row. **INFERRED:** one nullable free-text buyer name, used only when no customer is selected. No length is stated.

`sold_price` stays. The document does not remove the sold-date and sold-price pair (`design/15` §3.3).

### Shown in the sell menu, not new columns

Explicit: when Sell is opened, show cost, the total spent on work orders, and list price.

Cost and list price are the vehicle columns above. Work-order money is `work_order.cost` (`design/21`). The phrase is "total number spend", so it is ambiguous between a count and a sum of cost. Both are aggregates of existing rows. The document does not say which statuses count, and it does not ask to freeze the figure on the vehicle. No snapshot column.

Selling is still blocked while a work order is `OPEN` or `IN_PROGRESS` (`design/14` §4.5). The document does not change that.

### Lead count on the vehicle

Explicit as a possible DMS column: how many leads a vehicle has, and leads shown on the vehicle. `sales_lead.vehicle_id` already exists (`design/21`). The count is a query. The document marks the column as possible, not mandatory. No new table.

## 2. Work order

Table `work_order`. Statuses `OPEN`, `IN_PROGRESS`, `DONE`, `CANCELLED` (`design/21`). Cost is already stored.

The document only uses the open count and the spend total. No new work-order field.

## 3. Sales report and dashboard

Explicit: the sales report and the dashboard sales section offer the current day, week, month, and year, and list every sales employee with sales metrics.

Already modeled (`design/14` §4.3b, `design/21` DASH-01): overall `soldCount`, `revenue`, `grossProfit`, `averageDaysToSell`, plus the twelve latest months. The dashboard shows sales this month and total sales. There is no day, week, or year selector and no per-employee row.

Day, week, month, and year are filters on `sold_on`. They do not need a new fact table. Employee metrics need the Sold by fact in §1. The document says "sales metrics" and does not name the measures, so it does not by itself add revenue, count, or profit columns.

**INFERRED:** "sales employees" is not a new role. The document does not define the set. Do not add a sales-employee flag. Current dealership roles are only `MANAGER` and `STAFF` (`design/15` §2.5).

## 4. Customer

Table `customer` (`design/14` §5.2). Name, email, phone, and home address already exist.

Explicit validation, also when a customer is created from the leads page:

- If name, email, phone, or address matches an existing customer, warn and still allow the create. The warning names which of the four matched.
- Phone numbers are not exclusive. People may share a phone and still have separate customers.

Conflict: phone is unique among the dealership's customers (`409 PHONE_TAKEN`, CRM-09). Duplicate email already saves with `emailWarning` (CRM-13). Name and address have no duplicate check. Needs the phone rejection removed. The warning for name and address is a check, not a unique key.

Explicit display: replace the CRM "vehicles purchased" column with that customer's leads. `customer_vehicle` stays; the document does not remove purchase links. Leads are already `sales_lead.customer_id`. No new column.

Explicit: notes on a customer. There is no customer-note store. `sales_lead_note` is a lead note (`design/21`), not a customer note. Needs a new store. The document does not choose one text field versus a note history, so no columns are inferred from the lead-note table.

Explicit: add a lead from the customer menu. That uses the existing lead create. No new entity.

## 5. Lead

Table `sales_lead` (`design/14` §5.5, `design/21`). Already stored: customer, optional vehicle, `owner_username`, stage, next follow-up, lost reason. Stages: `NEW`, `CONTACTED`, `QUALIFIED`, `WON`, `LOST`.

Explicit, no new column:

- All lead columns are sortable.
- Owner is filled with the person creating the lead and can be changed. The column exists. The default is not a separate field.
- Search by vehicle name. Customer-name search refreshes while typing. Both query existing customer and vehicle fields.
- Closing a lead asks for confirmation before save. That is not a new status. Close today is a stage change to `WON` or `LOST`.

Explicit uniqueness: a second lead with the same customer and the same vehicle must not be created. No such key exists. Needs a uniqueness rule. The document does not say whether a closed lead still blocks a new one.

Explicit reopen: a closed lead can be opened again after an accidental closure. Conflict: `WON` and `LOST` are final (`409 LEAD_CLOSED`). Reopen is a stage change, not a new column. The document does not name the stage a reopened lead returns to.

Explicit sale link: leads are tied to vehicle sales. When a vehicle is sold to a customer, those leads are closed automatically, with "the appropriate label" applied to the customers tied to the lead. Conflict: `design/14` §5.5 says `WON` does not sell the vehicle, and a closed lead cannot change. The label value is not named. **INFERRED:** the close uses the existing lead stage; do not add a new label. The document does not say whether a lead with no vehicle is included.

Leads on the vehicle use `sales_lead.vehicle_id` (already modeled).

"Customer" and "Vehicle of interest" boxes should behave like the leads menu. The document does not name that page. Those two associations already exist on the lead. No new fields.

## 6. Account and membership

### Account (`app_user`)

Explicit conflict: full name must not be unique. The same block is reported on public create-account, platform-admin create-staff, and profile. Today `display_name` is unique (`uk_app_user_display_name`, `409 DISPLAY_NAME_TAKEN`) in `design/14` §1.5 and §2.1, `design/15` §8.3, and `design/21` AUTH-16. Needs that unique constraint dropped. Username, email, and phone uniqueness are not waived.

The profile and the admin staff form should call display name "full name". Same column.

A username with illegal characters must return a readable error. The allowed form is already 3–64 characters of letters, digits, `.`, `_`, and `-`, with at least one letter (`design/14` §1.5). No new column.

Explicit edits by the platform admin:

- Pending accounts: email, phone, and username, for a mistake at creation. Binding an existing account currently does not change contact fields (`design/14` §3.6). Needs those three columns to be updatable. Username is the membership key, the audit actor, and the JWT subject (`design/15` §8). The document does not say how membership and audit rows that store the old username are updated.
- Other accounts: "some information", with email and phone given as the examples. Only those two are explicit.

Explicit removal:

- Pending accounts can be removed.
- Users can be deleted, with at least one extra confirmation.

`app_user.active` exists. Self-delete already soft-deactivates the caller and keeps the username (`design/14` §2.2). Admin removal of a pending account, and admin deletion of another user, are not that operation. See §10.

Already modeled list facts:

- Pending "Registered" is `created_at` (`design/14` §3.8).
- Platform member columns Dealership, Role, Sign-in, and Status are the membership's dealership, `app_user.role` or `membership.dealer_role`, the sign-in method (password, Google, or Firebase), and `active`.

### Membership (`membership`)

`dealer_role` is `MANAGER` or `STAFF` (`design/15` §2.5). `created_at` is when the row was created. Inactive rows are kept.

Explicit:

- A manager may promote other staff to manager. Conflict: only `Platform.Admin` changes `dealer_role`, and a manager does not manage another manager (`design/15` §2.5). The column exists. No new role value for this promotion. The document does not say a manager may demote a manager.
- A manager may edit "certain employee information." The fields are not named. Email and phone are not inferred here; that example belongs to the platform admin above.
- The members list shows when the member joined, and Date Added is sortable. That is `membership.created_at`. Already modeled; the list column is missing. Role and Source are already on the member directory (`design/14` §5.6). Source is derived from the account's `APP_USER` / `CREATE` audit (`google`, `firebase`, `password`, `admin`), not its own column.

### Join request

Stored as notification kind `JOIN_REQUEST` plus `app_user.requested_dealer_id` (`design/14` §5.7, `design/21`). Timestamps and outcome already exist: `created_at` (Requested), `resolved_at` (Resolved), `resolved_by`, `resolved_action`.

Explicit: two lists, not one combined list. Current rows still need approve or reject. Past rows are those already approved or rejected. Sort Requested, Status, and Resolved.

Already modeled as a filter on resolved versus unresolved. The outstanding join-request query does not return history; resolved rows remain on the notification. Needs a history view, not a new table. Stored outcomes include `APPROVED`, `REJECTED`, and `CANCELLED`. The document's past list is approved or rejected only.

Explicit conflict: the platform admin must not bind an account to a dealership. The admin sends a join request, and the dealership accepts it. Today the platform admin is the party who binds (`design/15` §8.2, `design/14` §3.6). The existing request can carry this. The document does not require a new table or a separate admin-request kind.

### Privilege ladder

Explicit, most privilege to least:

1. Platform admin
2. Dealership admin / owner / regional manager
3. Dealership manager
4. Dealership staff
5. User not logged in

Current stored roles are `Platform.Admin` and `Dealer.User`, and the dealership role is `MANAGER` or `STAFF` (`design/15` §2.5). A person who is not logged in is not a row.

The dealership admin / owner / regional manager is explicitly optional and should be discussed before implementation. The only capability named is "some admin capabilities" for a single dealership, similar to the platform admin. No field list. Do not add the role from this document. If it is built later it needs a new `dealer_role` value or a new account role, which conflicts with the two membership roles.

### Public account creation

Explicit, then deferred: home-page create-account should become a way for a dealership to inquire about using the service. The same section says account creation still needs a client discussion, and removing the home-page button is enough for now. No inquiry fields are given. Do not add an inquiry table. Removing the button does not drop `app_user` or the register contract in `design/14` §1.5.

## 7. Dealership

Table `dealer`. Legal name, contact phone, contact email, contact address, logo, and `active` already exist.

Explicit: the platform admin may delete a dealership, with at least one extra confirmation. `active` can already be cleared. There is no `deleted_at` on `dealer`. The document says "deleted" and does not say whether vehicles, customers, memberships, or audit rows remain. A destroyed row conflicts with `design/15` §8.6. Needs a defined delete. No cascade columns are inferred.

Explicit public directory: search dealerships, and show address and some contact information on each dealership. Those columns exist. `GET /api/v1/catalog/dealers` returns id, legal name, slug, logo flag, and in-stock and sold counts only (`design/14` §4.6). The buyer inventory payload already includes contact phone, email, and address. Needs the directory to expose the existing contact fields. The document does not name the search fields beyond finding a dealership.

Explicit buyer site: a way back (no data), and a search of that dealership's inventory. Inventory fields are already returned. The inventory read has no search parameter (`design/14`). Needs a query, not new columns.

The home page should say it is for dealerships rather than retail customers. Copy only.

## 8. Audit and activity

Table `audit_event` (`design/15` §8.8, `design/14` §9). Already stored: `created_at` (When), `actor_username` (Actor), `action` (Action), `entity_type` plus `entity_id` (Record, type then number), `client_ip` (Source IP), `field_summary` and `previous_values` (the change), and optional `dealer_id`. Rows are append-only.

Explicit sort, already modeled:

- Team activity: When, Actor, Action, Record, Source IP, and Location.
- Platform audit log: When, Actor, Action, Record, and Location. Source IP is not in this sortable list; the column still exists on the shared table.
- Any manager audit menu: Action, Actor, When. Record history already omits `clientIp` (`design/14` §9).

Explicit query, already stored but not matched this way:

- Search the activity log by the change text. The example is the word "password" to find login requests made with passwords. That is a query over `field_summary` and `previous_values`. Sign-in rows do not store the typed identifier or the password (`design/15` §8.8, AUD-12), so the word "password" is not on a login row today. No new column fixes that example unless login rows start carrying text the current rule forbids.
- The same change search on the admin audit log.
- Partial match on the user search. Conflict: actor match is the exact username (`design/14` §9.2). Query behavior only.
- Day pickers on team activity and the admin audit log. `from` and `to` already exist. Missing labels are UI.
- Search options and columns in the same order. UI.

**Location** is named as a column on team activity and the admin audit log. `audit_event` has no location, and the log does not show one. The document does not say whether it is a place name, a dealership, or another value. Needs a defined value before a column is added. IP geolocation is not inferred.

## 9. Ad rules and buyer inquiry

Ad-rule sort columns Enabled and Severity are `compliance_rule_override.enabled` and `severity` (`BLOCK` or `REVIEW`). Already modeled. Sort is UI.

"Ask about this vehicle" must show its character limit as the writer nears it. The document does not state the number. The inquiry message is already 1–1000 characters (`design/14` public inquiries). No new field.

That inquiry reuses an active customer with the same phone, then creates a `NEW` lead. The customer rule in §4 says a phone is not exclusive, including customer creation from the leads page. The document does not retarget the buyer form. The phone-match will conflict with that rule once two customers may share a phone.

## 10. Retention and history

The document states no retention period, no purge, and no anonymization.

Explicit history that matches current storage:

- Approved and rejected join requests stay available in a past list. The notification row already remains after resolve (`design/15` §8.6).
- Date sold stays on the DMS row. `sold_on` is already kept, and a second sell is rejected (`design/15` §3). Sold by and sold to, once stored, are the same kind of sale fact. The document does not say they can be edited after the sale.
- A closed lead stays, because it can be reopened.
- Activity and admin audit stay searchable after the fact. That matches append-only `audit_event` for the life of the database (`design/15` §8.6–§8.8).
- The member joined date stays. That matches `membership.created_at`, including inactive memberships.

Explicit deletes with no survival rule in the document:

- Remove a pending account.
- Delete a user, with an extra confirmation.
- Delete a dealership, with an extra confirmation.

`design/15` §8.6 keeps business rows, uses soft delete, and keeps audit for the life of the database. Backups are 7 days (`design/15` §8.7). Reading these deletes as hard deletes conflicts with that ruling. **INFERRED:** the document only requires a confirmed delete action. It does not authorize erasing sales, customers, or audit rows.

A duplicate-customer warning still creates the new customer. No merge and no delete of the older row.

## 11. Validation list

| Rule | Source in the document | Against the current design |
| --- | --- | --- |
| Full name is not unique | Explicit, three create or edit paths | Conflict. Drop `uk_app_user_display_name`. |
| Username character errors must be readable | Explicit | Rule already modeled. Message only. |
| Pending email, phone, and username can be corrected | Explicit | Needs update. Username is a stable key today. |
| Admin can edit email and phone | Explicit examples | Needs update. Uniqueness of account email and phone stays; the document does not drop it. |
| Customer name, email, phone, or address match warns, then allows create | Explicit, CRM and lead-page create | Phone is a conflict (`PHONE_TAKEN`). Email warning exists. Name and address need a check only. |
| Customer phone is not unique | Explicit | Conflict with CRM-09. |
| VIN must match the vehicle information | Explicit | Needs a save-time check. Decode today does not gate save (`design/14` §4.2, §4.6.1). What is compared is not stated. |
| Carfax URL is exclusive and must be a real Carfax link before save | Explicit | Conflict with optional any-http(s) `carfaxUrl`. **INFERRED:** "exclusive" means unique, the same sense the document uses for a phone that cannot be shared. No URL pattern is given beyond "an actual Carfax link". |
| Sale requires a customer, or Other plus a typed buyer | Explicit | Conflict. Sell body is `soldOn`, `soldPrice`, `version` only. |
| No second lead for the same customer and vehicle | Explicit | Needs a uniqueness rule. Closed-lead scope is not stated. |
| Closed lead can be reopened | Explicit | Conflict with final `WON` / `LOST`. |
| Sale closes the related leads with an unnamed label | Explicit | Conflict with "WON does not sell the vehicle". Label not specified. |
| Lead close and dealership delete and user delete need an extra confirmation | Explicit | Confirmation is not a stored field. |
| Buyer message limit is visible near the limit | Explicit | Length already 1–1000. The document does not restate the number. |

## 12. Relationships

| Relationship | Document | Comparison |
| --- | --- | --- |
| Sale → customer, or sale → typed other buyer | Required at sell | Needs the buyer on the sale. `customer_vehicle` is optional and separate today. |
| Sale → selling staff member | Sold by | Needs a seller. SELL audit actor is only a partial stand-in. |
| Vehicle → work orders | Spend total and open count | Already modeled. |
| Vehicle → leads | Show leads; possible count; close them when that customer buys | Link already modeled. Auto-close is new behavior. |
| Lead → customer + vehicle | Unique pair; owner defaults to the creator | Owner column exists. Uniqueness is new. |
| Customer → notes | Notes in the customer menu | Needs a new store. Shape not specified. |
| Customer → leads | Replaces the vehicles-purchased column | Already modeled as a query. |
| Admin → join request → dealership | Admin sends a request instead of binding | Conflict with direct bind. Existing request row. |
| Manager → staff `dealer_role` | Manager promotes staff to manager | Conflict on who may write the role. Column exists. |
| Dealership → public address and contact | Directory cards | Columns exist; directory payload omits them. |
| Account display name | Many accounts may share it | Conflict with the unique key. |

## 13. Sortable columns

Sorting does not add columns. Each name is a field already covered above.

| Screen | Document columns | Storage |
| --- | --- | --- |
| DMS | Stock #, Body, Source, Condition, Cost, List price, Date added, Open WOS, Status | All already modeled. Sold by, Sold to, and Date sold are extra columns; only Date sold is stored. |
| Leads | All | Existing lead list fields. |
| Team members | Role, Source, Date added | `dealer_role`, derived account source, `membership.created_at`. |
| Team activity | When, Actor, Action, Record, Source IP, Location | All on `audit_event` except Location. |
| Join requests | Requested, Status, Resolved | Notification create time, resolved action, resolved time. |
| Admin audit | When, Actor, Action, Record, Location | Location is the gap. |
| Ad rules | Enabled, Severity | Already modeled. |
| Pending accounts | Registered | `app_user.created_at`. |
| Platform members | Dealership, Role, Sign-in, Status | Already modeled. |
| Manager audit menus | Action, Actor, When | Already modeled. |

## 14. Not a data-model change

Unsaved-change confirmation on dealership edit, vehicle add and edit, customer add and edit, lead add and edit, and dealership profile. Sample ads pointing at sign-up. Home-page audience sentence. Back button. Search-box order. Unlabeled day pickers. Removing the Make and Model boxes because VIN / make / model search covers them. A typeable year. Splitting the make list into major brands and every brand. Moving the VIN box. Limiting model years to the selected vehicle, or only to common vehicles if a full list is too hard. None of these ask for a new table. Make, model, and year lists stay the NHTSA catalog.

## 15. Gap summary

Needs a new stored fact:

- Vehicle seller.
- Sale buyer: a customer, or a typed other-buyer name.
- Customer notes, shape unspecified.
- Audit Location, only after that word is defined.
- Drop unique `display_name`.
- Stop treating customer phone as unique.
- Uniqueness for one lead per customer and vehicle, scope of closed leads unspecified.
- Carfax link check, and uniqueness if "exclusive" means unique.

Already modeled, so the change is a column on screen, a filter, or a rule on existing rows:

- Date sold, cost, list price, stock number, body, source, condition, date added, status, open work-order count, work-order cost, lead-to-vehicle link, lead owner, member joined date, member source, sign-in method, registered time, join-request requested / status / resolved, audit when / actor / action / record / source IP / change text, dealership address and contact, ad-rule enabled and severity, inquiry message length.

Conflicts with the design docs:

- Unique display name (`design/14`, `design/15` §8.3, `design/21` AUTH-16).
- Unique customer phone, including buyer-inquiry match by phone (`design/14` §5.2).
- Sell without a buyer; a sale does not close leads; `WON` and `LOST` cannot change (`design/15` §3–§4, `design/14` §4.5 and §5.5).
- Only the platform admin changes `dealer_role` and binds accounts (`design/15` §2.5 and §8.2).
- Optional dealership-admin role versus manager and staff only.
- Optional Carfax URL accepting any http(s) link (`design/14` §4.2).
- Exact actor match, and login audit rows with no password text (`design/14` §9, `design/15` §8.8).
- Hard reading of dealership or user delete versus nothing is deleted (`design/15` §8.6).

Deferred, with no fields to add:

- Home-page create-account becomes a dealership inquiry. Interim step is removing the button.
- Dealership admin / owner / regional manager. Optional, and not specified enough to model.
