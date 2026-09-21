# AI coding spec · dealer-web (frontend)

1. Reader: another coding AI. Follow this document to create `dealer-web` and wire it to [14](14-Backend-API-Contract.md); fields/enums/DTOs follow handbook section 3 and 14. This document does not define extra columns.
2. Stack pinned: Vue 3 + Vite + Element Plus + Vue Router + Pinia + `@azure/msal-browser` + axios. No Nuxt, no chart library, no generic CRUD generator.
3. Browser HTTP **only hits** `import.meta.env.VITE_GATEWAY_URL` (local `http://localhost:8080`), path prefix `/api/v1`. Ban axios pointing at 8081/8082. Ban requests to `/internal/v1/**`.
4. Routes are only six pages: `/login` `/admin` `/dms` `/crm` `/ads` `/assistant`. No seventh business route; ban `/audit` `/tickets` `/leads` `/dashboard` / buyer pages.
5. Admin: **one route** `/admin` + in-page dual tabs (Dealerships | Members). Ban `/admin/members`. This course UI **does not** Edit a dealership (even though 14 has `GET/PATCH /admin/dealers/{id}`).
6. Assistant model down but still HTTP 200: explanation area is the fixed English **`Smart summary unavailable`** (follow [12](12-Frontend-UI-Conventions.md); do not use the Chinese “智能说明暂不可用” from [10](10-Web-AI-Assistant.md)). Whole-page failure: `Could not ask assistant`.
7. Unlisted features are not built: work orders, leads, consumer/buyer site, standalone Audit page, KPI home, password login, dealership switcher, external ad publish.
8. UI is all English. Error body `{code,message}`. Failures are not empty tables. Optimistic-lock writes carry `version`; `409 VERSION_CONFLICT` → `Refresh and retry`. Ignore client `dealerId`.
9. **Implementation order locked:** FE-T01 shell → FE-T02 guards → FE-T03 MSAL/HTTP → FE-T04 layout four states → FE-T05 Login → FE-T06 Admin → FE-T07 DMS → FE-T08 CRM → FE-T09 Ads → FE-T10 Assistant → FE-T11 against 16.
10. Acceptance cites only [16](16-Acceptance-and-Test.md) `FE-01`–`FE-10`, `CL-1`–`CL-6` (and classroom `BE-*` frontend behavior). Do not invent paths / error codes / an ad overall status outside the five.

Authority conflicts: course PPT > specification fields > BRIEF / 00 > 15 / **14 (HTTP)** > 13 > 12 > this document. This document splits files into tasks; it is not a business implementation.

---

## Implementation order (must submit in this order)

