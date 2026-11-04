# Design and code impact

Source: the client change note in `requirements/iteration-2/Changes Document.docx`.

This map covers the active .NET 10 services (`DealerOps.Core`, `DealerOps.Gateway`, `DealerOps.AiService`) and `frontend/react`. Java and Vue are out of scope. `DealerOps.AiService` does not own any of these changes: none of them are model calls, and that service must not read or write the application database. VIN decode already runs in Core against NHTSA vPIC (`design/14-Backend-API-Contract.md` §4.6.1).

The browser talks only to the gateway. `backend/dotnet/DealerOps.Gateway/Program.cs` reverse-proxies `/api/v1/**` and allows anonymous calls only for login, register, Google, Firebase, `GET /api/v1/catalog/**`, and `GET`/`POST /api/v1/public/**`. Its role gate accepts only the JWT roles `Platform.Admin` and `Dealer.User`. A new dealership role should stay on the membership row, as manager and staff already do, so the gateway role gate does not have to learn a third role.

"Design update required" below means the repository rule for authentication, tenancy, roles, API contracts, gateway behavior, or classroom acceptance (`design/14-Backend-API-Contract.md`, `design/15-Data-Auth-and-Gateway.md`, `design/16-Acceptance-and-Test.md`, `design/21-Feature-Extensions.md`, and `design/00-Current-Development-Design.md` where those topics are restated). A UI-only change can still leave `design/12-Frontend-UI-Conventions.md` stale; that is noted, and it is not by itself a "yes" under that rule.

Two items in the note should not be built until the client confirms them: replacing self-registration with a dealership inquiry, and a per-dealership admin/owner/regional-manager role. The note says removing the home-page create-account button is enough for now, and that the new role should be discussed first. **Decided 2026-11-03:** the role is no longer held back — it ships as a single dealership Owner tier, so `DealerRole` is `{ Owner, Manager, Sales }` and the affected code and documents are listed in `requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md` §6. The registration item is unaffected.

Lists are paged at 10 rows (`design/12-Frontend-UI-Conventions.md` §2; `frontend/react/src/components/DataTable.tsx` has no sort); audit pages default to 20 rows. Sorting only the current page would be wrong. Real column sorting is a list-query contract change in Core.

Cross-cutting files that every contract change below also touches: `dealer-platform/openapi.yaml` (the contract next to `design/14-Backend-API-Contract.md`), the typed clients in `frontend/react/src/api/*.ts` (pages must not call the API directly), and `design/13-Frontend-Engineering.md` for client-layer changes. Core has no EF migrations: `backend/dotnet/DealerOps.Core/Program.cs` runs `EnsureCreated()` and then a hand-written DDL patch list, so every new column, dropped index, or new table needs an entry there, or an existing database (including the Azure demo database) keeps the old shape. New admin endpoints must stay under `/api/v1/admin/**` so the gateway AUTH-08 gate keeps covering them.

## 1. DMS sold-by, sold-to, and date-sold columns

**Design.** `design/14-Backend-API-Contract.md` §4.3 and the vehicle response already include `soldOn` and `soldPrice`. `design/12-Frontend-UI-Conventions.md` §2 lists the DMS columns and does not include seller, buyer, or sold date. Nothing stores who sold the vehicle. **Partial: sold date is specified and not shown; sold-by is silent; sold-to is only the linked customer.**

**Code.** `backend/dotnet/DealerOps.Core/Vehicle/Dto/VehicleResponse.cs` has `SoldOn`, `SoldPrice`, and `LinkedCustomer`, and no seller. `VehicleService.Sell` writes a `VEHICLE`/`SELL` audit row with the actor, then returns. `frontend/react/src/pages/DmsPage.tsx` columns are year/make/model, VIN, stock number, body, source, condition, cost, list price, date added, open work orders, and status.

**Size.** Medium. Date sold and sold-to can be rendered from fields the detail already has. Sold-by needs a stored seller (or a join to the sell audit) before the column and later sales reports can rely on it.

**Design update required.** Yes. The vehicle response and the sell audit shape change if `soldBy` is added. Update `design/14-Backend-API-Contract.md` and the DMS column list in `design/12-Frontend-UI-Conventions.md` in the same change.

## 2. Sell dialog: cost, work-order spend, and list price

**Design.** `design/12-Frontend-UI-Conventions.md` §4 limits the sell dialog to sold date and sold price. `design/14-Backend-API-Contract.md` §4.5 matches that. Work-order completion already adds cost onto `repairCost` (`VehicleService.AddRepairCost`). **Conflicts with the documented dialog; the amounts already exist on the vehicle.**

