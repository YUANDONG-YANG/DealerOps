# Frontend UI conventions (copy interaction, not business)

Version v6.1 · 2026-09-21

Do not fork any full dealer repository. Those projects usually include a buyer site, dashboards, leads, and tickets. This course uses Vue 3 + **Element Plus**, English UI, and 6 pages. Fields follow [00](00-Current-Development-Design.md) only.

## 1. Global

- Login: centered single card, no sidebar. Username + password fields and one `Sign in` button for admins and staff ([15](15-Data-Auth-and-Gateway.md) §8).
- A signed-in user with no dealership binding sees `Your account is not provisioned yet. Contact your administrator.` (UI-03).
- Other pages: left menu + top bar (dealership name or `Platform Admin`, role, `Sign out`).
- Admin sees Admin only; staff sees DMS / CRM / Ad compliance / Assistant only. Block unauthorized routes immediately.
- Post-login landing: admin → Admin; staff → DMS. No KPI home page.
- Primary action is top-right; Sell/Unbind require a second confirmation.
- Every page must have loading, empty, and error states. Failures must not look like empty tables; an AI failure must never show Pass.

## 2. Table columns (enough for the demo)

- Admin dealerships: Name, Contact, Staff count, Actions
- Admin members: Username, Dealership, Status, Actions
- DMS: Year Make Model, VIN, Source, Condition, Cost (CAD, 2 decimals), Date added, Status, Actions (UI-20)
- CRM: Name, Email, Phone, Linked vehicle, Vehicles purchased (`linkedVehicleCount`, UI-30), Actions
- Ad: Vehicle, Type, Medium, Check status, Actions

Use Tags for status. The actions column has at most 3 text links. 10 rows per page. Sold rows are dimmed; purchase fields are read-only.

## 3. Filters

One row: search + 1–3 dropdowns + Search + Reset. No price sliders, fuel filters, or maps.

- DMS: VIN/Make/Model; Status; Condition
- CRM: Name/Email/Phone; whether a vehicle is already linked
- Admin: dealership name / username

## 4. Forms

Create and edit use a drawer or Dialog. Enums use Select. Sell uses a separate small dialog: Sold date + Sold price are required as a pair. CRM vehicle linking uses a searchable Select (VIN / model) that lists only this dealership's unlinked vehicles (in stock or sold); a vehicle is taken when its `linkedCustomer` is set. Client validation mirrors the backend field rules, and `400 VALIDATION` `fieldErrors` are shown on the matching form field (UI-21, CRM-01). Vehicle detail shows the linked customer (link to `/crm?customerId=`) and the ad check status (UI-22, DMS-08, CRM-10). A sold vehicle's detail also shows profit = sold price − purchase cost − repair cost, computed in the browser and never stored (DMS-16). When a customer's email matches another customer at the same dealership, the customer form shows a non-blocking warning and still saves (CRM-13; families may share one email).

## 5. Ad compliance (the showcase page)

Form on the left, results on the right. The form shows the vehicle year and condition from DMS and the dealership name and contact fields from `GET /me` (UI-41). After a check, each checklist line is marked ✅ (no finding) / ❌ (BLOCK finding) / ⚠️ (REVIEW finding), and each rule finding is listed with its reason (UI-43); the checklist stays display only. The checklist changes immediately with ad type. Overall status may only be: Blocked / Needs AI review / Passed / Stale / AI unavailable. Export TXT is allowed only when Passed and not Stale.

## 6. Assistant

One question, one answer + at most 5 dealership resource cards that open ordinary pages. Cards must not show phone / email / home address. If the model is down, still show the retrieval list and display `Smart summary unavailable`.

## 7. Suggested references (interaction only)

1. [hyundai_dms Dealers](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Dealers.jsx)
2. [hyundai_dms Cars](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Cars.jsx)
3. [Car-Mart EntityPage](https://github.com/saadshd/Car-Mart-Frontend/blob/main/src/components/crud/EntityPage.tsx)
4. [carventory](https://github.com/mohammadumar-dev/carventory) staff back office only, not the marketplace
5. [vue-element-plus-admin Demo](https://element-plus-admin.cn/) (do not use the whole repo as scaffolding)
6. [Element Plus Result / Table / Empty](https://element-plus.org/en-US/component/result)
7. [MEVN-MyCar video](https://vimeo.com/500102464)

Do not copy: buyer sites, chart walls, leads/test-drives/tickets, dark glassmorphism, or a generic CRUD generator.
