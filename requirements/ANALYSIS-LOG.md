# Requirements Analysis Log

Record of work on the requirement sources in this folder. Newest entry first.

## 2026-09-28 · Minimal fixes before commit/push

Implemented V-01–04 from analysis/12: sold fields visible, customer link history remains readable, all linked vehicles excluded from the CRM picker, and simple assistant keyword/status questions supported. Added only small existing-page displays (VIN/detail link, read-only notice, BLOCK/REVIEW labels). Updated two obsolete CORS assertions, removed the CI skipTests mistake, and supplied the required address in the existing integration fixture. No new test cases/framework, schema or service. Push note: GitHub rejected the workflow change because the current OAuth credential lacks workflow scope. The one-line dealer-core.yml CI correction is retained locally and excluded from the pushed code commit; the remote pipeline still has its prior integration-test command.

Final local verification: core 25/25, gateway 15/15, AI stub 19/19 unit tests passed; web type-check and production build passed; CRM occupancy smoke check passed; git diff --check passed. Real Azure/external sign-in/AI and Docker integration are not claimed.

## 2026-09-28 · Requirements versus current code verification

Read the original PDF/DOCX, current requirements and implementation. Recorded four business follow-ups (sold fields, visible link audit, multi-vehicle picker occupancy, assistant sentence retrieval), documentation mismatches and delivery evidence separately. Core: 25 unit tests passed; gateway: 15 tests, 2 stale CORS assertions failed; AI stub: 19 tests passed; web build passed. Docker integration, browser E2E and real AI were not run. No application code or scope was changed.

Report: [analysis/12-Requirements-Code-Verification-2026-09-28.md](analysis/12-Requirements-Code-Verification-2026-09-28.md).

## 2026-09-28 · Codex's fix verified by build + test

Full report: [../review/DealerOps-Codex-Change-Review-2026-09-28.md](../review/DealerOps-Codex-Change-Review-2026-09-28.md).

Verified the uncommitted working-tree changes against the six High-severity findings from the same-day code review: all six are correctly fixed (merge-patch semantics restored, compliance-check version race closed, ad-view request race guarded, gateway JWT dev-mode fail-closed, internal-route shared secret fail-closed, AI-call timeout now cancels its task). Two related Medium items (anonymous Swagger, duplicate CORS config) were also fixed as a side effect.

Compiled and ran the unit test suites for real (offline `mvn`) rather than reading code only: `dealer-core` and `ai-service` compile clean with all unit tests passing; `dealer-gateway` compiles clean but **`CorsHeadersTest` and `GatewayNotPublicTest` now fail** — they assert the old, duplicated CORS block in `application.yaml` that the GW-7 fix intentionally removed. The tests need updating to check `CorsConfig.java` instead, not the fix reverting. `dealer-web` type-checks clean. Medium/Low items beyond the six High ones were not individually re-verified (diff is 65+ files).

## 2026-09-28 · Minimal demo requirements reconciliation

Resolved six documentation issues: course BLOCK/REVIEW severity, AI success semantics, CASH finance triggering, sold-vehicle linking, display-only checklist scope, and acceptance traceability. Added AT-24–28 as focused manual checks, not executed-test claims. Updated the protocol skeleton and corrected the old Jira report’s sold-link false positive. No application code or live Jira state changed. Details: [resolution](../review/DealerOps-Requirements-Resolution-2026-09-28.md). Earlier log entries below are historical snapshots.

## 2026-09-28 · Code review across all four services

Full report: [../review/DealerOps-Code-Review-2026-09-28.md](../review/DealerOps-Code-Review-2026-09-28.md).

Audited `requirements/analysis/` against current code (it had only ever been verified doc-vs-doc, except A2/A3/B4). Found the A3 fix never propagated to `design/13`, `14`, and `18`, which still describe the old sold-vehicle-link block — a coding agent following those three alone would reintroduce the bug. Also found `requirements/analysis/07` Q-15 contradicts `08`'s A7 finding on whether OMVIC rules are config-driven.

Then reviewed all Java/Vue source in `dealer-core`, `dealer-gateway`, `ai-service`, `dealer-web` line by line (not just docs). Six High-severity issues found, none previously tracked:
- `ListingService.patchByVehicle()` resets `adKind`/`medium` to defaults on a partial PATCH instead of merging.
- `ComplianceCheckService` can stamp a check PASSED against a *newer* content version than the one it actually evaluated, letting stale/unchecked ad copy pass the staleness gate.
- `AdsView.vue`'s vehicle-switch has no request-sequencing guard, so a slow response can persist one vehicle's ad copy onto another.
- The gateway's JWT mode defaults to `dev` with a hardcoded secret if `JWT_MODE` is unset.
- The `/internal/v1/**` shared-secret header defaults to the same hardcoded value across all three services.
- `ai-service`'s AI-call timeout doesn't cancel the underlying task, risking thread starvation under sustained AI latency.

