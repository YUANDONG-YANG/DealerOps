# DealerOps Requirement Implementation Ledger — 2026-10-19

## Scope

This ledger tracks the requested requirement IDs `AUTH-19`, `DMS-17`, `CRM-14`, `CRM-15`, `AD-15`, `AD-16`, and `NFR-07`. The request expanded prior Won't decisions to implementation requirements. AD-16 is delivered as an explicitly simulated capstone flow; NFR-07 still needs policy values.

## Status

| Requirement | Status | Implementation / open item |
|---|---|---|
| AUTH-19 | Superseded | The current design replaces this with Google sign-in AUTH-23. Google sign-in is already implemented in the active .NET/React stack; no legacy AUTH-19 path was added. |
| DMS-17 | Implemented | `DELETE /api/v1/vehicles/{id}` soft-deletes the vehicle from active queries, writes a `VEHICLE`/`DELETE` audit event, and retains sales, work-order, listing, and audit relationships. DMS has a confirmation control. Audit fix: a sold vehicle (`SOLD_LOCKED`), a customer-linked vehicle (`VEHICLE_ALREADY_LINKED`), or one with open work orders (`WORK_ORDERS_OPEN`) cannot be deleted, so CRM purchase history never loses a vehicle; the VIN check now includes deleted vehicles; DMS hides Delete for sold vehicles. |
| CRM-14 | Implemented | `DELETE /api/v1/customers/{id}` soft-deletes the customer from active queries, writes a `CUSTOMER`/`DELETE` audit event, and retains lead/link/audit history. CRM has a confirmation control. Audit fix: leads now keep showing a deleted customer's name and a deleted vehicle instead of a blank. |
| CRM-15 | Implemented | `GET /api/v1/leads/report/funnel` and `/reports/sales-funnel` show all five tenant-scoped stages, counts, shares, total leads, and won rate. This is a current snapshot without historical date ranges. |
| AD-15 | Implemented; browser acceptance pending | Platform Admin can enable/disable each built-in rule, change severity between BLOCK and REVIEW, and set its displayed finding message. Updates persist in `compliance_rule_override` and invalidate previous checks by advancing listing content versions. |
| AD-16 | Implemented as capstone simulation | Ads offers Kijiji, AutoTrader.ca, and generic marketplace demo targets, with simulated publish/unpublish status and a generated demo reference stored in that browser. The UI explicitly says no external listing is created. Live publishing still requires an approved platform API/feed and dealer authorization. |
| NFR-07 | Blocked on policy decision | Requirements name rate limits, throughput SLOs, and PIPEDA retention without values or data categories. Provide per-endpoint/user/dealer/IP limits, latency/availability targets, and retained data categories/periods (including any legal-hold rules). |

## Client-source traceability

Checked against the client originals (`requirements/DealerOps-Specification.pdf`, both `Dos Car dealership` documents):

- AD-15 traces to Specification §8 ("allow the rules to be updated without a code change"). The delivered editor covers enable/disable, severity, and message for built-in rules; adding new rules or changing thresholds (for example the 20,000 km/year lease allowance) still needs code.
- AUTH-19/AUTH-23 trace to the second client document's Google login; email/password sign-up is covered by Firebase sign-in.
- DMS-17, CRM-14, CRM-15, AD-16, and NFR-07 are not named in the client originals. AD-16 is implemented as a demo simulation; NFR-07 remains pending policy values.

## Validation completed

- `dotnet build backend/dotnet/DealerOps.Core/DealerOps.Core.csproj --no-restore` — passed, 0 errors.
- `npm run build` in `frontend/react` — passed. Vite reported the existing >500 kB bundle-size advisory.
- `ruby -e 'require "yaml"; YAML.load_file("dealer-platform/openapi.yaml")'` — OpenAPI YAML parsed successfully.
- Browser manual check: `/reports/sales-funnel` rendered 15 dealership leads across New 3, Contacted 3, Qualified 2, Won 4, Lost 3; stage percentages total 100%, and won rate displays 26.7%.
- Browser manual check: `/ads` gated demo publishing until the ad was saved, passed, and marked Ready; Kijiji simulation showed a demo reference and timestamp; simulated unpublish removed the status. The UI disclosed that no external platform was contacted. The sample ad was marked Ready during this smoke check.
- React `npm run build` after the AD-16 implementation — passed; Vite reported the existing >500 kB bundle-size advisory.
- Service readiness: Core, AI Service, Gateway, and React web returned healthy/HTTP 200 after Core restart.
- No existing tests were run or changed. No records were deleted and no rule settings were saved during browser review.

## Files for the delivered behavior

- Backend: `backend/dotnet/DealerOps.Core/Vehicle/`, `Customer/`, `Lead/`, `Compliance/`, `Data/AppDbContext.cs`, and `Program.cs`.
- Frontend: `frontend/react/src/api/`, `components/ComplianceRulesPanel.tsx`, `pages/AdminPage.tsx`, `pages/SalesFunnelPage.tsx`, `pages/DmsPage.tsx`, `pages/CrmPage.tsx`, `layouts/AppLayout.tsx`, and `router.tsx`.
- Contracts and scope: `dealer-platform/openapi.yaml`, `design/14-Backend-API-Contract.md`, `design/21-Feature-Extensions.md`, `design/SCOPE-BASELINE.md`, and `requirements/DealerOps-Requirements.md`.
