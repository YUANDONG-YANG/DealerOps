# New capabilities in the change document

Source: `requirements/update-cr/Changes Document.docx` (section **Client Requests**, then **Site Fixes and Changes**). This note lists only behavior the document introduces as new, or that reads as net-new. Each item is labeled against current design and requirements:

- **already-covered** — the behavior is already specified.
- **conflicts** — the document asks for something the current design forbids or decides the other way.
- **silent** — the current design does not specify it.

Labels cite repo-relative paths. Nothing in a screenshot is treated as a requirement; the document often says “see screenshots” without stating the pictured detail in text. Where the document gives no separate acceptance check, the expected outcome below is the only hint it gives.

Fixes, labels, column order, control layout, and copy changes are not capabilities and are omitted. Items that might be either a new capability or a change to something that already exists are included and marked **Ambiguous**.

---

## 1. Vehicle sales on the DMS

### 1.1 Sold-by, sold-to, and date-sold columns

- **Who:** A signed-in dealership user on the DMS page. The document does not distinguish manager from staff.
- **Trigger:** The user opens the DMS list.
- **Expected outcome:** Three added columns. **Sold by** lists who sold the vehicle. **Sold to** lists the customer who bought it. **Date sold** lists the day it was sold.
- **Inputs / outputs:** No new input. Output is three list columns. The document has a heading “Where columns should go” and does not state the position in text.
- **Acceptance hint:** None beyond those three sentences.
- **Coverage:**
  - **Sold by — silent.** Sell stores a date and a price only (`design/14-Backend-API-Contract.md` §4.5). No seller field is defined. The sell audit actor is not specified as a column.
  - **Sold to — already-covered as data, silent as a column.** A linked customer is `{ id, name }` on the vehicle (`design/14-Backend-API-Contract.md` §4.1, `linkedCustomer`; `requirements/DealerOps-Requirements.md` DMS-08, CRM-10). The DMS list columns in `requirements/DealerOps-Requirements.md` (DMS page) do not include Sold to.
  - **Date sold — already-covered as data, silent as a column.** `soldOn` is set by sell and returned on the vehicle (`requirements/DealerOps-Requirements.md` DMS-02, DMS-10; `design/14-Backend-API-Contract.md` §4.1). The same DMS list does not include Date sold.
- **Ambiguous:** These are new columns on an existing page. Sold to and date sold may only be a list-layout change. Sold by is new data unless it is defined as the existing sell-audit actor, which the document does not say.

### 1.2 Cost, work-order spend, and list price in the sell menu

- **Who:** The user who clicks **Sell vehicle**. Role is not stated.
- **Trigger:** The sell-vehicle action is clicked.
- **Expected outcome:** That menu also shows cost, “total number spend on work orders”, and list price.
- **Inputs / outputs:** No new input is described. Output is three figures in the existing sell menu. The document points at “Menu in reference” and does not name the fields’ sources.
- **Acceptance hint:** None beyond that sentence.
- **Coverage:** **Silent** as sell-menu content. Purchase cost and list price already exist on the vehicle (`design/14-Backend-API-Contract.md` §4.1 `purchaseCost`, `listPrice`). Completed work-order cost is added into `repairCost` (`design/21-Feature-Extensions.md` WO-04), which is not the same sentence as a separate work-order total in the sell menu. The sell body remains `soldOn`, `soldPrice`, and `version` (`design/14-Backend-API-Contract.md` §4.5).
- **Ambiguous:** “Total number spend” can be read as a count or as a sum. The document does not say which, or whether it means `repairCost`.

### 1.3 Sale must name a customer, or “Other” plus a typed buyer

- **Who:** The user selling a vehicle. Role is not stated.
- **Trigger:** Selling a vehicle.
- **Expected outcome:** The sale cannot complete until it is linked to a customer. The user may instead pick **Other** and type a buyer.
- **Inputs / outputs:** Input is a CRM customer, or the Other choice plus a manually typed buyer. Output is a completed sale tied to that buyer. No field names or validation text are given.
- **Acceptance hint:** None beyond that sentence.
- **Coverage:**
  - Linking a CRM buyer from the sell dialog is **already-covered** and optional (`requirements/DealerOps-Requirements.md` DMS-10: the dialog “can also name the buyer”). Making the link required **conflicts** with that optional wording.
  - **Other** plus a typed name is **silent**. A vehicle has at most one customer, and a customer needs name, email, phone, and address (`requirements/DealerOps-Requirements.md` §4). The sell API does not take a buyer (`design/14-Backend-API-Contract.md` §4.5).
- **Ambiguous:** The document does not say whether Other creates a customer, stores a display name only, or how a typed buyer appears in Sold to (item 1.1).

### 1.4 Leads on the vehicle, and an optional lead-count column

