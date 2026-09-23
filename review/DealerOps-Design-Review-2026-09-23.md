# DealerOps Design Document Review

Scope: all ~30 documents under `design/` (README, docs 00–19, the AI-CODING-*/AI-PROTOCOL series, DEVELOPMENT-DESIGN, IMPLEMENTATION-BRIEF, SCOPE-BASELINE), cross-checked against actual repo state (git log, the four service directories dealer-core/dealer-gateway/ai-service/dealer-web).
Review date: 2026-09-23

## Overall impression

This is a "lean and highly convergent" design set for a capstone course: a clear scope boundary (no work orders/leads/buyer portal/message queue), letter-level field/enum/HTTP-code conventions, an executable regex rule engine, and 22 reproducible ad-compliance fixtures — maturity clearly above a typical student project. The biggest risk is not "the design isn't good enough" but the **maintainability of the document system itself**: evolution is managed by repeatedly restating a "conflict order" and "withdrawing" half a sentence of an older document from within a newer one, instead of editing the older document directly. This leaves multiple mutually contradictory passages coexisting in the same repo, and the core entry document (IMPLEMENTATION-BRIEF.md) has already drifted from actual code progress.

## Strengths

- **Strong scope discipline**: SCOPE-BASELINE.md locks In/Out scope and six hard course requirements onto a single page, with a line-by-line diff of "what proposal/01-06 had that v6 doesn't," preventing scope creep.
- **OMVIC compliance rules are testable and reproducible**: `AI-PROTOCOL-AND-RULES.md` §C gives copy-pasteable regex and state-machine pseudocode; 17-Ad-Check-Fixtures.md supplies fixtures such as FX-01/03/10/11/12 that trace back to rule output. Tests and rules share the same source, better quality than most course projects.
- **AI integration shows real security awareness**: the internal endpoint `/internal/v1/**` returns 404 to browsers, travels on a fixed `X-Dealer-Internal` header, and never forwards the user JWT; resource ids returned by the assistant are re-validated by core, and "invented ids are always discarded"; the system prompt explicitly forbids the model from emitting SQL/stack traces/secrets/phone-email-address, and from claiming to be "OMVIC approved/certified" — a reasonable defense against prompt injection and over-privileged information leakage.
- **Zero tolerance for "fake pass" in the state machine**: `FAILED`/`UNAVAILABLE` are explicitly forbidden from being rendered as Pass, and multiple places reiterate "do not reintroduce MOCK/INVALID_RESPONSE."
- **Timeout budgets line up precisely**: both core and ai-service use connect 2s + response 13s = 15s, avoiding the classic bug where one side times out while the other is still waiting.

## Findings

### Blocking / must-fix

**1. IMPLEMENTATION-BRIEF.md's description of repo state is stale, yet it is positioned as the "AI coding entry document"**
- Line 9 reads: "The current skeleton has only `dealer-core`... There is **not yet** a `dealer-web` / `dealer-gateway` / `ai-service` project."
- The actual latest commit `dda4b09` ("Land the Entra-ready local stack so SPA, gateway, core, and AI share Compose, CI, and tests...") and the repo directory listing show `dealer-web` (with dist/e2e), `dealer-gateway`, and `ai-service` already each have `src`/`pom.xml`/`Dockerfile`/`target`.
- **Impact**: Brief §11 "Coding order" still numbers tasks as if starting from an empty repo (task 2 "Empty projects"). If this stays the sole entry point for a coding agent, it will misdirect re-scaffolding or misjudge current progress.
- **Fix**: Refresh IMPLEMENTATION-BRIEF.md's repo-state description and §11 task table, marking which tasks are already done.

**2. A rule is "verbally withdrawn" across documents instead of edited at the source — the same rule exists in two contradictory forms in the repo**
- `AI-PROTOCOL-AND-RULES.md` §A.1 explicitly states "withdraw 15 §4... for cross-store ids" and notes "this document does not edit 18 itself; implement this document."
- But in practice: `15-Data-Auth-and-Gateway.md` line 165 still reads "Visible vehicle/customer but dealership mismatch" → 400 `WRONG_DEALER_OR_SOLD`; `18-Backend-Core-Engineering.md` line 279 still carries the same mapping.
- Both passages have already been ruled incorrect by the PROTOCOL document (cross-store ids should uniformly be 404), yet the literal text remains with no strikethrough/annotation. Anyone reading only 15 or 18 (a new team member, or a coding agent that only searches these two files) will get the wrong answer.
- **Fix**: Add strikethrough or a "⚠ withdrawn by PROTOCOL A.1" annotation directly on the affected lines in 15/18, instead of relying solely on another document's aside to negate them.

