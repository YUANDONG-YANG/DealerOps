# Workflows and screens

Source: the written text of `requirements/iteration-2/Changes Document.docx` (sections **Client Requests** and **Site Fixes and Changes**). Screenshots in that document show the current screens; this note follows the written actor, steps, and states. It does not invent labels that appear only in a picture.

Active UI is `frontend/react`. Routes are declared in `frontend/react/src/router.tsx`. The signed-in shell (side menu, header, profile link) is `frontend/react/src/layouts/AppLayout.tsx`.

Disposition means:

- **Change existing screen** — the route and page already exist; the request edits columns, filters, a drawer, a dialog, or copy on that page.
- **New screen** — the request needs a route or page that does not exist.
- **Unknown** — the document does not name a page, or it defers the screen until a later client discussion.

No workflow in this document asks for a new route that is specified well enough to build. The only candidates for a new screen are deferred (dealership inquiry, dealership-scoped admin).

## Actors named in the document

From most to least privilege, as the document lists them:

1. Platform admin (`Platform.Admin`, menu **Admin** only, route `/admin`).
2. Dealership admin / owner / regional manager — described as optional and not to be built until discussed. No route, menu, or screen is specified. **Unknown.** **Decided 2026-11-03:** built as the dealership **Owner** (`dealer_role` `OWNER`), which opens **Team** and owns the dealership profile and join requests (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md`).
3. Dealership manager (`Dealer.User` with dealership role manager). Menu adds **Team** (`/team`).
4. Dealership staff (`Dealer.User`). Menu: Dashboard, DMS, CRM, Leads, Sales report, Ad compliance. (Now the **Sales** role, same menu.)
5. Signed-out visitor. Public routes: `/`, `/login`, `/register`, `/shop`, `/shop/:dealer`, `/disclaimer`.

The document sometimes says “any user account” and then names **Team**. Team is manager-only. Staff who open `/team` are sent to their home page (`frontend/react/src/router.tsx`, `ManagerGuard`). Those steps are manager steps.

## Route map

| Document location | Route | Page | Disposition |
| --- | --- | --- | --- |
| Home page | `/` | `frontend/react/src/pages/LandingPage.tsx` | Change existing screen |
| Create account (home) | `/register` (linked from `/`) | `frontend/react/src/pages/RegisterPage.tsx` | Change existing screen for the home links; the inquiry replacement is **unknown** |
| Profile | `/profile` | `frontend/react/src/pages/ProfilePage.tsx` | Change existing screen |
| DMS, including Sell | `/dms` | `frontend/react/src/pages/DmsPage.tsx` | Change existing screen |
| Bill of sale | `/dms/:vehicleId/bill-of-sale` | `frontend/react/src/pages/BillOfSalePage.tsx` | Not mentioned |
| CRM | `/crm` | `frontend/react/src/pages/CrmPage.tsx` | Change existing screen |
| Leads | `/leads` | `frontend/react/src/pages/LeadsPage.tsx` | Change existing screen |
| Sales report | `/reports/sales-funnel` | `frontend/react/src/pages/SalesFunnelPage.tsx` | Change existing screen |
| Dashboard, Sales section | `/dashboard` | `frontend/react/src/pages/DashboardPage.tsx` | Change existing screen |
| Team: Members, Activity, Join requests, Dealership profile | `/team` | `frontend/react/src/pages/TeamPage.tsx` | Change existing screen |
| Audit inside a record (manager) | drawers on DMS, CRM, Leads, and the ad workspace | `frontend/react/src/components/AuditTrail.tsx` | Change existing screen |
| Platform admin: Dealerships, Members, Pending accounts, Ad rules, Audit log | `/admin` | `frontend/react/src/pages/AdminPage.tsx` plus `frontend/react/src/components/PendingAccounts.tsx`, `AuditLogPanel.tsx`, `ComplianceRulesPanel.tsx` | Change existing screen |
| Shop vehicles (directory) | `/shop` | `frontend/react/src/pages/ShopPage.tsx` (`DealerDirectory`) | Change existing screen |
| One dealership’s buyer site | `/shop/:dealer` | `frontend/react/src/pages/ShopPage.tsx` (`DealerInventory`) | Change existing screen |
| Ask about this vehicle | drawer on `/shop/:dealer` | same file, inquiry `FormDrawer` | Change existing screen |
| Dealership admin / owner / regional manager | `/team`, `/team` Members | `frontend/react/src/pages/TeamPage.tsx` | Change existing screen (decided 2026-11-03 as the Owner role) |
| Customer and Vehicle of interest controls | `/leads` **Add lead** and **Edit** drawers | `frontend/react/src/pages/LeadsPage.tsx` | Change existing screen |

## Convention conflicts that apply to more than one workflow

Citations are `design/12-Frontend-UI-Conventions.md` (UI) and `design/13-Frontend-Engineering.md` (routes and guards).

- **C1. One table per view.** UI §1: a second list goes behind its own tab (`tab-bar`). Do not stack two tables on one screen. Hit by the join-request split and by an employee-metrics table on the sales report (that page already stacks a monthly sales table with funnel and workshop sections).
- **C2. Prescribed columns.** UI §2 fixes DMS columns (Year Make Model, VIN, Source, Condition, Cost, Date added, Status, Actions) and CRM columns (including **Vehicles purchased**). The document adds DMS sale columns and replaces the CRM purchase count.
- **C3. Filter row.** UI §3: one row of search plus 1–3 dropdowns, plus **Search** and **Reset**. DMS filters are VIN/make/model, Status, and Condition. Ad compliance is the only page allowed four dropdowns. DMS search changes add Stock # and open-work-order search and a typeable Year on top of the remaining filters.
- **C4. SearchSuggest.** UI §3: a list-page search waits 300 ms, shows up to 8 suggestions, and filters when a suggestion is picked or Enter runs the typed search. The leads request compares the customer-name box with DMS and CRM; its screenshots contrast deduplicated suggestions with repeated names, not live filtering, so `SearchSuggest` behavior still fits.
- **C5. At most three action links.** UI §2. Promote, edit, remove, delete, and reopen can push a row past three text links.
- **C6. Sell dialog.** UI §4: Sell is a small dialog; sold date and sold price are required as a pair. The document keeps that pair and adds read-only money facts plus a required buyer.
- **C7. Customer identity.** UI §4: a matching email is a non-blocking warning and the save still proceeds (CRM-13). Phone is unique in the dealership and is rejected. The document wants a confirm-before-create for name, email, phone, or address, and wants shared phone numbers allowed.
- **C8. Landing account entry.** UI §1 and engineering §2: the landing brand bar has **Sign in** and **Create account**. Removing **Create account** conflicts with that page. The sample-ad request (W32) changes only the inner sign-in link, so it does not conflict here.
- **C9. No third role.** Engineering §3: do not invent a role other than `Platform.Admin` and `Dealer.User`. A dealership admin / owner / regional manager is a third role. Team stays manager-only. **Resolved 2026-11-03:** the owner is a third `dealer_role`, not a third JWT role, so C9 holds as written; Team now opens to owner and manager, and Sales still has no Team access (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md`).
- **C10. Audit is manager-only.** Engineering §3: staff never see audit. (Now owner and manager; Sales never sees audit.) Sorting “any menu with audit” must stay on the manager drawer trail, Team **Activity**, and the platform **Audit log**.
- **C11. Unsaved-changes and delete confirms.** UI §1 already requires a second confirm for Sell and Unbind. It does not require a dirty-form confirm. The document adds that confirm, and the same extra step for deleting a dealership or a user. Use the existing confirm dialog rather than a second pattern.
- **C12. Display name.** Engineering §2 describes profile as editing the user’s own display name. The document renames that label to full name on Profile and on admin staff creation.

