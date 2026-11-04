# Implementation check summary

Whether the active .NET backend and React frontend already implement the change inventory in `requirements/update-cr/analysis`.

This file only restates the status each source file assigned. It does not re-score the code. The twenty check files partition CR-001 through CR-068. Their ranges do not overlap, and no two files assign different statuses to the same CR.

## Counts

| Status | Count |
| --- | ---: |
| Total CRs | 68 |
| implemented | 54 |
| partial | 13 |
| not-implemented | 0 |
| contradicted | 0 |
| not-applicable | 1 |

No CR number from CR-001 through CR-068 is missing. All twenty source files are present: `01-cr-001-004.md` through `20-cr-066-068.md`.

Partial: CR-009, CR-012, CR-014, CR-016, CR-018, CR-020, CR-022, CR-041, CR-047, CR-048, CR-051, CR-052, CR-055.

Not-applicable: CR-010.

## All change requests

| CR | Status | Evidence | Source |
| --- | --- | --- | --- |
| CR-001 | implemented | The DMS inventory table has Sold by, Sold to, and Date sold, filled from the sale. | [01-cr-001-004.md](requirements/update-cr/implementation-check/01-cr-001-004.md) |
| CR-002 | implemented | The sell dialog shows cost, work-order spend (`repairCost`), and list price. | [01-cr-001-004.md](requirements/update-cr/implementation-check/01-cr-001-004.md) |
| CR-003 | implemented | The sales report lists Today, This week, This month, and This year, and reloads that period’s totals. | [01-cr-001-004.md](requirements/update-cr/implementation-check/01-cr-001-004.md) |
| CR-004 | implemented | The dashboard Sales section uses the same four period options and the same period totals. | [01-cr-001-004.md](requirements/update-cr/implementation-check/01-cr-001-004.md) |
| CR-005 | implemented | The sales report lists each active member, plus former members who sold in the period, with sold count, revenue, gross profit, open leads, and won leads. | [02-cr-005-008.md](requirements/update-cr/implementation-check/02-cr-005-008.md) |
| CR-006 | implemented | A dealership manager can set another member of the same dealership to manager. The caller cannot change their own role. | [02-cr-005-008.md](requirements/update-cr/implementation-check/02-cr-005-008.md) |
| CR-007 | implemented | A dealership manager can edit another member’s full name and phone. | [02-cr-005-008.md](requirements/update-cr/implementation-check/02-cr-005-008.md) |
| CR-008 | implemented | Team > Members has a Joined column from the membership row’s `created_at`. | [02-cr-005-008.md](requirements/update-cr/implementation-check/02-cr-005-008.md) |
| CR-009 | partial | Home-page Create account buttons are gone; the dealership-use inquiry is not built, and `/register` still exists. | [03-cr-009-012.md](requirements/update-cr/implementation-check/03-cr-009-012.md) |
| CR-010 | not-applicable | Optional dealership admin, owner, or regional manager is discussion only; code still has platform admin, manager, and staff. | [03-cr-009-012.md](requirements/update-cr/implementation-check/03-cr-009-012.md) |
| CR-011 | implemented | The named DMS columns sort on the server for manager and staff. | [03-cr-009-012.md](requirements/update-cr/implementation-check/03-cr-009-012.md) |
| CR-012 | partial | Every Leads data column has a sortable header, and that sort covers only the current page of 10. | [03-cr-009-012.md](requirements/update-cr/implementation-check/03-cr-009-012.md) |
| CR-013 | implemented | Team > Members sorts Role, Source, and the join date across the full member list. | [04-cr-013-016.md](requirements/update-cr/implementation-check/04-cr-013-016.md) |
| CR-014 | partial | Team > Activity sorts When, Actor, Action, Record, and Source IP on the server. Location is absent. | [04-cr-013-016.md](requirements/update-cr/implementation-check/04-cr-013-016.md) |
| CR-015 | implemented | Team > Join requests sorts Requested on both tables, and Status and Resolved on History. | [04-cr-013-016.md](requirements/update-cr/implementation-check/04-cr-013-016.md) |
| CR-016 | partial | Admin > Audit log sorts When, Actor, Action, and Record on the server. Location is absent. | [04-cr-013-016.md](requirements/update-cr/implementation-check/04-cr-013-016.md) |
| CR-017 | implemented | Ad rules: Enabled and Severity sort the full catalog. | [05-cr-017-020.md](requirements/update-cr/implementation-check/05-cr-017-020.md) |
| CR-018 | partial | Pending accounts: Registered sorts only the first page of 10. | [05-cr-017-020.md](requirements/update-cr/implementation-check/05-cr-017-020.md) |
| CR-019 | implemented | Admin Members: Dealership, Role, Sign-in, and Status sort the full loaded list, then the page is cut. | [05-cr-017-020.md](requirements/update-cr/implementation-check/05-cr-017-020.md) |
| CR-020 | partial | Manager record-audit menus: Action, Actor, and When sort the loaded page only. | [05-cr-017-020.md](requirements/update-cr/implementation-check/05-cr-017-020.md) |
| CR-021 | implemented | Register, admin staff create, and profile save accept a full name that another account already uses. | [06-cr-021-024.md](requirements/update-cr/implementation-check/06-cr-021-024.md) |
| CR-022 | partial | The four named menus confirm before a dirty form is discarded. An ordinary save on those menus is not confirmed. | [06-cr-021-024.md](requirements/update-cr/implementation-check/06-cr-021-024.md) |
| CR-023 | implemented | Team > Dealership profile opens a confirm dialog before the profile is saved. | [06-cr-021-024.md](requirements/update-cr/implementation-check/06-cr-021-024.md) |
| CR-024 | implemented | Leads > Open asks before a save that sets the stage to Won or Lost. | [06-cr-021-024.md](requirements/update-cr/implementation-check/06-cr-021-024.md) |
| CR-025 | implemented | Team > Join requests renders a Pending table and a History table. | [07-cr-025-028.md](requirements/update-cr/implementation-check/07-cr-025-028.md) |
| CR-026 | implemented | Team activity and the admin audit log label the day pickers “From date” and “To date”. | [07-cr-025-028.md](requirements/update-cr/implementation-check/07-cr-025-028.md) |
| CR-027 | implemented | Team activity has “Search changes”, and `q` matches the stored change text, including the password sign-in method. | [07-cr-025-028.md](requirements/update-cr/implementation-check/07-cr-025-028.md) |
| CR-028 | implemented | On Team > Activity the filters follow When, Actor, Action, Record, and Changes. | [07-cr-025-028.md](requirements/update-cr/implementation-check/07-cr-025-028.md) |
| CR-029 | implemented | The DMS filter row has no Make or Model boxes. Make and model are covered by the search field. | [08-cr-029-032.md](requirements/update-cr/implementation-check/08-cr-029-032.md) |
| CR-030 | implemented | The DMS Year filter is a typeable number input, sent as an exact `modelYear`. | [08-cr-029-032.md](requirements/update-cr/implementation-check/08-cr-029-032.md) |
| CR-031 | implemented | The same DMS search field matches stock number on the server. There is no second Stock # box. | [08-cr-029-032.md](requirements/update-cr/implementation-check/08-cr-029-032.md) |
| CR-032 | implemented | Add Vehicle Make is two groups: “Popular makes”, then “All makes”. | [08-cr-029-032.md](requirements/update-cr/implementation-check/08-cr-029-032.md) |
| CR-033 | implemented | Add and edit Model year lists production years for a fixed set of common make/model pairs; every other pair keeps the full year list. | [09-cr-033-035.md](requirements/update-cr/implementation-check/09-cr-033-035.md) |
| CR-034 | implemented | VIN is the first field in the Add vehicle and Edit vehicle drawer. | [09-cr-033-035.md](requirements/update-cr/implementation-check/09-cr-033-035.md) |
| CR-035 | implemented | DMS has an “Open work orders only” checkbox that lists vehicles with an open or in-progress work order. | [09-cr-033-035.md](requirements/update-cr/implementation-check/09-cr-033-035.md) |
| CR-036 | implemented | Add lead Customer and Vehicle of interest are `SearchSuggest` pickers, the same control as the leads list search. | [10-cr-036-038.md](requirements/update-cr/implementation-check/10-cr-036-038.md) |
| CR-037 | implemented | Team Activity actor search returns rows whose username contains the typed text, ignoring case. | [10-cr-036-038.md](requirements/update-cr/implementation-check/10-cr-036-038.md) |
| CR-038 | implemented | Add lead sets Owner to the signed-in username and leaves the select changeable. | [10-cr-036-038.md](requirements/update-cr/implementation-check/10-cr-036-038.md) |
| CR-039 | implemented | Leads has a vehicle search box. `vehicle` matches year, make, and model, and also VIN. | [11-cr-039-041.md](requirements/update-cr/implementation-check/11-cr-039-041.md) |
| CR-040 | implemented | Typing in Customer name reloads the lead list after a 300 ms pause, as DMS and CRM do. | [11-cr-039-041.md](requirements/update-cr/implementation-check/11-cr-039-041.md) |
| CR-041 | partial | A closed lead can be reopened, except a won lead sold to that customer, and except when another open lead already uses the same customer and vehicle. | [11-cr-039-041.md](requirements/update-cr/implementation-check/11-cr-039-041.md) |
| CR-042 | implemented | The CRM list has a Leads column (`leadCount`). There is no Vehicles purchased column. | [12-cr-042-044.md](requirements/update-cr/implementation-check/12-cr-042-044.md) |
| CR-043 | implemented | The open customer drawer has New lead, which opens Add lead for that customer. | [12-cr-042-044.md](requirements/update-cr/implementation-check/12-cr-042-044.md) |
| CR-044 | implemented | The customer drawer has a Notes field stored on the customer. | [12-cr-042-044.md](requirements/update-cr/implementation-check/12-cr-042-044.md) |
| CR-045 | implemented | CRM add and edit, and lead “new customer”, ask before saving when name, email, phone, or address matches another customer. | [13-cr-045-047.md](requirements/update-cr/implementation-check/13-cr-045-047.md) |
| CR-046 | implemented | Customer create and update accept a phone another customer already has. Account phones stay unique. | [13-cr-045-047.md](requirements/update-cr/implementation-check/13-cr-045-047.md) |
| CR-047 | partial | Save refuses a VIN whose 10th character does not match the model year. Make, model, and a decoded vehicle are not forced. | [13-cr-045-047.md](requirements/update-cr/implementation-check/13-cr-045-047.md) |
| CR-048 | partial | A non-empty Carfax URL must be https on carfax.com or carfax.ca. The same URL is not exclusive across vehicles, and a blank URL still saves. | [14-cr-048-050.md](requirements/update-cr/implementation-check/14-cr-048-050.md) |
| CR-049 | implemented | A sale is refused without a CRM customer or Other plus a typed buyer name. Other is stored as `soldToName` and does not create a customer link. | [14-cr-048-050.md](requirements/update-cr/implementation-check/14-cr-048-050.md) |
| CR-050 | implemented | The DMS vehicle drawer lists that vehicle’s leads. The inventory table also has a Leads count column. | [14-cr-048-050.md](requirements/update-cr/implementation-check/14-cr-048-050.md) |
| CR-051 | partial | Staff create, vehicle change, and reopen reject a second open lead for the same customer and vehicle. A closed lead does not block another, and a buyer-site inquiry does not check. | [15-cr-051-053.md](requirements/update-cr/implementation-check/15-cr-051-053.md) |
| CR-052 | partial | Selling a vehicle closes that vehicle’s open leads (Won for the CRM buyer, Lost for every other). No label is written on the customer. | [15-cr-051-053.md](requirements/update-cr/implementation-check/15-cr-051-053.md) |
| CR-053 | implemented | Profile and the admin staff-account form label the `displayName` field “Full name”. | [15-cr-051-053.md](requirements/update-cr/implementation-check/15-cr-051-053.md) |
| CR-054 | implemented | Creating staff with an illegal username returns a plain-English field error, and the staff drawer shows it under Username. | [16-cr-054-056.md](requirements/update-cr/implementation-check/16-cr-054-056.md) |
| CR-055 | partial | After a dealership has a manager, admin create or bind files a join request. With no manager, the same call still binds the login directly as the first manager. | [16-cr-054-056.md](requirements/update-cr/implementation-check/16-cr-054-056.md) |
| CR-056 | implemented | A platform admin can remove a pending account from the pending list. Removal is a soft delete with a confirm dialog. | [16-cr-054-056.md](requirements/update-cr/implementation-check/16-cr-054-056.md) |
| CR-057 | implemented | A platform admin can edit a pending account’s username, email, and phone. | [17-cr-057-059.md](requirements/update-cr/implementation-check/17-cr-057-059.md) |
| CR-058 | implemented | Admin audit filters follow the column order through Changes, and `q` searches the stored change. | [17-cr-057-059.md](requirements/update-cr/implementation-check/17-cr-057-059.md) |
| CR-059 | implemented | Actor and change text are substring matches, and the day pickers read From date and To date. | [17-cr-057-059.md](requirements/update-cr/implementation-check/17-cr-057-059.md) |
| CR-060 | implemented | A platform admin soft-deletes a dealership after typing its legal name. The button is on the Dealerships list, not in the Edit drawer. | [18-cr-060-062.md](requirements/update-cr/implementation-check/18-cr-060-062.md) |
| CR-061 | implemented | A platform admin soft-deletes a member account after typing the username. Pending accounts have a separate confirm-and-delete. | [18-cr-060-062.md](requirements/update-cr/implementation-check/18-cr-060-062.md) |
| CR-062 | implemented | A platform admin edits a member’s email and phone. Pending accounts can also be edited, including email and phone. | [18-cr-060-062.md](requirements/update-cr/implementation-check/18-cr-060-062.md) |
| CR-063 | implemented | Each opened sample ad links to `/register` (“Sign up to check your own ads”). No sample-ad control goes to `/login`. | [19-cr-063-065.md](requirements/update-cr/implementation-check/19-cr-063-065.md) |
| CR-064 | implemented | A banner above the hero says Dealer Ops is software for car dealerships, not a place to buy a car. | [19-cr-063-065.md](requirements/update-cr/implementation-check/19-cr-063-065.md) |
| CR-065 | implemented | The shop directory heading is “Shop vehicles.” The shop page does not label the inventory as used. | [19-cr-063-065.md](requirements/update-cr/implementation-check/19-cr-063-065.md) |
| CR-066 | implemented | `/shop` searches dealership name and address and shows address, phone, and email on each card. | [20-cr-066-068.md](requirements/update-cr/implementation-check/20-cr-066-068.md) |
| CR-067 | implemented | `/shop/:dealer` has a back link to `/shop` and a year, make, and model inventory search. | [20-cr-066-068.md](requirements/update-cr/implementation-check/20-cr-066-068.md) |
| CR-068 | implemented | The inquiry message shows “n of 1000 characters left” once 50 or fewer remain. | [20-cr-066-068.md](requirements/update-cr/implementation-check/20-cr-066-068.md) |