| Seq | Task | Done before starting the next |
|---|---|---|
| 1 | FE-T01 scaffold | `npm run dev` starts Vite :5173 |
| 2 | FE-T02 route table + guards | Unauthenticated business path must go to `/login` |
| 3 | FE-T03 MSAL+axios | Every request hits 8080 only and carries Bearer |
| 4 | FE-T04 shell + four-state components | `AppLayout`/`PageState` can mount empty pages |
| 5 | FE-T05 Login | `Sign in with Microsoft` + `GET /me` routing |
| 6 | FE-T06 Admin | Dual tabs fully wired; no business menu |
| 7 | FE-T07 DMS | List/create-update/sell/audit drawer |
| 8 | FE-T08 CRM | List/create-update/link/**Unlink second confirmation** |
| 9 | FE-T09 Ads | Five states; Ready/export only Passed not Stale |
| 10 | FE-T10 Assistant | Input, ≤5 cards, failure copy |
| 11 | FE-T11 against 16 | FE-01–FE-10 + CL scripts hand-tested and checked |

---

## Copy-paste route table (FE-T02 write as-is into `src/router/index.ts`)

| path | name | Component file | `meta` | Post-login landing |
|---|---|---|---|---|
| `/login` | `login` | `src/views/LoginView.vue` | `{ public: true }` | — |
| `/admin` | `admin` | `src/views/AdminView.vue` | `{ roles: ['Platform.Admin'] }` | Admin default page |
| `/dms` | `dms` | `src/views/DmsView.vue` | `{ roles: ['Dealer.User'] }` | Staff default page |
| `/crm` | `crm` | `src/views/CrmView.vue` | `{ roles: ['Dealer.User'] }` | — |
| `/ads` | `ads` | `src/views/AdsView.vue` | `{ roles: ['Dealer.User'] }` | Page title **Ad compliance** |
| `/assistant` | `assistant` | `src/views/AssistantView.vue` | `{ roles: ['Dealer.User'] }` | — |

- `/` and unknown paths: if signed in, by `role` → `/admin` or `/dms`; if not signed in → `/login`. No 404 marketing page.
- Optional deep links: `/dms?vehicleId=`, `/crm?customerId=`, `/ads?vehicleId=` (assistant card jumps). **Ban** putting `dealerId` on the route as authority.
- Menu and guards share one set: Admin **renders only** Admin; staff **renders only** DMS / CRM / Ad compliance / Assistant.

`beforeEach` order (13 §3; do not reorder):

1. Not signed in (MSAL has no account) and not `meta.public` → `/login`, remember `redirect`.
2. Signed in and on `/login` → after `GET /api/v1/me` go to `/admin` or `/dms` by role.
3. `Platform.Admin` visiting `/dms` `/crm` `/ads` `/assistant` → send back to `/admin`; do not render business tables. `Dealer.User` visiting `/admin` → send back to `/dms`.
4. `GET /me` fails 401 → clear session, return `/login`.
5. `role` is not `Platform.Admin` | `Dealer.User`, or `/me` shows no dealership and the handbook has `active=false` → stay on a no-business shell, top bar `Sign out`, body uses the forbidden state. Do not invent a third role.

---

## FE-T01 · Vite scaffold and directory tree

- **Repo:** `dealer-web` (if this workspace does not have it yet: create it beside the repo root, or as the agreed monorepo subdirectory; **do not** write it into `design/`).
- **Files:**
  - `dealer-web/package.json`
  - `dealer-web/vite.config.ts` (dev server **5173**)
  - `dealer-web/.env.example` (copy only the four frontend items from `dealer-platform/env.example`, see below)
  - `dealer-web/src/main.ts`
  - `dealer-web/src/App.vue`
  - Empty placeholders (this task may start with empty components): `src/router/index.ts`, `src/auth/msal.ts`, `src/api/http.ts`, `src/api/me.ts`, `src/api/admin.ts`, `src/api/vehicles.ts`, `src/api/customers.ts`, `src/api/listings.ts`, `src/api/audit.ts`, `src/api/assistant.ts`, `src/stores/session.ts`, `src/layouts/AppLayout.vue`, `src/components/AppMenu.vue`, `src/components/DataTable.vue`, `src/components/FormDrawer.vue`, `src/components/ConfirmDialog.vue`, `src/components/PageState.vue`, `src/components/AdWorkspace.vue`, `src/components/AssistantCard.vue`, `src/views/LoginView.vue`, `src/views/AdminView.vue`, `src/views/DmsView.vue`, `src/views/CrmView.vue`, `src/views/AdsView.vue`, `src/views/AssistantView.vue`
- **Must include:**
  - Dependencies: `vue` `vue-router` `pinia` `element-plus` `axios` `@azure/msal-browser`; `vite` `@vitejs/plugin-vue`.
  - Directories that must exist: `src/views` `src/api` `src/stores` `src/auth` `src/layouts` (also `src/router` `src/components`).
  - `.env.example` four keys, values matching `dealer-platform/env.example`:

    | Key | Local default |
    |---|---|
    | `VITE_ENTRA_TENANT_ID` | empty (fill after copy) |
    | `VITE_ENTRA_CLIENT_ID` | empty |
    | `VITE_ENTRA_API_SCOPE` | `api://dealer-api/access_as_user` |
    | `VITE_GATEWAY_URL` | `http://localhost:8080` |

  - `stores` keeps **only** `session.ts` (account, `role`, dealership display name). List state lives in each View.
- **Ban:** Nuxt; extra `AuditView` / tickets / leads / dashboard; committing a real tenant/client in `.env`; writing Vue source into `design/`.
- **Acceptance:** `npm install && npm run dev` listens on `http://localhost:5173`. Directory tree matches the file list above one-for-one. No seventh business View.

---

## FE-T02 · Route table and guards

- **Repo:** `dealer-web`
- **Files:** `src/router/index.ts` (the only `beforeEach`); `src/stores/session.ts` (read `role`); the six `src/views/*.vue` files must already be referenced by the router.
- **Must include:** the six “copy-paste route table” rows above + `/` and unknown-path routing. Implement the five guard steps as-is. The later T04 menu component must read the same `meta.roles`; do not write a second permission set.
- **Ban:** registering `/audit` `/tickets` `/leads` `/dashboard` `/admin/members`; hiding buttons instead of guarding; a 404 marketing page.
- **Acceptance:** against 16 **FE-01–FE-06**: unauthenticated open `/dms` → `/login`; Staff open `/admin` → `/dms`; Admin open `/dms` `/crm` `/ads` `/assistant` → `/admin` and do not render business tables.

---

## FE-T03 · MSAL + axios (8080 only)

- **Repo:** `dealer-web`
- **Files:** `src/auth/msal.ts`; `src/api/http.ts`; `src/main.ts` (`handleRedirectPromise` at startup); `src/stores/session.ts`.
- **Must include:**
  - `PublicClientApplication`. authority = `https://login.microsoftonline.com/${VITE_ENTRA_TENANT_ID}`. `clientId` = `VITE_ENTRA_CLIENT_ID`.
  - **PKCE:** keep SPA / `@azure/msal-browser` default PKCE. Ban confidential client, ban client secret.
  - **Redirect URI (dev):** origin `http://localhost:5173`. `redirectUri` and `postLogoutRedirectUri` both point at same-origin **`/login`** (full URL: `http://localhost:5173/login`). Primary login path: `loginRedirect` (not popup). `loginRequest.scopes` / `acquireTokenSilent` **only** use `VITE_ENTRA_API_SCOPE` (default `api://dealer-api/access_as_user`).
  - `api/http.ts`: `baseURL = import.meta.env.VITE_GATEWAY_URL`. Request paths written as `/api/v1/...`.
  - Request interceptor: `acquireTokenSilent({ scopes: [VITE_ENTRA_API_SCOPE], account })`, then `acquireTokenRedirect` on failure; header `Authorization: Bearer <accessToken>`.
  - Response: 401 → clear session, return `/login`. 403/404/409/400/502 → throw to in-page `PageState` or `ElMessage`, **not an empty table**.
  - Ban putting `dealerId` in query/body/header as a tenant switch.
- **Ban:** password box; axios pointing at `8081`/`8082`; browser hitting `/internal/v1/ad-check` or `/internal/v1/assistant`; a second API root.
- **Acceptance:** network panel: every XHR host is Gateway (local **8080**). Requests without a token must not be sent (except the login page). Entra callback lands on `http://localhost:5173`. Against 16 **FE-01** (Microsoft button only).

---

## FE-T04 · Layout, shared components, four-state copy

- **Repo:** `dealer-web`
- **Files:** `src/layouts/AppLayout.vue`; `src/components/AppMenu.vue`; `src/components/DataTable.vue`; `src/components/FormDrawer.vue`; `src/components/ConfirmDialog.vue`; `src/components/PageState.vue`; `src/App.vue`.
- **Must include:**
  - `AppLayout`: left menu + top bar (staff dealership name = `/me.dealerLegalName`, else `Dealership`; Admin fixed `Platform Admin`; role; `Sign out`) + `router-view`.
  - `AppMenu`: Admin has only `Admin`. Staff four items: `DMS` · `CRM` · `Ad compliance` · `Assistant`.
  - `DataTable`: Element Table + **10** per page + actions column at most **3** text links + status Tag; fade rows with `status=SOLD`. Pagination: query `page` from **0**, envelope `{items,page,size,total}` (14).
  - `FormDrawer`: create/edit; enums as `el-select`, submit raw enum values, display readable space-separated labels.
  - `ConfirmDialog`: used for Sell, Unbind staff, and **Unlink** second confirmation.
  - `PageState`: four slots **loading / empty / error / forbidden**. All six pages must use the table below (13 §10); do not invent near-synonyms.
- **Ban:** KPI bars, multi-store switcher, icon seas, price sliders, inline universal editors, multi-step wizards.
- **Acceptance:** 16 **FE-09** copy can be applied page by page. Menu matches FE-01–FE-06.

### Six-page four states (copy into `PageState` call sites)

| Page | loading | empty | error | 403 / no access |
|---|---|---|---|---|
| Login | `Signing you in…` | (no list; login card only) | `Sign-in failed. Try again.` | Signed-in wrong role does not stay here; guard routes away |
| Admin | `Loading dealerships…` | `No dealerships yet.` | `Could not load dealerships.` | `You do not have access to Admin.` |
| DMS | `Loading vehicles…` | `No vehicles match.` | `Could not load vehicles.` | `You do not have access to DMS.` |
| CRM | `Loading customers…` | `No customers match.` | `Could not load customers.` | `You do not have access to CRM.` |
| Ads | `Loading listing…` | `Select a vehicle to start.` / `No vehicles to advertise.` | `Could not load listing.` | `You do not have access to Ad compliance.` |
| Assistant | `Asking…` | `Ask a question about this dealership.` | `Could not ask assistant.` | `You do not have access to Assistant.` |

Staff signed in but without a valid membership: business APIs **403** `FORBIDDEN` (14 §1.3); `GET /me` still 200 with `dealerId=null`. Pages use error/forbidden, not an empty table.

---

## FE-T05 · Login wiring table

- **Repo:** `dealer-web`
- **Files:** `src/views/LoginView.vue` (centered single card, no sidebar); `src/api/me.ts`; `src/stores/session.ts`; `src/auth/msal.ts`.
- **Must include:** only one button `Sign in with Microsoft`. No Forgot password. No username/password.
- **Ban:** password login, a third button.
- **Acceptance:** 16 **FE-01**, **CL-1** step 1, **CL-2** step 1.

### Wiring table · Login `/login`

| Control / timing | method + path | Success | Failure HTTP / code → English |
|---|---|---|---|
| `Sign in with Microsoft` | no business API; `loginRedirect` | redirect back to `/login` | MSAL failure → `Sign-in failed. Try again.` |
| After redirect completes | `GET /api/v1/me` | Pinia writes `role` `dealerId` `dealerLegalName` `displayName` `entraOid`. `Platform.Admin`→`/admin`; `Dealer.User`→`/dms` (or the guard-remembered `redirect`, still constrained by the role table) | `401` → `Sign in required` and return to login; other → `Could not load profile` |
| Entering any guarded page | `GET /api/v1/me` (if session has no role) | Same | Same |

`/me` response shape (14 §2): `{ entraOid, displayName, role, dealerId, dealerLegalName }`. Admin last two fields are `null`.

---

## FE-T06 · Admin (single page, dual tabs)

- **Repo:** `dealer-web`
- **Files:** `src/views/AdminView.vue`; `src/api/admin.ts`; reuse `DataTable` `FormDrawer` `ConfirmDialog` `PageState`.
- **Must include:**
  - Only route `/admin`. In-page `el-tabs`: `Dealerships` | `Members`.
  - **Dealerships columns (12):** Name, Contact, Staff count, Actions. Filter: dealership name, one row. Primary button top-right `New dealership`.
    - Name ← `legalName`. Contact ← `contactPhone` / `contactEmail` on one line. Staff count ← `staffCount` (show `—` if missing).
  - **Members columns (12):** Entra ID / email, Dealership, Status, Actions. Filter: staff email (API **has no email column**: send `q` against `displayName`/`entraOid`, 14 §3.5).
  - Members data: **ban** inventing `GET /admin/members`. Algorithm: `GET /api/v1/admin/dealers` then for each `items[]` `GET /api/v1/admin/dealers/{id}/members`, flatten on the frontend, attach store `legalName`.
  - Row `Staff`: drawer shows only that store’s members; `Bind staff` / `Unbind` both live in the drawer. Members tab `Unbind` hits the same DELETE.
  - `New dealership` drawer four fields: `legalName` `contactPhone` `contactEmail` `contactAddress` (all required).
  - `Bind staff` body: `{ entraOid, displayName }`.
- **Ban:** a second Admin child route; Edit dealership button (do not call `PATCH /admin/dealers/{id}`); vehicles tab; creating Entra accounts by email; DMS/CRM/Ads/Assistant appearing in the menu.
- **Acceptance:** 16 **FE-07**, **CL-1**, **CL-3** (changing the address bar to `/dms` is blocked back).

### Wiring table · Admin `/admin`

| Control | method + path | Refresh on success | Failure HTTP / code → English |
|---|---|---|---|
| Enter / Search / Reset (dealership tab) | `GET /api/v1/admin/dealers?q=&page=&size=` | Dealership table | `403` `FORBIDDEN` → `You cannot open Admin` / `You do not have access to Admin.`; other → `Could not load dealerships.` |
| `New dealership` submit | `POST /api/v1/admin/dealers` → **201** | Dealership table; switch to Dealerships | `400` `VALIDATION` → `Check required contact fields` |
| Open Staff drawer | `GET /api/v1/admin/dealers/{id}/members?page=&size=&q=` | Drawer table | `404` `NOT_FOUND` → `Dealership not found` |
| `Bind staff` submit | `POST /api/v1/admin/dealers/{id}/members` → **201** | That store’s members + dealership table `staffCount` | `400` `VALIDATION` → `Check Entra ID`; `409` `DUP_MEMBER` → `Staff already bound` |
| `Unbind` (after `ConfirmDialog`) | `DELETE /api/v1/admin/dealers/{id}/members/{entraOid}` → **204** no body | Same | `404` → `Member not found` |
| Members tab load | Combination of the two GETs above, flattened | Member table | Same as dealership / member GET |

Staff hitting the URLs above: backend **403** `FORBIDDEN`; the frontend guard should already block and not render the table.

---

## FE-T07 · DMS

- **Repo:** `dealer-web`
- **Files:** `src/views/DmsView.vue`; `src/api/vehicles.ts`; `src/api/audit.ts`; sell dialog may be embedded in this View.
- **Must include:**
  - Columns (12): Year Make Model, VIN, Source, Condition, Cost, Status, Actions.
    - Year Make Model ← `modelYear` `make` `model`. Source ← `source`. Condition ← `conditionCode`. Cost ← `purchaseCost`. Status Tag ← `status`.
  - Filters in one row: `q` (VIN/Make/Model), `status`, `condition` (i.e. `conditionCode`), Search, Reset. 10 per page. Query: `q` `status` `condition` `page` `size`. `page` from 0. Envelope `{items,page,size,total}`.
  - Primary button `Add vehicle`. Row actions at most three links: `Edit` `Sell` (hide Sell when sold).
  - Create required (00 / 14): `make` `model` `modelYear` `vin` `source` `purchaseCost` `addedOn` `conditionCode`. Optional: `repairCost` `carfaxUrl`. Ignore `dealerId` `status` `soldOn` `soldPrice`.
  - Submit raw enum values: `TRADE_IN` `AUCTION` `PRIVATE_PURCHASE` `OTHER`; `CERTIFIED` `AS_IS` `UNFIT` `IRREPARABLE`; `IN_STOCK` `SOLD`. Display: `Trade in` and other space-separated labels.
  - `Edit`: first `GET /vehicles/{id}` to fill; `PATCH` must carry `version`. Sold: purchase fields read-only.
  - `Sell`: `ConfirmDialog` small window, `Sold date` + `Sold price` required as a pair, button `Confirm sale`.
  - Detail drawer bottom Audit: `GET /api/v1/audit?entityType=VEHICLE&entityId=`. No standalone Audit page, no menu item.
  - Sold rows fade. No vehicle DELETE. Cross-store id: backend 404, frontend `Vehicle not found`, do not treat as this store’s vehicle (CL-2 deep link).
  - Deep link `/dms?vehicleId=`: open the matching drawer; 404 must not leak another store’s fields.
- **Ban:** Admin entering this page (guard); PATCH changing `status`/`soldOn`/`soldPrice`; writing `dealerId` into the body.
- **Acceptance:** 16 **CL-2** record a vehicle; **CL-3** Admin cannot see the table; Edit purchase after SOLD → in-page `Purchase fields are locked` (`409` `SOLD_LOCKED`).

### Wiring table · DMS `/dms`

| Control | method + path | Refresh on success | Failure HTTP / code → English |
|---|---|---|---|
| Enter / Search / Reset / page | `GET /api/v1/vehicles?q=&status=&condition=&page=&size=` | Vehicle table | `403` `FORBIDDEN` → no-access state `You do not have access to DMS.`; other → `Could not load vehicles.` |
| `Add vehicle` submit | `POST /api/v1/vehicles` → **201** | Vehicle table | `400` `VIN_DUP` → `VIN already in this dealership`; `400` `VALIDATION` → `Check required fields` |
| Row `Edit` open | `GET /api/v1/vehicles/{id}` | Drawer | `404` `NOT_FOUND` → `Vehicle not found` |
| `Edit` save | `PATCH /api/v1/vehicles/{id}` with `version` → **200** | That row + drawer | `404` → `Vehicle not found`; `409` `SOLD_LOCKED` → `Purchase fields are locked`; `409` `VERSION_CONFLICT` → `Refresh and retry`; `400` `VIN_DUP` → same as above |
| `Sell` confirm submit | `POST /api/v1/vehicles/{id}/sell` `{soldOn,soldPrice,version}` → **200** | Vehicle table (row fades, hide Sell) | `400` `SOLD_PAIR_REQUIRED` → `Sold date and price are required together`; `409` `SOLD_LOCKED` → sold lock; `409` `VERSION_CONFLICT`; `404` |
| Detail bottom Audit | `GET /api/v1/audit?entityType=VEHICLE&entityId={id}` | Refresh audit list only | `404` → do not show business fields; do not draw failure as an empty vehicle table |

---

## FE-T08 · CRM + Unlink

- **Repo:** `dealer-web`
- **Files:** `src/views/CrmView.vue`; `src/api/customers.ts`; `src/api/vehicles.ts` (link dropdown); `src/api/audit.ts`; `src/components/ConfirmDialog.vue`.
- **Must include:**
  - Columns (12): Name, Email, Phone, Linked vehicle, Actions.
    - Linked vehicle ← list `linkedVehicle`: `{id,modelYear,make,model}`, format `2020 Toyota Camry`; `null` shows `—`.
  - Filters in one row: `q` (Name/Email/Phone), `linked`=`true`|`false`, Search, Reset. Pagination same as DMS.
  - Primary button `Add customer`. Four fields: `name` `email` `phone` `homeAddress`.
  - Row: `Edit`, in detail `Link vehicle` / `Unlink` (actions column still ≤3 text links).
  - `Link vehicle`: searchable Select; data `GET /api/v1/vehicles?status=IN_STOCK`, then exclude already linked (other-customer occupancy disabled). List only this-store unsold unbound.
  - **Unlink (hard rules):**
    1. Must use `ConfirmDialog`. Cancel → **zero requests**.
    2. Only after confirm `DELETE /api/v1/customers/{id}/vehicles/{vehicleId}` → **204** no body.
    3. Refresh customer table `linkedVehicle` + drawer `linkedVehicles`.
    4. Vehicle `status=SOLD`: hide or disable the button; if still requested → `409` `SOLD_LOCKED` → `Sold vehicles cannot be unlinked`.
    5. Ban using empty PUT as a fake unlink.
  - Detail Audit: `GET /api/v1/audit?entityType=CUSTOMER&entityId=`. After unlink, optional `entityType=CUSTOMER_VEHICLE`. `fieldSummary` must not display full phone/email/address.
  - Deep link `/crm?customerId=`.
- **Ban:** standalone Audit page; cross-store VIN in the dropdown; click-to-delete.
- **Acceptance:** 16 **FE-08**, **CL-2** link, Review 3 Unlink. After in-stock unlink 204, Linked vehicle is empty. Sold cannot be unlinked.

### Wiring table · CRM `/crm`

| Control | method + path | Refresh on success | Failure HTTP / code → English |
|---|---|---|---|
| Enter / Search / Reset / page | `GET /api/v1/customers?q=&linked=&page=&size=` | Customer table | `403` → `You do not have access to CRM.`; other → `Could not load customers.` |
| `Add customer` | `POST /api/v1/customers` → **201** | Customer table | `400` `VALIDATION` → `Check required fields` |
| `Edit` open | `GET /api/v1/customers/{id}` | Drawer (use `linkedVehicles[]`) | `404` → `Customer not found` |
| `Edit` save | `PATCH /api/v1/customers/{id}` with `version` → **200** | That row + drawer | `404`; `409` `VERSION_CONFLICT` → `Refresh and retry` |
| `Link vehicle` | `PUT /api/v1/customers/{id}/vehicles/{vehicleId}` → **200** | List Linked vehicle + drawer | `409` `VEHICLE_ALREADY_LINKED` → `Vehicle already linked`; `400` `WRONG_DEALER_OR_SOLD` → `Vehicle not available`; `404` |
| Link dropdown | `GET /api/v1/vehicles?status=IN_STOCK&page=&size=` | Dropdown | Already taken disabled |
| **`Unlink` (after confirm)** | **`DELETE /api/v1/customers/{id}/vehicles/{vehicleId}` → 204** | List Linked vehicle + drawer | `404` → `Link not found`; **`409` `SOLD_LOCKED` → `Sold vehicles cannot be unlinked`** |
| Detail Audit | `GET /api/v1/audit?entityType=CUSTOMER&entityId=` | Audit list | `404` |
| Post-unlink audit (optional) | `GET /api/v1/audit?entityType=CUSTOMER_VEHICLE&entityId=` | Audit list | `404` |

---

## FE-T09 · Ad compliance (five states + Ready/export latch)

- **Repo:** `dealer-web`
- **Files:** `src/views/AdsView.vue`; `src/components/AdWorkspace.vue`; `src/api/listings.ts`; `src/api/vehicles.ts`.
- **Must include:**
  - Page title **Ad compliance**. `AdWorkspace`: pick vehicle + form on the left, check results on the right.
  - Left table columns (12, if using a vehicle list): Vehicle, Type, Medium, Check status, Actions. Vehicle ← year/make/model; Type ← `adKind`; Medium ← `medium`; Check status ← listing.`checkStatus` mapped in the table below.
  - Form fields only: `title` `body` `adKind`=`CASH`\|`FINANCE`\|`LEASE` `medium`=`ONLINE`\|`RADIO_TV_BILLBOARD`. Checklist display items switch with `adKind`/`medium` (00 §ads: always check dealership name/contacts / prior use / new-used year / warranty / price / condition; FINANCE also APR/term/cash price; LEASE also statement/term/rent/APR/down payment/low-km excess; RADIO_TV_BILLBOARD exempt from “shown next to the rate”). **The frontend only switches display items; it does not invent fields or compute pass in the browser.**
  - Right-rail overall status **allows only five states** (display ← API `checkStatus`):

    | UI (12) | API `checkStatus` (14) |
    |---|---|
    | Blocked | `BLOCKED` |
    | Needs AI review | `NEEDS_AI` |
    | Passed | `PASSED` |
    | Stale | `STALE` |
    | AI unavailable | `AI_UNAVAILABLE` |

  - `GET /vehicles/{id}/listing` with no row: virtual empty draft `id=null`, empty form, empty uses `Select a vehicle to start.`, **not** a Failed empty table. When `id=null` disable `Run check` / `Mark ready` / `Export TXT`; must `Save draft` first to get a listing `id`.
  - Buttons: `Save draft` `Run check` `Mark ready` `Export TXT`.
  - **`Mark ready` / `Export TXT` clickable only when `checkStatus===PASSED` (not Stale).** Blocked / Needs AI review / Stale / AI unavailable / no check → disabled.
  - `Run check`: body `{ version }` (listing optimistic lock); button loading; wait up to about 15s.
  - **Blocked = HTTP 200**, right rail Blocked, **ban** showing Passed. Network panel **must not** show a browser request to `/internal/v1/ad-check`.
  - **`502` `AI_UNAVAILABLE`:** `GET` listing again, right rail **AI unavailable**, ban Pass; disable Ready/export. Do not draw 502 as table empty.
  - `Export TXT`: response `Content-Type: text/plain`, trigger download. Export has no purchase cost, no customer.
  - Sold vehicles may still be selected to view the ad; product is read-only (may view results; do not encourage further edits after the deal).
  - Deep link `/ads?vehicleId=`.
- **Ban:** publishing to an external site; an overall status outside the five; Admin entering this page; browser calling internal; AI failure as Pass; exporting while Stale.
- **Acceptance:** 16 **CL-4** (missing price/FINANCE missing APR → Blocked, 200, no AI); **CL-5** (real AI or AI unavailable); **CL-6** (Stale after price change, Ready/export `409`); **FE-09** ad branch.

### Wiring table · Ads `/ads`

| Control | method + path | Refresh on success | Failure HTTP / code → English |
|---|---|---|---|
| Left table / pick vehicle | `GET /api/v1/vehicles?page=&size=` (`status` unrestricted) | Left table | Same as DMS list |
| After selecting a vehicle | `GET /api/v1/vehicles/{id}/listing` | Left form + right `checkStatus` + `lastCheck` | `404` → `Vehicle not found` |
| `Save draft` | `PATCH /api/v1/vehicles/{id}/listing` with `version` (first time may be 0); empty title/body send `''` | Form `version`/`id`; if previously Passed → right state **Stale** | `404`; `409` `VERSION_CONFLICT` → `Refresh and retry`; `400` `VALIDATION` |
| `Run check` | `POST /api/v1/listings/{id}/checks` `{version}` | Right result = check object (includes `ruleFindings` `checkStatus`) | `404`; `409` `VERSION_CONFLICT`; **`502` `AI_UNAVAILABLE` → right state AI unavailable, ban Pass**. Blocked **200** is not a failure |
| `Mark ready` | `POST /api/v1/listings/{id}/ready` `{version}` | Right state / listing.`status=READY` | `409` `CHECK_STALE` → `Check is stale. Run check again`; `409` `NOT_PASSED` → `Check has not passed`; `409` `VERSION_CONFLICT`; `404` |
| `Export TXT` | `POST /api/v1/listings/{id}/exports` `{version}` → **200** `text/plain` download | Do not change the table | Same 409/404. Clickable only when Passed and not Stale |

`lastCheck.ruleFindings[]`: `{ruleId,severity,passed,message}`. List `message` on the right; do not write OMVIC approved / certified (17).

---

## FE-T10 · Assistant

- **Repo:** `dealer-web`
- **Files:** `src/views/AssistantView.vue`; `src/components/AssistantCard.vue`; `src/api/assistant.ts`.
- **Must include:**
  - Interaction (10, thin): one input + `Ask`. One Q&A. Do not change vehicles/customers/checks on this page.
  - Request body only `{ text }`. `POST /api/v1/assistant/ask`.
  - Response fields **per 14**; ban the old `resources`:

    ```json
    {
      "summary": "…",
      "summaryAvailable": true,
      "cards": [
        { "kind": "VEHICLE", "id": 10, "label": "2020 Toyota Camry", "status": "IN_STOCK" }
      ]
    }
    ```

  - `kind`: `VEHICLE` | `CUSTOMER` | `LISTING`. `LISTING` may have `vehicleId` `checkStatus`.
  - Frontend mapping (14 does not specify Vue routes): `VEHICLE` → `/dms?vehicleId={id}`; `CUSTOMER` → `/crm?customerId={id}`; `LISTING` → `/ads?vehicleId={vehicleId}` (no `vehicleId` then `/ads`).
  - Render at most **5** `AssistantCard`s (truncate even if the backend sends more). Card: title `label` + link into a normal page. Cards **ban** phone / email / homeAddress.
  - `summaryAvailable===false` or `summary===null` (still HTTP 200): explanation area fixed **`Smart summary unavailable`**, **still render cards**.
  - Whole-page network/5xx: `Could not ask assistant`. `400` `VALIDATION` (empty question): in-page hint, do not emit empty cards.
- **Ban:** Chinese “智能说明暂不可用”; changing data on a card; Admin entering this page; browser hitting `/internal/v1/assistant`.
- **Acceptance:** 16 **FE-10**, **FE-06**, frontend behavior of **BE-12** (≤5 cards, read-only, Admin 403).

### Wiring table · Assistant `/assistant`

| Control | method + path | Success | Failure HTTP / code → English |
|---|---|---|---|
| `Ask` | `POST /api/v1/assistant/ask` `{text}` → **200** | Explanation: if `summaryAvailable` is true show `summary`; else **`Smart summary unavailable`**. `cards` ≤5 | `403` `FORBIDDEN` → `You do not have access to Assistant.`; `400` `VALIDATION` → empty-question validation; network/5xx → `Could not ask assistant` |

---

## FE-T11 · Acceptance checklist against 16 (no new features)

- **Repo:** `dealer-web` (hand test is enough; 16 does not require this document to add test files).
- **Files:** no new files. Check off on the six pages.
- **Must include:** walk the IDs below. Cite numbers only; do not change 16.
- **Ban:** inventing mock business pages “to make testing easier”; stubs pretending to be CL-5 real cloud AI (S2/S3 follow 16).
- **Acceptance:**

| 16 ID | Matching tasks | Frontend must see / must not see |
|---|---|---|
| **FE-01** | T02 T05 | Unauthenticated `/dms` → `/login`, only `Sign in with Microsoft`; no password box, no business table |
| **FE-02** | T02 T06 | Staff open `/admin` → `/dms`; no Dealerships/bind staff |
| **FE-03** | T02 T07 | Admin open `/dms` → `/admin`; no vehicle table |
| **FE-04** | T02 T08 | Admin open `/crm` → `/admin` |
| **FE-05** | T02 T09 | Admin open `/ads` → `/admin` |
| **FE-06** | T02 T10 | Admin open `/assistant` → `/admin` |
| **FE-07** | T06 | Single route, dual tabs + columns/filters/buttons match 12; no invented `/admin/members`; no Edit dealership |
| **FE-08** | T08 | Unlink confirms first; `DELETE .../vehicles/{vehicleId}`; sold copy `Sold vehicles cannot be unlinked` |
| **FE-09** | T04 all pages | Six-page loading/empty/error/403 copy = this document T04 table; ad 502 → right rail AI unavailable, not empty table/Passed |
| **FE-10** | T10 | `Smart summary unavailable`; whole-page failure `Could not ask assistant`; cards ≤5 read-only jumps |
| **CL-1** | T05 T06 | Admin opens two stores, binds one person each; `409 DUP_MEMBER` → `Staff already bound` |
| **CL-2** | T07 T08 | Staff A records vehicle/customer/link; Staff B cannot see; deep-link other-store id → 404 copy |
| **CL-3** | T02 | Changing the address bar to a business path immediately returns `/admin` |
| **CL-4** | T09 | Missing price/FINANCE missing APR → Blocked; HTTP 200; no `/internal` |
| **CL-5** | T09 | Real check or AI unavailable; ban failure as Pass |
| **CL-6** | T09 | Changing copy price → Stale; Ready/export `409 CHECK_STALE` / `NOT_PASSED` |

Backend codes the classroom will hit and the frontend only needs to display correctly: `VIN_DUP` `SOLD_LOCKED` `SOLD_PAIR_REQUIRED` `VEHICLE_ALREADY_LINKED` `WRONG_DEALER_OR_SOLD` `VERSION_CONFLICT` `CHECK_STALE` `NOT_PASSED` `AI_UNAVAILABLE` `DUP_MEMBER` `FORBIDDEN` `NOT_FOUND` `VALIDATION`.

---

## Enums and control English (shared across the repo; do not rewrite)

| Location | Copy |
|---|---|
| Login | `Sign in with Microsoft` |
| Top bar | `Sign out` · Admin top bar `Platform Admin` |
| Menu | `Admin` · `DMS` · `CRM` · `Ad compliance` · `Assistant` |
| Admin | `New dealership` · `Bind staff` · `Unbind` |
| DMS | `Add vehicle` · `Edit` · `Sell` · `Sold date` · `Sold price` · `Confirm sale` |
| CRM | `Add customer` · `Link vehicle` · `Unlink` |
| Ad | `Save draft` · `Run check` · `Mark ready` · `Export TXT` |
| Five states | `Blocked` · `Needs AI review` · `Passed` · `Stale` · `AI unavailable` |
| Assistant | `Ask` · `Smart summary unavailable` |

---

## Global bans (stacked on every task by default)

- Do not change `design/12`–`19`, `IMPLEMENTATION-BRIEF.md`, `design/README.md`.
- Do not write Vue source into `design/`.
- Do not implement work orders, leads, consumer/buyer site, standalone Audit page, KPI, password login, dealership switch, or browser hitting internal.
- Do not add a fifth ad overall status; do not use the Chinese assistant-failure sentence from 10.
- Do not use `GET /api/v1/admin/members`.
- Do not use client `dealerId` in requests to switch dealerships.
