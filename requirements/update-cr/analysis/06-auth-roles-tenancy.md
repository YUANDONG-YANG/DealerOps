# Auth, roles, and tenancy — change-request analysis

Thread 6. Source: `requirements/update-cr/Changes Document.docx` (Client Requests and Site Fixes).

Each statement is classified against the current design:

| Class | Meaning |
|---|---|
| **Matches** | The current design already says this. |
| **Extends** | The current design does not provide it. Adding it widens the contract. |
| **Conflicts** | The current design rules the opposite. |

Design used for the ruling, in conflict order from `design/SCOPE-BASELINE.md`: `design/15-Data-Auth-and-Gateway.md` (tenant authority and dealer auth), `design/14-Backend-API-Contract.md` (who may call which route), `design/21-Feature-Extensions.md` (AUTH-16–27, SHOP-01–05), `design/13-Frontend-Engineering.md` (routes and guards), `design/12-Frontend-UI-Conventions.md` (one table per view), `design/SCOPE-BASELINE.md`, and `design/00-Current-Development-Design.md`. The browser’s only API entry is `dealer-gateway` (`design/SCOPE-BASELINE.md` Gateway row; `design/15-Data-Auth-and-Gateway.md` §7 and §8.4). This note does not add a role the design does not already name.

Screen wording such as “any user account” is read as a bound dealership user. The document lists platform admin and “user not logged in” as separate actors. Where that reading is unsafe, the row says so.

---

## 1. Actors the design already has

JWT roles are only `Platform.Admin` and `Dealer.User` (`design/14-Backend-API-Contract.md` §1.3; `design/15-Data-Auth-and-Gateway.md` §8.2). Manager and staff are the same JWT role. The difference is `membership.dealer_role`: `MANAGER` or `STAFF` (`design/15-Data-Auth-and-Gateway.md` §2.5; `design/21-Feature-Extensions.md` AUTH-26).

| Actor | How the design recognizes them | Dealership data |
|---|---|---|
| Anonymous visitor | No JWT. Login, register, Google, Firebase, catalog, and `GET`/`POST /api/v1/public/**` | No tenant business rows. Public shop lists ready ads and dealership contact on the shop page (`design/14-Backend-API-Contract.md` §12a; `design/21-Feature-Extensions.md` SHOP-01–05) |
| Unbound `Dealer.User` | Signed in, zero active memberships. Lands on the no-access screen | `GET`/`PATCH`/`DELETE /me` and one join request. Business routes return **403** (`design/14-Backend-API-Contract.md` §1.3, §2, §5.7) |
| Staff | `Dealer.User` plus one active membership `STAFF` | This dealership’s DMS, CRM, leads, ads, reports, dashboard, work orders. May record a payment. No Team page, no join-request inbox, no audit, no payment ledger (`design/15-Data-Auth-and-Gateway.md` §2.5; `design/21-Feature-Extensions.md` AUTH-27) |
| Manager | `Dealer.User` plus one active membership `MANAGER` | Everything staff can, plus Team, join requests, removing staff, dealership profile, audit reads, payment ledger (`design/14-Backend-API-Contract.md` §5.7–§5.8, §9.1, §9.3) |
| Platform admin | `Platform.Admin`. `app_user.dealer_id` is null. No membership is required | `/admin` only: dealerships, bind and unbind, role changes, password reset, pending accounts, ad rules, platform audit. Business URLs return **403** with no business fields (`design/15-Data-Auth-and-Gateway.md` §2.1, §2.4; `design/00-Current-Development-Design.md` Screens and roles) |

Tenant rules that sit under every row below:

- One active membership per person. A second active dealership returns **409** `DUP_MEMBER`. There is no dealership switcher (`design/15-Data-Auth-and-Gateway.md` §2.2).
- The request’s dealership comes from that membership. A `dealerId` in the body, query, or header is ignored (`design/15-Data-Auth-and-Gateway.md` §2.1).
- A cross-dealership id returns **404** (`design/14-Backend-API-Contract.md` §1.3).
- Every new member, including an approved join request, starts as `STAFF`. Only the platform admin changes `dealer_role` (`design/21-Feature-Extensions.md` AUTH-26; `design/14-Backend-API-Contract.md` §3.7b).
- A manager cannot remove another manager or themselves (`design/14-Backend-API-Contract.md` §5.8).
- The username is the membership key, the audit actor, and the JWT `sub` (`design/15-Data-Auth-and-Gateway.md` §8.3).

