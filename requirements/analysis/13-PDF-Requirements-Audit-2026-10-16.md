# Customer PDF Requirements and Code Audit

Audit date: 2026-10-16  
Source: [`DealerOps-Specification.pdf`](../DealerOps-Specification.pdf), all four pages and sections 1–8.  
Scope: source decomposition in this folder and corresponding React/.NET implementation. This is a source inspection plus build verification, not a claim that the workflows were manually exercised or that the client/instructor signed the course scope.

## Result

The analysis files 01–07 cover the functional topics in the PDF. The decomposition needed qualification in three places: CRM purchase-link optionality, the salesperson checklist, and the broadcast-ad exception are interpretations rather than confirmed client decisions. Older files 08–11 also contain dated findings or instructions and must not be read as current evidence. The code review found two direct UI inconsistencies and corrected them: the count answer's empty-card message and the optional body-type field's required marker.

## PDF section coverage

| PDF section | Analysis location | Coverage and disposition |
|---|---|---|
| 1. Overview | 01 §§1–3; 05 ARC-01/02 | Multi-tenant dealer records, shared DMS/CRM/ad backend and direct use of DMS/dealer data in ad checks are represented. |
| 2. Roles & access | 01 §§2–7; 05 SEC-01/02/05 | Platform admin provisioning, dealer-shared access, individual sign-in, one-dealer ownership and admin exclusion from business data are decomposed. Authentication additions from the client notes and scope baseline are explicitly beyond the PDF. |
| 3. DMS | 02 §§2–5 | All eight required and four optional fields, acquisition-to-sale lifecycle and condition/source values are represented. Validation limits beyond the PDF are marked derived. The later `bodyType` extension remains optional; the UI's required marker has been removed. |
| 4. CRM | 03 §§2–5 | Name, email, phone, address and DMS purchase links are represented. The source places “Car(s) purchased” under “Required fields” but gives it no asterisk. Treating it as optional is a reasonable implementation assumption, not confirmed source meaning (Q-03). |
| 5. Ad compliance | 04 §§1–5; 07 Q-09/Q-16 | The disclosure families and finance/lease conditions are listed. The course baseline changes some source “required” items to REVIEW; this is a delivery-scope decision, not the PDF's severity. The PDF says the salesperson completes a checklist; the current UI displays a checklist without collecting answers. This limitation is now explicit and awaits confirmation (Q-09). The broadcast exception's scope remains ambiguous (Q-16). |
| 6. Cross-cutting | 05 §§1–3 | DMS/CRM actor, action, timestamp and change history; shared backend; tenant isolation and security are mapped. Additional audit metadata and privacy rules are derived or scope additions. |
| 7. Pages | 06 §§1–2 | All five source pages are listed. The assistant, landing page, registration and other extensions are identified as additions, not misattributed to the PDF. |
| 8. Known limitations | 04 AD-14/15; 05 SEC-01, NFR-04/05; 07 Q-15 | Password hashing, the not-legal-advice notice, configurable-rule limitation, hosting/domain and backups are represented as production/class-discussion topics. The UI already displays the compliance notice; rule configuration remains deferred. |

## Open source interpretations

| ID | PDF wording | Current behavior / interpretation | Decision needed |
|---|---|---|---|
| Q-03 | “Car(s) purchased” is under “Required fields” but has no `*`. | Customer can be created without a linked vehicle. | Confirm whether a purchase link is optional at customer creation. |
| Q-09 | “The salesperson completes a checklist.” | UI shows a kind/medium checklist but records no prior-use, warranty or lease-kilometre answers; rules infer only from ad copy and other stored data. Silent facts cannot be detected. | Confirm whether display-only is acceptable for the client deliverable. |
| Q-16 | Radio/TV/billboard ads are exempt from displaying “these” alongside the rate. | Current rule skips APR-proximity review only; it still checks APR, finance term and cash-price/cost-of-borrowing disclosure. | Confirm whether the exception waives only prominence or also those listed disclosures. |

