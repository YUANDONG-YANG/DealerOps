# Reference projects versus current requirements

Updated: 2026-10-15

This note records what the downloaded reference projects can contribute to DealerOps. It is not an implementation specification. The authoritative requirements are under `requirements/`; the current technology baseline is [design/TECHNOLOGY-STACK.md](../design/TECHNOLOGY-STACK.md).

## What matches and is useful

| Current requirement | Useful reference pattern | Current implementation status |
|---|---|---|
| DMS vehicle list, 10 per page, filters | Carventory inventory table and filter rhythm | Already implemented in `frontend/react/src/pages/DmsPage.tsx` |
| CRM customer and vehicle linking | Car-dealer-crm customer/vehicle dialogs and linked-record layout | Already implemented in `frontend/react/src/pages/CrmPage.tsx` |
| Create/edit flows | Drawer/Dialog form pattern with field-level feedback | Already implemented with React `FormDrawer` and validation states |
| Sold and linked status | Status tags, disabled actions, confirmation before destructive actions | Already implemented in DMS/CRM pages |
| Audit and API diagnostics | Carventory API-log/service separation as a reading aid | DealerOps uses its own audit model and `log-sum`; do not copy the schema |

## Do not import

- Java/Spring, Laravel, Vue, PrimeVue, Ant Design, PostgreSQL, Flyway, or reference JWT filters.
- Buyer marketplace, bookings, invoices, payments, email verification, password reset, Cloudinary, dashboards, and chart walls.
- Reference fields such as mileage, fuel, transmission, extra price fields, or buyer/inquiry data unless a current requirement explicitly adds them.

## Decision

No reference source file should be copied into the current application. The matching interaction ideas have already been implemented in the React UI. Future changes should use the references for visual comparison only, then implement in `frontend/react` and `backend/dotnet` against the current requirement IDs and API contract.
