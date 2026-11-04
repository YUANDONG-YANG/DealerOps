# Change Request Analysis — 2026-11-03

Source: `requirements/iteration-2/Changes Document.docx`. It has two parts: Client Requests (urgent) and Site Fixes and Changes.

Scope of this analysis: the text of the document was checked against the active .NET backend (`backend/dotnet/DealerOps.Core`) and the React frontend (`frontend/react/src`). The 69 screenshots inside the document were **not** reviewed. Items that depend on them ("where columns should go", "menu in reference", the Autotrader dropdown) need the images before implementation.

Path abbreviations: `BE` = `backend/dotnet/DealerOps.Core`, `FE` = `frontend/react/src`.

Status: **analysis only; nothing implemented.** Decisions D1–D6 (section 4) are open.

---

## 1. Client requests (urgent)

| ID | Request | Current state (evidence) | Effort |
|---|---|---|---|
| C1 | Add the DMS columns Sold by, Sold to and Date sold. | Only `SoldOn`, `SoldPrice` and Status=SOLD are stored (`BE/Vehicle/VehicleService.cs:399-401`). The buyer is a CRM link (`LinkedCustomer` in `BE/Vehicle/Dto/VehicleResponse.cs:21-24`), set by a separate, non-atomic `customersApi.link` call after the sell (`FE/pages/DmsPage.tsx:466-471`). **No sold-by is stored**; the actor exists only in the SELL audit row. The DMS table has no sold columns (`FE/pages/DmsPage.tsx:540-552`). | M: add `sold_by` to the vehicle, write it in `Sell`, expose it in `VehicleResponse`, add the three columns. |
| C2 | The Sell dialog shows cost, total work-order spend and list price. | The dialog has only sold date, sold price and buyer (`FE/pages/DmsPage.tsx:846-865`). Completed work-order cost is already added into `vehicle.RepairCost` (`BE/Vehicle/VehicleService.cs` AddRepairCost, called from `BE/WorkOrder/WorkOrderService.cs:209`). | S: frontend only, using existing fields. |
| C3 | Sales report for the current day, week, month and year; the same on the dashboard sales section; a list of sales employees with their metrics. | The report has all-time KPIs and a 12-month monthly table (`FE/pages/SalesFunnelPage.tsx:46-62`; `BE/Vehicle/VehicleService.cs:198-226`). The dashboard shows only the current month (`FE/pages/DashboardPage.tsx:12-34`). There are no per-salesperson metrics. | M: needs `sold_by` from C1. |
| C4 | A manager can promote staff to manager and edit some employee information; Team > Members shows a joined date. | Only the platform admin changes roles (`SetRole` calls `TenantGuard.RequireAdmin()`, `BE/Dealer/MembershipService.cs:195-199`). A manager can only edit the dealership profile and remove staff (`BE/Dealer/DealerTeamController.cs:26-35`). `MembershipEntity.CreatedAt` exists but `MemberOption` does not expose it (`BE/Dealer/Dto/MemberOption.cs`, `FE/pages/TeamPage.tsx:192-198`). | M. **Changes the permission design** (`design/15-Data-Auth-and-Gateway.md` §2.5). See D2. |
| C5 | Turn home-page account creation into a dealership inquiry path; for now, removing the create-account button is enough. | The button links to /register (`FE/pages/LandingPage.tsx:173, 188, 326`). | S: remove the buttons only. |
| C6 | Optional dealership admin / owner / regional manager role. | Does not exist. Roles today are `Platform.Admin`, `Dealer.User` (`BE/Dealer/AppRole.cs`) and membership `Manager` / `Staff` (`BE/Dealer/DealerRole.cs`). | **Not planned.** The document itself says to discuss it with the client first. |
| C7 | Sortable columns on DMS, Leads, Team Members / Activity / Join Requests, admin Audit log / Ad Rules / Pending accounts / Members, and manager audit menus. | No sorting anywhere. `DataTable` has no sort props (`FE/components/DataTable.tsx:3-18`), and no list API accepts a sort parameter. Ordering is fixed on the server (for example `BE/Vehicle/VehicleService.cs:124-126`, `BE/Dealer/MembershipService.cs:328`). | M–L: client-side sort in `DataTable` covers non-paged lists. Paged lists (DMS, audit) sort only the current page unless a server `sort` parameter is added. See D6. |