## Implemented highlights

Only items the source files mark implemented.

### DMS and sales

- Inventory shows Sold by, Sold to, and Date sold (CR-001). The sell dialog shows cost, work-order spend, and list price (CR-002). A sale requires a CRM customer or Other plus a typed buyer name (CR-049). The vehicle drawer lists that vehicle’s leads, and the table has a Leads count (CR-050).
- The sales report and the dashboard Sales section share Today, This week, This month, and This year (CR-003, CR-004). The sales report also lists each active member, and former members who sold in the period, with sold count, revenue, gross profit, open leads, and won leads (CR-005).
- The named DMS columns sort on the server (CR-011). Make and Model filter boxes are gone; search covers VIN, stock number, make, and model (CR-029, CR-031). Year is a typeable exact year (CR-030). Add Vehicle splits Make into Popular makes and All makes (CR-032), limits Model year for a fixed set of common pairs (CR-033), and puts VIN first (CR-034). “Open work orders only” keeps vehicles with an open or in-progress work order (CR-035).

### Team and roles

- A manager can promote another member to manager, and cannot change their own role (CR-006). A manager can edit another member’s full name and phone (CR-007). Members has a Joined column from membership `created_at` (CR-008). Role, Source, and Joined sort the full member list (CR-013).
- Join requests are split into Pending and History (CR-025). Requested sorts on both tables; Status and Resolved sort on History (CR-015). Saving the dealership profile asks for confirmation (CR-023).
- Team activity labels the day pickers, searches stored change text, and lines filters up with When, Actor, Action, Record, and Changes (CR-026, CR-027, CR-028). Actor search matches any part of the username (CR-037).
- Register, admin staff create, and profile save accept a full name another account already uses (CR-021).

