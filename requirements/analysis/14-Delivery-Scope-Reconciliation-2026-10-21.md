# Delivery Scope Reconciliation — 2026-10-21

## Decision

For the academic graduation demonstration, functionality requested in the customer's original
`DealerOps-Specification.pdf`, `Dos Car dealership.docx`, and `Dos Car dealership2.docx` is in scope
when it can reasonably be implemented in the active project. Do not exclude a requested feature
because the project is a student demo rather than a commercial product. When a live external account,
credential, or authorization is unavailable, implement a clearly labeled simulation or local demo
where feasible and state exactly what did not occur externally.

The active implementation is .NET 10, React, MySQL, and the Gateway. Retired Java and Vue code is
not part of this delivery. Firebase is used for Auth; MySQL remains the application database.

## Current feature groups

| Customer source | Requested capability | Delivery interpretation |
|---|---|---|
| Specification PDF | Tenant administration, DMS, CRM, OMVIC ad checks, AI review, audit, security, hosting/backup, UI pages | Implement the specified fields, rules, workflows, and constraints; use `analysis/01–06` for traceability |
| Customer DOCX | Unified dealer operations, DMS, CRM lead/customer lifecycle, AI compliance assistant, Image Studio | Implement in the active stack; Image Studio and lead follow-up are part of delivery |
| Customer DOCX2 | Public landing page, NHTSA vPIC VIN decoding and returned vehicle facts, Firebase email/password and Google sign-in, React, C# backend | Implement the public demo flow and auth providers; store decoded vehicle data only through the user’s explicit create action |
| Customer DOCX | Marketplace publication before listing is published | Implement target selection and publish/unpublish state as a clearly labeled browser simulation unless a real approved API/feed and authorization become available |
| Adopted delivery extensions | Vehicle/customer soft delete, sales-funnel reports, rule editor, rate limiting/SLO/privacy retention | These are delivery goals, not Won’t items. Preserve history and tenant isolation. |
| Former out-of-scope list | Buyer site, payments, contracts, listing details, KPI page, stage history, workshop settlement, disclaimer page, live publishing, OCR, queues, second database | Implemented where feasible (design/21 §9: DMS-18, PAY-01–04, SALE-01, DASH-01, CRM-16, WO-08, AD-14, SHOP-01–05). Live publishing stays simulated; card processing, OCR, queues and a second database are not built, for the reasons recorded there |

## Remaining evidence and implementation checks

This document sets scope; it does not claim that every feature has passed runtime acceptance. Track
unfinished implementation and unperformed demonstrations in the current progress report and
acceptance evidence. The known concrete operational evidence gap is a database restore exercise and
agreement on recovery targets. Automated or manual acceptance gaps are verification gaps, not scope
exclusions.

## Reconciliation rules for older documents

- A `Won't`, `out of scope`, or `deferred` label in an older analysis/review is historical unless it
  is repeated in `design/SCOPE-BASELINE.md` with a current technical reason.
- Reconcile DMS-17, CRM-14, CRM-15, AD-15, AD-16, and NFR-07 to their delivery-goal definitions.
- Do not treat absent Playwright acceptance as evidence that a customer requirement is out of scope.
- Keep external marketplace activity explicitly simulated unless a real authorized integration is
  available.