---

## Client requests (urgent)

### W1. DMS sale columns

- **Actor.** Any signed-in dealership user (staff or manager).
- **Navigation.** Side menu **DMS** → `/dms`.
- **Steps.** On the inventory table, show who sold the vehicle (**Sold by**), the customer who bought it (**Sold to**), and the day it was sold (**Date sold**). The document points at the table and says where the columns should go; it does not name the insert index in text.
- **States.** None stated. No empty or error copy.
- **Screen.** Change existing screen. `frontend/react/src/pages/DmsPage.tsx`. The table already has Year Make Model, VIN, Stock #, Body, Source, Condition, Cost, List price, Date added, Open WOs, and Status. Sold by, Sold to, and Date sold are not columns. The sell dialog already stores a sold date, sold price, and an optional CRM buyer; it does not show a seller.
- **Conflicts.** C2. Sold rows stay dimmed and purchase fields stay read-only (UI §2); the document does not relax that. Date sold should stay a date, and money columns stay CAD with two decimals (UI §2).

### W2. Sell dialog shows cost, work-order spend, and list price

- **Actor.** Any signed-in dealership user who can sell.
- **Navigation.** `/dms` → **Sell** on a row, or **Mark as sold** in the vehicle drawer. Both open the same confirm dialog.
- **Steps.** When Sell is clicked, the dialog presents, in addition to the fields already there: cost, total amount spent on work orders, and list price.
- **States.** None stated for these three facts (what to show when work-order spend is zero, or list price is unset).
- **Screen.** Change existing screen. The dialog in `DmsPage.tsx` is titled `Sell {year} {make} {model} · VIN {vin}` and requires sold date and sold price together. Buyer is optional today (“Not linked yet”, or the linked customer’s name when one is already linked). See also W21, which changes the buyer rule in this same dialog.
- **Conflicts.** C6. These three values are read-only context, not extra required inputs. Keep sold date and sold price as the required pair. Primary actions stay the existing confirm (`Confirm sale`).

### W3. Sales periods and per-employee metrics

- **Actor.** Any signed-in dealership user.
- **Navigation.** Side menu **Sales report** → `/reports/sales-funnel`. The same period view also appears in the **Sales** section of **Dashboard** → `/dashboard`. Dashboard already links to **Full sales report**.
- **Steps.** Offer the current day, week, month, and year as options. Show sales information for the selected period. List every sales employee and that employee’s sales metrics. The document does not name the metrics (units, revenue, profit, or others).
- **States.** None stated. The current sales report already shows “No vehicles sold yet” and “No sales yet” for average days; the document does not mention those.
- **Screen.** Change existing screen on both pages. `SalesFunnelPage.tsx` shows lifetime vehicle-sale KPIs, a monthly table (Month, Sold, Revenue, Gross profit), a lead funnel, and workshop settlement. It has no day/week/month/year switch and no employee list. `DashboardPage.tsx` **Sales** shows sold-this-month, vehicles sold, gross profit, and average days to sell, with no period switch and no employee list.
- **Conflicts.** C1 on the sales report: an employee table is another list on a page that already has tables. Put it on its own tab (or its own view), not under the monthly table. On the dashboard the Sales section is KPI cards only, so one employee table is the page’s single table and fits UI §1. Do not add a chart library (engineering §1); the document asks for options and a list, not a chart.

