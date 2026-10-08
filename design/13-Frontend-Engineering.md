# Frontend engineering (file split for coding)

- Status: **current (v6 frontend engineering)**
- Authority on conflict: **course PPT > spec fields > IMPLEMENTATION-BRIEF / 00 > 15 (data/tenant/gateway) / 14 (HTTP JSON) / this document (frontend engineering) > 12**
- This document covers only: **routes, guards, sign-in, page↔API mapping, component split, empty/error states, English copy**. **Fields, enums, and DTOs follow the handbook / 14**; this document does not define extra columns
- Out of scope: buyer/OEM/tickets/leads/KPI home/self-registration/forgot-password/standalone Audit page; do not change the backend contract, SQL, or `01`–`06`

Coding repo: `dealer-web`. Browser HTTP **hits Gateway only**. UI is English. Copy fields and enums from handbook section 3; this document does not rewrite them.

---

## 1. Stack and directories (enough to start)

Stack: **Vue 3 + Vite + Element Plus + Vue Router + Pinia**. No third-party identity SDK (see §4). HTTP uses axios (or a fetch wrapper — pick one and lock axios). No Nuxt, no chart library, no generic CRUD generator.

Layout:

```
dealer-web/
  .env.example          # copy only the four frontend items from platform/env.example
  src/
    main.ts
    App.vue
    router/index.ts
    auth/login.ts       # username/password login + sessionStorage token
    api/http.ts         # VITE_GATEWAY_URL only, Bearer
    api/me.ts
    api/admin.ts
    api/vehicles.ts
    api/customers.ts
    api/listings.ts
    api/audit.ts
    api/assistant.ts
    stores/session.ts   # account, role, dealer display name
    layouts/AppLayout.vue
    components/
      AppMenu.vue
      DataTable.vue
      FormDrawer.vue
      ConfirmDialog.vue
      PageState.vue
      AdWorkspace.vue   # form left, results right
      AssistantCard.vue
    views/
      LoginView.vue
      AdminView.vue
      DmsView.vue
      CrmView.vue
      AdsView.vue
      AssistantView.vue
```

Do not add "ticket/lead/dashboard/AuditView" splits. Keep `stores` for session only; list state can live in each View.

---

## 2. Route table

Handbook page names: Login / Admin / DMS / CRM / Ad compliance / Assistant. Use the six paths below; no seventh business route.

| path | name | component | `meta` | post-login landing |
|---|---|---|---|---|
| `/login` | `login` | `LoginView` | `public: true` | — |
| `/admin` | `admin` | `AdminView` | `roles: ['Platform.Admin']` | Admin default page |
| `/dms` | `dms` | `DmsView` | `roles: ['Dealer.User']` | staff default page |
| `/crm` | `crm` | `CrmView` | `roles: ['Dealer.User']` | — |
| `/ads` | `ads` | `AdsView` | `roles: ['Dealer.User']` | page title **Ad compliance** |
| `/assistant` | `assistant` | `AssistantView` | `roles: ['Dealer.User']` | — |

- `/` → if signed in, go to `/admin` or `/dms` by role; if not signed in, go to `/login`.
- Unknown path → same as above; do not build a 404 marketing page.
- **Do not** register: `/audit`, `/tickets`, `/leads`, `/dashboard`, or buyer public pages.
- Audit: **hidden at the bottom of the DMS / CRM detail drawer**, calling handbook `GET /audit?entityType=&entityId=`. No standalone Audit page and no menu item.

Query strings (optional deep links): `/dms?vehicleId=`, `/crm?customerId=`, `/ads?vehicleId=` (used by assistant cards). Do not put `dealerId` in the route as the tenant authority.

---

## 3. Route guards

One `beforeEach` in `router/index.ts`, order fixed:

1. **Not signed in** (no stored login token, and not `meta.public`) → `/login`, remember `redirect`.
2. **Signed in and on `/login`** → after `GET /me`, go to `/admin` or `/dms` by role.
3. **Wrong role / no permission**
   - `Platform.Admin` visiting `/dms` `/crm` `/ads` `/assistant` → send back to `/admin`; do not render business tables.
   - `Dealer.User` visiting `/admin` → send back to `/dms`.
4. `GET /me` fails with 401 → clear session, return to `/login`.
5. Role is not `Platform.Admin` | `Dealer.User` (or `active=false`, if the handbook response includes it) → stay in a shell with no business pages, top bar `Sign out`, body shows the "no access" state. Do not invent a third role.