### Leads and CRM

- Add lead uses the same suggestion pickers as the leads list for Customer and Vehicle of interest (CR-036). Owner starts as the signed-in user and stays changeable (CR-038). The list has a vehicle search (CR-039), and the customer-name box reloads the list while typing (CR-040). Closing a lead as Won or Lost asks before save (CR-024).
- The CRM list shows a Leads count and does not show Vehicles purchased (CR-042). The open customer drawer can start a new lead for that customer (CR-043) and stores notes on the customer (CR-044). A matching name, email, phone, or address asks before the customer is saved (CR-045). Customer phones may be shared; account phones stay unique (CR-046).

### Admin

- Ad Rules sorts Enabled and Severity across the full catalog (CR-017). Admin Members sorts Dealership, Role, Sign-in, and Status across the full loaded list, then pages (CR-019).
- An illegal staff username returns a plain-English field error under Username (CR-054). A platform admin can edit a pending account’s username, email, and phone (CR-057) and can soft-delete a pending account after a confirm dialog (CR-056).
- The admin audit log orders filters with its columns through Changes, searches the stored change, matches partial actor and change text, and labels the day pickers (CR-058, CR-059). The same day-picker labels are on Team activity (CR-026).
- A platform admin soft-deletes a dealership after typing its legal name (CR-060), soft-deletes a member account after typing the username (CR-061), and edits a member’s email and phone (CR-062). Profile and the staff-account form label `displayName` as Full name (CR-053).

