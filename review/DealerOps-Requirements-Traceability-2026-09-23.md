# DealerOps Requirements Traceability Audit

**Audit date:** 2026-09-23 (re-audit; updates this file in place)  
**Method:** Inventory discrete requirements from source documents → check **design** coverage → verify **current code** (not design alone). Prior reviews are a baseline to re-verify, not truth.

## Requirement sources

| Source | Path | Role |
|---|---|---|
| Business specification | `requirements/DealerOps-Specification.pdf` (4 pages, 2026-09-21) | Fields, roles, OMVIC checklist, pages, audit, multi-tenancy |
| Course hard requirements | `tech-stack/Non-Negotiable-Project-Requirements.pptx` | Six PPT pillars (microservices, cloud, security, full scope, AI, PM) |
| Approved scope | `design/SCOPE-BASELINE.md` | In/out scope; errata (Entra, Assistant, Ready+TXT); deferred NFRs |
| Course ID matrix | `design/11-Requirements-Governance-and-Agile.md` | NN-01…NN-24 demo IDs |
| Design / API / rules | `design/IMPLEMENTATION-BRIEF.md`, `design/14-Backend-API-Contract.md`, `design/15-Data-Auth-and-Gateway.md`, `design/16-Acceptance-and-Test.md`, `design/18-Backend-Core-Engineering.md`, `design/AI-PROTOCOL-AND-RULES.md` (§C.0a severity), `design/AI-CODING-BACKEND.md`, `dealer-platform/API.md` / OpenAPI | Implementation contracts |

Conflict order (course): **PPT > specification PDF fields > design docs**. Spec username/password and “publish” wording are superseded by SCOPE errata (Entra; Ready + TXT export).

Withdrawn `design/01`–`06` (now under `design/archive/`) are **not** grading criteria.

---

## Summary counts

| Bucket | Count | Meaning |
|---|---:|---|
| **Total discrete requirements audited** | **78** | Spec + PPT/NN + SCOPE in-scope extras + documented deferred |
| **Fully implemented (design + code)** | **52** | Behavior exists in code and is designed |
| **Partial** | **10** | Scaffold / env-blocked / monorepo vs four remotes / soft severity per course ruling vs raw PDF wording |
| **Design-only** | **6** | Designed (Bicep, cloud demo, process board) — not live / not evidenced in repo runtime |
| **Missing (neither design nor code for an in-scope item)** | **0** | No accidental in-scope holes found |
| **Explicitly deferred / intentional course ruling** | **10** | Out of scope, known-limitation discussion, or PROTOCOL §C.0a deliberate soft/no-column choices |

**Read of the product vs the grader:** Core DMS/CRM/ad/pages/roles/audit/tenant isolation are **implemented**. Remaining risk is almost entirely **PPT delivery evidence** (live Azure, real AI key, four git remotes, Scrum artifacts) — not missing business screens.

---

## What changed vs the previous version of this review

| Prior claim (`review/DealerOps-Requirements-Traceability-2026-09-23.md` earlier draft) | Re-audit finding |
|---|---|
| G1 “Status used/new” **Missing** | **Wrong as a silent gap.** Design now pins course ruling in `AI-PROTOCOL-AND-RULES.md` §C.0a and `15-Data-Auth-and-Gateway.md` (no `advertisedAsNew` column; soft `YEAR_NEW_USED_CONTRADICTION` only). Code matches. Reclassified **deferred / intentional**. |
| G2 FINANCE “cash price / cost of borrowing” **Missing** | **Partially wrong.** Cash price → always-on hard `PRICE_MISSING` (PROTOCOL §C.0a). Cost of borrowing → **intentionally** no dedicated regex. Not an accidental omission. |
| G3–G5 loan term / warranty terms / lease upfront as **Partial** (should be hard) | **Severity is now an explicit course choice** (§C.0a): stay soft/`REVIEW`. Code matches design. Count as **implemented per course design**, not unfinished hard rules. |
| G6 prior-use missing **limo** keyword | **Outdated.** Current `OmvicRuleEngine.PRIOR_USE_CUE` includes `limo(?:usine)?`. Still soft when cue lacks disclosure (by design). |
| G7 severity model “design-level gap” | **Resolved in design.** §C.0a documents hard vs soft buckets. Remaining debate is product/legal, not “forgot to design.” |
| §1–§4, §6–§7 “fully implemented” | **Confirmed** with fresh code citations (entities, services, Vue routes). |
| Multi-tenancy / Hibernate filter | **Confirmed implemented** (`TenantFilters`, `@Filter` on five business entities, `TenantHibernateFilterBinder`, `TenantDealerListener`). Aligns with design-review item #12 being **done in code**. `audit_event` correctly **excluded** (nullable `dealer_id`). |
| Design review #10 “only manual dealerId” | **Superseded** by Hibernate filter + existing `findByIdAndDealerId` / `TenantGuard`. |

