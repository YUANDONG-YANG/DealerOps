# Change Document Review — 2026-11-03

Source: `requirements/iteration-2/Changes Document.docx` (author Jackson Warga, created 2026-11-03, revision 1, 27 pages, 70 picture placements of 69 distinct images). Compared with the pre-change baseline on branch `v1`.

This note records problems **in the change document itself**: internal conflicts, conflicts with the current design, references to things that do not exist, undefined terms and typos. Each problem ends with the question to confirm with the author or client and the default used for implementation (see `CR-Analysis-2026-11-03.md` §6).

## 1. Internal conflicts

| # | Problem | Evidence | Question / default |
|---|---|---|---|
| P1 | The client asks to remove the home-page create-account entry, but a later author suggestion asks for the sample ads to link to the sign-up page. | Client request "removing the button to create account from the home page will suffice" vs "this should link to the sign-up page". | Which wins? **Default:** the client request; ads keep linking to sign-in (decision D4). |
| P2 | The full-name fix lists "On home page, clicking any of the create account options", although those options are to be removed. | Full-name fix vs the create-account removal. | Fix the rule on the register route and the other paths, not on the removed buttons. |
| P3 | Join Requests is described as "any user account > Team > Join Requests" (sortable list) and as "any manager account > Team > Join requests" (table split). | Sortable list vs the join-request change. | See P6. |
| P4 | Leads should close automatically when the vehicle sells, but closed leads should also be reopenable. Reopening a WON lead after the sale contradicts the recorded sale. | Auto-close change vs reopen change. | **Default:** LOST leads can always reopen; a WON lead only when its vehicle was not sold to that customer (D7). |
| P5 | "No duplicate lead with the same customer and vehicle" conflicts with the buyer site: every "Ask about this vehicle" inquiry creates a new lead and reuses the customer matched by phone. | v1 `backend/dotnet/DealerOps.Core/BuyerSite/BuyerSiteService.cs:121-137`; design/14 §12a. | A repeat inquiry should add a note to the existing open lead instead of failing. Confirm. |

## 2. Conflicts with the current design (v1)

| # | Problem | Evidence | Question / default |
|---|---|---|---|
| P6 | Team > Members, Activity and Join Requests are written as "any user account". At v1, `/team` is for managers only and staff are redirected. | v1 `frontend/react/src/router.tsx:114`; design/15 §2.5 (AUTH-27). | Does staff get Team access? **Default:** no; the paths mean manager accounts. |
| P7 | The platform admin should delete dealerships. design/14 §3.4 explicitly says "Do not add `DELETE /admin/dealers/{id}`". | v1 `design/14-Backend-API-Contract.md:311`. | Contract change required. **Default:** a soft delete with typed-name confirmation, and design/14 §3.4 updated (D6). |
| P8 | The admin should only send join requests, never bind accounts. A new dealership has no manager to approve the first request, so onboarding would stop. | design/14 §3; design/15 §2.4–2.5. | **Default:** a direct bind is allowed only while the dealership has no active manager (D3). |
| P9 | Customer phone becomes non-unique, but the buyer-site inquiry matches a customer by phone. With duplicates, the match becomes ambiguous. | v1 `BuyerSiteService.cs:100,126` ("unique per dealership"). | Match the most recently updated customer with that phone, or always create a new customer? Confirm. |
| P10 | The full-name uniqueness fix names three places, but Firebase sign-up also rejects a duplicate name with `DISPLAY_NAME_TAKEN`. The document itself says "there may be more". | design/14 §1.7. | Covered: the rule is dropped everywhere (D1). |
| P11 | Members "Date Added (when added)": a rejoined member reuses the old membership row, so `created_at` is the first join, not the latest. | v1 `MembershipService.cs:111-127`. | Which date is meant? **Default:** first join date. |
| P12 | The admin should edit a pending account's username. Usernames are login identifiers. | design/14 §3.8; design/15 §8. | Allowed only for pending (never signed-in) accounts. Confirm. |

## 3. References that do not exist