### W4. Managers promote staff, edit some employee fields, and see join date

- **Actor.** Dealership manager. The client request says manager accounts. A later sort note says “any user account > Team > Members”; staff cannot open Team.
- **Navigation.** Side menu **Team** → `/team` → **Members**.
- **Steps.** Promote another staff member to manager. Edit certain employee information (the document does not list the fields). Show a column for when the member joined. The sort list calls that column **Date added**.
- **States.** None stated (no confirm copy for promotion, no error if the last manager is demoted — demotion is not requested).
- **Screen.** Change existing screen. `TeamPage.tsx` **Members** columns are Member, Username, Role, Source, Actions. Staff rows have **Remove**. Manager rows say they are managed by the platform admin. There is no joined date and no promote or edit.
- **Conflicts.** C5: Promote, Edit, and Remove are already three links; do not add a fourth on the row. Engineering §3 puts **Make manager** / **Make staff** on platform-admin **Members**, not on Team. This request moves promotion to the dealership manager and does not say to remove it from Admin. C9: promotion stays inside manager vs staff. It is not the deferred dealership-admin role. **Resolved 2026-11-03:** a manager's row actions apply to **sales** members only — promote to manager, edit full name and phone, remove — while owner and manager rows are out of a manager's reach; the owner acts on any member below owner (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md` §2–§3).

### W5. Home page account creation becomes a dealership inquiry — deferred; remove the button for now

- **Actor.** Signed-out visitor.
- **Navigation.** `/` brand bar, hero, and bottom **Create account** links. They go to `/register`. `/login` also links to `/register`; the document does not mention the login page.
- **Steps.** The client asked to turn home-page account creation into a way for a dealership to inquire about using the service. Account creation “a different way” still needs a client discussion. Until then, remove the **Create account** button from the home page. That is the step to implement.
- **States.** None stated for the inquiry. The duplicate-name failure on create-account is W8.
- **Screen.** Removing the home links is a change to `LandingPage.tsx`. The inquiry form, its fields, its empty/error states, and where a signed-out visitor creates an account afterward are **unknown**. `RegisterPage.tsx` stays in the route table; the document does not say to delete `/register`.
- **Conflicts.** C8. Engineering §2 still describes `/register` as self sign-up and lists **Create account** on `/`.

### W6. Optional dealership admin / owner / regional manager

- **Actor.** A new role between platform admin and dealership manager. It would change dealership settings the way a platform admin can, but only for one dealership.
- **Navigation.** Not specified. No menu label.
- **Steps.** Not specified. The document says this is optional and should be discussed before implementation.
- **States.** None.
- **Screen.** **Unknown.** Not a page to add in this change.
- **Conflicts.** C9. Engineering §3: do not invent a third role, and a platform admin must not be sent into dealership business tables.
- **Resolved 2026-11-03.** Built as the dealership Owner on the existing screens — no new page: Team Members carries the owner's member actions, and the dealership profile and join requests stay where they are. See `requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md`.

### W7. Sortable columns

- **Actor.** As in the table. Sorting is a click on the column header. The document allows extra sortable columns beyond the list.
- **Navigation.** The page and tab in the table.
- **Steps.** Sort by the listed columns. No sort direction, default sort, or “unsorted” state is stated.
- **States.** None stated.
- **Screen.** Change existing screens. `frontend/react/src/components/DataTable.tsx` has no sort control. It renders DMS, Leads, Admin **Dealerships** and **Members**, and both audit logs. Local `<table>` markup, also unsorted, renders Team **Members**, Team **Join requests**, `PendingAccounts.tsx`, `ComplianceRulesPanel.tsx`, and the admin staff drawer. **Pending accounts** shows Registered only as a muted line in the Account cell, so sorting by it needs a Registered column. **Location** is not in branch `v1`; it exists on `origin/robin` (commit 54b6664, `audit_event.client_location`), and the audit screenshots come from that build.

| Actor | Navigation | Sortable columns | Page |
| --- | --- | --- | --- |
| Any dealership user | **DMS** `/dms` | Stock #, Body, Source, Condition, Cost, List price, Date added, Open WOs, Status | `DmsPage.tsx` |
| Any dealership user | **Leads** `/leads` | All columns | `LeadsPage.tsx` |
| Manager (document also says any user) | **Team** → **Members** | Role, Source, Date added | `TeamPage.tsx` |
| Manager | **Team** → **Activity** | When, Actor, Action, Record (type then number), Source IP, Location | `TeamPage.tsx` / `AuditLogPanel.tsx` |
| Manager | **Team** → **Join requests** | Requested, Status, Resolved | `TeamPage.tsx` |
| Platform admin | **Admin** → **Audit log** | When, Actor, Action, Record (type then number), Location | `AdminPage.tsx` |
| Platform admin | **Admin** → **Ad rules** | Enabled, Severity | `ComplianceRulesPanel.tsx` |
| Platform admin | **Admin** → **Pending accounts** | Registered | `PendingAccounts.tsx` |
| Platform admin | **Admin** → **Members** | Dealership, Role, Sign-in, Status | `AdminPage.tsx` |
| Manager | Any menu that already shows an audit trail | Action, Actor, When | `AuditTrail.tsx` on the DMS, CRM, and lead drawers and the ad workspace |

- **Conflicts.** C10 for the last row: staff must not gain an audit trail so that it can be sorted. UI §2 still caps the page at 10 rows; sorting does not add a second table. Sold by, Sold to, and Date sold (W1) are not in the DMS sort list.

---

## Site fixes and changes

### W8. Duplicate full names must be allowed

- **Actor.** Signed-out visitor; platform admin; any signed-in user with business access.
- **Navigation.**
  1. Home page, any **Create account** path (`/` → `/register`), for as long as that path exists (see W5).
  2. Platform admin → **Dealerships** → **Staff** → create a staff account (`/admin` staff drawer).
  3. **Profile** (`/profile`), from the header name.
- **Steps.** Creating or saving an account whose full name is already used must succeed. The document says the same full name is rejected in these three places and that other places may exist.
- **States.** Today the stated failure is that the account cannot be created. No replacement error copy is given. Other validation (empty name, length) is not discussed.
- **Screen.** Change existing screen on `RegisterPage.tsx` (the field is already labeled **Full name**; “Enter your full name.” is its empty-field validation error), the admin staff form in `AdminPage.tsx`, and `ProfilePage.tsx`. The **Display name** label appears only on `ProfilePage.tsx` and `AdminPage.tsx` (W25).
- **Conflicts.** None beyond C12’s label. Uniqueness of username, email, and phone is not waived here.

### W9. Confirm before leaving or saving dirty forms

- **Actor.** The actor of each screen below.
- **Navigation and steps.** If the form has unsaved data, or a change is about to be saved, ask the user to confirm. The document’s reason is accidental edits, lost data, and frustration. It does not give dialog copy, and it does not say whether the confirm is on close, on save, or both. Dealership profile and closing a lead are called out as save confirms.

| Actor | Navigation | Form |
| --- | --- | --- |
| Platform admin | **Admin** → **Dealerships** → **Edit** | Dealership edit drawer |
| Any dealership user | **DMS** → **Add vehicle** and **Edit** | Vehicle drawer |
| Any dealership user | **CRM** → **Add customer** and **Edit** | Customer drawer |
| Any dealership user | **Leads** → **Add lead** and **Edit** | Lead drawer |
| Manager | **Team** → **Dealership profile** | Legal name and contact. A large change confirms before save |
| Any dealership user | **Leads** → **Open** (closing a lead) | Confirm before the close is saved |

- **States.** The failure mode described is silent loss or a silent save. No success message is specified.
- **Screen.** Change existing screen. Drawers use `frontend/react/src/components/FormDrawer.tsx`. Confirms already use `frontend/react/src/components/ConfirmDialog.tsx` (Sell, Unbind, remove member).
- **Conflicts.** C11. UI §4 says create and edit use a drawer. A dirty-close confirm is new. Do not add a second table or a new route for it.

### W10. Split join requests into open and closed

- **Actor.** Dealership manager.
- **Navigation.** **Team** → **Join requests**.
- **Steps.** Stop listing every request in one table. One list is requests that still need approve or reject. The other is past requests that were approved or rejected.
- **States.** The current empty copy on that tab is “No join requests yet.” The document does not give empty copy for the two lists.
- **Screen.** Change existing screen (`TeamPage.tsx`). The tab already has one table: Name, Email, Username, Source, Requested, Status, Resolved, Actions.
- **Conflicts.** C1. Two stacked tables on the Join requests tab violate “one table per view.” Use two tabs (or one table plus a status filter), which is the pattern UI §1 already requires. Engineering §2 already says pending rows are approved or rejected and resolved rows show outcome, who settled it, and when. W7 sorting (Requested, Status, Resolved) applies to whichever list has those columns.

### W11. Label the date pickers

- **Actor.** Manager on Team activity. Platform admin on the audit log.
- **Navigation.** **Team** → **Activity**. **Admin** → **Audit log**.
- **Steps.** The day pickers have no labels, so the user cannot tell what they do. Label them. The document does not supply the label text (start, end, from, to).
- **States.** None.
- **Screen.** Change existing screen. Both logs use `frontend/react/src/components/AuditLogPanel.tsx`.
- **Conflicts.** None. Labels should be the uppercase tracked labels named in the introduction of `design/12-Frontend-UI-Conventions.md`, not a new control style.

### W12. Activity log: search the change text, align filters with columns, partial name search

- **Actor.** Manager.
- **Navigation.** **Team** → **Activity**. The document says “logged in as any manager account.”
- **Steps.**
  1. Search the log by the change itself. Example: searching `password` finds login requests made with passwords.
  2. Put search controls in the same order as the columns.
  3. Searching by user must return matches on a partial name. Today a partial user search shows no results.
- **States.** Partial search currently looks empty. No error copy is stated. No empty copy is stated for a real zero-hit search.
- **Screen.** Change existing screen (`AuditLogPanel.tsx` as used by `TeamPage.tsx`). Engineering §2: Activity filters are record type, record id, action, actor, and a date range, newest first.
- **Conflicts.** C3 if the new “what changed” box plus the existing filters exceeds one search row and three dropdowns. C4: the actor box already uses `SearchSuggest` (`frontend/react/src/components/SearchSuggest.tsx`). The empty partial search comes from the API: `AuditService` matches `actor` exactly, so the fix is a contains match on the server, not a new control. C10: this stays the manager activity tab, not a new `/audit` route (engineering §2 forbids a standalone audit page).

### W13. DMS filters and the Add vehicle form

- **Actor.** Any signed-in dealership user.
- **Navigation.** **DMS** `/dms`, list filters and the **Add vehicle** drawer.
- **Steps.**
  1. Remove the **Make** and **Model** filter boxes. **Search VIN, make, or model** already covers them.
  2. Turn the **Year** filter into a box the user can type in. A long year list is hard to use.
  3. Add a search by stock number.
  4. Split the **Add vehicle** make dropdown into two groups: major brands, then every brand. The document points at Autotrader as the pattern. It does not name the major brands.
  5. Make **Model year** list only years that the selected vehicle can use. If that cannot be done for every vehicle, do it for common vehicles only. The document does not define “common.”
  6. Move the VIN box to the top of the add form.
  7. Add a way to search vehicles that have open work orders.
- **States.** None stated. Catalog failure already has its own copy in the page (“Vehicle catalog unavailable; type a make and model instead.”); the document does not mention it.
- **Screen.** Change existing screen (`DmsPage.tsx`). Decode on the VIN field stays as engineering §2 describes it; the document does not remove Decode.
- **Conflicts.** C3. Removing Make and Model matches the spirit of “search VIN, make, or model,” but UI §3 still names those DMS dropdowns, and `SearchSuggest` must keep covering VIN, make, and model (including Make when the catalog is down). Adding Stock # and an open-work-order control on the same row can exceed “search + 1–3 dropdowns.” Year-as-a-text-box is not a dropdown. The brand split is inside the drawer, so it is not a second table. UI §4: enums use a Select; a grouped Select still fits.

### W14. Customer and Vehicle of interest pickers

- **Actor.** Any signed-in dealership user.
- **Navigation.** **Leads** `/leads` → **Add lead** (the screenshot, image36), and the same fields in the **Edit** drawer. The document says the **Customer** and **Vehicle of interest** boxes are confusing and should work like the leads menu; image37 shows the Leads list `SearchSuggest` as that pattern.
- **Steps.** Replace those boxes with a type-ahead that works like the Leads list search. No further steps.
- **States.** None.
- **Screen.** Change existing screen (`LeadsPage.tsx`, Add lead drawer around lines 290–324, Edit drawer around lines 377–384).
- **Conflicts.** UI §4’s searchable vehicle select (VIN / model, this dealership, unlinked in-stock or sold) is the CRM link rule, not the leads “in stock” rule. Changing the control does not change which vehicles the lead picker offers.

### W15. Lead owner default, vehicle-name search, live customer-name filter

- **Actor.** Any signed-in dealership user.
- **Navigation.** **Leads** `/leads`.
- **Steps.**
  1. On create, fill **Owner** with the person creating the lead. The owner stays editable.
  2. Add a search box for the vehicle name.
  3. When a name is typed into **Customer name**, update the list as on DMS and CRM (the document’s comparison).
- **States.** An owner list that fails to load is not discussed. Unassigned leads exist today (`Unassigned` in the Owner column); a default owner would make a new lead assigned.
- **Screen.** Change existing screen (`LeadsPage.tsx`). Filters today: customer name (`SearchSuggest`), stage, owner, overdue. The create form has Owner and Vehicle of interest. Customer name search is already a `SearchSuggest`.
- **Conflicts.** C4 does not block this: the screenshots contrast deduplicated suggestions on DMS and CRM with repeated customer names on Leads, so the fix is deduplicating Leads suggestions, not live filtering. C3: a vehicle-name box is another search on a row that already has customer name plus stage and owner dropdowns. UI §3 names Leads type-ahead as customer name only.

### W16. Reopen a closed lead

- **Actor.** Any signed-in dealership user.
- **Navigation.** **Leads** → open a closed lead. The document reuses the close-lead screenshot.
- **Steps.** Provide a way to reopen a lead that was closed, including after an accidental close.
- **States.** W9 asks to confirm before a close is saved. No confirm is stated for reopen. No stage to restore is stated (the previous stage versus a fixed stage).
- **Screen.** Change existing screen (`LeadsPage.tsx`).
- **Conflicts.** C5 if Reopen is a fourth action link on the row. Prefer it inside the lead drawer, which already holds stage, owner, vehicle, and notes.

### W17. CRM column, add a lead from the customer, customer notes

- **Actor.** Any signed-in dealership user.
- **Navigation.** **CRM** `/crm`, table and customer drawer.
- **Steps.**
  1. Replace **Vehicles purchased** with the leads for that customer. The document’s reason: most people buy few vehicles, so the count is less useful than the leads.
  2. Add a lead from inside the customer menu.
  3. Add notes about the customer in that same menu.
- **States.** None stated. No empty copy for a customer with no leads.
- **Screen.** Change existing screen (`CrmPage.tsx`). The table column is `linkedVehicleCount`, label **Vehicles purchased**. The customer drawer already loads that customer’s leads and links each one to `/leads?leadId=`. It does not create a lead or edit notes. Deep link `/crm?customerId=` stays the vehicle-detail link (UI §4).
- **Conflicts.** C2 (UI-30 requires **Vehicles purchased**). Replacing it is an explicit convention break. C1: the drawer already lists linked vehicles and leads. Notes are fields, not a second table. Adding a lead should open the existing lead form (or navigate to `/leads`), not a new route. C5 on the customer row.

### W18. Confirm possible duplicate customers, and allow a shared phone

- **Actor.** Any signed-in dealership user.
- **Navigation.** **CRM** → **Add customer** and **Edit**. The same rule applies when a customer is created from the leads page (the new-customer fields on `LeadsPage.tsx`).
- **Steps.** If the name, email, phone, or address matches an existing customer, show a notice like “a customer with this name/email/phone/address (based on what it is) already exists, are you sure you would like to create a new customer” and only then create. Phone must no longer be unique, because two people may share a number and still need separate profiles.
- **States.** The stated interaction is a confirm, not a hard error. The document does not say what happens on edit (versus create), or if several of name, email, phone, and address match at once.
- **Screen.** Change existing screen: `CrmPage.tsx` and the new-customer branch of `LeadsPage.tsx`. CRM already rejects a taken phone with `PHONE_TAKEN` and tells the user to search CRM for that number.
- **Conflicts.** C7. Email is already a non-blocking warning that still saves. This request turns name, email, phone, and address into a blocking confirm. Phone uniqueness is the opposite of the current rule (“rejected”). Address and name matching are new.

### W19. VIN must match the vehicle

- **Actor.** Any signed-in dealership user.
- **Navigation.** **DMS** add and edit.
- **Steps.** A VIN must match the other vehicle information before it can be stored. The document does not say which fields are compared (make, model, year) or whether Decode is the check.
- **States.** Save is refused when they do not match. No message text.
- **Screen.** Change existing screen (`DmsPage.tsx`). Engineering §2: **Decode** on VIN prefills make, model, year, and body type. That is the existing match path.
- **Conflicts.** None if a mismatch is a field error on VIN (`400 VALIDATION` / `fieldErrors` on the matching field, UI §4). Do not add a separate page.

### W20. Carfax URL must be a real, exclusive link

- **Actor.** Any signed-in dealership user.
- **Navigation.** **DMS** vehicle form, **Carfax URL**.
- **Steps.** The box is exclusive, and the value must be an actual Carfax link or the save does not proceed. “Exclusive” is not defined (one URL per vehicle, or only Carfax hosts).
- **States.** Save blocked. No message text.
- **Screen.** Change existing screen. The field exists on the vehicle form and is optional. A saved URL is shown as **Open Carfax report**. Sold vehicles lock the Carfax link (existing sold-lock copy on the page).
- **Conflicts.** UI §4: show the validation on the Carfax field. Do not invent a new status tag.

### W21. A sale must name the buyer

- **Actor.** Any signed-in dealership user who sells.
- **Navigation.** Same Sell dialog as W2 (`/dms`).
- **Steps.** The sale cannot complete until it is linked to a customer. The user may pick **Other** and type a buyer who is not a CRM customer.
- **States.** Save/confirm blocked until a customer or Other-plus-typed-name is present. No message text. This is stricter than today’s “Not linked yet.”
- **Screen.** Change existing screen (`DmsPage.tsx` sell `ConfirmDialog`).
- **Conflicts.** C6. Sold date and sold price stay a required pair. **Other** is an extra required branch, not a second dialog. W1 **Sold to** should show either the customer or the typed buyer; the document does not say which. A typed buyer is not a CRM row, so a link to `/crm?customerId=` (UI §4) does not apply to **Other**.

### W22. Show a vehicle’s leads on DMS

- **Actor.** Any signed-in dealership user.
- **Navigation.** **DMS** vehicle information (the drawer). Optionally a table column with the number of leads.
- **Steps.** Show the leads tied to that vehicle. A count column is “possible,” not required.
- **States.** None. No empty copy for a vehicle with no leads.
- **Screen.** Change existing screen (`DmsPage.tsx`). The drawer already shows the linked customer (`/crm?customerId=`) and ad-check status (UI §4, UI-22). It does not list leads.
- **Conflicts.** C1 if the count is a column (that is still one table) and the drawer also renders a lead table beside work orders, photos, and payments. A lead list in the drawer should be the only new list, or a tab, not a second table beside another list. C2: a lead-count column is outside the prescribed DMS columns. C5: do not add an **Open leads** action if the row already has Edit and Sell and would gain more.

### W23. Block duplicate leads

- **Actor.** Any signed-in dealership user.
- **Navigation.** **Leads** create. Also the add-lead action from CRM if W17 is built.
- **Steps.** Do not create a second lead with the same customer and the same vehicle.
- **States.** Creation refused. No message text. The document does not say whether a closed lead still counts as a duplicate.
- **Screen.** Change existing screen (`LeadsPage.tsx`, and the CRM entry point from W17).
- **Conflicts.** Show the failure on the form (UI §4), not as an empty table. Reopening (W16) is the path after an accidental close, so a duplicate check that ignores closed leads is a product choice the document does not make.

### W24. Selling a vehicle closes the matching leads

- **Actor.** The user who sells (any dealership user). The lead owners are the people whose leads change.
- **Navigation.** Sell on `/dms` (W2, W21). The result is visible on `/leads` and, if W22 is built, on the vehicle drawer.
- **Steps.** When a vehicle is sold to a customer, leads for that customer and that vehicle close automatically. Apply the appropriate label. The document does not name the label (won, lost, or another stage).
- **States.** None. No statement of what the seller sees at the moment of sale (no toast, no list of closed leads).
- **Screen.** Change existing screen: sale completes in `DmsPage.tsx`; lead stage is shown in `LeadsPage.tsx`. No new screen.
- **Conflicts.** W16 (reopen) is how an automatic close is undone. W21 **Other** has no CRM customer; the document says “sold to a customer,” so a typed **Other** buyer may not close leads. That gap is not resolved in the text. Do not send the user to a new route after the sale. The bill of sale (`/dms/:vehicleId/bill-of-sale`) is not part of this request.

### W25. Label “display name” as “full name”

- **Actor.** Any signed-in user on Profile. Platform admin when creating a staff account.
- **Navigation.** Header → `/profile`. **Admin** → **Dealerships** → **Staff** → create staff account.
- **Steps.** The field that says display name is labeled full name in both places.
- **States.** None.
- **Screen.** Change existing screen (`ProfilePage.tsx`, admin staff form in `AdminPage.tsx`).
- **Conflicts.** C12. This is copy on the existing field, not a new data item. W8 is the uniqueness rule for that same field.

### W26. Username validation must be readable

- **Actor.** Platform admin.
- **Navigation.** **Admin** → **Dealerships** → **Staff**, while typing a username.
- **Steps.** A username with characters that are not allowed returns an error that is hard to read. The document asks for that to be fixed. It does not give the allowed characters or the new sentence.
- **States.** Error on the username field. Current text is “difficult to read.” Desired text is not supplied.
- **Screen.** Change existing screen (staff create form on `AdminPage.tsx`).
- **Conflicts.** UI §4: `400 VALIDATION` `fieldErrors` appear on the matching field. A readable field error satisfies that. Do not use a page-level empty state for a field error.

### W27. Platform admin sends a join request instead of binding

- **Actor.** Platform admin. The dealership manager is the person who later approves or rejects (existing Team join-request actions; W10).
- **Navigation.** **Admin** → **Pending accounts**, and **Admin** → **Dealerships** → **Staff**. The document says the admin must not bind an account straight onto a dealership.
- **Steps.** The admin can only send a join request to the dealership. Direct binding is removed so a platform admin cannot open that dealership’s customers and vehicles. The document says the client asked for this.
- **States.** None stated for a failed send. The manager’s approve/reject states stay the existing join-request outcomes.
- **Screen.** Change existing screen. `PendingAccounts.tsx` currently binds a pending account onto a dealership in one action. `NoAccessPage` is the signed-in user waiting for approval; the document does not change that page.
- **Conflicts.** Engineering §3: platform admin does not render DMS/CRM/Leads. This request matches that boundary. It conflicts with the current pending-account design, which is bind-in-place, not with the route table. Do not add a dealership data screen for the admin. C9 still forbids a new role to do this job.

### W28. Remove or edit a pending account

- **Actor.** Platform admin.
- **Navigation.** **Admin** → **Pending accounts**.
- **Steps.** Remove a pending account. Edit account-creation mistakes: email, phone, username.
- **States.** None stated. No confirm is required in the text (unlike W30 and W31). No empty copy.
- **Screen.** Change existing screen (`PendingAccounts.tsx` on the **Pending accounts** tab, and the pending list inside the dealership staff drawer).
- **Conflicts.** C5: send join request (W27), Edit, and Remove are three links if they all sit on the row. Put edit in a drawer (UI §4). C11: removal is destructive; the document does not require a second confirm, but Sell/Unbind already use one. Prefer the existing confirm dialog if a confirm is added.

### W29. Platform audit log search

- **Actor.** Platform admin.
- **Navigation.** **Admin** → **Audit log**.
- **Steps.** Same three changes as W12, on this log: search controls in the same order as the columns, search by what changed, and partial search must return rows. Date pickers are the unlabeled controls from W11. Sortable columns are W7 (When, Actor, Action, Record, Location). This list does not include Source IP; Team activity does. Location is the `origin/robin` column from W7, not a `v1` column.
- **States.** Partial search currently returns nothing. No empty or error copy.
- **Screen.** Change existing screen (same `AuditLogPanel.tsx`, platform loader from `AdminPage.tsx`).
- **Conflicts.** Same as W12 (C3, C4). Not a new audit route.

### W30. Delete a dealership

- **Actor.** Platform admin.
- **Navigation.** **Admin** → **Dealerships** → **Edit**.
- **Steps.** The admin may delete a dealership. Deletion needs at least one extra confirmation step. The document calls it a more complex decision. No second phrase (typed name, or similar) is specified.
- **States.** The extra confirm is the stated gate. No success or “dealership not empty” error is stated.
- **Screen.** Change existing screen (`AdminPage.tsx` dealership edit drawer).
- **Conflicts.** C11. Reuse `ConfirmDialog`. UI §1’s second confirm is the right weight. Do not add a wizard route. W9’s dirty-form confirm is a different dialog from this delete confirm.

### W31. Delete a user, and edit email or phone

- **Actor.** Platform admin.
- **Navigation.** **Admin** → **Members** (the screenshot is the members area). The document says “delete users” and “edit some information on accounts, such as email or phone number.”
- **Steps.** Delete requires at least one extra confirmation, same weight as W30. Edit covers email or phone (the examples given), not every field.
- **States.** Extra confirm before delete. No copy. No rule for deleting the last admin or a user who still belongs to a dealership.
- **Screen.** Change existing screen (`AdminPage.tsx` **Members**, and possibly the staff list inside a dealership). Profile already lets a user delete their own account; this request is the admin deleting someone else.
- **Conflicts.** C5 and C11. Engineering §3: on Admin, members show dealership role with **Make manager** / **Make staff**. Adding Edit and Delete on that row exceeds three action links unless edit and delete live in a drawer. C12 does not apply; this is email and phone, not the full-name label.

### W32. Sample ads should lead to sign-up

- **Actor.** Signed-out visitor, described as a potential user.
- **Navigation.** Home page sample ads (`/` hero).
- **Steps.** The document says the sample ads link to the sign-in page and should link to the sign-up page instead. The screenshot circles only the **Sign in to check your own ads** link.
- **States.** None.
- **Screen.** Change existing screen (`LandingPage.tsx`). In the current page, choosing a sample car opens an inline ad-check (passed, blocked, or stale) and that panel contains **Sign in to check your own ads**, which goes to `/login`. That link is the target; the car click and the sample ad-check stay.
- **Conflicts.** None with C8 or UI §1, because the sample ad-check result stays. W5 removes **Create account** from the home page while this link sends people to sign-up; the link can point to `/register` for as long as that route exists.

### W33. Say the home page is for dealerships

- **Actor.** Signed-out visitor.
- **Navigation.** `/`.
- **Steps.** Put something larger on the page that says the page is for dealerships and not for customers. No sentence is supplied.
- **States.** None.
- **Screen.** Change existing screen (`LandingPage.tsx`).
- **Conflicts.** UI §1 fixes the landing structure (brand bar, hero, feature cards, VIN decoder, ad-approval steps) and says the page exposes no dealership data. A banner can be added without a new route. Do not turn the hero into a customer storefront; the shop is W34–W36.

### W34. Shop directory: not “used,” searchable, with address and contact

- **Actor.** Signed-out visitor (also any user who opens the shop). The document’s path is Home → **Shop vehicles**.
- **Navigation.** `/` → **Shop vehicles** → `/shop`.
- **Steps.**
  1. Do not call the shop “used.” Dealerships sell new vehicles too. The page heading is **Shop used vehicles**.
  2. Let the visitor search for a dealership.
  3. On each dealership, show the address and some contact information. “Some” is not specified (phone, email, or both).
- **States.** None stated. The page already has loading, error, and “No dealerships are listed yet.”
- **Screen.** Change existing screen (`ShopPage.tsx`, `DealerDirectory`). Cards now show logo, legal name, in-stock count, and sold count, and link to `/shop/{slug}`.
- **Conflicts.** UI §3’s filter row is written for back-office lists. A dealership search on this public list should still be a `SearchSuggest` if it is a free-text list search (UI §3, “every free-text search box on a list page”). Do not add price sliders, fuel filters, or maps (UI §3). Engineering §2 already allows `/shop` as the buyer directory. This is not a new screen.

### W35. Buyer site: back, and search inventory

- **Actor.** Visitor on a dealership’s buyer site.
- **Navigation.** `/shop` → a dealership → `/shop/:dealer`.
- **Steps.** Add a back control. Add a search of that dealership’s inventory for a specific vehicle. The document cuts off at “vehicl” (vehicle).
- **States.** None. No empty copy for a search with no hits.
- **Screen.** Change existing screen (`ShopPage.tsx`, `DealerInventory`). The shop header already has a **Dealerships** link to `/shop`. There is no back button on the inventory and no inventory search.
- **Conflicts.** Same search rules as W34. One search box does not justify a second table. Back returns to `/shop`, not to a new route.

### W36. Show the inquiry character limit as the user nears it

- **Actor.** Visitor asking about a vehicle.
- **Navigation.** Home → **Shop vehicles** → a dealership → **Ask about this vehicle**.
- **Steps.** The character limit becomes visible when the message gets close to it. The document does not give the limit or the threshold for “closer.”
- **States.** None beyond showing the limit. No over-limit error sentence is given.
- **Screen.** Change existing screen (inquiry drawer in `ShopPage.tsx`). Fields today: name, email, phone, home address, message. Field errors already say “Check the highlighted fields.”
- **Conflicts.** UI §4: a length error from `fieldErrors` stays on the message field. Showing a counter near the limit does not change the drawer-versus-page rule. The assistant and ad pages are not part of this request.

---

## Cross-screen flows

These are the only sequences that leave the screen where they start.

1. **Sell a vehicle.** `/dms` Sell dialog (W2 facts, W21 buyer) writes Sold by / Sold to / Date sold (W1), closes matching leads (W24), and those leads can be reopened (W16). A duplicate lead cannot be created again for that customer and vehicle (W23) unless reopen is the intended path; the document does not say.
2. **Join a dealership.** Platform admin sends a join request instead of binding (W27). The manager sees it under **Team** → **Join requests**, in the open list rather than the history list (W10), and approves or rejects. Pending-account edit/remove (W28) happens before that send. The waiting user’s no-access screen is not redesigned.
3. **Public entry.** `/` loses **Create account** for now (W5), gains a dealership-audience message (W33), and the sample ad-check’s sign-in link moves to sign-up (W32) while `/register` still exists. **Shop vehicles** goes to `/shop` (W34) and then `/shop/:dealer` (W35, W36). No new public route is named.
4. **Customer and lead.** CRM replaces the purchase count with leads, can start a lead, and can store notes (W17). Creating that customer, from CRM or from Leads, confirms possible duplicates and allows a shared phone (W18). Lead owner defaults to the creator (W15).

## Not a workflow in this document

- Ad compliance (`/ads`), the assistant, bill of sale, disclaimer, login fields, and the no-access screen are not given new steps. Audit sorting (W7) and audit search (W12, W29) only change logs that already exist.
- The document’s “feel free to add” other sortable columns is optional, not a screen.
- Empty, loading, and error states that the conventions require (UI §1) are unchanged where this document is silent. Do not treat silence as permission to drop them.