Menu and guards use the same rules: Admin **renders** Admin only; staff **renders** DMS / CRM / Ad compliance / Assistant only. Do not rely on hiding buttons for unauthorized access; the route blocks first.

---

## 4. Sign-in and HTTP (half page)

Admin-issued username/password; see [15](15-Data-Auth-and-Gateway.md) §8. Variable names must match `dealer-platform/env.example`:

| Variable | Purpose |
|---|---|
| `VITE_GATEWAY_URL` | sole API root; local `http://localhost:8080` |

- **Sign-in button**: username + password fields, one `Sign in` button. No Microsoft redirect.
- **Login call**: `src/auth/login.ts` posts `{ username, password }` to `POST ${VITE_GATEWAY_URL}/api/v1/auth/login`, and stores the returned JWT in `sessionStorage`.
- **Session**: after a successful login, `GET ${VITE_GATEWAY_URL}/api/v1/me` (14: `role`, `dealerId`, `dealerLegalName`; for Admin the last two are `null`). Top-bar dealership name: staff uses `dealerLegalName` (placeholder `Dealership` if empty); Admin is always `Platform Admin`.
- **Gateway only**: `api/http.ts` uses `baseURL = import.meta.env.VITE_GATEWAY_URL`, path prefix `/api/v1`. Do not point axios at 8081/8082. Do not call `/internal/v1/**`.
- **Bearer interceptor**: each request reads the stored token and sets `Authorization: Bearer <token>`; no silent refresh (tokens expire after 1 hour — sign in again). Do not put `dealerId` in query/body as a tenant switch (handbook: ignore dealer IDs sent by the frontend).
- **Uniform error body**: `{ code, message }`. 401 → sign in again; 403/404/409/400/502 → in-page error or `ElMessage`, **not an empty table**. Optimistic writes include `version`; `409 VERSION_CONFLICT` tells the user to refresh and write again.

---

## 5. Page ↔ API mapping (handbook section 5)

All paths are relative to Gateway: `/api/v1/...`. After success, "refresh" means re-fetch this page's main list or the current detail — not a full-site reload.

### 5.1 Global

| When | Handbook path | Success | Failure copy |
|---|---|---|---|
| Enter any protected page / login landing | `GET /me` | Write Pinia: `role`, `dealerId` | `401` Sign in required; otherwise Could not load profile |

### 5.2 Login `/login`

| Control | Handbook path | Success | Failure |
|---|---|---|---|
| `Sign in` (username + password) | `POST /auth/login` then `GET /me` | Admin→`/admin`; staff with `dealerId`→`/dms`; unbound / no business access→`/` shell showing `Your account is not provisioned yet. Contact your administrator.` | Invalid username or password. |

No "Forgot password".

The CRM link picker uses each vehicle’s `linkedCustomer` (`{id, name}` or `null`) from `GET /vehicles` to establish occupancy; the customer list’s single `linkedVehicle` is only a preview. Only unlinked vehicles are offered. Customer audit history includes link and unlink events even after the relationship row is deleted.

### 5.3 Admin `/admin` (Platform.Admin only)

**Information-architecture ruling: one route, two in-page Tabs** (aligns with the two column sets in 12; do not split a second page).

- Tab **Dealerships**: columns Name, Contact, Staff count, Actions. Filter: dealership name. Primary button `New dealership`.
- Tab **Members**: columns Username, Dealership, Status, Actions. Filter: username. Compose data from existing APIs: `GET /admin/dealers`, then `GET /admin/dealers/{id}/members` per dealer, flatten on the frontend (**do not invent** `GET /admin/members`).
- Row `Staff`: drawer showing that dealership's members only; bind/unbind both happen in the drawer. Unbind on the Members tab calls the same DELETE.

| Control | Handbook path | Success refresh | Failure code → English |
|---|---|---|---|
| Enter page / Search / Reset | `GET /admin/dealers` | dealership table | `403` You cannot open Admin; otherwise Could not load dealerships |
| `New dealership` submit | `POST /admin/dealers` four contact fields | dealership table; switch to Dealerships | `400 VALIDATION` Check required contact fields |
| Open Staff drawer | `GET /admin/dealers/{id}/members` | drawer table | `404` Dealership not found |
| `Bind staff` submit | `POST /admin/dealers/{id}/members` `{username,displayName,password}` | that dealership's members + table Staff count | `400` Check username, display name, and password; `409 DUP_MEMBER` Staff already bound |
| `Unbind` (after confirm) | `DELETE /admin/dealers/{id}/members/{username}` | same as above | `404` Member not found |
| Members Tab load | the two GETs above combined | member table | same as dealership/member GET |