### Public shop

- Opened sample ads on the home page link to sign-up (CR-063). A banner above the hero says the product is for dealerships, not a place to buy a car (CR-064).
- The shop directory is headed “Shop vehicles” and does not label the inventory as used (CR-065). `/shop` searches dealership name and address and shows address, phone, and email (CR-066). A dealership page links back to the directory and searches that inventory by year, make, and model (CR-067). The ask-about-this-vehicle message shows characters left once 50 or fewer of 1000 remain (CR-068).

## Partial items

Each item below is partial in its source file. Present and missing are taken from that file.

### CR-009 — Home Create account versus a dealership inquiry

Source: [03-cr-009-012.md](requirements/update-cr/implementation-check/03-cr-009-012.md).

**Present:** The home page no longer shows a Create account control in the header, the hero, or the bottom call to action. Those blocks offer Sign in. The hero also offers Decode a VIN. The footer links Disclaimer and Shop vehicles.

**Missing:** Nothing on the home page collects a dealership’s inquiry about using the service. The buyer-site form asks about a listed vehicle; it is not that inquiry. `/register` is still mounted, Login still links Create account to `/register`, and the gateway still allows anonymous registration. One home-page control still opens registration: the sample-ad link “Sign up to check your own ads”. The change note says removing the home-page button is enough for now, and that a different account-creation method still needs a client discussion. The inquiry form, its fields, and a new endpoint are not specified there.