- **Who:** A DMS user. Role is not stated.
- **Trigger:** Viewing vehicle information in DMS.
- **Expected outcome:** Leads are shown on the vehicle. A column for how many leads the vehicle has is described as a possible addition, “to help unify the systems”.
- **Inputs / outputs:** No new input. Output is lead information on the vehicle and, if added, a count column. Which lead fields appear is not stated.
- **Acceptance hint:** The purpose sentence is the only hint. The column is “possible”, not stated as required.
- **Coverage:** **Silent.** Lead list rows include a vehicle brief, and `GET /api/v1/leads` can filter by `customerId`, not by vehicle (`design/14-Backend-API-Contract.md` §5.5). The vehicle payload has `openWorkOrders` and `linkedCustomer`, not a lead count (`design/14-Backend-API-Contract.md` §4.1). `design/21-Feature-Extensions.md` §3 keeps the sale and the lead stage separate.
- **Ambiguous:** The count column is optional in the document’s own wording (“with the possible addition”).

### 1.5 Selling a vehicle closes the related leads

- **Who:** Not stated. The actor is whoever sells the vehicle; the people affected are “the customers tied to the lead”.
- **Trigger:** A vehicle is sold to a customer.
- **Expected outcome:** Leads tied to that sale are closed automatically, and “the appropriate label” is applied to the customers tied to the lead.
- **Inputs / outputs:** Input is the sale (and, by item 1.3, a customer). Output is closed leads plus a label. The label text, which leads match (same vehicle, same customer, or both), and whether the label is a lead stage or a customer flag are not stated.
- **Acceptance hint:** “This will increase integration between the systems of the site.” No example label is given.
- **Coverage:** **Conflicts** with the decision that a won lead does not sell the vehicle and the sale does not set the lead stage (`design/21-Feature-Extensions.md` §3; `design/14-Backend-API-Contract.md` §5.5: “`WON` does not sell the vehicle or link it”). Closed leads reject further stage changes with `409 LEAD_CLOSED`. Auto-close itself is **silent**.
- **Ambiguous:** “Label applied to the customers” may mean a lead stage (`WON` / `LOST`) or something stored on the customer. The document does not choose.

---

## 2. Sales reporting

### 2.1 Current day, week, month, and year on the sales report and the dashboard

- **Who:** The client, reading the sales report and the sales section of the dashboard. The document does not name a role. Both pages are dealer-user pages in the current design.
- **Trigger:** The user opens the sales report, or the sales section of the dashboard, and chooses a period.
- **Expected outcome:** Sales information can be viewed for the current day, week, month, and year. Each period is an option, on the sales report and in the dashboard sales section.
- **Inputs / outputs:** Input is one of those four period options. Output is “sales information” for that period. Measures are not listed.
- **Acceptance hint:** None beyond that request. It is under **Client Requests** and is marked urgent.
- **Coverage:** **Silent** for a day / week / month / year control. Nearby figures that already exist are not those four options: the dashboard shows sales this month and total sales (`design/21-Feature-Extensions.md` DASH-01); the vehicle sales report returns overall totals plus the twelve most recent months that had a sale (`design/14-Backend-API-Contract.md` vehicle sales report; `requirements/DealerOps-Requirements.md` CRM-15). Neither endpoint takes a period parameter.
- **Ambiguous:** “More information” on an existing sales report could mean new filters on the current month buckets. Day, week, and year are not in that report.

### 2.2 A list of sales employees and their sales metrics

- **Who:** The same reader as item 2.1.
- **Trigger:** Viewing the sales information described above. The document does not say whether the list is on the report, the dashboard, or both.
- **Expected outcome:** A list of all sales employees and their sales metrics.
- **Inputs / outputs:** No filter is described. Output is one row per sales employee with unspecified metrics.
- **Acceptance hint:** None. “Sales employees” is not defined.
- **Coverage:** **Silent.** Membership roles are manager and staff, not a sales role (`design/15-Data-Auth-and-Gateway.md` §2.5; `design/21-Feature-Extensions.md` AUTH-26). The sales report is dealership-wide and has no employee breakdown. Work-order settlement has per-assignee counts (`design/21-Feature-Extensions.md` WO-08); that is workshop work, not vehicle sales.
- **Ambiguous:** The document does not say whether every staff member is a sales employee, or only people who have sold a vehicle. It also does not say which metrics (units, revenue, profit, or something else).

---

## 3. Dealership roles and the public account entry

### 3.1 A manager promotes staff to manager

