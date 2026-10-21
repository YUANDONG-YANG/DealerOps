# Dealer Ops delivery scope baseline

Version 1.1 · 2026-10-21 · academic demonstration delivery baseline
Conflict order (read-only): **PPT hard requirements > specification PDF fields > v6 design > UI 12**. `01`–`06` and earlier proposals **are not grading criteria**.

## Delivery baseline

**Customer specification PDF features** (fields, business rules, pages, security, hosting, and backup)
**+ customer DOCX features** (product workflows, VIN decode, landing page, Firebase/Google sign-in, and Image Studio)
**+ academic delivery requirements** (active .NET/React stack, Gateway, tenant security, Azure/IaC/CI, and real AI)
**+ derived capabilities needed to demonstrate the requested product**
The customer’s original PDF and DOCX feature requests are delivery goals. Do not defer a requested
feature solely because this is not a production business or because a real third-party account is
unavailable; use a clearly labeled simulation or local demonstration where practical. Record any
technical exclusion with its reason and a demonstrable alternative when possible.

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
| Auth | Password, Google, and Firebase sign-in; username is also the key for memberships and the JWT subject; JWT roles only `Platform.Admin` / `Dealer.User`; bind `app_user`→dealership. See [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8 |
| Gateway | Browser traffic only through Gateway; direct core / ai-service access must fail |
| Real AI | `ai-service` embeds the GitHub component in-process; failure must not display Pass |

Classroom demo: two dealerships and two staff isolated; Admin hitting vehicle APIs is rejected; missing price / finance missing APR → Blocked; one real ad through a real model; after a price change the old check cannot be exported.

## Delivery boundaries

Third-party production accounts, paid services, or authorization may be unavailable in an academic demo. Implement the requested workflow and use a clearly labeled simulation when live integration is technically inaccessible. Do not represent simulated activity as real. Keep the architecture within the active .NET 10, React, MySQL, and Gateway stack; do not revive retired Java or Vue implementations.

> C# was listed here while the stack was Java. It is no longer out of scope: the active backend **is** .NET 10 / ASP.NET Core, per [TECHNOLOGY-STACK.md](TECHNOLOGY-STACK.md). The client notes state C# as the preferred language.

### External integration limits

External actions requiring unavailable paid credentials or authorization must be represented honestly in demo mode. The requested workflow remains in scope. API compatibility beyond `/api/v1` and a full observability schema are not customer feature requests and are not required for this delivery.

## Historical proposal differences

The following appeared in early proposals or superseded drafts now under [archive/](archive/). This table records historical design differences only; it does not remove customer-requested functionality from the delivery baseline.

| Historical proposal item | Current delivery baseline |
|---|---|
| Visitor buyer site, public ad pages, inquiry form | Public landing page, plus the buyer site added 2026-10-21: `/shop` lists ready ads that pass the current check, and an inquiry files a `NEW` lead (design/21 SHOP-01–05) |
| Staff / Manager roles | JWT roles stay Admin / Dealer.User; since 2026-10-21 a dealership membership is `MANAGER` or `STAFF` (design/15 §2.5, design/21 AUTH-26–27): managers run the team, join requests, and the dealership profile, and only the admin changes a role |
| Recon work orders, sale-ready gates, archive | Vehicle work orders are in the delivery baseline; additional inventory states are not specified by the customer sources |
| Lead funnel, follow-up, deal transactions, sales page | Lead follow-up and current sales-funnel reporting are in the delivery baseline; transaction workflows beyond DMS sale and CRM linking require explicit source detail |
| Dashboard / KPI | Tenant-scoped `/dashboard` KPIs (DASH-01) and the sales report with stage history (CRM-16) and workshop settlement (WO-08); `/dms` remains the post-login page |
| In-app Publish / Unpublish to visitor pages | **Ready + export TXT** plus a simulated marketplace publish/unpublish workflow; no claim of external publication |
| stock #, mileage, color, list price/fees, preset images | Optional stock number, mileage, exterior colour, fuel type, and list price (DMS-18); the specification's required fields are unchanged; no fee fields |
| Single store, no row-level isolation | **Multi-tenant** (specification requires all three modules in the same dealership) |
| Single repo / server-side session | Four repos + Gateway + JWT |
| Async domain events / queues (easy to expand in the proposal) | Sync REST + single database; no Service Bus |

Where original customer sources mention capabilities that need unavailable external authorization or paid infrastructure, provide a demo mode where feasible and document precisely what is simulated. Do not mark customer-requested features Won’t solely to match the original small-MVP scope.

## Specification errata (PPT / v6 win)

1. **Auth = password, with email, username, or phone as the sign-in name**; the user chose this on 2026-10-08. Accounts register with a username plus an email and/or phone. Password hashing and admin-controlled dealership binding remain; the username also keys membership, audit, and the JWT subject. **Google ID-token sign-in was added 2026-10-15 as AUTH-23** (see [21-Feature-Extensions.md](21-Feature-Extensions.md) §6), which grants no role and no dealership, so an admin still binds the account. See [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8.
2. **Add Assistant as specification section 7** (the specification has no such page; PPT requires a real-AI core feature → in-dealership read-only assistant).
3. **publish = Ready + TXT export** for the original scope. AD-16's later capstone extension adds an explicitly simulated marketplace publish/unpublish flow; it does not claim or perform external publication.
4. **Some OMVIC disclosures are review hints, not blockers** (year, new/used, warranty terms, prior use, finance term, lease term/payment/down). See [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) §C.0a.
5. ~~**Containerization** (NN-05: Docker images for the four apps, pushed to a registry, run as Container Apps).~~ **Dropped (2026-10-07), hosting corrected 2026-10-19:** the developer chose **Terraform + Azure Linux App Service**, so there is no Dockerfile, Compose file, container registry, or container host in this project. The three .NET services deploy as .NET 10 app artifacts to Linux App Service. The React SPA is a Linux App Service as well: `pm2 serve` hosts the built `dist/` with SPA fallback (`deploy/terraform/main.tf`). It is not Azure Static Web Apps. Rationale and the trade-offs accepted: [deploy/publish-options.md](../deploy/publish-options.md).

   **What is *not* affected.** NN-06 names "Bicep/Terraform/ARM", so `deploy/terraform` satisfies infrastructure as code on its own terms — that requirement is met, not reversed. NN-04 (live public cloud), NN-07 (CI/CD), and NN-08–11 (JWT/RBAC, HTTPS, Key Vault, no plaintext secrets) are unaffected. **NN-05 is the containerization item changed for this project; Terraform and Azure App Service remain the deployment approach.**
6. **Public landing page and VIN decode (added 2026-10-08).** Signed-out visitors at `/` see the product landing page, `Sign in`, `Create account`, and a public VIN decoder. The decoder and DMS Add vehicle form use dealer-core's vPIC proxy ([14](14-Backend-API-Contract.md) §4.6.1); it stores nothing. No inventory or buyer enquiry is exposed, so this is not the out-of-scope buyer site. Design: [13-Frontend-Engineering.md](13-Frontend-Engineering.md) §2. The requested implementation is part of the academic demo delivery baseline.
7. **Feature extensions from the client notes (added 2026-10-08).** `requirements/Dos Car dealership2.docx` raised five items. Per the user's explicit implementation direction, [21-Feature-Extensions.md](21-Feature-Extensions.md) records VIN decode, lead follow-up, reconditioning work orders without garage billing, local self-registration (username plus email and/or phone, password; sign in with any of them) with admin-bound access, and Image Studio with MySQL-backed photos and automatic enhancement. Google ID-token sign-in was added 2026-10-15 (AUTH-23, see item 1); no other social provider is in scope. The client notes' Firebase **database** stack is not adopted — MySQL remains the only application database and no Firestore or Realtime Database call exists — but Firebase **Auth** was adopted on 2026-10-16 as an additional sign-in path; see item 9. DealerOps uses .NET, React, and MySQL. These features are part of the academic demo delivery baseline.

8. **Vehicle body type stored as an optional field (added 2026-10-16).** The vPIC decode returns a body class and the client notes list it among the values that seed a vehicle record, so `bodyType` is persisted and offered as a DMS list filter. It is **optional** on create and patch, defaulting to `OTHER`, which keeps the specification's eight required vehicle fields intact. It was briefly required; that made it a ninth required field outside the specification and has been reverted. Engine, country, and manufacturer from the decode stay display-only. See [21-Feature-Extensions.md](21-Feature-Extensions.md) VIN-03.

9. **Firebase Auth as an email/password sign-in path (landed 2026-10-16).** `POST /api/v1/auth/firebase` accepts a Firebase ID token and exchanges it for a DealerOps JWT; Firebase owns the password while DealerOps owns roles and dealership membership. Unverified emails are accepted (decided 2026-10-16; the earlier `email_verified=true` requirement blocked Firebase sign-up), but an existing email account is linked to a Firebase uid only when the email is verified. Platform administrators are refused. An unknown email creates an unbound `Dealer.User`, which gains no dealership access until bound (erratum 10). This uses Firebase Auth only; Firebase Database is not adopted. Three sign-in paths coexist: local password, Google ID token, and Firebase. This sign-in path is included in the academic demo delivery baseline.

10. **Dealership members approve join requests (decided 2026-10-16).** An unbound account that asks to join a dealership appears in that dealership's `/team` queue (`/api/v1/dealer/join-requests`). Any active member of that dealership may approve it, which creates the membership, or reject it. This is the only way a dealer user grants access; dealer users still cannot create, edit or remove logins through the admin APIs, and the platform admin can still bind any account. Owned by design/21 `AUTH-25`.

## Delivery scope history

On 2026-10-21, the user clarified that all reasonably implementable customer-source features are goals for the academic graduation demonstration. Earlier deferrals are superseded. Current adopted derived workflows include: DMS-17 and CRM-14 soft deletion, CRM-15 sales-funnel reporting, AD-15 global rule editor, AD-16 simulated marketplace publishing, and NFR-07 rate limits/SLO/retention. Do not label these features deferred or Won’t. Report any remaining limitation at the feature level.

The same day the earlier out-of-scope list was implemented where feasible ([21-Feature-Extensions.md](21-Feature-Extensions.md) §9): optional listing details (DMS-18), a payment ledger (PAY-01–04), a printable bill of sale (SALE-01), the `/dashboard` KPI page (DASH-01), lead stage history (CRM-16), workshop settlement (WO-08), a public `/disclaimer` page (AD-14), and the buyer site (SHOP-01–05). Not built, with reasons in design/21 §9: live marketplace publishing (needs partner API access and dealer credentials; AD-16 stays simulated), card payment processing (needs a merchant account), OCR (no vision model and no named document), and a message queue or second database (no requirement needs them).

| Role | Name | Repo focus |
|---|---|---|
| A | Bedgel Fadhil Ndam Woukouo | `dealer-web` (5 pages + floating assistant) |
| B | Jackson Warga | `ai-service` + platform first draft |
| C | Logan Jones | `dealer-gateway` + `dealer-core` |
| Lead | Yuandong Yang (Robin) | Full stack across all repositories, Terraform and release |
