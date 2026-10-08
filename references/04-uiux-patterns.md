# Frontend interaction you may copy (condensed from 12)

Authoritative source: `design/12-Frontend-UI-Conventions.md` (v6.1). **Do not invent new pages.**  
This course has only: **Login, Admin, DMS, CRM, Ad compliance, plus a floating Assistant widget on staff pages** (`design/AI-CODING-FRONTEND.md` FE-T10).

Stack: Vue 3 + **Element Plus**, English UI. Fields follow `design/00-Current-Development-Design.md` only.

## Global

- **Login**: centered single card, no sidebar. Username + password + `Sign in` (`design/15-Data-Auth-and-Gateway.md` §8).
- **Other pages**: left menu + top bar (dealership name or `Platform Admin`, role, `Sign out`).
- Admin sees Admin only. Staff see DMS / CRM / Ad compliance only, plus the floating Assistant button. Block unauthorized routes.
- Post-login landing: admin → Admin; staff → DMS. **No KPI home page.**
- Primary actions at top right. Sell / unlink need a second confirm.
- Every page needs loading, empty, and error states. Failures must not look like an empty table. AI failure must not show Pass.

## Per page

### Login

Centered card with username, password and `Sign in`. No sidebar, no register, no forgot-password.

### Admin

- Dealership columns: Name, Contact, Staff count, Actions
- Member columns: Username, Dealership, Status, Actions
- Filters: dealership name / username (one row: search + dropdown + Search + Reset)

Density reference: hyundai_dms Dealers.

### DMS

- Columns: Year Make Model, VIN, Source, Condition, Cost, Status, Actions
- Filters: VIN/Make/Model; Status; Condition
- Sold rows fade; purchase fields are read-only
- Sell in a small dialog: Sold date + Sold price are **required as a pair**
- Create/edit: drawer or Dialog; enums use Select

Density reference: hyundai_dms Cars, carventory staff console (ignore marketplace).

### CRM

- Columns: Name, Email, Phone, Linked vehicle, Actions
- Filters: Name/Email/Phone; whether a vehicle is linked
- Link vehicle: searchable Select of this dealership's unlinked, unsold vehicles; already-taken vehicles are disabled

No leads / work orders / test-drive funnel.

### Ad compliance (the showcase)

- Form on the left, result on the right. Checklist updates immediately with ad type.
- Overall status may only be: Blocked / Needs AI review / Passed / Stale / AI unavailable
- Export TXT only when Passed and not Stale

No GitHub listing checker to copy. Rules: [02-omvic.md](02-omvic.md).

### Assistant (floating widget)

- Bottom-right robot button on every staff page opens a chat panel; no route, no menu item
- Each answer has a summary plus at most 5 dealership resource cards that open normal pages (DMS/CRM/Ad)
- Cards must not show phone / email / home address
- If the model is down, still show the retrieval list and the text `Smart summary unavailable`

## Tables / filters / forms (shared)

- Status uses Tag. Action column has at most 3 text links. 10 rows per page.
- One filter row: search + 1–3 dropdowns + Search + Reset. No price sliders, fuel filters, or maps.
- Enum Select. No generic CRUD generator.

## Suggested opens (interaction only)

1. [hyundai_dms Dealers](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Dealers.jsx)
2. [hyundai_dms Cars](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Cars.jsx)
3. [Car-Mart EntityPage](https://github.com/saadshd/Car-Mart-Frontend/blob/main/src/components/crud/EntityPage.tsx)
4. [carventory](https://github.com/mohammadumar-dev/carventory) staff console only
5. [vue-element-plus-admin Demo](https://element-plus-admin.cn/) (not scaffolding)
6. [Element Plus Result / Table / Empty](https://element-plus.org/en-US/component/result)
7. [MEVN-MyCar video](https://vimeo.com/500102464)

## Do not copy into the UI

Buyer site, KPI/chart wall, leads/test-drive/work orders, self-registration or password reset, dark glassmorphism, generic CRUD generators.