Also note: `IMPLEMENTATION-BRIEF.md` §12 still lists env blockers (Azure subscription, Entra permissions, model key) as **Missing** — those remain **course/PPT gaps**, not missing Java classes.

---

## Full traceability

Legend for **Code status**: `implemented` · `partial` · `design-only` · `missing` · `deferred` (explicit out-of-scope or intentional ruling).

### A. Specification PDF — Overview, roles, architecture

| ID | Statement | Design | Code | Gap |
|---|---|---|---|---|
| SPEC-01 | Multi-tenant web app for independent dealers | `SCOPE-BASELINE` In Scope; BRIEF §1 | Shared MySQL + `dealer_id` + tenant filter binder | — |
| SPEC-02 | Platform admin provisions dealers / credentials | BRIEF §2; 14 admin APIs | `AdminDealerController`, `AdminMemberController`, `DealerAdminService`, `MembershipService` | Credentials = Entra bind (errata), not passwords |
| SPEC-03 | Multiple staff share one dealer dataset | SCOPE; 15 §2 membership | `membership` table; same `tenantDealerId` | — |
| SPEC-04 | DMS + CRM + Ad share one backend store | SCOPE; 07; BRIEF §4 | Single `dealer-core` + `V1__init.sql` | — |
| SPEC-05 | Admin cannot view/edit dealer DMS/CRM/ad | SCOPE; 15; 16 | `TenantGuard.requireDealerUser()` on business services; Admin → 403 | — |
| SPEC-06 | Dealer user R/W own data only; cannot manage logins | SCOPE; 15 | Services + Admin gated by `requireAdmin()` | — |
| SPEC-07 | Username/password per user | **Errata:** Entra wins (`SCOPE-BASELINE` Specification errata) | `LoginView.vue` MSAL only; JWT security on gateway/core | Deferred raw-spec auth; **Entra implemented** |
| SPEC-29 | Shared backend, not three apps | 07; BRIEF | `dealer-core` only business DB | — |
| SPEC-30 | One dealer, many logins, admin no business visibility | SCOPE; 15; 18 tenantFilter | Filter + role guards | — |

### B. DMS fields and rules

| ID | Statement | Design | Code | Gap |
|---|---|---|---|---|
| SPEC-08 | Required: make, model, year, VIN, source, purchase cost, date added, condition (Certified/As-is/Unfit/Irreparable) | BRIEF §3; 14 | `VehicleEntity`, `ConditionCode`, `VehicleSource`, `V1__init.sql` NOT NULL columns; `VehicleController`/`VehicleService` | — |
| SPEC-09 | Optional: repair cost, Carfax link, sold date, sold price | BRIEF §3 | Nullable columns + DTOs | — |
| SCOPE-DMS-01 | VIN unique per dealership | BRIEF; 15 | `uk_vehicle_vin`; `VIN_DUP` | — |
| SCOPE-DMS-02 | Sold date + sold price as a pair | BRIEF; 14 | `SOLD_PAIR_REQUIRED` in `VehicleService.sell` | — |
| SCOPE-DMS-03 | Sold locks purchase fields | BRIEF; 14 | `SOLD_LOCKED` on patch | — |

### C. CRM fields and linking

| ID | Statement | Design | Code | Gap |
|---|---|---|---|---|
| SPEC-10 | Required: name, email, phone, home address | BRIEF §3 | `CustomerEntity` NOT NULL; create/patch validation | — |
| SPEC-11 | Link purchases to that dealer’s DMS vehicles | BRIEF; 14 unlink/link rules | `CustomerVehicleController` PUT/DELETE; `CustomerService`; `CrmView.vue` | — |
| SCOPE-CRM-01 | One vehicle → one customer; link an unbound same-store vehicle, IN_STOCK or SOLD (A3 correction, 2026-09-28) | 15; 14 | `uk_cv_vehicle`; duplicate link → `VEHICLE_ALREADY_LINKED`; cross-store → 404; sold unlink → `SOLD_LOCKED` | — |

### D. Ad compliance (OMVIC checklist)

