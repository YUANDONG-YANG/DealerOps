# Traceability Matrix

Source item → requirement ID → design doc → acceptance case. Design docs are under `design/`. AT cases are in analysis/06; BE/FE/CL and Review 1–3 evidence are in design/16. References are planned checks, not evidence that tests passed. Rows group related requirements; a referenced case covers only its stated scenario.

| Source | Point | Requirement IDs | Design doc | Acceptance |
|---|---|---|---|---|
| PDF §1 | Multi-tenant; admin provisions dealers | AUTH-01–03, AUTH-06 | 15-Data-Auth-and-Gateway | CL-1 (provisioning), CL-2 (dealer login), AT-02 (sharing) |
| PDF §2 | Admin sees no business data | AUTH-08 | 15, 14 | AT-03 |
| PDF §2 | Dealer users cannot see other dealers | AUTH-07, AUTH-09, SEC-05 | 15 | AT-01, BE-01, BE-16 (client `dealerId` ignored) |
| PDF §2 | Admin creates / removes logins | AUTH-03–05, AUTH-13, AUTH-14 | 14, 15 | CL-1 (create/list members; step 6 `DUP_MEMBER`), AT-04 / BE-02 (remove access, unbound 403) |
| PDF §2 | Dealer users cannot create or remove logins | AUTH-10 | 14 §3, 15 | FE-02 (route guard only); join-request approval is the AUTH-25 exception |
| PDF §2 | Own username / password sign-in (widened to email/username/phone, Google and Firebase) | AUTH-12, SEC-01 (reversed 2026-09-30, see design/SCOPE-BASELINE.md errata 1, 7, 9) | 15 §8, 14 §1.4–1.6 | CL-1/CL-2 (sign-in and landing), FE-01 (unsigned-in guard) |
| PDF §3 | 8 required vehicle fields | DMS-01, DMS-05 | 00, 14 | AT-05 (missing VIN); CL-2 (valid create); manually try each required field and invalid enum |
| PDF §3 | 4 optional vehicle fields | DMS-02, DMS-10 | 00, 14 | CL-2 create with repair cost/Carfax omitted; AT-07 / BE-15 sale pair |
| SCOPE | VIN unique per dealer | DMS-03 | 14 | AT-06 |
| SCOPE | Sold lock | DMS-11, DMS-12 | 14 | AT-08 / BE-03; repeat Sell must return SOLD_LOCKED |
| PDF §3 / SCOPE | Vehicle list, detail, edit, VIN format, optimistic lock | DMS-04, DMS-06–09, DMS-13 | 14 §4, 13 §5.4 | CL-2 (create / view / edit); FE-09 page states; `VERSION_CONFLICT` UI copy in 16 §4 |
| SCOPE | Condition change invalidates a pass | DMS-15 | 14 §8 | BE-07 (condition change → `CHECK_STALE`) |
| Delivery goals | Profit display and vehicle soft-delete | DMS-16 (Could), DMS-17 (Must) | 14 §4 | Source/code review; add/confirm acceptance for delete behavior |
| PDF §4 | 4 customer fields | CRM-01, CRM-02, CRM-04 | 00, 14 | AT-26; CL-2 |
| PDF §6 / SCOPE | Customer audit and contact privacy | CRM-11, CRM-12 | 14 §9, 18 | AT-26, BE-11, AT-22 |
| Delivery goals | Duplicate contact handling and customer soft-delete | CRM-13 (Could), CRM-14 (Must) | 14 §5 | CRM UI/API coverage; retention acceptance remains to verify |
| PDF §4 | Purchase linked to DMS | CRM-05–09 | 14 | AT-09/10/25/29; BE-05 (same-store stock/sold and cross-store); BE-06 |
| PDF §5 | Salesperson checklist answers and disclosure checks | AD-02, AD-R03/06/25 | 04, 15 §6, PROTOCOL §C | AT-28 |
| PDF §5 / SCOPE erratum 4 | Course BLOCK/REVIEW disclosures | AD-R01–R08, AD-R05b, AD-07 | 15 §6, PROTOCOL §C, 17 | AT-12/16/27, BE-09 (Blocked skips AI); FX rule fixtures (individual findings; `NEW_USED_NOT_STATED` in the 17 amendment) |
| PDF §5 | Finance ads | AD-R10–R13, AD-04 | 15 §6, PROTOCOL §C, 17 | AT-13/24/27 |
| PDF §5 | Radio / TV / billboard exemption | AD-R14 | 17 | AT-14 |
| PDF §5 | Lease ads, 20,000 km | AD-R20–R25 | 17 | AT-15 |
| DOC | AI compliance assistant | AD-08, AD-09, AI-01, AI-02 | 09, 19, PROTOCOL §B.6 | AT-17/18/27; CL-5 |
| SCOPE | Ready + TXT export | AD-11–13 | 14 §8 | AT-19, AT-20 |
| PDF §6 | Audit trail | AUD-01–07 | 14, 18 | AT-11/26, BE-11 (visible audit/PII); AUD-05/07 require implementation inspection, not proved by AT-11 |
| Derived | Admin operations audited | AUD-08 (Could; implemented as `DEALER` / `MEMBERSHIP` rows) | 14 §9 | — |
| PDF §6 | Shared back end | ARC-01, ARC-02 | 07, 00 | CL-2 + CL-5; Review 1 architecture inspection confirms shared backend/database |
| PDF §7 | 5 pages | UI-01–04, UI-10–13, UI-20–24, UI-30–33, UI-40–46, UI-50–51 (26 ids; the ranges are not contiguous) | 12, 13 | FE-01–10, CL-1–6, AT-26/28; UI-46 notice and TXT disclaimer are asserted in ads-ready-export.spec.ts |
| SCOPE + user request (2026-10-16) | Assistant panel, read-only lookup, deterministic counts | AI-03, AI-04, UI-50–52 | 10 | AT-21, AT-22, AT-40 |
| SCOPE (PPT) | Gateway | ARC-03 | 19 | AT-23 |
| PDF §8 | Password security | SEC-01–04 (reversed 2026-09-30, see design/SCOPE-BASELINE.md errata 1) | 15 §8 | CL-1/2; Review 2 Azure HTTPS, BCrypt hash + JWT and Key Vault evidence |
| PDF §8 | Compliance notice / rules update without code changes | AD-14, AD-15 | 04 §5 / 07 Q-15 | UI notice, `/disclaimer` page and admin rule editor are implemented; verify editor flow in admin acceptance |
| PDF §8 | Own hosting, backups | NFR-04, NFR-05, ARC-07 | 08, deploy/README.md | Review 2/3 Azure deployment evidence; custom domain and restore exercise are not added gates |
| DOC2 | VIN decode and public landing page | VIN-01–04 | 21 §2, 13 §2, 14 §4.6.1 | EXT-01 (16 §5a) |
| DOC2 | Lead follow-up | LEAD-01–09, CRM-16 | 21 §3, 13 §5.5a, 14 §5.5–5.6 | EXT-02, EXT-03 (16 §5a) |
| DOC2 | Reconditioning work orders | WO-01–07 | 21 §4, 14 §4.7 | EXT-04 (16 §5a) |
| DOC2 | Self sign-up and Google sign-in | AUTH-16–23 | 21 §5, 15 §8, 14 §1.5–1.6 | EXT-05–07 (16 §5a); no EXT case exercises Google sign-in (AUTH-23) |
| DOC2 / SCOPE erratum 9 | Firebase Auth sign-in | AUTH-24 | 21 §5, 14 §1.7 | — (see known gaps) |
| SCOPE erratum 10 | Dealership members approve join requests | AUTH-25 | 21 §5, 14 | — (see known gaps) |
| DOC2 | Image Studio | IMG-01–05, AD-17 | 21 §6, 14 §4.8 | EXT-08–10 (16 §5a) |
| DOC | Sales-funnel reports | CRM-15 (Must) | 21 §3 / Reports | Current reports page; acceptance coverage to confirm |
| DOC | Marketplace publishing | AD-16 (Must; simulated where live authorization is unavailable) | 21 / Ads | Simulated publishing acceptance to confirm |
| Derived / delivery goals | Phone-width layout; rate limits, SLOs, privacy retention | NFR-06 (Could), NFR-07 (Must) | 19, 20, 15 | Existing responsive and configuration coverage; runtime acceptance to confirm |