`design/SCOPE-BASELINE.md` erratum 10 (2026-10-16) still says any active member may approve a join request. AUTH-25, AUTH-27, `design/15-Data-Auth-and-Gateway.md` §2.5, and `design/14-Backend-API-Contract.md` §5.7 later limit that inbox to managers. This note uses the later manager-only ruling.

The document’s ladder omits the unbound signed-in account. That actor exists today and can file a join request without seeing dealership data.

---

## 2. Privilege ladder and the proposed dealership admin

The document says:

> From most to least privilege: Platform admin. Dealership admin/owner/regional manager. Dealership manager. Dealership staff. User not logged in.

It also says a dealership-specific admin is optional and should be discussed before implementation:

> What was also discussed with the client was the potentiality of a dealership specific admin/owner/regional manger account that has some admin capabilities to change things with the dealership, like the platform admin account, but is exclusive to a single dealership. This functionality is optional and should likely be discussed further with the client before full implementation occurs.

| Statement | Class | Design basis |
|---|---|---|
| Platform admin is the highest actor | **Matches** | `Platform.Admin` is the only JWT role above `Dealer.User` (`design/15-Data-Auth-and-Gateway.md` §2.5, §8.2) |
| Dealership manager outranks dealership staff | **Matches** | Same JWT role; `MANAGER` may call the extra routes in §2.5 and AUTH-27. Staff receive **403** on those routes |
| A signed-out visitor is the lowest actor | **Matches** | Anonymous routes expose no tenant business rows (`design/14-Backend-API-Contract.md` §1.3, §12a) |
| Insert “Dealership admin/owner/regional manager” between platform admin and dealership manager | **Conflicts** | The organisation has three levels: platform admin, manager, staff (`design/15-Data-Auth-and-Gateway.md` §2.5). JWT roles stay `Platform.Admin` and `Dealer.User`. `design/13-Frontend-Engineering.md` §3: do not invent a third role. `dealer_role` is only `MANAGER` or `STAFF` (AUTH-26) |
| That account would be exclusive to a single dealership | **Matches** the tenancy rule, as a scope constraint on a role the design does not have | One active membership; client `dealerId` is ignored (`design/15-Data-Auth-and-Gateway.md` §2.1–§2.2). The sentence does not grant one person several dealerships |
| Give that account “some admin capabilities … like the platform admin account” | **Conflicts** if those capabilities are the platform admin’s current set | Platform admin powers include every dealership, global ad rules, the platform audit log, and pending accounts across the platform (`design/14-Backend-API-Contract.md` §3, §3.9, §9.2). Copying that set into one dealership crosses the tenant boundary. A narrower set overlaps powers the manager already has (profile, staff removal) or powers reserved to the platform admin (role changes) |

The document does not define which admin powers move. Ad rules are global: a rule change invalidates checks across dealerships (`design/14-Backend-API-Contract.md` §3.9). A single-dealership account must not receive that route.

---

## 3. Who may change people

### 3.1 Managers promoting staff and editing employees

> The client has requested that manager accounts be allowed to promote other staff to managers, as well as being able to edit certain employee information. The client has also requested a column in the members section listing when the member joined.

| Statement | Class | Design basis |
|---|---|---|
| A manager may promote staff to manager | **Conflicts** | AUTH-26: only the platform admin promotes or demotes, via `PUT /api/v1/admin/dealers/{id}/members/{username}/role`. “No dealer user can change a role” (`design/14-Backend-API-Contract.md` §3.7b). `design/SCOPE-BASELINE.md` historical row: only the admin changes a role. A dealer user calling `/api/v1/admin/**` receives **403** |
| A manager may edit “certain employee information” | **Conflicts** as an account edit | The fields are unnamed. Dealer users cannot create, edit, or remove logins through the admin APIs (`design/SCOPE-BASELINE.md` erratum 10). A manager’s people actions are approve or reject a join request, remove a `STAFF` member, and edit the dealership profile (`design/14-Backend-API-Contract.md` §5.7–§5.8). Account contact edits are self-service `PATCH /me` (display name and phone only, §2.1) or absent |
| Members list shows when the member joined | **Extends** | `GET /api/v1/members` returns `username`, `displayName`, `source`, `dealerRole` (`design/14-Backend-API-Contract.md` §5.6). The admin member item (§3.5) has no join timestamp. Pending accounts expose account `createdAt` (§3.8), which is registration time, not the membership start |