Other derived behavior (field length/format, duplicate handling, deletion policy and detailed status transitions) is identified in the relevant analysis tables. It should not be presented as literal PDF text.

## Frontend and backend source inspection

| Area | Evidence inspected | Result |
|---|---|---|
| Sign-in, roles and dealer access | `DealerOps.Core/Dealer/AuthService.cs`, `MembershipService.cs`, `Common/Tenant/TenantMiddleware.cs`, `Common/Tenant/TenantGuard.cs`, Gateway role gate | Admin and dealer routes are separated; tenant id comes from active membership; business services reject unbound users; cross-dealer record lookups use tenant predicates. |
| DMS fields and lifecycle | `Vehicle/Dto/CreateVehicleRequest.cs`, `PatchVehicleRequest.cs`, `SellVehicleRequest.cs`, `VehicleService.cs`, React `pages/DmsPage.tsx` | Required/optional fields and date/VIN/money checks are present; sold date/price are paired; sold vehicle acquisition fields are locked. Body type is optional in API and is now labelled optional in the form. |
| CRM fields and vehicle associations | `Customer/Dto/*CustomerRequest.cs`, `CustomerService.cs`, React `pages/CrmPage.tsx` | Four customer fields are required; same-dealer links are enforced, a vehicle cannot be linked twice, and sold vehicles cannot be unlinked. Duplicate customer email/phone is rejected by current code even though the PDF is silent; see CRM-13 before treating that constraint as approved. |
| Compliance rules and UI | `Compliance/OmvicRuleEngine.cs`, `ComplianceCheckService.cs`, `ListingService.cs`, React `components/AdWorkspace.tsx`, `pages/AdsPage.tsx` | Deterministic BLOCK/REVIEW rules, AI second pass, check history, stale checks, Ready/TXT gates and a visible not-legal-advice notice are present. Checklist answers are not persisted. Rule changes require code changes. |
| Audit | `Audit/AuditService.cs`, vehicle/customer services, React audit panels | Actor, action, UTC timestamp and history are recorded. Customer history includes link/unlink events. Customer email/phone/address values are not written into audit summaries. |
| Read-only assistant and counts | `Assistant/AssistantResourceQuery.cs`, `AssistantService.cs`, `Dto/AskResponse.cs`, React assistant API/widget, AI service prompt | Lookup is dealer-scoped and card-limited; supported count queries are computed from complete tenant-scoped queries and bypass the model. A structured count is returned so the UI does not report “No matching records” for a count answer. |
| Storage and architecture | `Data/AppDbContext.cs`, `DealerOps.Core/Program.cs`, Gateway/AI service projects | One MySQL application database; DMS, CRM and listings share the Core backend, with Gateway-mediated browser access. Tenant query filters are also applied to tenant-owned entities. |

## Findings corrected during this audit

1. The assistant count response now includes a structured count object. The React widget no longer appends an empty-search message to a count answer. Singular/plural wording is generated correctly.
2. `bodyType` remains optional in the API and is no longer visually marked as required in DMS.
3. `AD-14` and `UI-46` now reflect the existing result-panel notice. A separate disclaimer page or TXT footer is not implemented.
4. The English progress page now reports AI-03 count support as implemented. The English requirements and traceability documents include the feature and its acceptance case.
5. The analysis README now marks old Cursor notes as historical, removes the false claim that Firebase Auth is unused, and does not call the scope baseline client-signed while its signature is pending.
6. The English progress page now reflects Firebase Auth and points to the English traceability matrix. The Chinese requirements mirror was left untouched under the English-only documentation instruction; its AI-03 wording still says aggregate counts are unsupported, so it is not current for that feature.

## Verification boundary

This audit used source inspection and successful project builds. No test suite or live multi-dealership scenario was executed in this audit. Open items Q-03, Q-09 and Q-16 require a product decision before the implementation can be called an exact match to the corresponding PDF wording.