**3. AI-CODING-BACKEND.md's BE-T22 task body contains an already-deprecated response-shape draft, corrected only by a warning sentence**
- Line 1528: "**PROTOCOL wins this task's `{failed,reason}` / `{aiNotes,success}` / HTTP-503-only sketches.**...Do not rewrite the copy-paste below; do not ship it."
- The "copy-paste" code block immediately following in the task list is itself wrong, negated only by a natural-language reminder — easy for an executing agent to miss or misread which part to copy.
- **Fix**: Delete/replace the stale draft code block in the task body directly, rather than keeping wrong code plus a warning.

### Should-fix

**4. The "conflict order" statement is repeated across multiple documents with inconsistent ordering**
- `DEVELOPMENT-DESIGN.md`: `PPT > spec > this document + PROTOCOL > 14 / 15`
- `00-Current-Development-Design.md`: `PPT > specification fields > DEVELOPMENT-DESIGN / PROTOCOL > 14 / 15 > task lists`
- `14-Backend-API-Contract.md`: `PPT > spec > BRIEF/00 > 15(owns data) > 14(owns HTTP) > 13 > 12`
- `16-Acceptance-and-Test.md`: `PPT > spec > BRIEF/00 > 15 / 14 / 13 > this document`
- 14 and 16 place 15 ahead of 14 (explained as a division of labor: "15 owns data, 14 owns HTTP"), while 00 and DEVELOPMENT-DESIGN write it as "14 / 15" — easy to misread as a reversed priority order. It's really a division of labor, not a priority, but inconsistent phrasing raises parsing cost for new readers/agents.
- **Fix**: Define the conflict order as a single authoritative table in one place (e.g. README.md); have every other document link to it instead of re-wording its own version.

**5. Document volume doesn't fully match the course's "minimal delivery" positioning**
- AI-CODING-BACKEND.md, AI-PROTOCOL-AND-RULES.md, AI-CODING-FRONTEND.md, and doc 15 each exceed 20K characters individually; combined with a dozen-plus cross-referencing documents, the maintenance cost of the document set itself is already non-trivial for a three-person team across three sprints. Content quality is high, but "manually honoring a priority chain" has real error probability, somewhat at odds with the "don't expand scope" spirit SCOPE-BASELINE emphasizes.

**6. No rate-limiting/cost control — only a manual to-do, not a technical constraint**
- IMPLEMENTATION-BRIEF.md §12 lists "budget cap (MySQL + Container Apps bill continuously)" as a manual reminder, but the two endpoints that trigger paid model calls — `/assistant/ask` and `/listings/{id}/checks` — have no rate-limit/quota design anywhere (per-user or per-dealer) in the whole document set. Not a real problem for a classroom demo environment, but the design docs should at least state "no rate limiting for now, because..." — otherwise a reviewer is likely to flag it as a gap.

### Nice-to-have

**7.** The six "withdrawn" documents `01`–`06` remain fully present in the `design/` root, mixed in with the live documents. Although current documents repeatedly remind readers that "01–06 withdrawn, not for grading," keeping them in the same directory still raises the risk of accidental reference (especially when a coding agent reads the whole directory).

**8.** `dealer-platform/openapi.yaml` (1989 lines) and `14-Backend-API-Contract.md` (739 lines) differ substantially in size. Doc 00 notes "PROTOCOL wins if internal sketches conflict," but doesn't specify which paths in openapi.yaml count as "internal sketches" — recommend adding precise guidance at the top of 14 or openapi.yaml.

**9.** 07-Azure-Microservices-Architecture.md mentions "Application Insights" only once; there's no matching logging/observability field spec in 09/AI-PROTOCOL (e.g. whether AI call latency is logged, or how a correlation id propagates across gateway→core→ai-service). This would help debugging the 15s timeout path but is currently entirely blank.

## Document structure suggestions