- **Who:** A dealership manager, acting on other staff.
- **Trigger:** Not named. The place implied by the next sentence is the members section.
- **Expected outcome:** A manager account can promote other staff to managers.
- **Inputs / outputs:** Input is the staff member to promote. Output is that person becoming a manager. Demotion, confirmation, and whether a manager can promote another manager are not stated.
- **Acceptance hint:** None. This is a client request and is marked urgent.
- **Coverage:** **Conflicts.** Only the platform admin changes a dealership role (`design/21-Feature-Extensions.md` AUTH-26; `design/14-Backend-API-Contract.md` §3.7b: “no dealer user can change a role”; `design/15-Data-Auth-and-Gateway.md` §2.5; `requirements/DealerOps-Requirements.md` roles paragraph).
- **Ambiguous:** No. The sentence is a new permission. The screen and the exact action are not named.

### 3.2 A manager edits certain employee information

- **Who:** A dealership manager.
- **Trigger:** Not named.
- **Expected outcome:** The manager can edit “certain employee information”.
- **Inputs / outputs:** The document does not list the fields.
- **Acceptance hint:** None.
- **Coverage:** **Silent** for a manager editing another person’s account. A manager can remove a staff member and edit the dealership profile (`design/14-Backend-API-Contract.md` §5.8). Account contact edits that exist are self-service (`displayName` and `phone` on `PATCH /me`, `design/14-Backend-API-Contract.md` §2.1) or admin password reset (`design/14-Backend-API-Contract.md` §3.7a). Binding an existing account does not change its contact fields (`design/14-Backend-API-Contract.md` §3.6).
- **Ambiguous:** “Certain” is undefined. If the intended edit is the role, it is item 3.1 and **conflicts** with AUTH-26. This item is not specific enough to implement.

### 3.3 Members column for when the member joined

- **Who:** A reader of the members section. The client request does not name the role. Elsewhere the document sorts Team > Members as “any user account”, while Team is manager-only in the design.
- **Trigger:** Viewing the members section.
- **Expected outcome:** A column listing when the member joined.
- **Inputs / outputs:** No input. Output is a join date or time per member. Format is not stated.
- **Acceptance hint:** The sortable-column list calls a related column “Date Added (when added)” under Team > Members. The document does not say that this is the same column.
- **Coverage:** **Silent.** `GET /api/v1/members` returns `username`, `displayName`, `source`, and `dealerRole` (`design/14-Backend-API-Contract.md` §5.6). It does not return a join time.
- **Ambiguous:** Only if “Date Added (when added)” in the sort list is a different column from “when the member joined”. The document uses both phrases.

### 3.4 Home-page account creation becomes a dealership inquiry

- **Who:** A dealership that wants to inquire and possibly use the service. The actor is on the home page and is not signed in as a dealer user.
- **Trigger:** The current create-account entry on the home page.
- **Expected outcome:** That entry becomes a way for dealerships to inquire about using the service.
- **Inputs / outputs:** Not stated. No fields, destination, or stored record are described.
- **Acceptance hint:** The next paragraph withdraws a full design: account creation “being done a different way” still needs client discussion, and “for now, removing the button to create account from the home page will suffice.”
- **Coverage:** The inquiry flow is **silent**. Removing public account creation **conflicts** with self sign-up (`design/21-Feature-Extensions.md` §5, AUTH-16; `design/14-Backend-API-Contract.md` §1.5 `POST /api/v1/auth/register`). A buyer-site vehicle inquiry already exists and is a different actor and payload (`design/21-Feature-Extensions.md` SHOP-04; `design/14-Backend-API-Contract.md` public `POST …/inquiries`).
- **Ambiguous:** The document asks for three different near-term outcomes: a dealership inquiry, a still-undiscussed account-creation method, and immediate removal of the button. Later in the same document, sample ads on the home page should link to the sign-up page rather than sign-in, which assumes a sign-up page remains. That ads sentence is a link change, not a separate capability, but it disagrees with removing create-account.

### 3.5 Optional dealership admin / owner / regional manager

- **Who:** A per-dealership account described as admin, owner, or regional manager. Spelled “regional manger” in the document.
- **Trigger:** Not specified. The document says the idea was discussed with the client.
- **Expected outcome:** The account has some admin capabilities to change things at one dealership, “like the platform admin account”, and is exclusive to that dealership. A privilege order is listed, most to least: platform admin; dealership admin / owner / regional manager; dealership manager; dealership staff; user not logged in.
- **Inputs / outputs:** None. The capabilities are not listed.
- **Acceptance hint:** “This functionality is optional and should likely be discussed further with the client before full implementation occurs.”
- **Coverage:** **Silent** as a role, and **conflicts** with the current three-level model if it is added as specified. Dealership membership is only `MANAGER` or `STAFF`, both are `Dealer.User`, and only the platform admin changes a role (`design/15-Data-Auth-and-Gateway.md` §2.5; `design/21-Feature-Extensions.md` AUTH-26). Platform admin is refused on dealer business APIs (`design/14-Backend-API-Contract.md` §4 and the contract overview). The same change document later says a platform admin must not be able to open a dealership’s customer and vehicle data.
- **Ambiguous:** Optional and explicitly not ready to implement. “Like the platform admin” clashes with an owner who would work inside one dealership’s data. The document does not say which admin actions this role gets. The privilege list is more definite than the “discuss first” sentence.