`staffCount`: already returned by the 14 list (count of that dealership's active memberships). Show `—` when missing. Fields follow the handbook/14.  
| `Edit` (row action) → `Save` | `PATCH /admin/dealers/{id}` with the row's `version` and `active`, the four contact fields, and `logoDataUrl` | dealership table | `400` server detail; `409 VERSION_CONFLICT` This dealership changed elsewhere. Close and reopen Edit. |

`Edit` reuses the `New dealership` drawer, filled from the table row, and adds a `Logo` field (upload, replace, remove). The chosen image is downscaled in the browser to a PNG of at most 160 px before it is sent (14 §3.4). The logo shows next to the dealership name in the table and, for bound staff, in the app header next to the legal name (from `GET /me` `dealerLogoDataUrl`; staff see a change after their next page load). Bind staff issues the username and temporary password directly in that one form; there is no separate account-creation step.

### 5.4 DMS `/dms` (Dealer.User only)

Filter row, broad to narrow: `Make` → `Model` → `Year` cascading selects, then `VIN` text, `status`, `condition`; 10 per page. Make and model options come from `GET /vehicle-catalog/makes` and `GET /vehicle-catalog/models?make=` (14 §4.6). Year options run from next year down to 1900. Model is disabled until a make is chosen and Year until a model is chosen; changing a broader level clears the narrower ones. Make and model selects allow typed values, so the filter still works when the catalog is unavailable (a warning line says so). Query: `make` `model` `modelYear` `q` `status` `condition` `page` `size`. **Pagination envelope `{items,page,size,total}`, `page` starts at 0** (14). Fields follow the handbook/14.

| Control | Handbook path | Success refresh | Failure |
|---|---|---|---|
| Enter / Search / Reset / page | `GET /vehicles` | vehicle table | `403` use the no-access state; otherwise Could not load vehicles |
| `Add vehicle` submit | `POST /vehicles` handbook required fields | vehicle table | `400 VIN_DUP` VIN already in this dealership; `400` Check required fields |
| Row `Edit` / save | `GET/PATCH /vehicles/{id}` with `version` | that row + open drawer | `404` Vehicle not found; `SOLD_LOCKED` Purchase fields are locked; `409 VERSION_CONFLICT` Refresh and retry |
| Row `Sell` small-dialog submit | `POST /vehicles/{id}/sell` `{soldOn,soldPrice,version}` | vehicle table (row dimmed) | `400 SOLD_PAIR_REQUIRED` Sold date and price are required together; `404` |
| Detail footer Audit | `GET /audit?entityType=VEHICLE&entityId=` | refresh audit list only | `404` do not show business fields |
| Detail linked customer / ad status | `linkedCustomer` from `GET /vehicles/{id}` (link to `/crm?customerId=`); `GET /vehicles/{id}/listing` `checkStatus` | detail drawer | ad status shows `Could not load ad check status.` |

No vehicle DELETE. Sold: purchase fields read-only, hide Sell. Cross-dealership ids are treated as 404.

### 5.5 CRM `/crm` (Dealer.User only)

Filters: `q` (Name/Email/Phone), `linked`. Pagination same as DMS: `page`/`size`, envelope `{items,page,size,total}` (14). Fields follow the handbook/14.

| Control | Handbook path | Success refresh | Failure |
|---|---|---|---|
| Enter / Search / Reset | `GET /customers` | customer table | `403` no-access state; otherwise Could not load customers |
| `Add customer` | `POST /customers` four fields | customer table | `400` Check required fields |
| `Edit` save | `GET/PATCH /customers/{id}` | that row + drawer | `404` Customer not found; `409 VERSION_CONFLICT` |
| `Link vehicle` (searchable Select, this dealership, unlinked only (in stock or sold)) | `PUT /customers/{id}/vehicles/{vehicleId}` | customer table Linked vehicle + drawer | `409 VEHICLE_ALREADY_LINKED` Vehicle already linked; `404` Vehicle not found. A same-store sold vehicle is a valid link. |
| `Unlink` (after confirm) | `DELETE /customers/{id}/vehicles/{vehicleId}` → **204** no body | customer table Linked vehicle + drawer | `404` Link not found; `409 SOLD_LOCKED` Sold vehicles cannot be unlinked |
| Link-vehicle dropdown data | Link options call `GET /vehicles` with `page` and `size` only (no `status` filter), requesting size 10, adopting the size the server returns (capped at 10), and paging until the accumulated count reaches `total`. Drop every vehicle whose `linkedCustomer` is set (this customer or another) | dropdown | only unlinked vehicles are listed. In-stock and sold vehicles both appear. Fields follow the handbook/14 |
| Detail Audit | `GET /audit?entityType=CUSTOMER&entityId=` | audit list | `404` |
| Audit after unlink (optional) | `GET /audit?entityType=CUSTOMER_VEHICLE&entityId=` | audit list | `404` |

### 5.6 Ad compliance `/ads` (Dealer.User only)

Left: pick a vehicle + ad form; right: check results. The checklist changes immediately with `adKind` / `medium` (copy rules are in handbook sections 3/6; the frontend only switches displayed items and does not invent fields). Overall status may only be: Blocked / Needs AI review / Passed / Stale / AI unavailable.

| Control | Handbook path | Success refresh | Failure |
|---|---|---|---|
| Left vehicle row / select vehicle | `GET /vehicles` (prefer no `status` filter; sold vehicles can still show ads but are product-read-only) | left table | same as DMS |
| Load listing after select | `GET /vehicles/{id}/listing` (empty draft if none) | left form + right status | `404` Vehicle not found |
| `Save draft` | `PATCH /vehicles/{id}/listing` with `version` | form version; right state becomes Stale (if it was Passed) | `404`; `409 VERSION_CONFLICT` |
| `Run check` | `POST /listings/{id}/checks` | right results; wait up to about 15s, button loading | `404`; `409` version conflict; `502 AI_UNAVAILABLE` right state **AI unavailable**, **never show Pass** |
| `Mark ready` | `POST /listings/{id}/ready` | right state | `409 CHECK_STALE` Check is stale. Run check again; `409 NOT_PASSED` Check has not passed |
| `Export TXT` | `POST /listings/{id}/exports` → `text/plain` download | do not change the table | same 409s; clickable only when **Passed and not Stale** |

No "publish to an external site". Admin never enters this page.

### 5.7 Assistant `/assistant` (Dealer.User only)

| Control | Handbook path | Success | Failure |
|---|---|---|---|
| `Ask` | `POST /assistant/ask` `{text}` | short summary + ≤5 cards; cards navigate to `/dms` `/crm` `/ads` | `403` no-access state; `400 VALIDATION` empty question; network/5xx Could not ask assistant |

Response body follows **14** (fields follow the handbook/14; do not guess with the old `resources` shape):

```json
{
  "summary": "…",
  "summaryAvailable": true,
  "cards": [
    { "kind": "VEHICLE", "id": 10, "label": "2020 Toyota Camry", "status": "IN_STOCK" }
  ]
}
```

`kind`: `VEHICLE` | `CUSTOMER` | `LISTING`. `LISTING` cards may include `vehicleId`, `checkStatus`. The frontend maps these to `/dms` `/crm` `/ads` itself (14 does not specify Vue routes).  
If the model is down but HTTP is still **200**: `summary` is `null`, `summaryAvailable=false`, `cards` still render; the summary area is fixed English **`Smart summary unavailable`** (follow 12; do not use document 10's Chinese wording).  
Do not change vehicles/customers/checks on this page. Cards must not show phone / email / homeAddress.

### 5.8 Pages not to invent

| Idea | Ruling |
|---|---|
| Standalone Audit / tickets / leads | Do not build. Audit lives only in DMS/CRM detail |
| Admin viewing vehicles | Do not build. Hitting a business URL is 403/404 from the backend; the frontend guard already blocks |
| Browser calling `/internal/v1/ad-check` or `/internal/v1/assistant` | Forbidden |

---

## 6. Component list (do not over-design)

| Component | Responsibility | Do not |
|---|---|---|
| `AppLayout` | left menu + top bar (dealership name or `Platform Admin`, role, `Sign out`) + `router-view` | KPI strip, multi-dealership switcher |
| `AppMenu` | Admin: one Admin item. Staff: DMS, CRM, Ad compliance, Assistant | inject tickets by permission |
| `DataTable` | Element Table + page size 10 + at most 3 text links in actions + status Tag; sold rows dimmed | price slider, inline universal editor |
| `FormDrawer` / Dialog | create/edit; enums via `el-select` | multi-step wizard |
| `ConfirmDialog` | Sell, Unbind staff, Unlink (12: second confirmation for sell/unbind) | — |
| `PageState` | shared loading / empty / error / forbidden slots | paint failures as empty tables |
| `AdWorkspace` | form left, results right; checklist changes with type/medium | a fifth overall status |
| `AssistantCard` | title + link into an ordinary page; no contact details | mutate data inside the card |

Sell small dialog (may live inside `DmsView`): Sold date + Sold price, required as a pair. CRM link-vehicle Select lists this dealership's unlinked vehicles (in stock or sold).

---

## 7. Admin information architecture (ruling)

**Ruling: single page `/admin` + two Tabs (Dealerships | Members); member edits use a drawer.**

Reason: 12 gives two column sets and two filters ("dealership name / staff email"), but the handbook only has "load members by dealership" and no third Admin sub-route. Tabs align with the two column sets; the Staff drawer reuses the same member APIs. Do not add an `/admin/members` route.

---

## 8. Assistant failure copy

Follow **12**, in English:

- Model unavailable but resource cards still present: `Smart summary unavailable`
- Whole-page request failure: `Could not ask assistant` (not Pass, and not Chinese)

Do not use document 10's Chinese wording.

---

## 9. Unlink customer vehicles

- UI: CRM detail provides `Unlink` for a linked vehicle; **second confirmation is required** (12).
- API (align 14): `DELETE /api/v1/customers/{id}/vehicles/{vehicleId}` → **204** no body. Audit `CUSTOMER_VEHICLE` / `UNLINK`.
- **Sold vehicles cannot be unlinked** (15): hide or disable the button when `status=SOLD`; if the request is still sent → `409 SOLD_LOCKED`, copy `Sold vehicles cannot be unlinked`.
- No such link or cross-dealership → `404`. Do not pretend to unlink with an empty PUT.

---

## 10. Four states per page (one line each)

| Page | loading | empty | error | no access |
|---|---|---|---|---|
| Login | Signing you in… | (no list; show the login card only) | Invalid username or password. | A signed-in wrong role never stays here; the guard redirects immediately |
| Admin | Loading dealerships… | No dealerships yet. | Could not load dealerships. | You do not have access to Admin. |
| DMS | Loading vehicles… | No vehicles match. | Could not load vehicles. | You do not have access to DMS. |
| CRM | Loading customers… | No customers match. | Could not load customers. | You do not have access to CRM. |
| Ad compliance | Loading listing… | Select a vehicle to start. / No vehicles to advertise. | Could not load listing. | You do not have access to Ad compliance. |
| Assistant | Asking… / Loading | Ask a question about this dealership. | Could not ask assistant. | You do not have access to Assistant. |

Failures must not look like empty tables. Ad AI failure uses the right pane **AI unavailable**, not table empty, and never Passed.

---

## 11. English copy (controls, enough to code)

| Location | Copy |
|---|---|
| Login button | Sign in (fields: Username, Password) |
| Top-bar exit | Sign out |
| Top-bar Admin | Platform Admin |
| Menu | Admin · DMS · CRM · Ad compliance · Assistant |
| Admin primary button | New dealership |
| Admin members | Bind staff · Unbind |
| DMS | Add vehicle · Edit · Sell |
| Sell dialog | Sold date · Sold price · Confirm sale |
| CRM | Add customer · Link vehicle · Unlink |
| Ad | Save draft · Run check · Mark ready · Export TXT |
| Check states | Blocked · Needs AI review · Passed · Stale · AI unavailable |
| Assistant | Ask · Smart summary unavailable |
| Table actions | at most three text links; no icon sea |

Enum dropdown values match the handbook: `TRADE_IN` `AUCTION` `PRIVATE_PURCHASE` `OTHER`; `CERTIFIED` `AS_IS` `UNFIT` `IRREPARABLE`; `IN_STOCK` `SOLD`; `CASH` `FINANCE` `LEASE`; `ONLINE` `RADIO_TV_BILLBOARD`. Display may use spaced readable labels (for example `Trade in`); submit still uses the raw enum value.

---

## 12. Frontend coding gaps (not invented here)

13/14/15 already align: **Unlink DELETE 204**, pagination envelope, `staffCount` / `dealerLegalName`, assistant `{summary,summaryAvailable,cards}`, customer list `linkedVehicle`. Fields still follow the handbook/14.

Still not invented on the frontend:

1. Production login page copy beyond the username/password form already described in §4
2. The `dealer-web` repository itself is not created yet

This document is a file-split basis, not a business implementation.