## 2. Fixes

| ID | Issue | Current state (evidence) | Smallest fix |
|---|---|---|---|
| F1 | An account cannot be created when the full name is already used (home register, admin create staff, Profile). | This is deliberate: there is a DB unique index `uk_app_user_display_name` (`BE/Data/AppDbContext.cs:179`), and the service returns DISPLAY_NAME_TAKEN (`BE/Dealer/NewAccountRules.cs:63, 85`). | Drop the index and the check (needs a schema change) and update the design docs. See D1. |
| F2 | No unsaved-changes or confirm-before-save prompt on: admin Dealership edit, DMS add/edit, CRM add/edit, Leads add/edit, Team dealership profile, closing a lead. | There is no dirty-form guard, and `FormDrawer` closes without a check. A reusable `ConfirmDialog` exists (`FE/components/ConfirmDialog.tsx`). | Add a dirty check to `FormDrawer` that confirms on close, and use `ConfirmDialog` before saving a dealership profile and before closing a lead. |
| F3 | "Display name" should read "Full name" in Profile and in admin create staff. | Label text. | Rename the labels. |
| F4 | An invalid username in admin create staff gives a hard-to-read error. | The `[RegularExpression]` on `BE/Dealer/Dto/CreateMemberRequest.cs` has no `ErrorMessage`. The ASP.NET default text ("must match the regular expression …") is likely shown under the field (`FE/pages/AdminPage.tsx:579`). This was not confirmed by running it. | Add a readable `ErrorMessage` (letters, digits, `.`, `_` and `-`; 3–64 characters; at least one letter). |

## 3. Changes

### 3.1 Team and audit log

| ID | Change | Current state | Notes |
|---|---|---|---|
| T1 | Split Join Requests into Pending and History. | One table with Status and Resolved columns (`FE/pages/TeamPage.tsx:225-246`). | S: filter on the frontend. |
| T2 | Label the date pickers in Team Activity and the admin Audit log. | Only `aria-label="From"` / `"To"` (`FE/components/AuditLogPanel.tsx:67-68`). | S: add visible labels. |
| T3 | Search the activity / audit log by change content (for example "password"). | Not found. | M: add a text filter on the change detail. |
| T4 | Put the search inputs in the same order as the columns (Team Activity and admin Audit log). | Shared `AuditLogPanel` (`FE/components/AuditLogPanel.tsx:50-68`). | S. |
| T5 | Partial match on actor / user search (Team Activity and admin Audit log). | Exact match `e.ActorUsername == actor` (`BE/Audit/AuditService.cs:101-104`). | S: use `Contains`. |

### 3.2 DMS

| ID | Change | Current state | Notes |
|---|---|---|---|
| D-1 | Remove the Make and Model filters. | They exist (`FE/pages/DmsPage.tsx:591-614`) and overlap with `q`. | S. |
| D-2 | Make Year a typeable box. | Select box. | S. |
| D-3 | Add Stock # search. | `q` already LIKE-matches the stock number (`BE/Vehicle/VehicleService.cs:101-105`), but the placeholder says only "Search VIN, make or model". | S: change the placeholder. |
| D-4 | Add a filter for vehicles with open work orders. | Not found; open work orders show only as a column. | S–M: new query flag. |
| D-5 | Add Vehicle make dropdown split into major brands and all brands. | Single list. | M. Needs the screenshots. |
| D-6 | Limit the model-year dropdown to years valid for the selected model. | Not supported. | **Not planned** (needs vehicle reference data). |
| D-7 | Move the VIN box to the top of the Add Vehicle form. | Layout. | S. |
| D-8 | Force the VIN to match the vehicle information. | Only the format is validated (`FE/pages/DmsPage.tsx:39, 63`; `CreateVehicleRequest.cs`). The decode button fills make, model and year (`FE/pages/DmsPage.tsx:482-505`), but nothing cross-checks them. | M. See D6. |
| D-9 | Carfax URL must be a real Carfax link. | Validated only as http(s), at most 500 characters (`FE/pages/DmsPage.tsx:41, 71`; `CreateVehicleRequest.cs`). | S: require the carfax.com host on both sides. |
| D-10 | A sale must link to a customer, or "Other" with a typed buyer. | The buyer is optional ("Not linked yet"), with no free-text option. | M: needs a buyer-name field when "Other" is chosen. |
| D-11 | Show leads on the vehicle, with an optional lead-count column. | Not found. | M. |