---

## 4. Leads and customers

### 4.1 Reopen a closed lead

- **Who:** A user on Leads. Role is not stated.
- **Trigger:** A lead is already closed, including an accidental closure.
- **Expected outcome:** There is a way to reopen it.
- **Inputs / outputs:** Not stated. No resulting stage is named.
- **Acceptance hint:** The accidental-closure example is the only hint.
- **Coverage:** **Conflicts.** `WON` and `LOST` are final (`design/21-Feature-Extensions.md` LEAD-03). Changing either returns `409 LEAD_CLOSED` (`design/14-Backend-API-Contract.md` §5.5). Notes on a closed lead are still allowed; that is not a reopen.
- **Ambiguous:** No. Reopen is new behavior. The target stage and who may do it are unspecified.

### 4.2 Block a second lead for the same customer and vehicle

- **Who:** The user creating a lead.
- **Trigger:** Creating a lead whose customer and vehicle match an existing lead.
- **Expected outcome:** The duplicate is refused, “to avoid redundancy”.
- **Inputs / outputs:** Inputs are the customer and vehicle already used by a lead. Output is a blocked create. The document does not say whether a closed lead still counts, or what happens when the vehicle is empty.
- **Acceptance hint:** None beyond the redundancy sentence.
- **Coverage:** **Silent.** `sales_lead` has no unique key on customer plus vehicle (`design/21-Feature-Extensions.md` §3 data). Create accepts an optional `vehicleId` (`design/14-Backend-API-Contract.md` §5.5).
- **Ambiguous:** Whether an already closed pair still blocks a new lead.

### 4.3 Add a lead from the customer menu

- **Who:** A user in the customer menu.
- **Trigger:** Working inside that menu. The control is not named.
- **Expected outcome:** The user can add a lead there.
- **Inputs / outputs:** Not stated. The customer is implied by the open customer.
- **Acceptance hint:** “Extra functionality and usefulness.” No fields are listed.
- **Coverage:** Creating a lead for an existing customer is **already-covered** (`POST /api/v1/leads` with `customerId`, `design/14-Backend-API-Contract.md` §5.5; `design/21-Feature-Extensions.md` LEAD-01). A leads list on the customer drawer that links to `/leads?leadId=` is **already-covered** (`design/21-Feature-Extensions.md` §3 UI). An add action inside the customer menu is **silent**.
- **Ambiguous:** This may be a second entry point to the existing create-lead flow, not a new kind of lead.

### 4.4 Notes on the customer

- **Who:** A user in the customer menu.
- **Trigger:** Not named beyond “in the customer menu”.
- **Expected outcome:** The user can add notes about customers.
- **Inputs / outputs:** Note text is implied. Length, author, time, and edit or delete rules are not stated.
- **Acceptance hint:** None.
- **Coverage:** **Silent** for a customer note. Append-only notes exist on leads only (`design/21-Feature-Extensions.md` LEAD-07; `design/14-Backend-API-Contract.md` §5.5 `POST /api/v1/leads/{id}/notes`). The customer record is the four contact fields plus linked vehicles (`requirements/DealerOps-Requirements.md` §4).
- **Ambiguous:** The document does not say whether this is a new customer note or the existing lead note shown from the customer. The sentence says “notes about customers”, which reads as its own feature.

### 4.5 Warn on a matching customer, and allow a shared phone

- **Who:** A user creating a customer, from CRM add or from customer creation on the leads page. The edit screen is listed as the location (“Add customer + Edit”) even though the sentence is about creation.
- **Trigger:** The name, email, phone, or address matches an existing customer.
- **Expected outcome:** A confirmation similar to “a customer with this name/email/phone/address (based on what it is) already exists, are you sure you would like to create a new customer”, and the user may continue. Phone is not exclusive, because two people may share a number and need separate profiles. The same rule applies to customer creation through leads.
- **Inputs / outputs:** Input is the four customer fields. Output is a warning that names the matching kind of field, then either a cancelled create or a second customer. The document does not say what happens if more than one field matches.
- **Acceptance hint:** The sample sentence above is the only hint.
- **Coverage:**
  - Duplicate email warning that still saves is **already-covered** for email only (`requirements/DealerOps-Requirements.md` CRM-13; `design/14-Backend-API-Contract.md` §5.2 `emailWarning`). The document’s confirm-before-create step is stricter than a warning returned on a successful save, so that interaction is **silent**.
  - Name and address warnings are **silent**.
  - Allowing a shared phone **conflicts** with one phone per dealership (`design/14-Backend-API-Contract.md` §5.2 `409 PHONE_TAKEN`). Buyer-site inquiries also reuse the customer with the same phone (`design/21-Feature-Extensions.md` SHOP-04).
