# Traceability Matrix

Source item → requirement ID → design doc → acceptance case. Design docs are under `design/`.

| Source | Point | Requirement IDs | Design doc | Acceptance |
|---|---|---|---|---|
| PDF §1 | Multi-tenant; admin provisions dealers | AUTH-01–03, AUTH-06 | 15-Data-Auth-and-Gateway | AT-02 |
| PDF §2 | Admin sees no business data | AUTH-08 | 15, 14 | AT-03 |
| PDF §2 | Dealer users cannot see other dealers | AUTH-07, SEC-05 | 15 | AT-01 |
| PDF §2 | Admin creates / removes logins | AUTH-03–05 | 14, 15 | AT-04 |
| PDF §2 | Username / password sign-in | AUTH-12, SEC-01 (changed to Entra) | 15, SCOPE erratum 1 | — |
| PDF §3 | 8 required vehicle fields | DMS-01, DMS-05 | 00, 14 | AT-05 |
| PDF §3 | 4 optional vehicle fields | DMS-02, DMS-10 | 00, 14 | AT-07 |
| SCOPE | VIN unique per dealer | DMS-03 | 14 | AT-06 |
| SCOPE | Sold lock | DMS-11, DMS-12 | 14 | AT-08 |
| PDF §4 | 4 customer fields | CRM-01, CRM-02 | 00, 14 | — |
| PDF §4 | Purchase linked to DMS | CRM-05–09 | 14 | AT-09, AT-10 |
| PDF §5 | Always-required disclosures | AD-R01–R08 | 15 §6, 17 | AT-12, AT-16 |
| PDF §5 | Finance ads | AD-R10–R13 | 15 §6, 17 | AT-13 |
| PDF §5 | Radio / TV / billboard exemption | AD-R14 | 17 | AT-14 |
| PDF §5 | Lease ads, 20,000 km | AD-R20–R25 | 17 | AT-15 |
| DOC | AI compliance assistant | AD-08, AD-09, AI-01, AI-02 | 09, 19 | AT-17, AT-18 |
| SCOPE | Ready + TXT export | AD-11–13 | 14 §8 | AT-19, AT-20 |
| PDF §6 | Audit trail | AUD-01–07 | 14, 18 | AT-11 |
| PDF §6 | Shared back end | ARC-01, ARC-02 | 07, 00 | — |
| PDF §7 | 5 pages | UI-01–46 | 12, 13 | — |
| SCOPE | Assistant page | AI-03, AI-04, UI-50–51 | 10 | AT-21, AT-22 |
| SCOPE (PPT) | Gateway | ARC-03 | 19 | AT-23 |
| PDF §8 | Password security | SEC-01–04 | 15 | — |
| PDF §8 | Updatable rules | AD-14, AD-15 | 15 §6 | — |
| PDF §8 | Own hosting, backups | NFR-04, NFR-05, ARC-07 | 08, `deploy/README.md` | — |
| DOC | Image Studio | AD-17 (Won't) | — | — |
| DOC | Lead management | CRM-15 (Won't) | — | — |