| # | Problem | Evidence |
|---|---|---|
| P13 | The Activity and admin Audit log sortable lists include a "Location" column. It is not on local `robin` / `v1` (columns When, Actor, Action, Record, Dealership for the admin, Changes, Source IP), but it **is** on `origin/robin`: commit `54b6664` "Show the client location in the audit log" (2026-11-02) adds `audit_event.client_location`. The screenshots (image10, image12) were taken from that newer build. The admin list also omits Source IP and Dealership. | v1 `frontend/react/src/components/AuditLogPanel.tsx:76-82`; `git show 54b6664`. The local branches must take `origin/robin` before the sort work can cover Location. |
| P14 | The sales report should list "all sales employees". The product has no sales role, only Manager and Staff. | design/15 §2.5. **Default:** every dealership member with at least one sale. |
| P15 | "Manager account > Any menu with audit" does not name the menus. | **Default:** every screen that uses the shared audit panel. |
| P16 | "Customer" and "Vehicle of interest" boxes: the text names no screen; only the screenshots show the Add lead form. | Screenshots image36 and image37. |
| P17 | "Where columns should go" is a caption on the current DMS table; the picture marks no position. "Menu in reference" likewise marks nothing. | image1, sell-dialog screenshot. **Default:** append the sold columns at the end of the DMS table. |

## 4. Undefined or ambiguous terms

| # | Term | Question / default |
|---|---|---|
| P18 | Sell menu "cost" | Purchase cost only, or purchase cost plus repairs? **Default:** purchase cost; work-order spend is shown separately. |
| P19 | "Total number spend on work orders" | Sum of DONE work-order costs (already added into `repair_cost`, WO-04), or including open ones? **Default:** DONE only. |
| P20 | Day / week / month / year | Calendar periods in the dealership's local time; does a week start on Sunday or Monday? **Default:** calendar periods, week starting Monday. |
| P21 | "Certain employee information" a manager may edit | Not named. **Default:** full name and phone only (D2). |
| P22 | "VINs should be forced to match vehicle information" | No matching rule is given. **Default:** the VIN model-year code must match the year (D6). |
| P23 | Carfax box "should be exclusive" | Read as "accept only Carfax links". **Default:** https on a carfax.com or carfax.ca host. |
| P24 | "Major brands" in the Add Vehicle list | Not listed. **Default:** a fixed popular-makes group. |
| P25 | "Common vehicles" for year limits | Not defined. **Default:** a small static make/model table. |
| P26 | "Replacing [vehicles purchased] with the leads for the customer" | A count, a list or a link? **Default:** a lead count column. |
| P27 | "The appropriate label applied to the customers tied to the lead" | The sentence is garbled; it does not say which leads close or with which stage. **Default:** the buyer's lead becomes WON, other open leads on that vehicle become LOST ("Vehicle sold") (D7). |
| P28 | "Search the activity log based on the change made, such as 'password' to find all login requests made with passwords" | Feasible: login rows store `{"method":"password"}`. Confirm that a free-text match on the change details is enough. |
| P29 | "A larger change like this should require a confirmation" | It applies to Team > Dealership profile (it sits under that line and its screenshot); "larger" is not defined. |
| P30 | "If you feel any other columns ... should be sortable feel free" | Open scope; extra sortable columns are optional. |

## 5. Typos and wording

- "Dealership admin/owner/regional **manger**" (spelled "manager" in the privilege list).
- "split into **to** tables" means "two tables".
- "total number **spend** on work orders" means "total amount spent".
- "search a dealerships inventory for a specific **vehicl**" is cut off.
- "Dealer-ops AutotraderAutotrader" is a run-together picture caption.
- "find all **login requests** made with passwords" means sign-ins (LOGIN and LOGIN_FAILED rows).

## 6. Priority statements

- Client Requests are "urgent changes that must be completed first".
- The dealership admin / owner / regional manager role is "optional and should likely be discussed further with the client" (not implemented, D5).
- "Account creation being done a different way" needs a further client discussion; only the button removal is required now.
- Site Fixes and Changes are "less urgent ... but should still be implemented, especially the fixes".