- **Ambiguous:** The document groups four match types into one confirmation and also changes phone uniqueness. It does not say whether email still saves with a warning when the user confirms, which is the current email rule.

### 4.6 Show the customer’s leads instead of vehicles purchased

- **Who:** A user on CRM.
- **Trigger:** Viewing the CRM list column that currently shows vehicles purchased.
- **Expected outcome:** That column is replaced by the leads for the customer.
- **Inputs / outputs:** No new input. Output is lead information in place of the purchased-vehicle count or list. The document does not say which lead fields, or whether the vehicle links remain elsewhere.
- **Acceptance hint:** The rationale is that most people buy few vehicles, so a purchase count is less useful.
- **Coverage:** Removing the purchased-vehicles column **conflicts** with `requirements/DealerOps-Requirements.md` CRM-03 (the list shows purchased vehicles). Leads for one customer are **already-covered** (`GET /api/v1/leads?customerId=`, `design/14-Backend-API-Contract.md` §5.5; customer-drawer leads list in `design/21-Feature-Extensions.md` §3 UI).
- **Ambiguous:** The new part is the column swap. The underlying “leads for this customer” view already exists off the list.

---

## 5. Search and sort that add a new way to find or order records

### 5.1 Sortable columns on the listed tables

- **Who:** As stated per surface: any signed-in user for DMS, Leads, Team > Members, Team > Activity, and Team > Join Requests; platform admin for Audit log, Ad Rules, Pending accounts, and Members; a manager for “any menu with audit”.
- **Trigger:** The user sorts a listed column. The gesture is not specified.
- **Expected outcome:** These columns are sortable:
  - DMS: Stock#, Body, Source, Condition, Cost, List Price, Date Added, Open WOS, Status.
  - Leads: all columns.
  - Team > Members: Role, Source, Date Added (when added).
  - Team > Activity: When, Actor, Action, Record (type followed by number), Source IP, Location.
  - Team > Join Requests: Requested, Status, Resolved.
  - Platform admin audit log: When, Actor, Action, Record (type followed by number), Location.
  - Ad Rules: Enabled, Severity.
  - Pending accounts: Registered.
  - Platform admin Members: Dealership, Role, Sign-in, Status.
  - Manager audit menus: Action, Actor, When.
- **Inputs / outputs:** Input is the chosen column and, though not stated, a direction. Output is the same table reordered. Record format is “type followed by number”.
- **Acceptance hint:** The client named the DMS columns; the author added the others from screenshots and wrote that further sortable columns may be added if they seem useful. That invitation is not a requirement.
- **Coverage:** **Silent.** List order is fixed: vehicles default to `createdAt` descending with no `sort` parameter (`design/14-Backend-API-Contract.md` §4.1); leads are newest first (§5.5); members are sorted by username (§5.6); audit reads are newest first (§9). `design/12-Frontend-UI-Conventions.md` does not specify column sorting.
- **Ambiguous:** Sorting is new interaction on existing tables, not a new business record. “Any user account” on Team **conflicts** with Team being manager-only (`design/15-Data-Auth-and-Gateway.md` §2.5). Staff have no audit menu (`design/14-Backend-API-Contract.md` §9.1, AUD-17). Date Added on Members depends on item 3.3, which is silent.

### 5.2 Search the activity log by what changed

- **Who:** A manager on Team > Activity. The same idea is repeated for the platform-admin audit log (“search based on changes”).
- **Trigger:** The user searches the log with text from the change, for example the word “password”.
- **Expected outcome:** Matching rows are returned. The example says searching “password” finds all login requests made with passwords. Admin audit search options and columns should also share one order, and partial searches should return results. Column order and unlabeled day pickers are layout fixes, not separate capabilities.
- **Inputs / outputs:** Input is search text, illustrated by “password”. Output is the matching audit rows. Fields searched, match type, and empty results are not specified, except that partial admin-audit searches should hit.
- **Acceptance hint:** The “password” example is the only concrete check in the document.
- **Coverage:** **Silent** for text search of the change. Dealership and admin audit filters are `entityType`, `entityId`, `action`, `actor` (exact username), optional `dealerId` on the admin log, and `from` / `to` (`design/14-Backend-API-Contract.md` §9.2, §9.3). There is no query over `fieldSummary`. `LOGIN` and `LOGIN_FAILED` exist as actions (§9). The example **conflicts** with the rule that a password is never logged or returned (`design/14-Backend-API-Contract.md` §3.7a).
- **Ambiguous:** Partial match on the existing actor filter is a change to current search behavior (the document says partial user searches on Team activity return nothing). Text search of the change itself is the new capability. The password example cannot be satisfied from audit content as the design stands.