- Move `01-Scope-and-Acceptance.md` through `06-Delivery-and-Test-Plan.md` into a `design/archive/` subdirectory (or rely on git history and delete them outright), out of the way of live documents; this also lets you drop the many scattered "01–06 withdrawn" reminders across other docs, cutting noise.
- Consolidate the "conflict order" into a single authoritative table in README.md; have every other document say "see README's conflict-order table" instead of restating it.
- Statements in 15/18 already withdrawn by PROTOCOL should be struck through or rewritten directly, instead of leaving the wrong text in place and negating it only via another document's aside.
- IMPLEMENTATION-BRIEF.md needs a version refresh (currently v1.6), aligning its repo-state table and §11 task table with what's actually been committed.

## Gaps

- **Missing NFRs**: no concurrency/throughput targets, no CRUD-endpoint latency budget (only the AI call's 15s), no rate-limit/quota design.
- **Missing observability**: Application Insights is mentioned exactly once; no logging field spec, no cross-service correlation-id propagation plan.
- **Missing data privacy/compliance coverage**: the `customer` table stores name/email/phone/address; as a Canadian used-car-dealer project this should at least mention PIPEDA-related retention limits/redaction policy — currently there's only a general "platform encryption left on is enough."
- **Missing API versioning strategy**: there's a `/api/v1` prefix but no stated compatibility strategy for a future v2 (a course project can legitimately declare "not needed," but right now it's simply blank rather than an explicit out-of-scope statement).
- **Frontend automated test strategy undocumented**: doc 16 only has "classroom demo scripts" manual scripts; dealer-web does have an `e2e` folder, but at the design-doc level there's no statement of what that e2e suite actually covers or whether it's wired into a CI gate.

---

## Addendum (2026-09-23, added: multi-tenancy implementation audit)

Reviewed `15-Data-Auth-and-Gateway.md` §2/§4/§7/§8 and `AI-PROTOCOL-AND-RULES.md` §A.1 specifically for "how is multi-tenancy actually implemented."

**Pattern confirmed**: a single MySQL database `dealer_core` + a `dealer_id` column on every business table + the application layer computing `tenantDealerId` per request (the chain JWT → `app_user` → `membership.active=1`, see 15 §2.1). This is not database-level RLS, not a database/schema-per-dealership split, and it never trusts a client-supplied `dealerId`. This is a reasonable choice at course-project scale, and 15 §2.1 already states "forbidden to use `app_user.dealer_id` as isolation key," showing the designers were already aware of that trap.