The Team sortable columns “Role, Source, Date Added (when added)” split the same way: Role and Source **match** `dealerRole` and `source` on §5.6. Date Added **extends** the directory. `source` (how the account was created: `google`, `firebase`, `password`, `admin`) is the dealer directory field. Admin Members “Sign-in” is the separate admin-only `signInMethod` (`password`, `firebase`, `google`) in §3.5. Those two columns are different facts.

### 3.2 Platform admin bind, pending accounts, and deletion

> The platform admin should not be able to directly bind accounts to dealerships, instead they should only be able to send the join request to the dealerships. This will improve security and prevent a platform admin from being able to create an account to go and access a dealerships customer and vehicle database, something the client asked platform admins to not be able to do.

| Statement | Class | Design basis |
|---|---|---|
| A platform admin must not read or write a dealership’s customers or vehicles | **Matches** | After opening stores and binding staff, admin has zero business data (`design/SCOPE-BASELINE.md` Multi-tenant row). Business URLs return **403** with no business fields (`design/15-Data-Auth-and-Gateway.md` §2.1, §2.4; `design/00-Current-Development-Design.md`) |
| Replace direct bind with an admin-sent join request | **Conflicts** | The platform admin grants access by `POST /api/v1/admin/dealers/{id}/members`, including bind-without-password of a pending account (`design/14-Backend-API-Contract.md` §3.6, §3.8; AUTH-20; `design/15-Data-Auth-and-Gateway.md` §8.2). The person who files a join request today is the unbound account (`POST /api/v1/me/join-request`), and a manager approves it (AUTH-25). An admin-initiated request is a new direction |
| Stop the admin from reaching business data by creating a staff login | **Extends** the threat the role gate does not close | The admin role itself cannot call business APIs. The admin can still set the new account’s password (§3.6) and can reset an active member’s password (§3.7a). Signing in as that account is a `Dealer.User` session. Removing bind, while leaving password issuance, leaves that path |

> Admins should be able to remove pending accounts.

| Statement | Class | Design basis |
|---|---|---|
| Platform admin may remove a pending account | **Extends** the HTTP contract | Pending accounts are active unbound `Dealer.User` rows (`design/14-Backend-API-Contract.md` §3.8). The admin list is read-only plus “Add to dealership”. The account holder can soft-delete themselves (`DELETE /api/v1/me`, §2.2). `design/15-Data-Auth-and-Gateway.md` §8.6 says an account lasts until that self-delete “or an admin removes it”, and §3 defines no admin remove-user route. Unbind (§3.7) applies to a membership, and a pending account has none |
| That removal destroys the row | **Conflicts** if implemented as a hard delete | §8.6 soft-deletes accounts: the row stays, memberships go inactive, and email, phone, and Google subject are suffixed so the person can register again. Audit keeps the username |

> Pending accounts should be able to be edited in some way by admin, such as email, phone, username, in the event that account creation information was accidentally input incorrectly.

| Statement | Class | Design basis |
|---|---|---|
| Admin may correct a pending account’s email or phone | **Extends** | Binding an existing account never changes display name, password, or contact fields (`design/14-Backend-API-Contract.md` §3.6). Email and phone are unique sign-in identifiers (`design/15-Data-Auth-and-Gateway.md` §8.3). A collision is already **409** `EMAIL_TAKEN` or `PHONE_TAKEN` |
| Admin may change a pending account’s username | **Conflicts** | Username is the JWT subject, the membership key, and the audit actor (`design/15-Data-Auth-and-Gateway.md` §8.3; `design/SCOPE-BASELINE.md` Auth row). Issued tokens and audit rows would point at the old name |

> Dealerships should be able to be deleted by platform admin; however, this should be a more complex decision requiring at least one extra step to confirm.

| Statement | Class | Design basis |
|---|---|---|
| Platform admin deletes a dealership, with an extra confirm | **Conflicts** | `design/18-Backend-Core-Engineering.md` §4.1: no delete dealership. The admin sets `active` on `PATCH /api/v1/admin/dealers/{id}` (`design/14-Backend-API-Contract.md` §3.4). Inactive dealerships drop out of the public directory (§4.6.2). §8.6 keeps business rows. An extra confirm **matches** the existing confirm pattern for unbind (`design/13-Frontend-Engineering.md` §6 `ConfirmDialog`) and would still need a new delete decision |