### CR-012 — Leads sort is page-only

Source: [03-cr-009-012.md](requirements/update-cr/implementation-check/03-cr-009-012.md).

**Present:** Every Leads data column has a sortable header: Customer, Vehicle of interest, Stage, Owner, and Next follow-up. Manager and staff can open the page.

**Missing:** A header click does not reload the list. The list request has no sort argument, and the server always orders by created time, then id, before paging. The table sorts only the rows already loaded for the current page of 10. Later pages stay in created-at order.

### CR-014 — Team activity has no Location column

Source: [04-cr-013-016.md](requirements/update-cr/implementation-check/04-cr-013-016.md).

**Present:** Team > Activity sorts When, Actor, Action, Record, and Source IP on the server. The sort is applied before paging, so it covers the filtered log, not only the current page of 10.

**Missing:** There is no Location column, no location value on the audit item, and no location sort field. The analysis does not define what Location would contain.

### CR-016 — Admin audit log has no Location column

Source: [04-cr-013-016.md](requirements/update-cr/implementation-check/04-cr-013-016.md).

**Present:** The platform-admin audit log sorts When, Actor, Action, and Record on the server, using the same sort path as the dealership log. Dealership and Source IP are also sortable on this screen.

**Missing:** There is no Location column and no location field to sort. Location is the same undefined column as CR-014.