### 5.3 A stock-number search box on DMS

- **Who:** A DMS user.
- **Trigger:** Searching inventory.
- **Expected outcome:** A box searches by stock number. In the same passage the document also says to remove the Make and Model boxes, make Year typeable, and move the VIN box. Those are changes to existing controls, not separate capabilities.
- **Inputs / outputs:** Input is a stock number. Output is the matching vehicles. Match rules are not stated.
- **Acceptance hint:** None for the stock-number box itself.
- **Coverage:** Finding a vehicle by stock number is **already-covered** because list search `q` matches `stockNumber` (`design/14-Backend-API-Contract.md` §4.1; `design/21-Feature-Extensions.md` DMS-18 and EXT-11). A separate box is **silent**.
- **Ambiguous:** A dedicated box does not add a search the current `q` box lacks, unless the document means an exact stock-number filter. It does not say that.

### 5.4 Search vehicles that have open work orders

- **Who:** A DMS user, in the same vehicle-form / search passage as the VIN box.
- **Trigger:** Using a new box “to search for vehicles with open work orders”.
- **Expected outcome:** The user can limit vehicles to those with open work orders.
- **Inputs / outputs:** The document says “a box” but not whether it is a yes/no filter or a count. Output is the matching vehicles.
- **Acceptance hint:** None.
- **Coverage:** **Silent** as a filter. The list already returns `openWorkOrders` and the DMS list shows that count (`design/14-Backend-API-Contract.md` §4.1; `design/21-Feature-Extensions.md` WO-07). The list query parameters do not include an open-work-order flag (`design/14-Backend-API-Contract.md` §4.1).
- **Ambiguous:** Only the control type (checkbox versus a number). The outcome, vehicles with open work orders, is clear.

### 5.5 Vehicle-name search on leads, and a customer-name list that updates while typing

- **Who:** A user on the leads page.
- **Trigger:** Searching leads. Separately, typing in the customer-name box.
- **Expected outcome:** A search box for vehicle name. The customer-name list updates as a name is typed, in the same way as DMS and CRM.
- **Inputs / outputs:** Inputs are a vehicle name and a partial customer name. Outputs are the filtered lists. “Vehicle name” is not defined (year/make/model versus stock number or VIN).
- **Acceptance hint:** Customer-name behavior should be “similar to the DMS and CRM pages”.
- **Coverage:** Customer-name contains-search is **already-covered** (`GET /api/v1/leads?q=` matches customer name, `design/14-Backend-API-Contract.md` §5.5). A live-updating list is **silent** as a UI behavior. Vehicle-name search is **silent**; `q` is not specified to match the vehicle.
- **Ambiguous:** The customer-name half may only be making the existing `q` filter update on each keystroke. The vehicle-name box is new search content.

### 5.6 Two join-request tables: waiting and past

- **Who:** A manager on Team > Join requests (“any manager account”).
- **Trigger:** Opening join requests.
- **Expected outcome:** One table of current requests that still need approval or rejection, and a second table of past requests that were approved or rejected.
- **Inputs / outputs:** No new decision action. Output is the same requests split by whether they are still open. Columns are not restated here; the sort list names Requested, Status, and Resolved.
- **Acceptance hint:** None beyond the two-table split.
- **Coverage:** The pending list is **already-covered** (`GET /api/v1/dealer/join-requests` returns unbound accounts that requested this dealership, `design/14-Backend-API-Contract.md` §5.7). A history of resolved join notifications is **already-covered** on the notification feed (`includeResolved=true`, `resolvedAction` of `APPROVED`, `REJECTED`, or `CANCELLED`, same section), not as a second table on Team > Join requests. That second table is **silent**.
- **Ambiguous:** The document presents this as a split of a list that “lists every single request”, which is a layout change if past rows are already on that page. The design’s join-request collection itself does not include resolved rows, so a past table would be new on that page.

---

## 6. Platform administration

### 6.1 Platform admin sends a join request instead of binding an account

- **Who:** The platform admin.
- **Trigger:** Attaching an account to a dealership. The document’s location for nearby staff-account work is Dealerships > Staff.
- **Expected outcome:** The admin cannot bind an account directly. The admin can only send a join request to the dealership. The stated reason is that a direct bind would let the admin create an account and then open that dealership’s customer and vehicle data, which the client does not want.
- **Inputs / outputs:** Input is the account and the target dealership. Output is a join request the dealership must handle. Who approves it is not restated; existing join requests are approved by a manager.
- **Acceptance hint:** The security sentence is the rationale, not a test script.
- **Coverage:** **Conflicts** with the admin bind. Pending accounts are added with `POST /api/v1/admin/dealers/{id}/members` without a password (`design/14-Backend-API-Contract.md` §3.6 and §3.8; `design/15-Data-Auth-and-Gateway.md` §2.5 and the “Issuing access” row). An applicant’s own join request is **already-covered** (`POST /api/v1/me/join-request`, `design/14-Backend-API-Contract.md` §5.7). An admin action that sends that request is **silent**. Admin calls to vehicle and customer APIs are already refused (`design/14-Backend-API-Contract.md` §4).
- **Ambiguous:** The document forbids direct bind and also says the admin must not reach customer and vehicle data. The design already blocks the admin on those APIs, so the new part is replacing bind with a join request. It does not say whether admin-created staff accounts inside a dealership also stop.