Course severity is pinned in **`AI-PROTOCOL-AND-RULES.md` §C.0a** and mirrored in **`15-Data-Auth-and-Gateway.md`**. Engine: `OmvicRuleEngine.java`. Flow: `ComplianceCheckService` → optional `AiGatewayClient` → Ready/Export in `ListingService` + `AdsView.vue`.

| ID | Statement | Design | Code | Gap |
|---|---|---|---|---|
| SPEC-12 | Dealer registered name + contact | §C.1 hard/soft contact rules | Hard `DEALER_NAME_MISSING` / `DEALER_CONTACT_MISSING`; soft incomplete | — |
| SPEC-13 | Previous-use disclosure if applicable | §C.0a soft; limo included | Soft `PRIOR_USE_UNCLEAR`; cue includes limo | Not a hard publish gate (intentional) |
| SPEC-14 | Status used/new and year | §C.0a: no used/new column; year soft; contradiction soft | `YEAR_NOT_IN_COPY`, `YEAR_NEW_USED_CONTRADICTION` | **Deferred** separate used/new field |
| SPEC-15 | Extended warranty terms if offered | §C.0a soft boast → AI | Soft `WARRANTY_CLAIM_NEEDS_REVIEW` (detects claim, does not parse terms text) | Intentional soft; no terms-parser |
| SPEC-16 | Price | Hard `PRICE_MISSING` | Hard price regex | — |
| SPEC-17 | Vehicle condition | Hard mismatch/undisclosed; soft certified omission | Condition rules in engine | — |
| SPEC-18 | Finance APR (prominent) | Hard APR; soft proximity ONLINE | `FINANCE_APR_MISSING` hard; `FINANCE_APR_PROXIMITY` soft | Layout “prominence” is soft by design |
| SPEC-19 | Finance loan term | Soft per §C.0a | Soft `FINANCE_TERM_MISSING` | Intentional soft |
| SPEC-20 | Finance cash price / cost of borrowing | Cash = `PRICE_MISSING`; cost of borrowing **no regex** (§C.0a) | Price hard; no `COST_OF_BORROWING_*` | **Deferred** dedicated cost-of-borrowing rule |
| SPEC-21 | Radio/TV/billboard exempt from rate-alongside display | BRIEF; §C.1 | `AdMedium.RADIO_TV_BILLBOARD` skips proximity soft | — |
| SPEC-22 | Lease: state it is a lease | Hard | `LEASE_STATEMENT_MISSING` | — |
| SPEC-23 | Lease term | Soft | `LEASE_TERM_MISSING` | Intentional soft |
| SPEC-24 | Lease payment amount | Soft rent | `LEASE_RENT_MISSING` | Intentional soft |
| SPEC-25 | Lease APR | Hard | `LEASE_APR_MISSING` | — |
| SPEC-26 | Lease upfront payment | Soft | `LEASE_DOWN_MISSING` | Intentional soft |
| SPEC-27 | Excess-km if allowance &lt; 20,000 | Hard when km captured &lt; 20k | `LEASE_EXCESS_KM_MISSING`; allowance soft if unstated | — |
| SCOPE-AD-01 | Ready + TXT only when Passed and not Stale | SCOPE errata; BRIEF; 14 | `ListingService.assertExportable`; `AdsView` Mark ready / Export TXT | — |
| SCOPE-AD-02 | contentVersion invalidation on listing/condition change | BRIEF; 15 | `ListingService.patch` ++; `VehicleService` on condition change | — |
| SCOPE-AD-03 | Hard block skips AI; AI fail ≠ Pass | PROTOCOL; 17 fixtures | `ComplianceCheckService`; `AI_UNAVAILABLE` / Ready blocked | — |

### E. Cross-cutting + pages

| ID | Statement | Design | Code | Gap |
|---|---|---|---|---|
| SPEC-28 | Audit trail: user, action, timestamp on DMS/CRM changes | BRIEF §3 audit; 14 GET `/audit` | `AuditService` + calls from `VehicleService` / `CustomerService`; `audit_event` | — |
| SPEC-31 | Login page (public) | 00; 13; BRIEF §2 | `LoginView.vue`; router `/login` | — |
| SPEC-32 | DMS page | same | `DmsView.vue` `/dms` | — |
| SPEC-33 | CRM page | same | `CrmView.vue` `/crm` | — |
| SPEC-34 | Ad compliance page | same | `AdsView.vue` `/ads` | — |
| SPEC-35 | Admin page | same | `AdminView.vue` `/admin` | — |
| SCOPE-UI-01 | Assistant page (PPT real-AI feature) | SCOPE errata; 10; BRIEF | `AssistantView.vue` `/assistant`; `AssistantController`/`AssistantService` | — |
| SPEC-36 | Known limitation: plain passwords (discussion) | Errata → Entra | N/A | **Deferred** as build req |
| SPEC-37 | Rules updatable without code change (discussion) | Spec §8; not SCOPE in-scope | Hardcoded `OmvicRuleEngine` | **Deferred** (discussion only) |
| SPEC-38 | Real hosting vs artifact host | PPT cloud; SCOPE | Local compose + Bicep draft | See NN cloud rows |