> Admins should be able to delete users; however, this should be a more complex decision requiring at least one extra step to confirm. Additionally, admin should be able to edit some information on accounts, such as email or phone number.

| Statement | Class | Design basis |
|---|---|---|
| Platform admin deletes a user, with an extra confirm | **Extends** | §8.6 names admin removal and does not specify the route. What exists is unbind (§3.7), which keeps `app_user` and the password hash (`design/15-Data-Auth-and-Gateway.md` §2.3), and self soft-delete (§2.2). The extra confirm **matches** unbind’s confirm dialog. A hard delete **conflicts** with §8.6 and with append-only audit (`design/15-Data-Auth-and-Gateway.md` §8.8) |
| Platform admin edits another account’s email or phone | **Extends** | `PATCH /me` lets the signed-in user change display name and phone, not email (`design/14-Backend-API-Contract.md` §2.1). Admin create and bind do not update an existing account’s contact fields (§3.6). Uniqueness rules for email and phone still apply |

### 3.3 Identity rules on create and profile

> Currently an account is unable to be created if the full name is already used. Many people have the same name and would be unable to have an account with the current system.

The document names three places: home-page create account, platform admin create staff, and Profile.

| Statement | Class | Design basis |
|---|---|---|
| Allow two accounts to share a full name on register, admin create, and profile | **Conflicts** | AUTH-16 and `design/14-Backend-API-Contract.md` §1.5: full names are unique, trimmed and case-insensitive (`uk_app_user_display_name`), and a duplicate returns **409** `DISPLAY_NAME_TAKEN`. `PATCH /me` uses the same code (§2.1). Admin-created accounts write the same column (§3.6) |
| Google sign-in already avoids a hard failure on a duplicate display name | **Matches** a narrower path | `design/14-Backend-API-Contract.md` §1.6: a derived username or display name that is already taken gets a numeric suffix. Password register and profile update reject the duplicate instead |

> Display name should be listed as full name in Profile and when creating a staff account through the admin page.

| Statement | Class | Design basis |
|---|---|---|
| Label the field “full name” on Profile and admin staff create | **Extends** the label | The stored field remains `displayName` (`design/14-Backend-API-Contract.md` §1.5, §2.1, §3.6; `design/13-Frontend-Engineering.md` §2 and §5.3). This does not add an identity attribute |

> When creating a staff account for a dealership, typing the username with incorrect characters returns a difficult to read error.

| Statement | Class | Design basis |
|---|---|---|
| Username characters stay letters, digits, `.`, `_`, `-`, length 3–64, with at least one letter | **Matches** | AUTH-16; `design/15-Data-Auth-and-Gateway.md` §8.3. The letter rule keeps a username from being read as a phone number |
| The admin-create error for a bad username is a clear field message | **Extends** | Register errors name the field in English (AUTH-16, §1.5). Admin create is specified as `400 VALIDATION` (`design/14-Backend-API-Contract.md` §3.6). The admin screen copy is the generic “Check username, display name, password, and a valid email and/or phone” (`design/13-Frontend-Engineering.md` §5.3) |

Profile reach is narrower than “any account”. `/profile` is for `Platform.Admin` or a `Dealer.User` who already has a dealership. An unbound account stays on the no-access screen, including for `/profile`, and can still `PATCH /me` (`design/13-Frontend-Engineering.md` §2; `design/14-Backend-API-Contract.md` §1.3). The full-name rule on profile **matches** who can open that page, and **conflicts** with opening it for every signed-in account.

---

## 4. Registration, the home page, and anonymous visitors

> The client has requested that the create account functionality on the home page be converted into a way for dealerships wanting to inquire and potentially use the service.

> The client talked about account creation being done a different way; however, this is something we need to discuss further with the client. For now, removing the button to create account from the home page will suffice.

