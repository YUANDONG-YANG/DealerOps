# Dealer Ops approved scope (one page)

Version 1.0 · 2026-09-21 · for Instructor / Client **signature or email confirmation**  
Conflict order (read-only): **PPT hard requirements > specification PDF fields > v6 design > UI 12**. `01`–`06` and earlier proposals **are not grading criteria**.

## Approved-scope formula

**Specification PDF fields** (DMS / CRM / Ad: do not add or remove)  
**+ PPT six hard requirements** (four repos and four pipelines; Gateway; Azure + IaC + CI/CD, with Docker dropped and Terraform as the IaC per errata 5; JWT+RBAC+HTTPS+Key Vault (sign-in per errata 1); real AI; Scrum board and three all-hands Reviews)  
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
| Four repos | `dealer-web` / `dealer-gateway` / `dealer-core` / `ai-service` (plus `dealer-platform` for the shared contract and config; IaC is `deploy/terraform`) |
| Auth | Password per account; sign in with email, username, or phone; no social sign-in; username is also the key for memberships and the JWT subject; JWT roles only `Platform.Admin` / `Dealer.User`; bind `app_user`→dealership. See [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8 |
| Gateway | Browser traffic only through Gateway; direct core / ai-service access must fail |
| Real AI | `ai-service` embeds the GitHub component in-process; failure must not display Pass |

Classroom demo: two dealerships and two staff isolated; Admin hitting vehicle APIs is rejected; missing price / finance missing APR → Blocked; one real ad through a real model; after a price change the old check cannot be exported.

## Out of Scope (do not write back into scope)

Garage / service billing · buyer site / public inventory / visitor inquiry · OEM portal · KPI dashboards · CSV import · Service Bus / outbox / DLQ / second database / vector store · third-party auto-listing · payments · custom model SDK · standalone contracts repo · mileage / colour / fuel / stock number / list price and other fields outside the specification. Password auth is **no longer** out of scope — see errata item 1. Reconditioning work orders, lead follow-up, VIN decode, and email/phone self sign-up are feature extensions — see errata item 7. Vehicle `bodyType` is the one stored field outside the specification field list, as an optional field — see errata item 8.

> C# was listed here while the stack was Java. It is no longer out of scope: the active backend **is** .NET 10 / ASP.NET Core, per [TECHNOLOGY-STACK.md](TECHNOLOGY-STACK.md). The client notes state C# as the preferred language.

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
| Recon work orders, sale-ready gates, archive | No sale-ready gates or archive; stock is only IN_STOCK / SOLD. Reconditioning work orders returned as an extension (errata 7) |
| Lead funnel, follow-up, deal transactions, sales page | CRM four fields + vehicle link; DMS paired sale. Lead follow-up returned as an extension (errata 7); no funnel reports or deal transactions |
| Dashboard / KPI | No KPI home page |
| In-app Publish / Unpublish to visitor pages | **Ready + export TXT** (not an external site, not an in-app buyer page) |
| stock #, mileage, color, list price/fees, preset images | Specification PDF fields only |
| Single store, no row-level isolation | **Multi-tenant** (specification requires all three modules in the same dealership) |
| Single repo / server-side session | Four repos + Gateway + JWT |
| Async domain events / queues (easy to expand in the proposal) | Sync REST + single database; no Service Bus |

Already deferred in the proposal and still out of this version: OCR, third-party ad sync, payments/contracts, SMS/email, vector store and model training.

## Specification errata (PPT / v6 win)

1. **Auth = password, with email, username, or phone as the sign-in name**; the user chose this on 2026-10-08. Accounts register with a username plus an email and/or phone. Password hashing and admin-controlled dealership binding remain; the username also keys membership, audit, and the JWT subject. Entra ID and every social provider other than Google stay out of scope; **Google ID-token sign-in was added 2026-10-15 as AUTH-23** (see [21-Feature-Extensions.md](21-Feature-Extensions.md) §6), which grants no role and no dealership, so an admin still binds the account. See [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8. KAN-5 (client/instructor sign-off) is still open, so this scope is not yet formally re-confirmed in writing.
2. **Add Assistant as specification section 7** (the specification has no such page; PPT requires a real-AI core feature → in-dealership read-only assistant).  
3. **publish = Ready + TXT export** (not external publishing, and not listing on a buyer site).  
4. **Some OMVIC disclosures are review hints, not blockers** (year, new/used, warranty terms, prior use, finance term, lease term/payment/down). See [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) §C.0a.
5. ~~**Containerization** (NN-05: Docker images for the four apps, pushed to a registry, run as Container Apps).~~ **Dropped (2026-10-07):** the developer chose **Terraform + Azure App Service**, so there is no Dockerfile, Compose file, container registry, or container host in this project. The three .NET services deploy as .NET 10 app artifacts to App Service and the React SPA as static files to Static Web Apps. Rationale and the trade-offs accepted: [deploy/publish-options.md](../deploy/publish-options.md).

   **What is *not* affected.** NN-06 names "Bicep/Terraform/ARM", so `deploy/terraform` satisfies infrastructure as code on its own terms — that requirement is met, not reversed. NN-04 (live public cloud), NN-07 (CI/CD), and NN-08–11 (JWT/RBAC, HTTPS, Key Vault, no plaintext secrets) are unaffected. **NN-05 is the single item given up.** Like item 1, this is a developer decision and is **not yet re-signed**; raise NN-05 with the instructor if containerization is graded on its own.
6. **Public landing page and VIN decode (added 2026-10-08).** Signed-out visitors at `/` see the product landing page, `Sign in`, `Create account`, and a public VIN decoder. The decoder and DMS Add vehicle form use dealer-core's vPIC proxy ([14](14-Backend-API-Contract.md) §4.6.1); it stores nothing. No inventory or buyer enquiry is exposed, so this is not the out-of-scope buyer site. Design: [13-Frontend-Engineering.md](13-Frontend-Engineering.md) §2. The requested implementation is complete; instructor scope confirmation remains administrative follow-up.
7. **Feature extensions from the client notes (added 2026-10-08).** `requirements/Dos Car dealership2.docx` raised five items. Per the user's explicit implementation direction, [21-Feature-Extensions.md](21-Feature-Extensions.md) records VIN decode, lead follow-up, reconditioning work orders without garage billing, local self-registration (username plus email and/or phone, password; sign in with any of them) with admin-bound access, and Image Studio with MySQL-backed photos and automatic enhancement. Google ID-token sign-in was added 2026-10-15 (AUTH-23, see item 1); no other social provider is in scope. The client notes' Firebase **database** stack is not adopted — MySQL remains the only application database and no Firestore or Realtime Database call exists — but Firebase **Auth** was adopted on 2026-10-16 as an additional sign-in path; see item 9. DealerOps uses .NET, React, and MySQL. The instructor scope signature remains a separate course-administration follow-up and does not block this implementation.

8. **Vehicle body type stored as an optional field (added 2026-10-16).** The vPIC decode returns a body class and the client notes list it among the values that seed a vehicle record, so `bodyType` is persisted and offered as a DMS list filter. It is **optional** on create and patch, defaulting to `OTHER`, which keeps the specification's eight required vehicle fields intact. It was briefly required; that made it a ninth required field outside the specification and has been reverted. Engine, country, and manufacturer from the decode stay display-only. See [21-Feature-Extensions.md](21-Feature-Extensions.md) VIN-03.

9. **Firebase Auth as an email/password sign-in path (landed 2026-10-16).** `POST /api/v1/auth/firebase` accepts a Firebase ID token and exchanges it for a DealerOps JWT; Firebase owns the password while DealerOps owns roles and dealership membership. Unverified emails are accepted (decided 2026-10-16; the earlier `email_verified=true` requirement blocked Firebase sign-up), but an existing email account is linked to a Firebase uid only when the email is verified. Platform administrators are refused. An unknown email creates an unbound `Dealer.User`, which gains no dealership access until bound (erratum 10). This uses Firebase Auth only; Firebase Database is not adopted. Three sign-in paths coexist: local password, Google ID token, and Firebase. The feature remains subject to client/instructor scope confirmation.

10. **Dealership members approve join requests (decided 2026-10-16).** An unbound account that asks to join a dealership appears in that dealership's `/team` queue (`/api/v1/dealer/join-requests`). Any active member of that dealership may approve it, which creates the membership, or reject it. This is the only way a dealer user grants access; dealer users still cannot create, edit or remove logins through the admin APIs, and the platform admin can still bind any account. Owned by design/21 `AUTH-25`.

## Signature / email confirmation

Confirm: the tables above are this course’s grading and demo scope; garage/service billing, sales funnel reports, buyer site, and Service Bus are **not** in scope; the errata 6–7 extensions are in scope. The team roster is [TEAM.md](TEAM.md).

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