### 3.3 Leads

| ID | Change | Current state | Notes |
|---|---|---|---|
| L1 | Prefill Owner with the creating user, still editable. | Blank (`FE/pages/LeadsPage.tsx:113-117`). | S. |
| L2 | Add a vehicle-name search; filter live while typing the customer name. | Not present. | S–M. |
| L3 | Make the Customer and Vehicle of interest boxes match the Leads-menu style. | Needs the screenshots. | S–M. |
| L4 | Reopen a closed lead. | Won and lost leads reject changes with LEAD_CLOSED (`BE/Lead/LeadService.cs:242-247`). | M: allow WON/LOST → open. |
| L5 | Block duplicate leads with the same customer and vehicle. | Not checked (`BE/Lead/LeadService.cs:163-190`). | S: add a service check. |
| L6 | Auto-close the related leads when the vehicle is sold. | `Sell` never touches leads. | M: in `Sell`, close the buyer's lead as WON and the others as LOST. |

### 3.4 CRM

| ID | Change | Current state | Notes |
|---|---|---|---|
| R1 | Replace the "Vehicles purchased" column with the customer's leads. | The column shows `linkedVehicleCount` (`FE/pages/CrmPage.tsx:406`). | S. |
| R2 | Create a lead from the customer detail. | The detail lists the customer's leads with links (`FE/pages/CrmPage.tsx:538`); there is no create action. | S–M. |
| R3 | Customer notes. | No notes field on `CustomerEntity`. | M: schema change. |
| R4 | Warn on a duplicate name, email, phone or address, then allow creation; phone must no longer be unique (CRM and the create-from-lead flow). | Email already only warns (`BE/Customer/CustomerService.cs:81, 317-321`). **Phone is a hard per-dealer uniqueness check** in the service (`BE/Customer/CustomerService.cs:300-310`); there is no DB index. | M. See D1. |

### 3.5 Platform admin

| ID | Change | Current state | Notes |
|---|---|---|---|
| A1 | The admin may only send a join invitation, not bind an account to a dealership directly. | `POST /api/v1/admin/dealers/{id}/members` creates the login and binds it (`BE/Dealer/MembershipService.cs:68-140`; `FE/pages/AdminPage.tsx:306-349`). | L: **changes the admin flow** (`design/14-Backend-API-Contract.md` §3). See D3. |
| A2 | Delete pending accounts. | The pending-users controller is GET only (`AdminPendingUserController.cs:21`). | S–M. |
| A3 | Edit a pending account's email, phone and username. | Not found. | M. |
| A4 | Audit log: search inputs in column order, search by change content, partial match, labeled date pickers. | Same as T2–T5 (shared `AuditLogPanel`). | Covered by T2–T5. |
| A5 | Delete a dealership, with an extra confirmation step. | Not found; there is only a PATCH that can deactivate (`AdminDealerController.cs:22-41`). | L: cascade or soft delete. See D6. |
| A6 | Delete users with an extra confirmation step; edit a user's email and phone. | Not found; a user can only be unbound, which is a soft delete (`AdminMemberController.cs:53`). | M–L. |

### 3.6 Home page and shop

| ID | Change | Current state | Notes |
|---|---|---|---|
| H1 | Sample ads should link to sign-up, not sign-in. | They link to /login (`FE/pages/LandingPage.tsx:220`). | Read as a conflict with C5 during this analysis; D4 later found the two compatible and implemented H1. See D4. |
| H2 | A prominent "for dealerships, not customers" message. | Copy change. | S. |
| H3 | The shop must not say "used". | "Shop used vehicles" (`FE/pages/ShopPage.tsx:106`). | S. |
| H4 | Search dealerships on the shop page; show each dealership's address and contact details. | Not present. | S–M. |
| H5 | A back button on the dealership page; search that dealership's inventory. | Not present. | S–M. |
| H6 | Show the character limit on "Ask about this vehicle" as the limit nears. | Not present. | S. |