No code changed by this review — findings only, recorded in the report above.

## 2026-09-25 · A2 / A3 / B4 closed

Cursor's large change set was reviewed ([analysis/10](analysis/10-Cursor-Change-Review.md)): A3 was not actually fixed, rule severity contradicted itself, and scope went far beyond the minimum. Cursor was directed ([analysis/11](analysis/11-Cursor-Instructions.md)) to back its work up to `backup/cursor-wip-2026-09-25` and re-apply only the minimal fix.

Result: commit `128c86b`, identical to the reviewed minimal fix. A2, A3, and B4 are closed. Everything else from the review (A1, A4–A10, B5) stays not planned. The backup branch holds Cursor's extra work if any of it is wanted later.

## 2026-09-25 · Requirements breakdown and design review

### Inputs

- `DealerOps-Specification.pdf` (2026-09-21): roles, DMS / CRM / ad-compliance fields, cross-cutting rules, pages, known limitations
- `Dos Car dealership.docx`: product vision (DealerOS)
- `../design/SCOPE-BASELINE.md`: signed scope and errata, used to resolve conflicts

### Output

New folder [analysis/](analysis/README.md):

| File | Content |
|---|---|
| 01–06 | Requirement items by module: AUTH, DMS, CRM, AD (rules AD-R01–R25), AUD / ARC / SEC / AI / NFR, UI + 23 acceptance cases (AT-01–AT-23) |
| 07 | Differences between the two sources, 15 assumptions (Q-01–Q-15), questions for the client, risks |
| 08 | Review of `design/` against the analysis |
| 09 | Verification checklist: evidence per finding, verdict column for manual review |
| Traceability-Matrix | Source → requirement ID → design doc → acceptance case |

Each requirement carries a source (`PDF §x` / `DOC` / `SCOPE` / `Derived`) and a priority (Must / Should / Could / Won't).

### Design review result (details in analysis/08)

The design matches the source on roles, tenant isolation, DMS / CRM fields, sale pair, sold lock, one vehicle one customer, audit, five check states, Ready + TXT, Gateway, and the assistant.

Open items:

| ID | Severity | Summary |
|---|---|---|
| A1 | High | No salesperson checklist; "if applicable" disclosures (previous use, warranty) are only checked when the copy mentions them |
| A2 | High | Finance rules trigger on `adKind` only; a CASH ad showing a rate or payment skips them |
| A3 | High | A vehicle sold before being linked can never be linked to its buyer in CRM |
| A4 | Medium | AI success always gives PASSED; soft findings and AI notes are not required to show |
| A5 | Medium | Editing vehicle year / make / model / VIN or dealer info does not make a passed check Stale |
| A6 | Medium | No field format rules (VIN, year, email, phone, dates) in the API contract |
| A7–A10 | Low | Hard-coded rules, no legal disclaimer, backup undocumented, acceptance gaps |
| B4 | Sign-off | PROTOCOL §C.0a makes several spec "must disclose" items soft; not recorded in SCOPE-BASELINE errata |
| B5 | Sign-off | Broadcast exemption: design waives proximity only; the spec wording may waive APR / term / cash price entirely |

### Pending

Scope rule: meet the spec at its minimum. This is a graduation project, not a commercial product (see "Minimum-spec triage" in analysis/08).

Open issues to hand to the developer (verified against code on 2026-09-25):

| ID | Where | Issue | Smallest fix |
|---|---|---|---|
| A2 | `dealer-core/.../compliance/OmvicRuleEngine.java` (the `if (listing.getAdKind() == AdKind.FINANCE)` block) | A CASH ad showing "$299 per month" or an APR skips all finance rules and can reach PASSED. Spec §5: finance rules apply "if the ad shows a rate or payment". | Also enter the finance block when a CASH ad matches `APR` or a payment pattern. Add one unit case. Update PROTOCOL C.1 and 15 §6. |
| A3 | `dealer-core/.../customer/CustomerService.java` `link()` (the `IN_STOCK` check) and `dealer-web/src/views/CrmView.vue` `loadLinkOptions()` (`status: 'IN_STOCK'`) | A vehicle sold before being linked can never be linked to its buyer. Spec §4 "Car(s) purchased". | Drop the `IN_STOCK` check; the unique key still enforces one vehicle, one customer. Drop the status filter in the picker. Update 12 / 13 / 14 / 15 / 16 BE-05 and `CustomerVehicleLinkIT.soldCannotBeNewlyLinked`. |
| B4 | `design/SCOPE-BASELINE.md` errata | PROTOCOL §C.0a makes several "must disclose" items soft, but it isn't a signed erratum. | Add erratum 4: some OMVIC disclosures are review hints, not blockers (see PROTOCOL §C.0a). |

Not planned: A1, A4–A10, B5.

No code or `design/` files are changed by this analysis. A fix commit was made and reverted, because this analysis only records issues.