**10. (Should-fix) Multi-tenant isolation relies entirely on manual discipline, with no unified enforcement mechanism**
- Current isolation is: every Repository query method hand-writes its own `WHERE dealer_id = :tenantDealerId`. Nothing in the design docs mentions a unified `TenantContext` + a base Repository (or AOP/interceptor) that force-injects the `dealer_id` filter as a backstop.
- **Risk**: across a three-person team and multiple sprints, a single newly added query that forgets the `dealer_id` condition is a cross-dealership data leak — and this kind of omission is easy to miss in code review (it "looks like it works," but is actually returning another dealership's data).
- **Fix**: add a convention in 18-Backend-Core-Engineering.md or 15 — all business-table Repositories should inherit a common base class/Specification that force-injects the `dealer_id` condition, rather than each query composing its own; or at minimum add a "cross-store privilege-escalation probe" as a required test case in the test plan (06/16) — currently the doc-17 fixtures cover only OMVIC ad compliance, not cross-tenant escalation scenarios.

**11. (Nice-to-have) The known document contradiction directly affects correct implementation of the multi-tenancy rule**
- Same spot as blocking issue #2 above: `15` line 165 and `18` line 279 still read "dealership mismatch → 400 `WRONG_DEALER_OR_SOLD`," but this has been withdrawn by `AI-PROTOCOL-AND-RULES.md` §A.1 in favor of "cross-store is uniformly 404." This rule directly decides whether a cross-tenant probe returns 404 or 400, which has a real effect on the security property of "does the id's existence leak" — recommend fixing it together with #2, at the same priority.

---

## Addendum (2026-09-23, added: verifying the multi-tenant isolation implementation against actual code)

Cross-checked #10 against the actual code (`dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantGuard.java`, `TenantContext.java`, `TenantFilter.java`, and Repositories such as `vehicle/VehicleRepository.java`) to see whether the risk has already materialized.

**State confirmed**: `TenantContext` holds the current request's `tenantDealerId`; each Repository method explicitly takes a `dealerId` parameter (e.g. `findByIdAndDealerId(id, dealerId)`, `search(dealerId, ...)`); the Service layer manually passes `TenantContext.get().tenantDealerId()` into each call; `TenantGuard.assertSameDealer()` performs a post-load secondary check. This is already better than a pure post-load-only check (the `dealerId` is already part of the query itself), but it **is still pure manual discipline**: nothing at compile time or framework level guarantees that a newly added Repository method or Service call will actually carry `dealerId`. Finding #10's risk assessment holds — it has not been resolved by the existing code.

**12. (Should-fix, recommended best solution) Use Hibernate `@Filter`/`@FilterDef` for entity-level enforced isolation, replacing the "every Repository method hand-writes its dealerId parameter" pattern**

Final recommendation after discussing the user's proposed "annotation-based interception at the DAO layer":

- **Do not** implement this as AOP interception on DAO methods — most Spring Data JPA Repository methods are framework-generated proxy implementations. AOP can intercept the "call," but cannot reach into already-generated SQL. In practice this just turns the manual call to `TenantGuard.assertSameDealer()` into an automatic trigger, and does not cover the real risk point: a new method or a new `@Query` that simply forgets the `dealer_id` parameter.
- **Recommended**: apply Hibernate's native row-level multi-tenancy mechanism at the Entity layer (not the DAO layer):
  ```java
  @FilterDef(name = "tenantFilter", parameters = @ParamDef(name = "dealerId", type = Long.class))
  @Filter(name = "tenantFilter", condition = "dealer_id = :dealerId")
  @Entity
  public class VehicleEntity { ... }
  ```
  Apply this to the six business tables `VehicleEntity`/`CustomerEntity`/`ListingEntity`/`CustomerVehicleEntity`/`ComplianceCheckEntity`/`AuditEventEntity`; **do not** apply it to `DealerEntity`/`AppUserEntity`/`MembershipEntity` (Admin needs cross-dealership visibility on those).
  In the existing `TenantFilter.java`, once `tenantDealerId` is resolved, add one more step: `session.enableFilter("tenantFilter").setParameter("dealerId", tenantDealerId)` (enabled only for the `Dealer.User` role; not enabled for Admin).
- **Effect**: from then on, any Repository method — existing ones, future ones, `findAll()`, Criteria queries — that touches one of these entities automatically gets Hibernate appending `AND dealer_id = ?` to the generated SQL. This turns isolation from "each method has to remember" into "physically impossible to forget" — the standard approach for shared-schema multi-tenancy on a Spring Boot + Hibernate stack, and far less code than building custom AOP.
- **Implementation notes**:
  1. Only applies to JPQL/Criteria, **not to native SQL** — if `@Query(nativeQuery = true)` or `EntityManager.createNativeQuery` ever appears in the project, `dealer_id` must be added by hand; recommend writing this into the spec as a hard requirement (currently `VehicleRepository` uses JPQL, no native SQL yet).
  2. Need to confirm the `spring.jpa.open-in-view` setting in `application.yml`: if `true` (Spring Boot default), the Hibernate Session is reused across the whole request, so enabling the filter once in the Servlet Filter is enough. If OSIV is disabled, move the enable-filter call to the entry of each `@Transactional` Service method (AOP around the Service layer, enabling the filter when the transaction starts).
  3. Do not remove the existing `TenantGuard.assertSameDealer()` — keep it as defense-in-depth (a backstop for the rare case the filter wasn't enabled); the cost of keeping it is low and it doesn't conflict with the new mechanism.
- **Status update (2026-09-23, later same day): already implemented.** A follow-up requirements-traceability pass (see `DealerOps-Requirements-Traceability-2026-09-23.md`) found this exact mechanism already in the codebase: `VehicleEntity`, `CustomerEntity`, `ListingEntity`, `ComplianceCheckEntity`, and `CustomerVehicleEntity` all carry `@FilterDef`/`@Filter` (`TenantFilters.NAME`/`CONDITION`) plus `@EntityListeners(TenantDealerListener.class)`, and `TenantHibernateFilterBinder.bindIfDealerTenant(EntityManager)` enables the Hibernate filter with the resolved `tenantDealerId` for `Dealer.User` sessions while explicitly disabling it for Admin/null-tenant sessions — matching the recommendation precisely, including the Admin exemption. No further code change is needed for this item; the only remaining step is optional — writing this mechanism into `18-Backend-Core-Engineering.md` §5 as a formal design record, since the design docs still only describe the older manual per-Repository `dealerId` pattern.