**Code.** `frontend/react/src/pages/DmsPage.tsx` sell dialog collects sold date, sold price, and an optional CRM buyer. `SellVehicleRequest` is only `SoldOn`, `SoldPrice`, and `Version`. `VehicleResponse` already has `PurchaseCost`, `RepairCost`, and `ListPrice`. `backend/dotnet/DealerOps.Core/WorkOrder/WorkOrderEntity.cs` stores each order's `Cost`.

**Size.** Small if the dialog shows purchase cost, repair cost (the rolled-up work-order spend), and list price from the vehicle already loaded for edit. Medium if "total spent on work orders" must be a separate sum that ignores repair cost entered by hand.

**Design update required.** No under the auth/API/gateway/acceptance rule when the dialog only displays fields the vehicle response already returns. Update `design/12-Frontend-UI-Conventions.md` §4 so the dialog spec matches. Yes if a new aggregate field is added to the API.

## 3. Sales report periods and per-employee metrics

**Design.** `design/14-Backend-API-Contract.md` §4.3b (`GET /api/v1/vehicles/report/sales`) and `design/21-Feature-Extensions.md` DASH-01 define one all-time sales report plus the twelve most recent months, shared by `/dashboard` and `/reports/sales-funnel`. There is no day/week/year switch and no salesperson breakdown. **Silent on both requests; the current contract conflicts with a period switch if the same endpoint keeps returning only lifetime totals.**

**Code.** `backend/dotnet/DealerOps.Core/Vehicle/Dto/SalesReport.cs` is `SoldCount`, `Revenue`, `GrossProfit`, `AverageDaysToSell`, `InStockCount`, `InventoryCost`, and `Months`. `frontend/react/src/pages/DashboardPage.tsx` and `frontend/react/src/pages/SalesFunnelPage.tsx` render that payload. No salesperson dimension exists until sold-by is stored (item 1).

**Size.** Large. Period filtering changes the report contract, and employee metrics need a seller on each sale plus a new grouping. Both pages must stay on the same Core endpoint.

**Design update required.** Yes. `design/14-Backend-API-Contract.md` §4.3b and `design/21-Feature-Extensions.md` DASH-01. Classroom report checks in `design/16-Acceptance-and-Test.md` (the EXT-11–EXT-19 pointer) need the same update if the demo numbers change.

## 4. Managers promote staff and edit employee details; members show join date

**Design.** **Conflicts.** `design/15-Data-Auth-and-Gateway.md` §2.5 and `design/21-Feature-Extensions.md` AUTH-26 say only the platform admin changes `MANAGER`/`STAFF`. AUTH-27 lets a manager remove staff and edit the dealership profile, not another person's account. `design/14-Backend-API-Contract.md` §3.7b is the admin role route. §2.1 lets a user patch their own display name and phone; username, role, and email stay fixed. §3.6 says binding an existing account never changes its contact fields.

**Code.** `backend/dotnet/DealerOps.Core/Dealer/DealerRole.cs` is `Manager` and `Staff`. `MembershipService.SetRole` is reached from `AdminMemberController` (platform admin). `frontend/react/src/pages/TeamPage.tsx` says the platform admin appoints managers and only offers Remove for staff. `MembershipEntity.CreatedAt` exists, but `MemberResponse` does not expose it, and the members table has no joined column. The Team members table is fed by `MemberOption` from `GET /members` (`MemberDirectoryService`), so the joined date goes on that DTO. `frontend/react/src/pages/AdminPage.tsx` already has Make manager / Make staff.

