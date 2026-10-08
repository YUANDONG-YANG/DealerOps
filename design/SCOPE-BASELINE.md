# Dealer Ops approved scope (one page)

Version 1.0 · 2026-09-21 · for Instructor / Client **signature or email confirmation**  
Conflict order (read-only): **PPT hard requirements > specification PDF fields > v6 design > UI 12**. `01`–`06` and earlier proposals **are not grading criteria**.

## Approved-scope formula

**Specification PDF fields** (DMS / CRM / Ad: do not add or remove)  
**+ PPT six hard requirements** (four repos and four pipelines; Gateway; Azure+Docker+Bicep+CI/CD; JWT+RBAC+HTTPS+Key Vault (sign-in per errata 1); real AI; Scrum board and three all-hands Reviews)  
**+ v6 five pages** (Login / Admin / DMS / CRM / Ad compliance) **+ floating Assistant widget on staff pages**  
**− v6 out-of-scope list** (see Out of Scope).  
Scope changes require a re-sign of this page or email confirmation.

## In Scope (this course delivery)

| Item | One sentence |
|---|---|
| Multi-tenant | One dealership, one data set; dealership A cannot see dealership B; Admin has **zero** business data after opening stores and binding staff |
| DMS | Specification vehicle fields; VIN unique per dealership; sale fields as a pair; sold locks purchase fields |
| CRM | Name / Email / Phone / Home address; link an unbound vehicle at this dealership (in stock or sold; sold links cannot be removed); one vehicle, one customer |
| Ad check + TXT export | OMVIC fixed checklist + GitHub AI component; Ready + TXT only when Passed and not Stale |
| Audit | Every DMS/CRM change: who, what, when |
| Assistant | In-dealership read-only Q&A; same AI component; no database writes |
| Four repos | `dealer-web` / `dealer-gateway` / `dealer-core` / `ai-service` (plus `dealer-platform` for IaC) |
| Auth | Admin-issued username/password per dealer user (client spec; errata 1); JWT roles only `Platform.Admin` / `Dealer.User`; bind `app_user`→dealership. See [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8 |
| Gateway | Browser traffic only through Gateway; direct core / ai-service access must fail |
| Real AI | `ai-service` embeds the GitHub component in-process; failure must not display Pass |

Classroom demo: two dealerships and two staff isolated; Admin hitting vehicle APIs is rejected; missing price / finance missing APR → Blocked; one real ad through a real model; after a price change the old check cannot be exported.

## Out of Scope (do not write back into scope)

Work Orders · Leads / follow-up · buyer site / public inventory / visitor inquiry · OEM portal · KPI dashboards · CSV import · Service Bus / outbox / DLQ / second database / vector store · third-party auto-listing · payments · Image Studio · custom model SDK · C# / standalone contracts repo · mileage / color / fuel and other fields outside the specification. Username/password auth is **no longer** out of scope — see errata item 1.

### Explicitly out of scope (do not design these features)

This course build does **not** include:

- Per-user or per-dealer rate limits / quotas on `/assistant/ask` and listing checks (classroom demo; Azure spend is watched manually).
- Throughput / concurrency SLOs and CRUD latency budgets (only the existing **15s AI timeout** budget applies).
- PIPEDA retention schedules or field-level masking beyond keeping platform encryption on and **not** putting phone / email / address into AI prompts, audit `fieldSummary`, or assistant cards (already required elsewhere — not a new privacy program).
- API v2 / compatibility policy (only `/api/v1` exists for this course).
- A full observability schema (Application Insights may appear in architecture docs; no new log-field specification here).

## Cuts versus the proposal / `01`–`06`

The following appeared in early proposals or superseded drafts now under [archive/](archive/) (`01`–`06`). **\*superseded, not for grading.** Do not implement, demo, or grade.

| Proposal / `01`–`06` had | v6 does not do / does instead |
|---|---|
| Visitor buyer site, public ad pages, inquiry form | No buyer site |
| Staff / Manager roles | Admin / Dealer.User only |
| Recon work orders, sale-ready gates, archive | No work orders; stock is only IN_STOCK / SOLD |
| Lead funnel, follow-up, deal transactions, sales page | CRM four fields + vehicle link; DMS paired sale |
| Dashboard / KPI | No KPI home page |
| In-app Publish / Unpublish to visitor pages | **Ready + export TXT** (not an external site, not an in-app buyer page) |
| stock #, mileage, color, list price/fees, preset images | Specification PDF fields only |
| Single store, no row-level isolation | **Multi-tenant** (specification requires all three modules in the same dealership) |
| Single repo / server-side session | Four repos + Gateway + JWT |
| Async domain events / queues (easy to expand in the proposal) | Sync REST + single database; no Service Bus |

Already deferred in the proposal and still out of this version: Image Studio, OCR, VIN decode, third-party ad sync, payments/contracts, SMS/email, vector store and model training.

## Specification errata (PPT / v6 win)

1. **Auth = admin-issued username/password** per dealer user, as the client specification requires (PDF §2, §8); decided 2026-09-30. This point does not follow the "PPT hard requirements > specification PDF" conflict order stated above; every other PPT hard requirement (four repos/pipelines, Gateway, Azure+infrastructure as code+CI/CD, real AI, Scrum board) is unaffected by *this* item; the container and Bicep wording is reversed separately in item 5. See [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8 for the design. KAN-5 (client/instructor sign-off) is still open, so this scope is not yet formally re-confirmed in writing.  
2. **Add Assistant as specification section 7** (the specification has no such page; PPT requires a real-AI core feature → in-dealership read-only assistant).  
3. **publish = Ready + TXT export** (not external publishing, and not listing on a buyer site).  
4. **Some OMVIC disclosures are review hints, not blockers** (year, new/used, warranty terms, prior use, finance term, lease term/payment/down). See [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) §C.0a.
5. ~~**Containerization** (NN-05: Docker images for the four apps, pushed to a registry, run as Container Apps).~~ **Dropped (2026-10-07):** the developer chose **Terraform + Azure App Service**, so there is no Dockerfile, Compose file, container registry, or container host in this project. The three Java services deploy as Spring Boot JARs to App Service and the SPA as static files to Static Web Apps. Rationale and the trade-offs accepted: [deploy/publish-options.md](../deploy/publish-options.md).

   **What is *not* affected.** NN-06 names "Bicep/Terraform/ARM", so `deploy/terraform` satisfies infrastructure as code on its own terms — that requirement is met, not reversed. NN-04 (live public cloud), NN-07 (CI/CD), and NN-08–11 (JWT/RBAC, HTTPS, Key Vault, no plaintext secrets) are unaffected. **NN-05 is the single item given up.** Like item 1, this is a developer decision and is **not yet re-signed**; raise NN-05 with the instructor if containerization is graded on its own.

## Signature / email confirmation

Confirm: the tables above are this course’s grading and demo scope; work orders, leads, buyer site, and Service Bus are **not** in scope. The team roster is [TEAM.md](TEAM.md).

| Role | Name | Repo focus |
|---|---|---|
| A | Bedgel Fadhil Ndam Woukouo | `dealer-web` (5 pages + floating assistant) |
| B | Jackson Warga | `ai-service` + platform first draft |
| C | Logan Jones | `dealer-gateway` + `dealer-core` |
| Lead | Yuandong Yang (Robin) | Full stack across all repositories, Terraform and release |

| | Name / signature | Date |
|---|---|---|
| Instructor | ________________ | __________ |
| Client | ________________ | __________ |

**Email confirmation is also acceptable.** Reply with this file path `design/SCOPE-BASELINE.md` and write: *I confirm the approved scope on this page.* Enter the email date in the table above; paper is not required.