| Statement | Class | Design basis |
|---|---|---|
| The signed-out home page offers Create account | **Matches** the current page, and removing it **conflicts** | `design/SCOPE-BASELINE.md` erratum 6 and `design/13-Frontend-Engineering.md` §2: `/` shows Sign in and Create account. `/register` is a public route (AUTH-16). New accounts are unbound `Dealer.User` until a bind or an approved join request (`design/15-Data-Auth-and-Gateway.md` §8.2; AUTH-18) |
| Replace that button with an inquiry from a dealership that wants the service | **Extends** | No platform-sales inquiry exists. The public inquiry that does exist is a vehicle shopper writing to one dealership (`POST /api/v1/public/dealers/{dealerId}/inquiries`), which creates a CRM customer and a `NEW` lead inside that dealership (`design/14-Backend-API-Contract.md` §12a; SHOP-04). That is a different actor and a different tenant write |
| Account creation will move to an unspecified later method | **Extends**, and the document defers it | AUTH-16–24 are the current methods: password register, Google, Firebase, and admin-created accounts. Google and Firebase also create unbound accounts and are not on the home-page button alone (`design/14-Backend-API-Contract.md` §1.6–§1.7; `design/13-Frontend-Engineering.md` §2) |

> The sample ads on the home page link to the sign in page. … this should link to the sign-up page.

| Statement | Class | Design basis |
|---|---|---|
| Send sample-ad clicks to `/register` | **Extends** | Both `/login` and `/register` are public (`design/13-Frontend-Engineering.md` §2). The landing page already offers both. Pointing ads at sign-up fights the same document’s “remove Create account for now” if sign-up is removed from the home page |

> There should be something bigger on the home page saying that that page is for dealerships and not customers.

| Statement | Class | Design basis |
|---|---|---|
| `/` is the product page for dealerships; shoppers use the buyer site | **Matches** the boundary | `/` is the signed-out product landing and calls only anonymous VIN decode (`design/13-Frontend-Engineering.md` §2; `design/SCOPE-BASELINE.md` erratum 6). `/shop` is the buyer directory (`design/21-Feature-Extensions.md` SHOP-01). A larger sentence on the page **extends** copy only |

Public shop visibility, where the document assigns it to a signed-out visitor:

| Statement | Class | Design basis |
|---|---|---|
| A signed-out visitor can open a dealership’s buyer site | **Matches** | `/shop` and `/shop/{slug}` are anonymous (SHOP-01). Inventory omits VIN, cost, list price, and customer data (SHOP-02) |
| Directory cards show address and contact details | **Extends** the directory | `GET /api/v1/catalog/dealers` returns id, legal name, slug, logo flag, and in-stock and sold counts (`design/14-Backend-API-Contract.md` §4.6.2). Phone, email, and address are on the dealership inventory payload (`design/14-Backend-API-Contract.md` §12a) and on the shop page (SHOP-01), so the contact is already public one level down |
| Search the dealership directory | **Extends** | §4.6.2 returns the active list sorted by legal name and defines no search parameter |

Staff and managers already open the buyer site from the dashboard (`design/13-Frontend-Engineering.md` §2). That does not grant them another tenant. Shop inquiries notify every member of that dealership, staff included (SHOP-04).

---

## 5. Who can open which signed-in screen

The document’s screen labels, compared with the guards in `design/13-Frontend-Engineering.md` §2–§3 and the route rules in `design/14-Backend-API-Contract.md`.

| Document screen and actor | Class | Who the design allows |
|---|---|---|
| DMS, CRM, Leads, sales report, and the sales area of the dashboard, “any user account” | **Matches** for a bound `Dealer.User` (staff and manager share this data) | `design/00-Current-Development-Design.md`: several staff at one dealership see the same data. Dashboard and sales report are `Dealer.User` routes with no manager gate (`design/13-Frontend-Engineering.md` §2). **Conflicts** for `Platform.Admin` and for an unbound account: both are kept off these pages (§3; business **403**) |
| “A list of all sales employees and their sales metrics” on the dashboard and sales report | **Matches** the audience | The document does not add a sales-only role. Those pages are already every bound dealership user. What the metrics contain is outside this note |
| Team › Members, Team › Activity, Team › Join Requests, “any user account” | **Conflicts** | `/team` requires `dealerRole: MANAGER`. Staff are sent to `/dms` (`design/13-Frontend-Engineering.md` §2; AUTH-27). Activity is `GET /api/v1/dealer/audit` (manager). Join-request list and approve/reject are manager (§5.7). Staff **can** call `GET /api/v1/members` for lead-owner and work-order pickers (§5.6); that does not open the Team page |
| Team › Join requests and Team › Dealership profile, “manager account” | **Matches** | AUTH-27; §5.7; §5.8. Profile edits legal name and contact. `active` stays with the platform admin |
| “Any menu with audit”, manager | **Matches** | Record history `GET /api/v1/audit` and the dealership log `GET /api/v1/dealer/audit` are manager-only (AUD-17; §9.1, §9.3). Staff receive **403** and the UI does not call those routes (`design/13-Frontend-Engineering.md` §3) |
| Platform admin › Audit log, Ad rules, Pending accounts, Members, Dealerships › Staff | **Matches** | Single `/admin` page (`design/13-Frontend-Engineering.md` §5.3, §7). Audit: §9.2. Ad rules: §3.9, dealer users **403**. Pending: §3.8. Members are composed from per-dealership member lists. Create staff: §3.6 |
| Admin Members columns Dealership, Role, Sign-in, Status | **Matches** the fields | UI columns include Dealership and Status (`design/13-Frontend-Engineering.md` §5.3). API items include `dealerRole`, `signInMethod`, and `active` (§3.5). The header shows Make manager / Make staff, which is the admin role change in §3.7b |

