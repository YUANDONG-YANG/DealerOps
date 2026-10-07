# Traceability Matrix

Source item → requirement ID → design doc → acceptance case. Design docs are under `design/`. AT cases are in analysis/06; BE/FE/CL and Review 1–3 evidence are in design/16. References are planned checks, not evidence that tests passed. Rows group related requirements; a referenced case covers only its stated scenario.

| Source | Point | Requirement IDs | Design doc | Acceptance |
|---|---|---|---|---|
| PDF §1 | Multi-tenant; admin provisions dealers | AUTH-01–03, AUTH-06 | 15-Data-Auth-and-Gateway | CL-1 (provisioning), CL-2 (dealer login), AT-02 (sharing) |
| PDF §2 | Admin sees no business data | AUTH-08 | 15, 14 | AT-03 |
| PDF §2 | Dealer users cannot see other dealers | AUTH-07, SEC-05 | 15 | AT-01 |
| PDF §2 | Admin creates / removes logins | AUTH-03–05 | 14, 15 | CL-1 (create/list members), AT-04 / BE-02 (remove access) |
| PDF §2 | Username / password sign-in | AUTH-12, SEC-01 (reversed 2026-09-30, see design/SCOPE-BASELINE.md errata 1) | 15 §8, 14 §1.4 | CL-1/CL-2 (sign-in and landing), FE-01 (unsigned-in guard) |
| PDF §3 | 8 required vehicle fields | DMS-01, DMS-05 | 00, 14 | AT-05 (missing VIN); CL-2 (valid create); manually try each required field and invalid enum |
| PDF §3 | 4 optional vehicle fields | DMS-02, DMS-10 | 00, 14 | CL-2 create with repair cost/Carfax omitted; AT-07 / BE-15 sale pair |
| SCOPE | VIN unique per dealer | DMS-03 | 14 | AT-06 |
| SCOPE | Sold lock | DMS-11, DMS-12 | 14 | AT-08 / BE-03; repeat Sell must return SOLD_LOCKED |
| PDF §4 | 4 customer fields | CRM-01, CRM-02 | 00, 14 | AT-26; CL-2 |
| PDF §4 | Purchase linked to DMS | CRM-05–09 | 14 | AT-09/10/25; BE-05 (same-store stock/sold and cross-store); BE-06 |
| PDF §5 / SCOPE erratum 4 | Course BLOCK/REVIEW disclosures | AD-R01–R08 | 15 §6, PROTOCOL §C, 17 | AT-12/16/27; FX rule fixtures (individual findings) |
| PDF §5 | Finance ads | AD-R10–R13 | 15 §6, PROTOCOL §C, 17 | AT-13/24/27 |
| PDF §5 | Radio / TV / billboard exemption | AD-R14 | 17 | AT-14 |
| PDF §5 | Lease ads, 20,000 km | AD-R20–R25 | 17 | AT-15 |
| DOC | AI compliance assistant | AD-08, AD-09, AI-01, AI-02 | 09, 19, PROTOCOL §B.6 | AT-17/18/27; CL-5 |
| SCOPE | Ready + TXT export | AD-11–13 | 14 §8 | AT-19, AT-20 |
| PDF §6 | Audit trail | AUD-01–07 | 14, 18 | AT-11/26, BE-11 (visible audit/PII); AUD-05/07 require implementation inspection, not proved by AT-11 |
| PDF §6 | Shared back end | ARC-01, ARC-02 | 07, 00 | CL-2 + CL-5; Review 1 architecture inspection confirms shared backend/database |
| PDF §7 | 5 pages | UI-01–46 | 12, 13 | FE-01–09, CL-1–6, AT-26/28; UI-46 deferred |
| SCOPE | Assistant page | AI-03, AI-04, UI-50–51 | 10 | AT-21, AT-22 |
| SCOPE (PPT) | Gateway | ARC-03 | 19 | AT-23 |
| PDF §8 | Password security | SEC-01–04 (reversed 2026-09-30, see design/SCOPE-BASELINE.md errata 1) | 15 §8 | CL-1/2; Review 2 Azure HTTPS, BCrypt hash + JWT and Key Vault evidence |
| PDF §8 | Disclaimer / updatable rules | AD-14, AD-15 | 04 §5 / 07 Q-15 | Deferred; not demo acceptance gates |
| PDF §8 | Own hosting, backups | NFR-04, NFR-05, ARC-07 | 08, deploy/README.md | Review 2/3 Azure deployment evidence; custom domain and restore exercise are not added gates |
| DOC | Image Studio | AD-17 (Won't) | — | — |
| DOC | Lead management | CRM-15 (Won't) | — | — |

Display-only checklist AD-02 / UI-40 → AT-28. Soft review and AI outcome AD-03/08/10/12 → AT-27. Existing classroom demo set stays unchanged; AT-24–28 are short regression checks using the same records.