### CR-018 — Pending-accounts sort is page-only

Source: [05-cr-017-020.md](requirements/update-cr/implementation-check/05-cr-017-020.md).

**Present:** The Pending accounts tab has a Registered header, and a header click reorders the rows the table has loaded.

**Missing:** The screen requests one page of 10 and does not read the total or offer another page. The pending-users API accepts no sort parameter and orders by created time descending. Header clicks reorder at most those ten rows. Accounts past that page are not in the sort.

### CR-020 — Manager record-audit sort is page-only

Source: [05-cr-017-020.md](requirements/update-cr/implementation-check/05-cr-017-020.md).

**Present:** On the DMS vehicle drawer, the CRM customer drawer, the lead drawer, and the ad workspace, a manager sees sortable Action, Actor, and When headers. Those headers reorder the rows already passed to the trail.

**Missing:** The record-audit request does not send a sort. The server returns newest first, then pages. A header click reorders only that loaded page. On DMS, CRM, and Ads, the next page is another newest-first request of 10. On Leads there is no pager, so events after the first 10 are not on screen and cannot be sorted into view. Team > Activity is a different request (CR-014) and is not scored here.

### CR-022 — Dirty-form confirm does not confirm an ordinary save

Source: [06-cr-021-024.md](requirements/update-cr/implementation-check/06-cr-021-024.md).

**Present:** The four named menus confirm before a dirty form is discarded: platform admin > Dealerships > Edit, DMS add and edit vehicle, CRM add and edit customer, and Leads add and edit. Overlay click, close, and Escape open “Discard unsaved changes?”. A dirty open drawer also warns before tab close or an in-app link click.

**Missing:** None of those four saves asks before an ordinary commit. Dealership save, vehicle save, and an ordinary lead edit write immediately. CRM save, and lead create of a new customer, ask only when a matching customer is found. Lead save asks only when the stage is Won or Lost (CR-024). The inventory sentence covers both losing changes and saving them. Dealership-profile save and lead close are CR-023 and CR-024, and those confirms are present.

### CR-041 — Reopen has two exceptions

Source: [11-cr-039-041.md](requirements/update-cr/implementation-check/11-cr-039-041.md).

**Present:** Opening a won or lost lead offers Reopen as New, Contacted, or Qualified. Reopen posts to the lead reopen route, requires an open target stage, clears the lost reason, and writes an audit row.

**Missing:** Not every closed lead can be reopened. A won lead whose vehicle is sold and linked to that lead’s customer is rejected. Reopen is also rejected when another open lead already exists for the same customer and vehicle. The drawer still shows Reopen in the sold-won case; the refusal appears after the click.

### CR-047 — VIN check is the year code only

Source: [13-cr-045-047.md](requirements/update-cr/implementation-check/13-cr-045-047.md).

**Present:** On create, and on patch when the VIN or model year changed, a 17-character VIN for model year 1980 or later is refused when character 10 is not the model-year code for that year. The DMS form repeats that check before save.

**Missing:** Make, model, body type, and the other decoded facts are not compared to the VIN. Decode fills make, model, year, and body and does not refuse a later edit of those fields. A user can save a VIN whose year code matches the entered year and whose make and model do not match a decode. Years before 1980, and a VIN that is not 17 characters, skip this year-code check.

### CR-048 — Carfax host is checked; the URL is not exclusive

Source: [14-cr-048-050.md](requirements/update-cr/implementation-check/14-cr-048-050.md).

**Present:** A non-empty Carfax URL must be https on carfax.com, carfax.ca, or a subdomain of either, on the DMS form and in vehicle create and patch. A value that fails is a validation error on `carfaxUrl`.

**Missing:** Nothing makes one Carfax URL exclusive to one vehicle. Two vehicles can store the same link. A blank URL still saves. The analysis does not settle whether exclusive means one URL per vehicle or only Carfax hosts. The host check matches the second reading. The unique-URL reading is not in the code.

### CR-051 — Duplicate-lead check has exceptions