---

## 4. Open decisions (owner: Robin, with the client where needed)

| ID | Decision | Why it matters |
|---|---|---|
| D1 | Drop the uniqueness of the user full name (F1) and of the customer phone (R4)? | Both are deliberate rules. Dropping the name rule needs a schema change; both need design doc updates. |
| D2 | C4: can a manager only promote staff to manager, or also demote other managers? Which member fields may a manager edit? | Changes the permission table in `design/15-Data-Auth-and-Gateway.md` §2.5. |
| D3 | A1: replace the admin's direct bind with an invitation flow? | Changes the admin create-staff contract in `design/14-Backend-API-Contract.md` §3. It matches the principle in `design/15-Data-Auth-and-Gateway.md` §2.4 that the admin has no business-data access. |
| D4 | With create-account removed (C5), where should the sample ads link (H1)? | The two requests conflict. |
| D5 | C6 dealership admin role. | Recommended: not planned until the client confirms. |
| D6 | Scope under the minimum-spec rule. | Recommended to defer the heavier items: D-6 (year by model), D-8 (VIN cross-check), A5 (dealership delete), and server-side sort for paged lists in C7. |

## 5. Recommended order

1. **Client requests:** C5, C2, C1, then C3 (depends on C1), C4 (after D2), and C7 (client-side sort first).
2. **Fixes:** F3, F4, F2, then F1 (after D1).
3. **Small changes:** T1, T2, T4, T5, D-1, D-2, D-3, D-7, D-9, L1, L5, R1, H2, H3, H6.
4. **Larger changes, after the decisions:** L4, L6, D-10, R2, R3, R4, A1, A2, A3, A6, H4, H5, D-4, D-5, D-11, T3.
5. **Not planned unless confirmed:** C6, D-6, D-8, A5.

Every behavior change above that touches roles, tenancy, API contracts or the admin flow must update the matching `design/` document in the same change.

---

## 6. Implementation decisions (2026-11-03)

Robin asked to implement the change request. The open decisions in section 4 were resolved with these defaults:

| ID | Decision taken |
|---|---|
| D1 | The user full name is no longer unique: drop `uk_app_user_display_name` and the DISPLAY_NAME_TAKEN check. The customer phone is no longer unique: a duplicate name, email, phone or address only warns, and the user confirms to continue. **Rationale:** people share names, and households share a phone. A login is identified by its username and email, and a CRM duplicate check should warn rather than block. |
| D2 | A dealership manager can set another member of the same dealership to Manager or Staff, but not themselves, and can edit that member's full name and phone. **Rationale:** in a dealership the sales or general manager runs the team, and blocking self-changes keeps the dealership from losing its last manager by accident. |
| D3 | The platform admin binds accounts directly only while the dealership has no active manager, to bootstrap the first manager. After that, the admin's create-staff and bind actions create a pending join request that a dealership manager approves in Team > Join Requests. **Rationale:** the client does not want platform staff to reach dealer customer and inventory data. The dealership itself controls who joins; onboarding the first manager is the only exception. |
| D4 | **Reversed on 2026-11-03; this supersedes the earlier decision that rejected H1.** The home-page create-account buttons stay removed (C5), and the expanded sample ad links to `/register` with the text "Check your own ads". **Rationale:** on re-reading the change document the two statements never conflicted. The client asked only for the create-account *button* to go ("For now, removing the button to create account from the home page will suffice") and said nothing about where a sample ad should lead; the reviewer's line ("I believe most people who are clicking on the ads are potential users and this should link to the sign-up page") is a usability observation about a different element, not a contradiction of the client. The earlier call framed this as a client-versus-reviewer conflict and resolved it for the client, and that framing was wrong. Keeping the ad on sign-in also served nobody: a dealership evaluating the product clicked the ad, reached a sign-in page it has no account for, and left — while `/register` remained live and reachable from the sign-in page anyway, so nothing was really closed off. The ad's link is a contextual call to action, not the header entry the client objected to. This interim stands until the dealership enquiry flow the client asked for (C5) is designed; the ad should point there once it exists. |
| D5 | **Superseded on 2026-11-03.** C6 is implemented as a single dealership Owner role, giving the dealership three tiers: Owner, Manager, Sales. `admin`, `owner` and `regional manager` in the change document all mean that one Owner; no cross-dealership regional manager is built. The platform admin binds the first owner directly and files a join request after that (D3 unchanged). **Rationale:** the client described one person who runs a single dealership, and splitting Owner from Manager gives the dealership an administrator without granting platform-wide reach. The full specification is in `requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md`. |
| D6 | All other items are implemented minimally. Notes: D-6 uses a static year list for common makes and models only. D-8 checks the VIN model-year code (10th character) against the entered year. A5 is a soft delete, confirmed by typing the dealership name, so sale and audit history is kept. C7 sorts on the client in `DataTable`, plus a `sort` query parameter on the paged vehicle and audit lists. |
| D7 | **Lead lifecycle (L4, L5, L6):** a LOST lead can always be reopened. A WON lead can be reopened only when its vehicle was not sold to that lead's customer. Only one OPEN lead may exist per customer and vehicle. A sale closes the buyer's lead as WON and the other open leads on that vehicle as LOST ("Vehicle sold"). **Rationale:** a reopened WON lead would contradict a recorded sale. |
| D8 | **Sale buyer (D-10):** a sale requires a CRM customer, or "Other" with a typed buyer name. **Rationale:** the bill of sale and the "Sold to" column need a buyer. Linking the CRM customer keeps purchase history visible in the customer detail, even though the list column now shows leads (R1). |
| D9 | **VIN must match the vehicle information (CR-047). Supersedes the D-8 note in D6**, which checked only the VIN's 10th character against the entered model year and left CR-047 partially done. On create and on edit the server now decodes the VIN through the existing vPIC catalog client and refuses the save when the decoded make, model or model year disagrees with the values being saved, as `400 VALIDATION` with the message under `fieldErrors.make`, `fieldErrors.model` or `fieldErrors.modelYear`. Make and model are compared on letters and digits only, ignoring case, spacing and punctuation, so `Mercedes Benz` matches the decoder's `Mercedes-Benz`; a field the decoder leaves blank is not checked. **Rationale:** the change document says only "VINs should be forced to match vehicle information in DMS page", and the add-vehicle form's Decode action already fills make, model and year from the VIN, so those three fields are the vehicle information the VIN must agree with. **Why the fallback exists:** vPIC is an external service. If it is unreachable, times out on its 5-second client timeout, returns malformed data, or knows no vehicle for the VIN, the save logs a warning and falls back to the old model-year character check instead of failing, so a dealership can never be blocked from adding a vehicle because a third-party decoder is down. The write endpoints therefore never return `CATALOG_UNAVAILABLE`. Contract: `design/14-Backend-API-Contract.md` §4.2 and §4.4. |

### Shared field contract

Every work item that crosses an area uses these names:

| Item | Name and type |
|---|---|
| Vehicle sold-by | `VehicleEntity.SoldBy` (`string?`, column `sold_by VARCHAR(64)`, the username), exposed as `soldBy` in `VehicleResponse` |
| Vehicle sold-to free text | `VehicleEntity.SoldToName` (`string?`, column `sold_to_name VARCHAR(120)`), sent in `SellVehicleRequest.BuyerCustomerId` (`long?`) / `BuyerName` (`string?`), exposed as `soldToName` |
| Vehicle lead count | `leadCount` (int) in `VehicleResponse` |
| Customer notes | `CustomerEntity.Notes` (`string?`, column `notes VARCHAR(2000)`) |
| Customer lead count | `leadCount` (int) in the customer list response, replacing the "Vehicles purchased" column |
| Member joined date | `joinedAt` in `MemberOption`, from `membership.created_at` |
| Dealership soft delete | `DealerEntity.DeletedAt` (column `deleted_at DATETIME(6) NULL`) |

New columns are added through the idempotent `ALTER TABLE` patch list in `backend/dotnet/DealerOps.Core/Program.cs`.