Two join-request wordings disagree with each other. “Any user account › Team › Join Requests” **conflicts** with the manager gate. “Any manager account › Team › Join requests” **matches** it. The later, narrower wording is the one that fits AUTH-27.

> Currently join requests lists every single request, I feel this should be split into to tables, one for current requests that need to be approved or rejected and one for all past requests that have been approved or rejected.

| Statement | Class | Design basis |
|---|---|---|
| Managers see pending requests separately from approved, rejected, or cancelled ones | **Matches** the data | `GET /api/v1/dealer/join-requests` is the pending list. `GET /api/v1/dealer/notifications?includeResolved=true` is the history, with `resolvedAction` `APPROVED`, `REJECTED`, or `CANCELLED` (`design/14-Backend-API-Contract.md` §5.7). The Team page already loads that history (`design/13-Frontend-Engineering.md` §2) |
| Show them as two tables on that view | **Extends** the layout | `design/12-Frontend-UI-Conventions.md`: one table per page, tab, or drawer; a second list goes behind its own tab |

Staff still receive dealership notifications except `JOIN_REQUEST` (`design/14-Backend-API-Contract.md` §5.7). A split of the join-request tables does not put that queue on the staff menu.

Dealership profile: the document asks for a confirm before saving “a larger change like this”. Who may save **matches** AUTH-27. The extra confirm **extends** `ConfirmDialog`, which the design names for sell and unbind (`design/13-Frontend-Engineering.md` §6).

Recording a sale stays any bound `Dealer.User` (`design/14-Backend-API-Contract.md` §4.5). “Sold by” does not, in this document, restrict who may sell. Seller identity as a column is outside this note.

---

## 6. Audit: who sees it, and what a search may return

Team › Activity columns When, Actor, Action, and Record (type plus number) **match** `createdAt`, `actorUsername`, `action`, and `entityType` plus `entityId` on the dealership log (`design/14-Backend-API-Contract.md` §9.3). Source IP **matches** `clientIp` on §9.2 and §9.3 (`design/15-Data-Auth-and-Gateway.md` §8.8). The per-record history route returns `clientIp` as null (§9.1). Location has no column.

| Statement | Class | Design basis |
|---|---|---|
| Team Activity shows a Location column | **Extends** | Audit stores `client_ip` only (§8.8). No geo or location field is defined |
| Search the activity log by the change text, “such as searching the word password to find all login requests made with passwords” | **Extends** the query, and the password example **conflicts** with what is stored | Dealership and platform logs filter by `entityType`, `entityId`, `action`, exact `actor`, and a date range (§9.2, §9.3). They do not search `fieldSummary`. Passwords are never logged or returned (`design/14-Backend-API-Contract.md` §3.7a). A failed or successful sign-in is `LOGIN` / `LOGIN_FAILED` on `APP_USER`; an unknown identifier is actor `anonymous`, and the typed identifier is never stored (`design/15-Data-Auth-and-Gateway.md` §8.8; §1.4). The platform log includes sign-ins (§9.2). The dealership log returns rows for the caller’s `dealerId` only (§9.3) |
| Actor search on Team Activity and the admin audit log matches a partial name | **Conflicts** with the current query | `actor` is an exact username (§9.2, §9.3). A contains-match would extend that parameter |
| Admin audit columns and filters line up, and the admin can search by the change | **Extends** the text search | Column order is layout. The filter set above already exists for the platform log, including `dealerId`. Text search of the change is the same extension as the activity-log row |
| Staff open Team Activity or any audit menu | **Conflicts** | AUD-17; §9.1; §9.3; `design/13-Frontend-Engineering.md` §3. The document’s manager-only audit line **matches** |