### 6.2 Remove a pending account

- **Who:** An admin, on platform-admin pending accounts.
- **Trigger:** Not named.
- **Expected outcome:** Admins can remove pending accounts.
- **Inputs / outputs:** Input is the pending account. Output is that it is removed. The document does not say whether the login is deleted, deactivated, or only dropped from the list.
- **Acceptance hint:** None.
- **Coverage:** **Silent** for an admin remove. The pending list is accounts with no active membership (`design/14-Backend-API-Contract.md` §3.8). Unbind does not delete `app_user` (`design/14-Backend-API-Contract.md` §3.7). The account holder can soft-delete their own account (`design/14-Backend-API-Contract.md` §2.2). There is no admin delete-user API.
- **Ambiguous:** “Remove” may mean delete the account or hide the row. Those are different outcomes.

### 6.3 Edit a pending account’s email, phone, or username

- **Who:** An admin, on pending accounts.
- **Trigger:** Account-creation information was entered incorrectly.
- **Expected outcome:** The admin can edit the pending account “in some way”, with email, phone, and username given as examples.
- **Inputs / outputs:** Examples are email, phone, and username. No validation or uniqueness outcome is stated.
- **Acceptance hint:** The incorrect-entry example is the only hint.
- **Coverage:** **Silent.** For an existing account, admin bind does not change contact fields (`design/14-Backend-API-Contract.md` §3.6). Self-service profile edit changes `displayName` and `phone`, not email or username (`design/14-Backend-API-Contract.md` §2.1). Username identifies the account in the pending list and in bind (§3.6, §3.8).
- **Ambiguous:** “In some way” plus “such as” does not close the field list. Changing username conflicts in spirit with username as the account key, but no sentence forbids an admin rename because no admin edit exists.

### 6.4 Delete a dealership, with an extra confirmation

- **Who:** The platform admin, on Dealerships > Edit.
- **Trigger:** The admin deletes a dealership.
- **Expected outcome:** Deletion is possible and needs at least one extra confirmation step because it is “a more complex decision”.
- **Inputs / outputs:** Input is the dealership and a confirmation. Output is a deleted dealership. What happens to staff, vehicles, customers, and leads is not stated.
- **Acceptance hint:** “At least one extra step to confirm.” No confirmation text is given.
- **Coverage:** **Conflicts.** `design/14-Backend-API-Contract.md` §3.4: “Do not add `DELETE /admin/dealers/{id}` (the spec does not require deleting dealerships).” `design/18-Backend-Core-Engineering.md` also says no delete dealership. Dealership edit is contact fields, `active`, logo, and `version` (`design/14-Backend-API-Contract.md` §3.4).
- **Ambiguous:** No, on the request itself. The fate of dealership data is unspecified, so the delete behavior is not fully defined.

### 6.5 Delete a user, with an extra confirmation, and edit email or phone

- **Who:** An admin. The document says “Admins” and does not say platform admin only, but the surrounding items are platform-admin actions.
- **Trigger:** Deleting a user, or correcting account contact information.
- **Expected outcome:** The admin can delete users, with at least one extra confirmation step, and can edit some account information, “such as email or phone number”.
- **Inputs / outputs:** Input is the user, a confirmation for delete, and for edit an email or phone. Output is a deleted user or updated contact values. Scope of “some information” is not closed.
- **Acceptance hint:** The extra confirmation is the only delete hint. No message text is given.
- **Coverage:** Admin delete of a user account is **silent** and **conflicts** with unbind leaving `app_user` in place (`design/14-Backend-API-Contract.md` §3.7: “Unbind; do not delete the `app_user` account”). Self-delete exists for the signed-in user only (`design/14-Backend-API-Contract.md` §2.2) and refuses `Platform.Admin`. Admin edit of another account’s email or phone is **silent** (same gap as item 6.3).
- **Ambiguous:** “Such as email or phone” does not limit the editable fields. Whether delete is a soft delete, and whether it applies to pending accounts (item 6.2) as well as members, is not stated.

---

## 7. Data checks the document adds

### 7.1 VIN must match the vehicle information