Source: [15-cr-051-053.md](requirements/update-cr/implementation-check/15-cr-051-053.md).

**Present:** Staff create, when a customer id is set, rejects a second open lead for the same customer and vehicle. Changing the vehicle on an open lead, and reopening a closed lead, use the same check. The error tells the user to open the existing lead.

**Missing:** A won or lost lead for the same customer and vehicle does not block another create. The statement does not exempt a closed lead. A buyer-site inquiry inserts a new lead and does not run this check, so a second open lead for that customer and vehicle can still be created from the buyer site. A create that inserts a new customer first has no prior lead for that new id. There is no unique index on dealership, customer, and vehicle; the staff check is a query before insert.

### CR-052 — A sale closes leads and does not label the customer

Source: [15-cr-051-053.md](requirements/update-cr/implementation-check/15-cr-051-053.md).

**Present:** Selling a vehicle, in the same transaction, closes that vehicle’s open leads. The lead whose customer is the CRM buyer becomes Won. Every other open lead on that vehicle becomes Lost with reason “Vehicle sold”. When the buyer is Other, every open lead on the vehicle becomes Lost.

**Missing:** No label is written on the customer. The customer record stays name, email, phone, address, and notes. The source sentence applies the label to the customers tied to the lead, and the document does not name the label. Leads that are already Won or Lost are left unchanged. Leads with no vehicle, or a different vehicle, are not closed.

### CR-055 — Platform admin still binds the first manager

Source: [16-cr-054-056.md](requirements/update-cr/implementation-check/16-cr-054-056.md).

**Present:** After a dealership already has an active manager, admin create or bind does not insert a membership. It files a join request and tells the admin that a manager approves it under Team > Join requests. The same split is shown on the staff drawer and on pending accounts.

**Missing:** When the dealership has no active manager, the same call still binds the login directly as the first manager. The staff drawer button is still “Create and bind”, and pending accounts still offer “Bind without password” for that case. The statement’s required behavior is not to bind, and only to send a join request. That behavior is only the branch that runs after a manager already exists.

## Not-applicable or deferred

### CR-010 — Dealership-admin role

Source: [03-cr-009-012.md](requirements/update-cr/implementation-check/03-cr-009-012.md). Status: not-applicable.

The statement says a dealership-specific admin, owner, or regional-manager account is optional and should be discussed before it is fully implemented. The source says no code behavior is required yet, and that the note’s instruction is not to add the role in this pass. Account roles remain platform admin and dealer user. Membership roles remain manager and staff. The privilege rung printed after the statement is not in the code.

## Not-implemented

Empty. No source file assigns not-implemented.

## Contradicted

Empty. No source file assigns contradicted.

## Reading for the team

Fifty-four of the sixty-eight client-request items are already in the active .NET backend and React frontend. That includes the DMS sale columns and period sales, manager staff actions, the lead and CRM additions that the checks mark complete, platform-admin account and audit work, and the public shop. One item is deferred: CR-010, the optional dealership-admin role, which the source marks not-applicable until the client discusses it.

Thirteen items are partial. They are the ones that still need a decision, because each source file found part of the request in the product and part of it absent:

- CR-009: the home-page Create account buttons are gone, and the dealership-use inquiry is not built. Registration is still reachable.
- CR-012, CR-018, and CR-020: the named columns sort, and the sort covers only the loaded page.
- CR-014 and CR-016: the named audit columns sort on the server, and Location is absent. The checks say the analysis does not define Location.
- CR-022: leaving a dirty form is confirmed, and an ordinary save on those menus is not.
- CR-041: a closed lead can be reopened, with a sold-to-this-customer exception and a duplicate open-lead exception.
- CR-047: the VIN check is the model-year code, not make, model, or a decoded vehicle.
- CR-048: a non-empty Carfax URL must be a Carfax https link, and the same URL is not exclusive across vehicles.
- CR-051: a second open lead is rejected on the staff paths, and a closed lead or a buyer-site inquiry does not get that block.
- CR-052: a sale closes the vehicle’s open leads, and it does not write a label on the customer.
- CR-055: once a manager exists, admin create or bind sends a join request. The first manager is still bound directly.

Nothing in this set is marked not-implemented or contradicted. This reading does not add requests beyond the inventory.