`GET /api/v1/audit` does not open `DEALER`, `MEMBERSHIP`, or `APP_USER` to dealer users (§9.1). A manager searching Team Activity for password or login events only sees rows that carry that dealership’s id. Platform-wide sign-in rows stay on the admin log.

---

## 7. Decisions the team must make

1. **Dealership admin / owner / regional manager.** The document says this account is optional and should be discussed before implementation. Decide whether it is in scope. If it is, name it as a `dealer_role` value or refuse a third JWT role, list the exact routes, and keep global ad rules, the platform audit log, and other dealerships on `Platform.Admin`. The one-dealership sentence already fits current tenancy.
2. **Manager promotion.** The client asked managers to promote staff to managers. AUTH-26 reserves that to the platform admin and says nothing about demotion. Decide promote-only, promote and demote, or no change. A manager who can create another manager changes who can remove members: managers still cannot remove managers (§5.8).
3. **“Certain employee information.”** Name the fields. Account email, phone, username, and password are login identifiers. Username changes collide with the JWT subject and audit actor. Password edits by a manager would recreate the “sign in as that person” path the client wants closed for the platform admin.
4. **Joined column.** Choose the timestamp: membership start, or account `createdAt`. Pending-account “Registered” already matches account `createdAt` (§3.8). The member DTOs do not return either join time today.
5. **Home-page Create account.** The document asks for three different outcomes: remove the button now, replace it with a dealership-inquiry form, and invent another account-creation method later. Decide which one ships. Google and Firebase still create unbound accounts if only the home button is removed (`design/13-Frontend-Engineering.md` §2).
6. **Dealership inquiry versus shopper inquiry.** A prospect asking to use DealerOps is not SHOP-04. Decide the fields, who receives it, and that it must not write a dealership’s CRM.
7. **Sample ads.** Linking them to `/register` assumes sign-up stays. That conflicts with decision 5 if Create account is removed.
8. **Admin bind versus join request.** The security goal (platform admin cannot read customer and vehicle data) already matches the role gate. The proposed remedy (admin may only send a join request) removes AUTH-20 / §3.6. Decide whether managers still approve, and whether admin password set (§3.6) and password reset (§3.7a) remain. Those two let an admin obtain a `Dealer.User` session inside a dealership even when the admin role is forbidden from business URLs.
9. **Pending-account edit and removal.** Email and phone can be an extension with the existing uniqueness codes. Username change conflicts with identity. Removal needs an admin route; §8.6 already describes a soft remove and forbids a hard delete.
10. **Delete dealership and delete user.** Both ask for an extra confirm, which matches unbind’s dialog. Dealership delete conflicts with `design/18-Backend-Core-Engineering.md` §4.1. Deactivate (`active=false`) already exists. User delete needs a defined soft-delete that keeps audit actors. Decide what happens to memberships, vehicles, and the public shop when a dealership is deactivated or removed.
11. **Duplicate full names.** Allowing shared full names conflicts with `DISPLAY_NAME_TAKEN` and `uk_app_user_display_name` on register, profile, and the admin-create column. Google already suffixes a collision. Decide one rule for every path.
12. **Audit text search and Location.** A contains search on actor and on change text extends §9.2–§9.3. Searching the word “password” cannot return password values or the typed sign-in identifier. Location needs a new stored fact, or the column should stay Source IP (`clientIp`).
13. **Team for every dealership user.** “Any user account” on Team Members, Activity, and Join Requests conflicts with AUTH-27. The manager-only lines later in the document match it. Decide which wording wins. Staff already read `GET /api/v1/members` for pickers; Activity and join-request approval are not in that API.
14. **Stale join-request sentence.** Update `design/SCOPE-BASELINE.md` erratum 10 when the next auth change lands, so “any active member may approve” is not implemented beside AUTH-27. That edit belongs with the implementation, not with this analysis.

DMS columns, sort behaviour, CRM duplicate customers, lead reopen, VIN checks, and unsaved-edit confirms on vehicle and customer forms are outside this note except where a sentence names who is logged in.
