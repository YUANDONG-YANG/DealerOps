# Frontend UI conventions (copy interaction, not business)

Version v6.1 · 2026-09-21

Do not fork any full dealer repository. Those projects usually include a buyer site, dashboards, leads, and tickets. This project uses **React 19 + TypeScript + Vite**, the Graphite CSS design system in `frontend/react/src/styles.css` (soft white canvas, charcoal ink, 6px control / 10px panel radii, uppercase tracked labels, glossy graphite primary buttons, one 40px control height, soft layered shadows; colour is reserved for status), English UI, and the implemented React pages. Fields follow [00](00-Current-Development-Design.md) only.

## 1. Global

- Login: centered single card, no sidebar. One email/username/phone field + password field and one `Sign in` button for admins and staff ([15](15-Data-Auth-and-Gateway.md) §8).
- A signed-in user with no dealership binding sees `Your account is not provisioned yet. Contact your administrator.` (UI-03).
- Other pages: left menu + top bar (dealership name or `Platform Admin`, role, `Sign out`).
- Admin sees Admin only; a dealership member sees Dashboard / DMS / CRM / Leads / Sales report / Ad compliance, plus **Team** for the owner and managers only — a sales member gets no Team item and `/team` is blocked ([15](15-Data-Auth-and-Gateway.md) §2.5). Block unauthorized routes immediately.
- Post-login landing: admin → Admin; a dealership member → DMS. The KPI page is `/dashboard`, the first menu item, not the landing page (design/21 DASH-01).
- Signed-out visitors at `/` see a static landing page: brand bar with `Sign in` (no create-account button, CR C5), a banner stating the site is for dealerships, not car shoppers, linking shoppers to `/shop`, hero (car photo plus an illustrative inventory preview whose three fictional cars open a sample ad-check result: passed, blocked and stale, using the real checklist labels, each ending with a **Check your own ads** link to `/register`, a contextual call to action for an evaluating dealership rather than the removed header entry, CR-063/D4 as reversed 2026-11-03; it moves to the dealership enquiry flow once that exists), feature cards with illustrative mini screens, a VIN decoder (14 §4.6.1), and ad-approval steps. The page exposes no dealership data or public inventory.
- Primary action is top-right; Sell/Unbind require a second confirmation.
- Unsaved changes (CR F2): a form drawer opened with `dirty` (Admin dealership create/edit, DMS add/edit vehicle, CRM customer, Leads add lead and lead detail) asks `Discard unsaved changes?` (title `Unsaved changes`, buttons `Cancel` / `Discard`) when closed by ×, the overlay or Escape. While such a form or the Team dealership profile is dirty, closing or reloading the tab triggers the browser `beforeunload` prompt, and an in-app link asks `Discard unsaved changes?` in a native confirm. Saving the Team dealership profile first asks `Save changes to the dealership profile?`; saving a lead as Won or Lost first asks `Close this lead as Won/Lost? …` (button `Close lead`). Shared code: `useFormBaseline` / `useLeaveWarning` in `frontend/react/src/components/unsavedChanges.ts` and the `dirty` prop of `FormDrawer`.
- One table per page, tab, or drawer view. A second list goes behind its own tab (`tab-bar`, as on Admin and Team); never stack two tables on one screen.
- Every page must have loading, empty, and error states. Failures must not look like empty tables; an AI failure must never show Pass.

## 2. Table columns (enough for the demo)

- Admin dealerships: Name, Contact, Staff count, Actions
- Admin members: Username, Dealership, Role, Contact, Sign-in, Status, Actions
- DMS: Year Make Model, VIN, Stock #, Body, Source, Condition, Cost (CAD, 2 decimals), List price, Date added, Open WOs, Leads, Sold by, Sold to, Date sold, Status, Actions (UI-20)
- CRM: Name, Email, Phone, Home address, Linked vehicles, Leads (`leadCount`, CR R1; replaced "Vehicles purchased"), Actions
- Ad: Vehicle, Type, Medium, Check status, Buyer site (Listed / Not listed / Taken down when sold, by the SHOP-01 rule), Actions; above the table, the number of vehicles the buyer site lists now, read from the public inventory

Use Tags for status. The actions column has at most 3 text links. 10 rows per page. Sold rows are dimmed; purchase fields are read-only.

## 3. Filters

One row: search + 1–3 dropdowns + Search + Reset. No price sliders, fuel filters, or maps.

- DMS: VIN/Make/Model; Status; Condition
- CRM: Name/Email/Phone; whether a vehicle is already linked
- Admin: dealership name / username
- Ad compliance: VIN/Make/Model; Ad type; Medium; Check status; Buyer site (Listed / Not listed / Taken down) — one filter per table column, the one page with four dropdowns, so sales staff can find ads to fix or list

Every free-text search box on a list page uses `SearchSuggest` (type-ahead): after a 300 ms pause it shows up to 8 suggestions that contain the typed text anywhere (the list APIs already match `LIKE %q%`), with the match in bold and a muted hint line. Arrow keys move, Enter picks the highlighted suggestion or runs the typed search, Escape or a click outside closes the list. Picking a suggestion fills the box and filters the list at once. A suggestion equal to the typed text is not shown. This covers Leads (customer name), CRM (name / email / phone), DMS (VIN / make / model search, Model, and Make when the catalog is unavailable), Admin (dealership name, members) and both audit logs (actor username). Form pickers inside drawers keep their own controls.

## 4. Forms

Create and edit use a drawer or Dialog. Enums use Select. Sell uses a separate small dialog that shows cost, work-order spend and list price, and requires sold date, sold price and a buyer together (a CRM customer of the dealership, or Other with a typed name). CRM vehicle linking uses a searchable Select (VIN / model) that lists only this dealership's unlinked vehicles (in stock or sold); a vehicle is taken when its `linkedCustomer` is set. Client validation mirrors the backend field rules, and `400 VALIDATION` `fieldErrors` are shown on the matching form field (UI-21, CRM-01). Vehicle detail shows the linked customer (link to `/crm?customerId=`) and the ad check status (UI-22, DMS-08, CRM-10). A sold vehicle's detail also shows profit = sold price − purchase cost − repair cost, computed in the browser and never stored (DMS-16). No customer field is unique. When a name, email, phone or address matches another customer at the same dealership, the form asks for confirmation and then saves; a duplicate email also shows a non-blocking warning after the save (CRM-13).

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
6. Current implementation reference: Graphite CSS and reusable React components in `frontend/react/src/components/`
7. [MEVN-MyCar video](https://vimeo.com/500102464)

Do not copy: buyer sites, chart walls, leads/test-drives/tickets, dark glassmorphism, or a generic CRUD generator.