Structured salesperson checklist AD-02 / UI-40 → AT-28. Soft review and AI outcome AD-03/08/10/12 → AT-27. Existing classroom demo set stays unchanged; AT-24–28 are short regression checks using the same records.

## Acceptance coverage and reconciliation

This section records missing or indirect acceptance coverage, not missing product scope. A coverage gap does not downgrade a customer-source feature. Update this list when acceptance cases are added.

| Requirement | Why it has no case |
|---|---|
| AUTH-09 (server ignores a client-supplied `dealerId`) | No `analysis/06` AT case, but design/16 **BE-16** covers it (mapped above); `AT-31` in `../DealerOps-Requirements-zh.html` is the same check |
| AUTH-10 | Only route guards (FE-02) are planned; no case calls an admin API as a dealer user. Join-request approval on `/team` is the documented AUTH-25 exception |
| AUTH-11, AUTH-15 | Identity and admin dealership edit; partly covered by CL-1 / CL-2 as side effects |
| AUTH-23 | Google sign-in has no EXT case in design/16 §5a |
| AUTH-24 Firebase sign-in (erratum 9) | Implemented (`POST /api/v1/auth/firebase`, design/14 §1.7) but has no acceptance case |
| AUTH-25 join-request approval (erratum 10) | UI coverage exists in `playwright/tests/ui/team-profile.spec.ts`; no `analysis/06` AT case is assigned |
| Join requests, notifications, profile self-service | Implemented (`/api/v1/dealer/join-requests`, `/api/v1/dealer/notifications`, `PATCH` / `DELETE /api/v1/me`, routes `/team` and `/profile`) and listed in design/13 §2, but have no requirement ID, no design/14 contract entry and no acceptance case |
| DMS-14, CRM-03, CRM-10 | Audit-on-write, customer paging, cross-navigation; exercised incidentally by AT-11 / AT-26 |
| AD-01, AD-05, AD-06 | Draft lifecycle and reads of DMS / dealership data; a precondition of every AD case rather than its own |
| AI-05, AUD-09 | Output shape and check history; inspection-only |
| ARC-04, ARC-05, ARC-06 | Module split, sync REST, error envelope; architecture inspection (Review 1) |
| SEC-06, SEC-07 | Prompt-injection handling and PII exclusion from AI; SEC-07 is partly covered by AT-22 |
| CRM-15, AD-15, AD-16, DMS-17, CRM-14, NFR-07 | Delivery goals adopted on 2026-10-19; the acceptance catalog and some detailed analysis tables need reconciliation with current implementation |
| NFR-01, NFR-02, NFR-03 | Paging, money / date format, English UI; visible in every page case |

`NFR-08` (release-timestamp visibility) is cited by `AT-39` in the progress reports but is defined
in `../DealerOps-Requirements.md`, not in `analysis/05`. Treat that report as its home.