- **Who:** A user on the DMS page. The sentence does not name add versus edit.
- **Trigger:** Saving vehicle information that includes a VIN.
- **Expected outcome:** “VINs should be forced to match vehicle information in DMS page.”
- **Inputs / outputs:** Not stated. No error text is given.
- **Acceptance hint:** None.
- **Coverage:** **Silent.** VIN is 17 characters, upper case, no I/O/Q, and unique per dealership (`requirements/DealerOps-Requirements.md` DMS-03, DMS-04). Decode prefills make, model, year, and body type and does not save a vehicle by itself (`design/14-Backend-API-Contract.md` §4.6.1). Nothing requires the saved make, model, or year to equal the decode result.
- **Ambiguous:** The sentence does not say what “match vehicle information” compares (decode versus typed make/model/year, VIN versus an existing vehicle, or something else). It is not implementable from the sentence alone.

### 7.2 Carfax URL is exclusive and must be a real Carfax link

- **Who:** A user saving the Carfax URL box in DMS.
- **Trigger:** Saving that field.
- **Expected outcome:** The box is “exclusive” and an actual Carfax link is required before the information is saved.
- **Inputs / outputs:** Input is the URL. Output is a refused save when the value fails the rule. The accepted host pattern and the error text are not given.
- **Acceptance hint:** None.
- **Coverage:** **Conflicts** with the current optional http(s) URL of at most 500 characters (`requirements/DealerOps-Requirements.md` DMS-02 and the vehicle field table; `design/14-Backend-API-Contract.md` §4.2). Uniqueness of `carfaxUrl` is **silent**.
- **Ambiguous:** “Exclusive” may mean unique across vehicles, or that the box accepts only Carfax links. “Require an actual Carfax link before the information is saved” may also make the field required. The document does not choose. Today the field is optional.

---

## 8. Public shop

### 8.1 Search dealerships, and show address and contact on each directory card

- **Who:** A visitor on Home page > shop vehicles. Sign-in is not required by the document.
- **Trigger:** Using the dealership shop page.
- **Expected outcome:** The visitor can search for dealerships. Each dealership on that page lists its address and some contact information.
- **Inputs / outputs:** The search input is not defined (name, city, or something else). Output is a filtered directory, plus address and contact on each card. Which contact fields are “some” is not stated.
- **Acceptance hint:** None.
- **Coverage:** Directory search is **silent**. `GET` of active dealerships for the buyer-site directory returns id, legal name, slug, logo flag, and in-stock and sold counts, sorted by legal name, with no search parameter (`design/14-Backend-API-Contract.md` public dealer list near §4.6; `design/21-Feature-Extensions.md` SHOP-01). Address and contact on the directory cards are **silent**. The dealership’s own shop page already shows contact details (`design/21-Feature-Extensions.md` SHOP-01; inventory payload includes `contactPhone`, `contactEmail`, and `contactAddress` in `design/14-Backend-API-Contract.md` public inventory).
- **Ambiguous:** “Some contact information” does not choose phone, email, or both. Search fields are unnamed.

### 8.2 Search one dealership’s inventory

- **Who:** A visitor who opened a dealership from Home page > shop vehicles.
- **Trigger:** Looking at that dealership’s buyer site.
- **Expected outcome:** The visitor can search that dealership’s inventory for a specific vehicle. The document also asks for a back button; that is navigation chrome, not a capability.
- **Inputs / outputs:** The search text is “a specific vehicle”. The sentence is cut off at “vehicl”. Fields (make, model, year, or keyword) are not stated. Output is the matching listed vehicles.
- **Acceptance hint:** None. The path is “click any dealership”.
- **Coverage:** **Silent.** Public inventory returns every listed vehicle for that dealership and has no search query (`design/14-Backend-API-Contract.md` `GET /api/v1/public/dealers/{dealer}/inventory`; `design/21-Feature-Extensions.md` SHOP-02). Listed vehicles omit VIN, cost, list price, and customer data.
- **Ambiguous:** The match key is not defined, and the source sentence is truncated.

---

## Not counted as new capabilities

The rest of the document is a fix or a change to an existing control. It is outside this note, including: unique full-name blocking account create; unsaved-change and lead-close confirmation; unlabeled day pickers; search-control order; removing DMS Make and Model boxes; a typeable Year; splitting the make list into major brands and all brands; limiting model years to the selected vehicle; moving the VIN box; restyling Customer and Vehicle of interest; partial member-name search; prefilling the lead owner; renaming display name to full name; a clearer username error; sample ads linking to sign-up; a stronger “for dealerships” home-page message; dropping the word “used” on the shop; a back button; and showing the inquiry character limit as the user approaches it. The inquiry limit of 1–1000 characters is already specified (`design/21-Feature-Extensions.md` SHOP-04).