### F. PPT / NN hard requirements

| ID | Statement | Design | Code / evidence | Gap |
|---|---|---|---|---|
| NN-01 | Separate deployable services; **own repo & pipeline** each | 07; BRIEF; 08; workflows note “if later splits remotes” | Four apps + Dockerfiles; `.github/workflows/dealer-*.yml` path-filtered **inside one git tree** | **Partial** — monorepo vs PPT “own repository” |
| NN-02 | API Gateway for traffic | 07; 15; 19 | `dealer-gateway` routes `/api/v1/**` → core; `/internal/v1/**` header-gated → AI | — |
| NN-03 | Architecture diagram | 07 mermaid | Doc present; no separate image asset | **Implemented** as design artifact (present for Review 1) |
| NN-04 | Live public-cloud deployment | 07; LOCAL-AND-CLOUD; BRIEF §12 Azure **Missing** | `dealer-platform/infra/main.bicep` exists; **not deployed** from this repo | **Design-only** / blocked on subscription |
| NN-05 | Containerization | 07; Dockerfiles | Dockerfiles for web/gateway/core/ai; compose | Images buildable; cloud run **partial** until Azure |
| NN-06 | IaC (Bicep/Terraform/ARM) | 07; `main.bicep` | Bicep with ACR, Container Apps, MySQL, Key Vault, App Insights | Template only until deploy |
| NN-07 | CI/CD automated | LOCAL-AND-CLOUD §7 | GitHub Actions per app; image push steps largely commented | **Partial** — compile/test yes; production deploy not wired |
| NN-08 | OAuth2 / JWT / Azure AD only | SCOPE; 15 | MSAL SPA; gateway/core JWT (`JWT_MODE=entra`/`dev`) | Classroom Entra app registration still an env blocker |
| NN-09 | HTTPS / encryption in transit & at rest | 15 §13; SCOPE out-of-scope PIPEDA extras | Designed for Azure HTTPS; local HTTP OK for Sprint 1 | **Partial** until live Azure HTTPS |
| NN-10 | No hardcoded secrets; Key Vault | 15; Bicep Key Vault secrets | Env vars + Bicep `@secure()`; default local tokens in yaml for dev | Live Key Vault **design-only** until deploy |
| NN-11 | RBAC on features/endpoints | 15; 14 | Roles `Platform.Admin` / `Dealer.User`; router + `TenantGuard` | — |
| NN-12 | Full approved scope delivered | SCOPE; 16 | Business features largely coded | Cloud/AI live demo still open |
| NN-13 | Traceable requirements | 11; this review | Design matrix + this audit | Process ongoing |
| NN-14 | Scope changes need written approval | SCOPE signature block | Process | **Deferred** to human process |
| NN-15 | Client validation; critical tests | 16; AI-CODING-TESTS | Unit/IT/e2e present in repo; client sign-off external | **Partial** (tests exist; client validation is process) |
| NN-16 | Functional AI as core feature (not stub) | 09; 19; PROTOCOL | Adapters + prompts; **stub profile** for CI (`-Pstub`); real JAR + `AIMANAGER_API_KEY` required for Sprint 2 | **Partial** |
| NN-17 | Production-grade model endpoint | BRIEF; README ai-service | Designed for OpenAI/etc. via ai-manager | Depends on key + non-stub build |
| NN-18 | Document model/prompts/fallback | PROTOCOL §B; 09 | Documented; `SystemPrompts.java` | — |
| NN-19–24 | Scrum board, every member presents, weekly paragraphs, client minutes | `11-Requirements-Governance-and-Agile.md` | Process; not application code | **Design-only** (course evidence outside product binary) |

### G. Explicitly out of scope (do not count as accidental gaps)

From `SCOPE-BASELINE.md` Out of Scope / deferred NFRs:

| ID | Item | Status |
|---|---|---|
| OOS-01 | Work orders, leads, buyer site, OEM, KPI, CSV import, Service Bus/outbox/DLQ, second DB, vector store, third-party listing, payments, Image Studio, homemade password auth, extra fields (mileage/color/fuel), … | **Deferred** |
| OOS-02 | Per-user/dealer rate limits on assistant/checks | **Deferred** |
| OOS-03 | Throughput/latency SLOs beyond 15s AI timeout | **Deferred** |
| OOS-04 | Full PIPEDA program / field masking beyond existing AI/audit rules | **Deferred** |
| OOS-05 | API v2 compatibility policy | **Deferred** |
| OOS-06 | Full observability schema | **Deferred** |

---

## Prioritized gap list (still not done in **runtime/delivery**, even if designed)

1. **NN-04 / SPEC-38** — Live Azure demo environment (subscription + deploy). Bicep ready; BRIEF marks subscription **Missing**.
2. **NN-16 / NN-17** — Real AI path end-to-end with non-stub `aimanager` + live `AIMANAGER_API_KEY` (CI currently builds with stub profile).
3. **NN-07 image/deploy** — Pipeline image push / ACA deploy still placeholder comments.
4. **NN-01** — Split (or prove) four independent git remotes if graders enforce “own repository” literally; today path-filtered monorepo CI.
5. **NN-08 env** — Classroom Entra app registration / roles / demo accounts (code ready; [design/PREP-CHECKLIST.md](../design/PREP-CHECKLIST.md) Missing).
6. **NN-19–24** — Scrum board + Review speaking evidence + client minutes (process, not code).
7. **SPEC-20 residual** — No dedicated “cost of borrowing” finding (only if instructor rejects §C.0a ruling).
8. **SPEC-14 residual** — No explicit used/new disclosure field (only if instructor rejects §C.0a).

**Not recommended as “bugs” without instructor sign-off:** promoting soft OMVIC items (term, down payment, prior-use, warranty) to hard `BLOCK` — contradicts PROTOCOL §C.0a.

---

## Design coverage notes

| Area | Covered in | Caveat |
|---|---|---|
| Tenant Hibernate filter | **18** § tenantFilter; entity comments | **15** describes membership/`dealer_id` authority but does not fully restated the Hibernate `@Filter` mechanism (18 is the code-facing home) |
| OMVIC severity vs raw PDF | **PROTOCOL §C.0a**, **15** comments near rule sketches | Prior audit treated soft rules as defects; design now explicit |
| Public HTTP | **14** + `dealer-platform/openapi.yaml` / `API.md` | Prefer OpenAPI + 14 over archived 04 |
| Acceptance | **16** + **17** fixtures | Do not change contracts |

---

## Code citation index (high-signal)

| Concern | Primary citations |
|---|---|
| OMVIC engine | `dealer-core/.../compliance/OmvicRuleEngine.java` |
| Check orchestration | `dealer-core/.../compliance/ComplianceCheckService.java` |
| Ready / export / stale | `dealer-core/.../listing/ListingService.java` |
| Tenant filter | `.../common/tenant/TenantFilters.java`, `TenantHibernateFilterBinder.java`, `TenantDealerListener.java`; entities `VehicleEntity`, `CustomerEntity`, `CustomerVehicleEntity`, `ListingEntity`, `ComplianceCheckEntity` |
| Audit entity (no filter) | `dealer-core/.../audit/AuditEventEntity.java` |
| Roles / pages | `dealer-web/src/router/index.ts`; views under `dealer-web/src/views/` |
| Gateway | `dealer-gateway/src/main/resources/application.yaml` |
| AI adapter | `ai-service/.../adapter/adcheck/AdCheckAdapter.java`, `assistant/AssistantAdapter.java`; stub vs real in `ai-service/pom.xml` / README |
| IaC / Key Vault | `dealer-platform/infra/main.bicep` |
| Schema | `dealer-core/src/main/resources/db/migration/V1__init.sql` |

---

## Bottom line

- **Business specification (§1–§4, §6–§7 pages, core OMVIC hard gates):** covered in **design and code**.
- **OMVIC soft items and used/new / cost-of-borrowing:** not “forgotten”; they are **course-documented intentional rulings** (§C.0a). Reclassify prior G1–G7 accordingly.
- **True remaining gaps for a passing PPT demo:** **live Azure**, **real AI credentials/build**, **CI deploy wiring**, optional **repo split**, and **Scrum/process evidence** — not missing DMS/CRM screens.