**Size.** Medium for a joined-date column (membership `created_at` is already stored; it is the first-bind time, so a member who was unbound and re-bound may show the original row's date unless the rule is stated). Large for promotion and for a manager editing another account's email or phone: that moves a platform-admin power onto the dealership and changes who may write `app_user`.

**Design update required.** Yes. `design/14-Backend-API-Contract.md` §3.7b and §5.6–§5.8, `design/15-Data-Auth-and-Gateway.md` §2.5, `design/21-Feature-Extensions.md` AUTH-26 and AUTH-27, and the manager/staff acceptance notes in `design/16-Acceptance-and-Test.md`. Do not add a JWT role; keep using `membership.dealer_role` so `DealerOps.Gateway` stays unchanged. **Settled 2026-11-03:** that is the route taken — `dealer_role` gains `owner` and `staff` is renamed `sales`, a manager may promote and edit **sales** members only, and the editable fields are full name and phone (`requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md`).

## 5. Home-page account creation, dealership inquiry, and a dealership-admin role

**Design.** **Conflicts with the current acceptance flow, and the replacement is unspecified.** `design/12-Frontend-UI-Conventions.md` §1 requires Sign in and Create account on `/`. `design/14-Backend-API-Contract.md` §1.5 and `design/21-Feature-Extensions.md` AUTH-16–AUTH-18 define self-registration as an unbound `Dealer.User`. `design/16-Acceptance-and-Test.md` FE-01 and EXT-05 walk `/register`. A dealership inquiry form is not specified. A dealership admin/owner/regional manager is **not** in the three-level model in `design/15-Data-Auth-and-Gateway.md` §2.5 (`Platform.Admin`, manager, staff).

**Code.** `frontend/react/src/pages/LandingPage.tsx` links Create account to `/register` in the header, hero, and footer. `frontend/react/src/pages/LoginPage.tsx` links there too. `frontend/react/src/router.tsx` still mounts `RegisterPage`. `backend/dotnet/DealerOps.Gateway/Program.cs` still permits anonymous `POST /api/v1/auth/register`. There is no dealership-inquiry API. Buyer-site questions are a different flow (`POST /api/v1/public/dealers/{dealerId}/inquiries` in `design/14-Backend-API-Contract.md` §12a).

**Size.** Small to hide the create-account buttons and leave `/register` and the API in place, which matches "for now". Large to replace registration with an inquiry, and large again for a fourth privilege level.

**Design update required.** Yes even for the small hide, because `design/16-Acceptance-and-Test.md` and `design/12-Frontend-UI-Conventions.md` §1 describe the button. A public inquiry needs `design/14-Backend-API-Contract.md` and a gateway anonymous-route update in `design/15-Data-Auth-and-Gateway.md`. A new role needs `design/15-Data-Auth-and-Gateway.md`, `design/14-Backend-API-Contract.md`, and `design/21-Feature-Extensions.md` before any code. **Do not implement the new role in this pass.** **Superseded 2026-11-03:** the role was specified and implemented as the dealership Owner, a third `dealer_role` value rather than a fourth privilege level in the JWT, with the design updates in `requirements/iteration-2/CR-Role-Hierarchy-2026-11-03.md` §6.

The same note also asks sample ads to link to sign-up instead of sign-in. `LandingPage.tsx` currently sends "Sign in to check your own ads" to `/login`. That request is an author suggestion; the client request (CR-009) is to remove home-page account creation. Decision D4 follows the client: sample ads stay on `/login` and are not pointed at `/register`, a recorded decision against the author suggestion until an inquiry page exists.

## 6. Sortable columns across DMS, leads, team, audit, rules, and pending accounts

**Design.** **Silent.** List contracts fix the order (vehicles by `createdAt` descending, leads newest first, audit newest first). `design/12-Frontend-UI-Conventions.md` does not define sortable headers. `design/14-Backend-API-Contract.md` would have to grow a sort parameter on each list that must sort beyond the current page.

**Code.** `frontend/react/src/components/DataTable.tsx` renders plain `<th>` labels. The named screens are:

| Screen | File | Sort target today |
| --- | --- | --- |
| DMS | `frontend/react/src/pages/DmsPage.tsx` | Core `OrderByDescending(CreatedAt)` in `VehicleService` |
| Leads | `frontend/react/src/pages/LeadsPage.tsx` | `LeadService.List` orders by `CreatedAt` |
| Team members, activity, join requests | `frontend/react/src/pages/TeamPage.tsx`, `frontend/react/src/components/AuditLogPanel.tsx` | Members are an in-memory table; activity uses `AuditService` newest first |
| Admin audit, ad rules, pending accounts, members | `frontend/react/src/pages/AdminPage.tsx`, `frontend/react/src/components/ComplianceRulesPanel.tsx`, `frontend/react/src/components/PendingAccounts.tsx` | Same audit panel; rules are a static table; pending rows expose `createdAt` |
| Record audit drawers | `frontend/react/src/components/AuditTrail.tsx` | Action, Actor, When, Summary, one page of history |

Team activity columns in the note include Location. The screenshots were taken from an origin/robin build: commit 54b6664 ("Show the client location in the audit log") added `audit_event.client_location` and a Location column, now merged into V2. Location therefore exists; keep it and add it to the sortable set rather than dropping it.

**Size.** Large as a program, small per endpoint if every list takes the same `sort` and `direction`. Client-only sort is the wrong fix on paged APIs. The ad-rules table and the current-page member table can be sorted in the browser.

**Design update required.** Yes for every server-sorted list, in `design/14-Backend-API-Contract.md`. Gateway code does not change. `design/12-Frontend-UI-Conventions.md` should list which headers sort.

## 7. Full name must not be unique

**Design.** **Conflicts.** `design/21-Feature-Extensions.md` AUTH-16, `design/14-Backend-API-Contract.md` §1.5, §1.7, and §2.1, and `design/15-Data-Auth-and-Gateway.md` §8 all reject a duplicate display name with `409 DISPLAY_NAME_TAKEN`. `design/16-Acceptance-and-Test.md` EXT-05 expects that 409.

**Code.** `backend/dotnet/DealerOps.Core/Data/AppDbContext.cs` unique index `uk_app_user_display_name`. `backend/dotnet/DealerOps.Core/Dealer/NewAccountRules.cs` rejects a matching display name on register, Google, Firebase, and admin create. Profile save uses the same rule (`MeController` / §2.1). The three UI entry points are `frontend/react/src/pages/RegisterPage.tsx`, the staff drawer in `frontend/react/src/pages/AdminPage.tsx`, and `frontend/react/src/pages/ProfilePage.tsx`.

**Size.** Medium. Drop the uniqueness check and the unique index, and fix every caller that surfaces `DISPLAY_NAME_TAKEN`. Usernames, emails, and account phones stay unique.

**Design update required.** Yes. `design/14-Backend-API-Contract.md`, `design/15-Data-Auth-and-Gateway.md` §8, `design/21-Feature-Extensions.md` AUTH-16, and `design/16-Acceptance-and-Test.md` EXT-05.

The label change is real work. Before the change (branch v1), `frontend/react/src/pages/ProfilePage.tsx` line 138 and `frontend/react/src/pages/AdminPage.tsx` lines 52 and 582 say "Display name", and the hint at `AdminPage.tsx` line 57 says "Display names are unique". Rename those labels to "Full name" and drop the uniqueness hint. The JSON field remains `displayName`.

## 8. Confirm unsaved edits and lead closure

**Design.** `design/12-Frontend-UI-Conventions.md` §1 already requires a second confirmation for Sell and Unbind. It is **silent** on dirty-form prompts and on confirming a lead close. `design/21-Feature-Extensions.md` LEAD-03 treats `WON` and `LOST` as final, which is why a confirm is warranted, but it does not require one.

**Code.** `frontend/react/src/components/FormDrawer.tsx` closes on overlay click or Escape with no dirty check. `frontend/react/src/components/ConfirmDialog.tsx` already exists and is used for sell and unbind. The drawers called out are dealership edit (`AdminPage.tsx`), vehicle add/edit (`DmsPage.tsx`), customer add/edit (`CrmPage.tsx`), lead add/edit and close (`LeadsPage.tsx`), and dealership profile (`TeamPage.tsx`). The dealership profile is an inline form, not a `FormDrawer`, so it needs its own confirm-before-save.

**Size.** Small. One dirty check in `FormDrawer`, a confirm before saving the inline dealership profile, plus an explicit confirm when a lead stage becomes `WON` or `LOST`. No API change.

**Design update required.** No. Record the confirm in `design/12-Frontend-UI-Conventions.md` §4 so later UI work does not remove it.

## 9. Split join requests into open and closed

**Design.** `design/12-Frontend-UI-Conventions.md` §1 forbids two tables on one screen and allows a second list behind a tab. `design/14-Backend-API-Contract.md` §5.7 returns the dealership's requests; it does not require a single mixed table. **The split fits the tab rule; stacking two tables would conflict with §1.**

**Code.** `frontend/react/src/pages/TeamPage.tsx` renders one join-request table with Requested, Status, and Resolved. Status is already on each row, so open versus closed can be two tabs over the same payload.

**Size.** Small, React only, if the existing list includes resolved rows. The closed history comes from the join-request notifications read with `includeResolved`.

**Design update required.** No, unless the list API gains a status filter. Then update `design/14-Backend-API-Contract.md` §5.7.

## 10. Audit log: labels, column order, partial actor match, and search in the change text

**Design.** `design/14-Backend-API-Contract.md` audit filters are entity, action, actor, dealer, and from/to. Actor match is exact. **Silent** on searching inside `fieldSummary` (the example is the word "password") and on aligning filter controls with column order. Date filters exist but the inputs are only labeled for assistive tech.

**Code.** `backend/dotnet/DealerOps.Core/Audit/Dto/AuditLogFilter.cs` has no free-text field. `AuditService` compares `ActorUsername` with equality. `frontend/react/src/components/AuditLogPanel.tsx` is shared by Team activity and the admin audit tab. Its date inputs use `aria-label` "From" and "To" and no visible label. Columns are When, Actor, Action, Record, Dealership (admin only), Changes, Source IP. The panel comment states that the actor query is exact, so suggestions must be a full username. `TeamPage.tsx` already filters suggestion candidates with a partial match, then the API keeps only the exact username.

**Size.** Medium. Visible date labels and column order are React-only. Partial actor match and a search over the change summary are Core query changes on both the admin log and `GET /api/v1/dealer/audit`.

**Design update required.** Yes for the new query parameters, in the audit section of `design/14-Backend-API-Contract.md`. Gateway unchanged. The password example must not copy secret values into the audit; the search should hit the summary keys and non-secret values that are already stored.

## 11. DMS search and add-vehicle form

**Design.** `design/14-Backend-API-Contract.md` §4.1 and `design/12-Frontend-UI-Conventions.md` §3 specify `q` plus exact `make`, `model`, and `modelYear`. `design/21-Feature-Extensions.md` DMS-18 already puts stock number inside `q`. `VehicleService` implements that (`Like` on VIN, make, model, and stock number). **Removing the Make and Model boxes conflicts with the documented filter row.** A typeable year, a dedicated stock box, an open-work-order filter, and a split brand list are **silent**. `design/14-Backend-API-Contract.md` §4.6.1 decodes a VIN to prefill make, model, year, and body; it does not limit years to that make/model.

**Code.** Filters and the add form live in `frontend/react/src/pages/DmsPage.tsx`. `backend/dotnet/DealerOps.Core/Vehicle/Dto/VehicleFilter.cs` has `Q`, `Make`, `Model`, `ModelYear`, and no open-work-order flag. Catalog makes and models come from Core (`design/14-Backend-API-Contract.md` §4.6), not from the AI service. The form field order still puts VIN after make, model, and year (`purchaseFields` in `DmsPage.tsx`).

**Size.** Medium. Dropping Make/Model boxes, making year a text input, moving VIN up, and grouping catalog makes are React work. An open-work-order filter and "years for this model" need Core. Stock search already works through `q`; a separate box can send that same parameter.

**Design update required.** Yes if Make/Model query params are removed or an open-work-order (or model-year) parameter is added: `design/14-Backend-API-Contract.md` §4.1 and `design/12-Frontend-UI-Conventions.md` §3. No for reordering fields and regrouping the make dropdown.

## 12. Customer and vehicle pickers, lead defaults, and lead search

**Design.** `design/12-Frontend-UI-Conventions.md` §3 says lead search suggests customer names, and CRM suggests name, email, and phone. LEAD-04 says the owner is optional. **Silent** on prefilling the owner and on a vehicle-name box.

**Code.** `LeadService.List` applies `q` only to the customer name. `frontend/react/src/pages/LeadsPage.tsx` starts `ownerUsername` as empty. `frontend/react/src/pages/CrmPage.tsx` already filters its vehicle picker on year, make, model, and VIN. The sell dialog in `DmsPage.tsx` uses a plain `<select>` of buyers.

The client asks the Lead drawer's Customer and Vehicle boxes to behave like the leads search (`SearchSuggest`), but `design/12-Frontend-UI-Conventions.md` §3 says "form pickers inside drawers keep their own controls". That is a conflict; the client request wins, so §3 must be amended.

**Size.** Small to prefill the owner from the signed-in username and to reuse the CRM picker pattern. Small-to-medium to let `q` also match the vehicle's year, make, and model, which is an API change because the current page cannot see unloaded rows.

**Design update required.** Yes for a vehicle match on `GET /api/v1/leads`: `design/14-Backend-API-Contract.md` lead list query and `design/21-Feature-Extensions.md` LEAD-05. No for defaulting the owner in the form.

## 13. Reopen a closed lead

**Design.** **Conflicts.** `design/21-Feature-Extensions.md` LEAD-03 says `WON` and `LOST` are final. `design/14-Backend-API-Contract.md` uses `409 LEAD_CLOSED`.

**Code.** `backend/dotnet/DealerOps.Core/Lead/LeadStage.cs` treats Won and Lost as closed. `LeadService.Patch` throws `LEAD_CLOSED` and will not change them. `frontend/react/src/pages/LeadsPage.tsx` disables editing for a closed stage.

**Size.** Medium. Reopening needs a defined target stage, a reason, an audit row, and a funnel-report rule so a reopened lead is not still counted as won or lost.

**Design update required.** Yes. `design/21-Feature-Extensions.md` LEAD-03 and the lead section of `design/14-Backend-API-Contract.md`.

## 14. CRM list: leads instead of vehicles purchased; add a lead; customer notes

**Design.** `design/12-Frontend-UI-Conventions.md` §2 and `design/14-Backend-API-Contract.md` §5.1 keep "Vehicles purchased" (`design/00-Current-Development-Design.md` does not mention it). Lead notes exist (`design/21-Feature-Extensions.md` LEAD-07). **Customer notes are silent.** A lead can already be created for an existing customer (LEAD-01).

**Code.** `backend/dotnet/DealerOps.Core/Customer/Dto/CustomerListItem.cs` exposes `LinkedVehicleCount`, not a lead count. `frontend/react/src/pages/CrmPage.tsx` shows that column, and the open customer already lists leads via `customerId` on `LeadController.List` with links to `/leads`. There is no customer-note type; notes are `LeadNoteEntity` only.

**Size.** Small to replace the list column with a lead count (new list field) and to add a "Add lead" action that opens the existing lead create flow with the customer set. Medium for customer notes: a new Core entity, API, and drawer section. Do not overload lead notes for this.

**Design update required.** Yes. Customer list shape and a notes API belong in `design/14-Backend-API-Contract.md`. Column label belongs in `design/12-Frontend-UI-Conventions.md` §2. Notes are dealership business data, so they stay in Core and must not be sent to `DealerOps.AiService` (same rule as LEAD-09).

## 15. Duplicate-customer warning, and shared customer phone numbers

**Design.** **Conflicts on phone.** `design/14-Backend-API-Contract.md` §5.2 and §5.3 return `409 PHONE_TAKEN` inside the dealership. Email may be shared and returns `emailWarning` (cited as CRM-13 from `design/12-Frontend-UI-Conventions.md` §4 and `design/14-Backend-API-Contract.md` §5.4, but CRM-13 is not defined in `design/21-Feature-Extensions.md`). Name and address duplicates are **silent**. Account phone uniqueness (`uk_app_user_phone`) is a different rule and is not what this note asks to relax.

**Code.** `CustomerService.RequireUniquePhone` enforces the dealership phone rule on create and patch. The same service already builds `emailWarning`. `frontend/react/src/pages/CrmPage.tsx` maps `PHONE_TAKEN` to a visible error. Lead create goes through the same customer rules when `newCustomer` is sent. `BuyerSiteService` finds the customer by phone for a public inquiry, so shared phones need a rule there too.

**Size.** Medium. Replace the phone 409 with the email-warning pattern for name, email, phone, and address, on CRM save and on lead create. Confirm-and-save needs a second request or a flag so the API can tell a warning from a hard error.

**Design update required.** Yes. `design/14-Backend-API-Contract.md` §5.2, `design/12-Frontend-UI-Conventions.md` §4, and `design/21-Feature-Extensions.md` (define CRM-13 there).

## 16. VIN must match the decoded vehicle, and the Carfax URL must be a unique Carfax link

**Design.** **Conflicts.** §4.2 accepts any 17-character VIN (no I, O, or Q) and any http(s) `carfaxUrl` up to the documented length. §4.6.1 decode prefills the form and does not reject a mismatch. VIN uniqueness per dealership stays.

**Code.** VIN and Carfax format rules are DataAnnotations on `backend/dotnet/DealerOps.Core/Vehicle/Dto/CreateVehicleRequest.cs` and `PatchVehicleRequest.cs`; VIN uniqueness is checked in `VehicleService`. The format rules are mirrored in `DmsPage.tsx` (`URL_PATTERN` for Carfax). Decode is the public catalog route, implemented in Core.

**Size.** Medium. Carfax host and uniqueness checks are ordinary validation. Forcing make, model, and year to equal a vPIC decode is larger: the catalog can be down (`502`), many vehicles decode incompletely, and staff can legitimately correct a bad decode. Specify the failure mode before coding it.

**Design update required.** Yes. `design/14-Backend-API-Contract.md` §4.2 and §4.6.1.

## 17. A sale must name a buyer; leads on the vehicle; no duplicate lead; close leads when the vehicle sells

**Design.** **Conflicts and extends.** §4.5 sells with date and price only. The sell dialog may link a customer, and the bill of sale already tolerates no buyer (`design/21-Feature-Extensions.md` SALE-01). LEAD-02 allows a vehicle on a lead and does not forbid a second open lead for the same customer and vehicle. LEAD-03 does not auto-close leads on a sale. One vehicle still links to one customer (`design/00-Current-Development-Design.md`).

**Code.** `VehicleService.Sell` does not read leads. `DmsPage.tsx` lets the buyer stay "Not linked yet". `AppDbContext.ConfigureLead` indexes `(dealer, stage)` and does not unique `(customer, vehicle)`. `CrmPage.tsx` already shows a customer's leads; the vehicle drawer does not show a lead count. Today sell and buyer link are two browser calls (sell, then the CustomerVehicle link/unlink path), so a required buyer means one Core call. A duplicate-lead rule also hits `BuyerSiteService`, which creates a lead for each public inquiry.

**Size.** Large. These four behaviors belong in one Core transaction: require `customerId` or an explicit other-buyer name on sell, reject a duplicate open lead, attach leads to the vehicle list, and move matching open leads to a defined closed stage when that customer buys that vehicle. An "other" buyer who is not a CRM customer conflicts with "one vehicle, one customer" and needs an explicit decision. Auto-close must not close a different customer's lead on the same vehicle without a rule.

**Design update required.** Yes. `design/14-Backend-API-Contract.md` §4.5 and the lead section, `design/21-Feature-Extensions.md` LEAD-02, LEAD-03, and SALE-01, and `design/12-Frontend-UI-Conventions.md` §4.

## 18. Clearer username errors

**Design.** AUTH-16 already states the username character set and says every error names its field in English. **Covers the rule; the note says the current text is hard to read.**

**Code.** The username pattern is on `backend/dotnet/DealerOps.Core/Dealer/Dto/CreateMemberRequest.cs` with no `ErrorMessage`, so the default DataAnnotations text is returned; the admin staff drawer shows it. `AdminPage.tsx` already has a readable hint when the username is taken. Invalid characters are a separate `400 VALIDATION` message.

**Size.** Small. Add an `ErrorMessage` for `fieldErrors.username` in `CreateMemberRequest.cs` and show it on the staff drawer. No rule change.

**Design update required.** No, unless the allowed character set changes.

## 19. Platform admin sends a join request instead of binding; pending accounts can be edited or removed

**Design.** **Conflicts.** AUTH-18 and AUTH-20, `design/15-Data-Auth-and-Gateway.md` §2.5 and §8, and `design/14-Backend-API-Contract.md` §3.6 and §3.8 say the platform admin binds an unbound account and does not rewrite its credentials. Join requests are filed by the user and approved by a manager (AUTH-25). Pending accounts have list and bind, not admin edit or delete. Self-delete exists at §2.2 and is not an admin action.

**Code.** `frontend/react/src/components/PendingAccounts.tsx` offers "Bind without password" only. `MembershipService` binds directly. `AdminPendingUserController` lists pending users. There is no admin delete or admin patch of a pending username, email, or phone. The main account-creation path is the AdminPage create-staff drawer (`POST /api/v1/admin/dealers/{id}/members`), which creates and binds in one step.

**Size.** Large. Replacing bind with "admin creates a join request that a manager must approve" changes tenancy onboarding and the classroom bind script. Editing username, email, or phone hits the same uniqueness rules as registration. Removing a pending account should follow the existing self-delete idea (deactivate, keep audit) rather than a hard delete, per `design/15-Data-Auth-and-Gateway.md` §8.6 (NFR-07, "nothing is deleted").

**Design update required.** Yes. `design/14-Backend-API-Contract.md` §3.6 and §3.8, `design/15-Data-Auth-and-Gateway.md` §8, `design/21-Feature-Extensions.md` AUTH-18, AUTH-20, and AUTH-25, and `design/16-Acceptance-and-Test.md`. Gateway route list stays the same if these remain under `/api/v1/admin/**`.

## 20. Delete a dealership or a user, with a second confirmation; admin edits email and phone

**Design.** **Conflicts with hard delete.** `design/15-Data-Auth-and-Gateway.md` §8.6 (NFR-07) says nothing is deleted, and §2.3 says unbind deactivates the membership and does not delete the account. Admin edit of someone else's email or phone **conflicts** with §3.6 (existing credentials are not replaced).

**Code.** `frontend/react/src/pages/AdminPage.tsx` already confirms unbind. The dealership edit drawer has no active toggle, and no dealership-deactivate action exists in the UI. There is no dealership-delete or user-delete action. `ConfirmDialog.tsx` is the confirmation widget to reuse.

**Size.** Small for a second confirmation around the existing unbind action. A dealership deactivate (soft delete under NFR-07) is new work: an admin action, an endpoint under `/api/v1/admin/**`, and its confirm. Large for a true delete: vehicles, customers, leads, audit, and memberships reference the dealership, and `design/15-Data-Auth-and-Gateway.md` says the account row stays. Admin contact edits are medium and share the uniqueness work in item 7 and item 19.

**Design update required.** Yes if delete, dealership deactivate, or admin contact edit is real. No if the work is only an extra confirm on the existing unbind action; still describe that confirm in `design/12-Frontend-UI-Conventions.md`.

## 21. Home page says it is for dealerships; shop copy, search, back, and the inquiry character count

**Design.** `design/12-Frontend-UI-Conventions.md` §1 says `/` exposes no dealership data. `design/21-Feature-Extensions.md` SHOP-01 and `design/14-Backend-API-Contract.md` §4.6.2 and §12a define `/shop`: directory cards show logo, in-stock count, and sold count; the dealership page already returns `contactPhone`, `contactEmail`, and `contactAddress`. The directory payload does not include address or phone. The shop title is not specified as "used". Inquiry `message` is 1–1000 characters. **Silent** on a back button, directory search, and a visible character count.

**Code.** `frontend/react/src/pages/LandingPage.tsx` hero is dealership-oriented but does not say the page is not for retail buyers. `frontend/react/src/pages/ShopPage.tsx` heading is "Shop used vehicles". Directory cards use `frontend/react/src/api/publicDealers.ts` (`id`, `legalName`, `slug`, `hasLogo`, counts). The dealership inventory view already prints address, phone, and email, has no back control beyond the header "Dealerships" link, and does not filter vehicles. The inquiry `<textarea>` sets `maxLength={1000}` and shows no counter.

**Size.** Small for the home-page sentence, the "used" wording, a back link, a client-side inventory filter, and a character counter. Medium if directory search and address/phone must come from the API, because `GET /api/v1/catalog/dealers` would grow fields. The inventory payload is already loaded, so a vehicle search box does not need a new route.

**Design update required.** Yes only if the public dealer directory shape changes (`design/14-Backend-API-Contract.md` §4.6.2 and SHOP-01). No for copy, the back link, the counter, and a filter over vehicles the page already fetched. Gateway already allows `GET /api/v1/catalog/**` and `GET /api/v1/public/**`.

## Suggested implementation order

Build in this order so later work sits on a stable contract, Core remains the only writer of business data, and the gateway stays a proxy.

1. **Write the design deltas first for anything marked Yes**, in the same change as the code. Do not start the deferred dealership-admin role or a public inquiry. Hide the create-account buttons only, and update `design/12-Frontend-UI-Conventions.md` and `design/16-Acceptance-and-Test.md` with that hide. Leave sample ads on `/login` (decision D4, following the client). Update `dealer-platform/openapi.yaml`, the `frontend/react/src/api/*.ts` clients, and the `Program.cs` DDL patch list with each contract or schema change.

2. **React-only confirms and copy** (items 8, 9, and the small parts of 21): dirty-form and lead-close confirms, join-request tabs, shop wording, back link, inquiry counter, visible audit date labels. No Core deploy.

3. **Account name uniqueness and the "Full name" label** (item 7) in `DealerOps.Core` (drop `uk_app_user_display_name`, with a `Program.cs` DDL patch so existing databases drop it too), then the register, profile, and admin staff forms. This removes a false 409 before any later account-edit work.

4. **Sale record** (items 1, 2, and the buyer rule in 17) in `VehicleService.Sell` and `DmsPage.tsx`: persist the seller, require a CRM buyer or an explicit documented alternative, and show cost, work-order spend, and list price. Publish `soldOn`, sold-to, and sold-by on the vehicle list.

5. **Sales periods and salesperson totals** (item 3) on the existing Core sales report, then `DashboardPage.tsx` and `SalesFunnelPage.tsx`. Depends on step 4.

6. **Lead rules that follow a sale** (items 13 and 17): reopen, duplicate open lead, lead count on the vehicle, and auto-close when that customer buys that vehicle. Keep the update inside Core so the sell transaction and the lead rows commit together. Then `LeadsPage.tsx`, `DmsPage.tsx`, and `CrmPage.tsx`.

7. **CRM warnings, shared phones, notes, and the lead column** (items 14 and 15) in `CustomerService` and `CrmPage.tsx`.

8. **Team and admin authority** (items 4, 18, 19, and 20) only after the client confirms manager promotion, admin join-requests instead of bind, and deactivate-versus-delete. Implement in `MembershipService` and the admin controllers. Reuse `ConfirmDialog`. Do not add a JWT role.

9. **List sorting and richer search** (items 6, 10, 11, and 12) once the new columns exist: one sort parameter on the Core list endpoints, audit text search and partial actor match, DMS open-work-order filter, lead vehicle text. Teach `DataTable.tsx` to render sort buttons. The gateway does not parse these queries.

10. **VIN and Carfax validation** (item 16) after the add-vehicle form layout settles, still inside `VehicleService` and the catalog decode path.

`DealerOps.Gateway` changes only if step 1 grows into a new anonymous inquiry route or someone adds a JWT role. `DealerOps.AiService` is not in this sequence.
