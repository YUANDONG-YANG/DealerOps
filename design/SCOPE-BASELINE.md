# Dealer Ops approved scope (one page)

Version 1.0 · 2026-09-21 · for Instructor / Client **signature or email confirmation**  
Conflict order (read-only): **PPT hard requirements > specification PDF fields > v6 design > UI 12**. `01`–`06` and earlier proposals **are not grading criteria**.

## Approved-scope formula

**Specification PDF fields** (DMS / CRM / Ad: do not add or remove)  
**+ PPT six hard requirements** (four repos and four pipelines; Gateway; Azure+Docker+Bicep+CI/CD; Entra+JWT+RBAC+HTTPS+Key Vault; real AI; Scrum board and three all-hands Reviews)  
**+ v6 six pages** (Login / Admin / DMS / CRM / Ad compliance / Assistant)  
**− v6 out-of-scope list** (see Out of Scope).  
Scope changes require a re-sign of this page or email confirmation.

## In Scope (this course delivery)

| Item | One sentence |
|---|---|
| Multi-tenant | One dealership, one data set; dealership A cannot see dealership B; Admin has **zero** business data after opening stores and binding staff |
| DMS | Specification vehicle fields; VIN unique per dealership; sale fields as a pair; sold locks purchase fields |
| CRM | Name / Email / Phone / Home address; link an in-stock, unbound vehicle at this dealership; one vehicle, one customer |
| Ad check + TXT export | OMVIC fixed checklist + GitHub AI component; Ready + TXT only when Passed and not Stale |
| Audit | Every DMS/CRM change: who, what, when |
| Assistant | In-dealership read-only Q&A; same AI component; no database writes |
| Four repos | `dealer-web` / `dealer-gateway` / `dealer-core` / `ai-service` (plus `dealer-platform` for IaC) |
| Entra | OAuth/OIDC + PKCE + JWT; roles only `Platform.Admin` / `Dealer.User`; bind `entra_oid`→dealership |
| Gateway | Browser traffic only through Gateway; direct core / ai-service access must fail |
| Real AI | `ai-service` embeds the GitHub component in-process; failure must not display Pass |

Classroom demo: two dealerships and two staff isolated; Admin hitting vehicle APIs is rejected; missing price / finance missing APR → Blocked; one real ad through a real model; after a price change the old check cannot be exported.

## Out of Scope (do not write back into scope)

Work Orders · Leads / follow-up · buyer site / public inventory / visitor inquiry · OEM portal · KPI dashboards · CSV import · Service Bus / outbox / DLQ / second database / vector store · third-party auto-listing · payments · Image Studio · custom model SDK · homemade username/password · C# / standalone contracts repo · mileage / color / fuel and other fields outside the specification.

## Cuts versus the proposal / `01`–`06`

The following appeared in early proposals or superseded drafts `design/01`–`06`. **\*superseded, not for grading.** Do not implement, demo, or grade.

| Proposal / `01`–`06` had | v6 does not do / does instead |
|---|---|
| Visitor buyer site, public ad pages, inquiry form | No buyer site |
| Staff / Manager; password-hash login | Entra; Admin / Dealer.User |
| Recon work orders, sale-ready gates, archive | No work orders; stock is only IN_STOCK / SOLD |
| Lead funnel, follow-up, deal transactions, sales page | CRM four fields + vehicle link; DMS paired sale |
| Dashboard / KPI | No KPI home page |
| In-app Publish / Unpublish to visitor pages | **Ready + export TXT** (not an external site, not an in-app buyer page) |
| stock #, mileage, color, list price/fees, preset images | Specification PDF fields only |
| Single store, no row-level isolation | **Multi-tenant** (specification requires all three modules in the same dealership) |
| Single repo / password session | Four repos + Gateway + Entra |
| Async domain events / queues (easy to expand in the proposal) | Sync REST + single database; no Service Bus |

Already deferred in the proposal and still out of this version: Image Studio, OCR, VIN decode, third-party ad sync, payments/contracts, SMS/email, vector store and model training.

## Specification errata (PPT / v6 win)

1. **Auth = Entra** (not the specification username/password).  
2. **Add Assistant as specification section 7** (the specification has no such page; PPT requires a real-AI core feature → in-dealership read-only assistant).  
3. **publish = Ready + TXT export** (not external publishing, and not listing on a buyer site).

## Signature / email confirmation

Confirm: the tables above are this course’s grading and demo scope; work orders, leads, buyer site, and Service Bus are **not** in scope. Team member names are still missing; assign by role for now.

| Role | Name (still missing; leave blank) | Repo focus |
|---|---|---|
| A | ________________ | `dealer-web` (6 pages) |
| B | ________________ | `ai-service` + platform first draft |
| C | ________________ | `dealer-gateway` + `dealer-core` |

| | Name / signature | Date |
|---|---|---|
| Instructor | ________________ | __________ |
| Client | ________________ | __________ |

**Email confirmation is also acceptable.** Reply with this file path `design/SCOPE-BASELINE.md` and write: *I confirm the approved scope on this page.* Enter the email date in the table above; paper is not required.
