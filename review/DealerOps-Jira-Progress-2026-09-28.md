# DealerOps Jira Four-Status Review and Publication - 2026-09-28

With the user's authorization, status changes were saved in the existing Jira KAN project through the browser MCP. The current session provided no dedicated Jira connector tool; all actual operations and confirmations come from the Jira pages. In total, 89 issue details were read, 64 status transitions were completed and each was read back and verified, and 3 acceptance description corrections were saved. No project was created, no issue was deleted, no software version was released, and no cloud deployment was performed.

## Publication results

Board (78 cards, excluding 10 Epics and 1 subtask): To Do **8**, In Progress **41**, Review **28**, Finished **1**. These four counts were verified directly on the final board page.

Whole project (89 issues): To Do **11**, In Progress **49**, Review **28**, Finished **1**; totaled from the complete pre-review list and the per-issue record of successful transitions. Before the review it was 68 / 5 / 15 / 1.

Board: https://sait-group2-private.atlassian.net/jira/software/projects/KAN/boards/2

## Four-column criteria

- To Do: no sufficient implementation evidence yet, or still awaiting sign-off, an external decision, or an actual walkthrough. This does not call for adding complex features to the student demo.
- In Progress: code/documents/tests exist, but there is still a clear gap in runtime, description, deployment, or acceptance. An Epic advances with its existing child items, but no single child item represents its completion.
- Review: static review found the main implementation, and the item can go to manual acceptance; this does not mean the build, automated tests, real login, or classroom demo have passed.
- Finished: only KAN-15's single-MySQL, nine-table architecture deliverable is kept; this does not mean the whole project is complete.

## Main evidence and open items

1. KAN-67 has moved to Review. CustomerService allows the first link of an unlinked same-dealer IN_STOCK/SOLD vehicle; a repeated link returns 409, cross-dealer returns 404, and SOLD unlink returns 409. The current A3 decision explicitly allows a first link after sale. The Jira descriptions of KAN-23, KAN-50, and KAN-67 have been corrected and saved, withdrawing the old sold-link 400 requirement; historical comments are kept, and the new descriptions explicitly supersede the old conclusion. KAN-23 still awaits test execution evidence.
2. The APIs for KAN-51/52/53/64/69/74/75/76 and others had their Controller/Service read one by one and moved to Review. The corresponding evidence is MeService, DealerAdminService, MembershipService, CustomerService, ListingService, AuditService, and AssistantService. The internal calls and security implementation of KAN-77/78/79 moved to Review; this does not mean the real model integration in KAN-86 is complete.
3. The frontend already has routing, PageState, and the Admin/DMS/CRM/Ads/Assistant implementations. KAN-28/33/60 move to Review. The sign-in SDK and login tasks KAN-32/41 stay In Progress; the placeholder defaults in code alone neither prove that the external sign-in registration is missing nor prove that login has passed.
4. dealer-web/package.json lacks a test script and runtime dependencies such as vitest and @vue/test-utils, and web CI only builds. AdminView.spec.ts has real mount tests and must not be mislabeled as an empty test; but it cannot be run reproducibly in a clean environment, so KAN-65 is moved back to In Progress, and the other existing frontend test source files also move to In Progress.
5. Core CI keeps the plain mvn test separate from IT, while the integration test step uses mvn verify -DskipTests, which cannot serve as evidence that IT actually passed. All test cards stay In Progress for now, including KAN-16/21/22/37, which were previously in Review. The execution entry point needs to be restored and its report saved; this pass ran no tests and claims no pass.
6. CoreNotPublicIT and CL-4/CL-5 are source/configuration scans and cannot replace actual network isolation and a browser demo. KAN-43/72/73 stay In Progress.
7. deploy/README.md records the deployed Azure VM, Caddy TLS, and Compose services; AI is still a stub. main.bicep is not deployed, and publish-ghcr only pushes images and does not update the VM. KAN-19/81/87 are In Progress. KAN-86 (real AI), KAN-88 (live acceptance of the earlier external sign-in plan), and KAN-89 (repository organization decision) stay To Do. The VM deployment must not replace the course Container Apps requirement unless an exemption is confirmed.
8. KAN-11 README, KAN-82 documentation consistency, KAN-84 release hygiene, and KAN-85 isolation tests and documentation wrap-up move to In Progress. A review of the current working tree does not mean everything has been committed or deployed.
9. KAN-83's complex NFRs deviate from the current student demo scope and stay To Do pending scope convergence; no rate limiting, performance SLOs, retention policies, or similar features are built. KAN-91 awaits the instructor's decision. KAN-5 sign-off, KAN-20/61 actual walkthroughs, and KAN-92 diagram acceptance have no completion evidence and stay To Do; the existing diagram attachment on KAN-7 does not mean everything in the diagram was verified in this pass.

## Wording that later acceptance should align with

- KAN-31 should keep the semantics of the 15-second upper bound and avoid making the old .orTimeout style the only implementation requirement; the existing implementation is a bounded executor with timeout cancellation.
- The internal token default for KAN-35 should be limited to dev/local; production needs explicit configuration.
- KAN-38 and KAN-74 should unify the export gate: the current ListingService checks for a valid PASSED and a matching version, and an extra READY status gate must not be invented from the old wording.
- The success-result wording of KAN-73 needs to align with the current PASSED contract; the real model demo is still pending.

The wording issues above remain as In Progress wrap-up items; this pass actually modified only the descriptions of KAN-23/50/67.

## Full issue publication list

Below is each issue's status before this review and after saving. Unchanged issues are listed explicitly; every change was read back through the Jira status control.

- KAN-3: To Do (kept)
- KAN-5: To Do (kept)
- KAN-6: To Do (kept)
- KAN-7: To Do → In Progress
- KAN-8: To Do → In Progress
- KAN-9: To Do → In Progress
- KAN-10: To Do → In Progress
- KAN-11: Review → In Progress
- KAN-12: To Do → In Progress
- KAN-13: To Do → Review
- KAN-14: To Do → Review
- KAN-15: Finished (kept)
- KAN-16: Review → In Progress
- KAN-17: To Do → Review
- KAN-18: To Do → In Progress
- KAN-19: In Progress (kept)
- KAN-20: To Do (kept)
- KAN-21: Review → In Progress
- KAN-22: Review → In Progress
- KAN-23: In Progress (kept)
- KAN-24: To Do → In Progress
- KAN-25: To Do → In Progress
- KAN-26: To Do → In Progress
- KAN-27: To Do → In Progress
- KAN-28: To Do → Review
- KAN-29: Review (kept)
- KAN-30: Review (kept)
- KAN-31: To Do → In Progress
- KAN-32: In Progress (kept)
- KAN-33: To Do → Review
- KAN-34: To Do → In Progress
- KAN-35: To Do → In Progress
- KAN-36: To Do → In Progress
- KAN-37: Review → In Progress
- KAN-38: To Do → In Progress
- KAN-39: To Do → In Progress
- KAN-40: To Do → In Progress
- KAN-41: To Do → In Progress
- KAN-42: To Do → In Progress
- KAN-43: To Do → In Progress
- KAN-44: Review (kept)
- KAN-45: To Do → In Progress
- KAN-46: To Do → In Progress
- KAN-47: To Do → Review
- KAN-48: Review (kept)
- KAN-49: Review (kept)
- KAN-50: Review (kept)
- KAN-51: To Do → Review
- KAN-52: To Do → Review
- KAN-53: To Do → Review
- KAN-54: Review (kept)
- KAN-55: To Do → In Progress
- KAN-56: Review (kept)
- KAN-57: To Do → In Progress
- KAN-58: To Do → In Progress
- KAN-59: To Do → In Progress
- KAN-60: To Do → Review
- KAN-61: To Do (kept)
- KAN-62: To Do → In Progress
- KAN-63: To Do → In Progress
- KAN-64: To Do → Review
- KAN-65: Review → In Progress
- KAN-66: To Do → In Progress
- KAN-67: In Progress → Review
- KAN-68: To Do → In Progress
- KAN-69: To Do → Review
- KAN-70: To Do → In Progress
- KAN-71: Review (kept)
- KAN-72: In Progress (kept)
- KAN-73: To Do → In Progress
- KAN-74: To Do → Review
- KAN-75: To Do → Review
- KAN-76: To Do → Review
- KAN-77: To Do → Review
- KAN-78: To Do → Review
- KAN-79: To Do → Review
- KAN-80: To Do → In Progress
- KAN-81: To Do → In Progress
- KAN-82: To Do → In Progress
- KAN-83: To Do (kept)
- KAN-84: To Do → In Progress
- KAN-85: To Do → In Progress
- KAN-86: To Do (kept)
- KAN-87: To Do → In Progress
- KAN-88: To Do (kept)
- KAN-89: To Do (kept)
- KAN-90: To Do → In Progress
- KAN-91: To Do (kept)
- KAN-92: To Do (kept)

---

## Historical record (the following is not the current status)

# DealerOps Jira progress — 2026-09-28

Source of truth for the KAN board on this date. Code was checked at git HEAD `1694510` on `main`. Jira statuses below were read before any transition in this pass: To Do 75, In Progress 4, Review 9, Finished 1.

This is a historical board snapshot, not a live Jira status source. 2026-09-28 correction: linking an unlinked same-dealer SOLD vehicle is intended (closed A3); only unlink after sale is blocked. KAN-23/KAN-67 must not be held back on that obsolete defect. No live Jira transition was made by this correction; acceptance and board status must be verified separately.

## Column rules

| Column | Rule |
| --- | --- |
| To Do | Not started, or reference-only. Blank signatures and unread controllers stay here. |
| In Progress | Code has started and the done condition is still open, including a known defect. |
| Review | Implementation matches the design and is waiting for acceptance. A test card may be Review only when the feature it checks is also Review or Finished. A test must not be Review while that feature is In Progress. A test is never Finished by itself. |
| Finished | A product or architecture deliverable is in the repo and is not blocked by an open defect on that same deliverable. Design markdown alone is not Finished. An Azure/Bicep draft is not Finished. |

## To Do

Explicit keep. The rest of the To Do column stays To Do. Stories whose controllers were not read in this pass are not placed: `MeController`, `CustomerController`, `ListingController`, `AuditController`, `AssistantController`.

| Key | Summary | Evidence or gap |
| --- | --- | --- |
| KAN-5 | Get client to sign project agreement form | `design/SCOPE-BASELINE.md` signature and email-confirmation rows are still blank. |

## In Progress

| Key | Summary | Evidence or gap |
| --- | --- | --- |
| KAN-19 | Architecture: minimum Azure set | `dealer-platform/infra/main.bicep` is a draft (`targetScope = 'resourceGroup'`, comment: not deployed from this repo). Azure draft is not Finished. |
| KAN-23 | TEST-05 CustomerVehicleLinkIT | Historical In Progress status; the alleged sold-link defect is withdrawn. BE-05/06 and AT-25 define the correct stock/sold link and sold-unlink behavior. Acceptance execution remains to be recorded. |
| KAN-32 | FE-T03 sign-in SDK and axios to port 8080 only | `dealer-web/src/auth/login.ts` (then the earlier sign-in SDK wrapper) is wired, but the client id falls back to `dealer-web-placeholder`. Done condition still open. |
| KAN-67 | BE-T14 Link, unlink, and sold lock | Historical In Progress status; current intended behavior allows an unlinked same-dealer SOLD vehicle to link, while unlink throws SOLD_LOCKED. This is not a defect. Do not change code to reject sold links; record acceptance before changing the live board. |
| KAN-72 | TEST-27 CL-4 ads blocked e2e | `dealer-web/e2e/cl4-ads-blocked.spec.ts` only reads source files. That is not a live classroom run. Source-scan-only tests are not Finished. |

## Review

Features caught up so the tests already in Review are no longer ahead of them.

| Key | Summary | Evidence or gap |
| --- | --- | --- |
| KAN-11 | Project material: Dealer Ops README | `README.md` exists. It still calls `dealer-core` in progress and Bicep a placeholder. Review, not Finished. |
| KAN-16 | TEST-01 CrossTenantIsolationIT | Feature KAN-48 is Review. Evidence for the feature: `dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantFilter.java`. |
| KAN-21 | TEST-03 SoldLockedIT | Feature KAN-54 is Review. Must not stay ahead of that feature. |
| KAN-22 | TEST-04 VinDuplicateIT | Feature KAN-54 is Review. Must not stay ahead of that feature. |
| KAN-29 | BE-T03 Gateway route YAML | `dealer-gateway/src/main/resources/application.yaml` routes `/api/v1/**` to core and `/internal/v1/**` to AI. |
| KAN-30 | FE-T02 Route table and guards | `dealer-web/src/router/index.ts` (public login, role meta, `beforeEach`). |
| KAN-37 | TEST-09 BlockedSkipsAiIT | Feature KAN-71 is Review. |
| KAN-44 | FE-T06 Admin dealership and staff tabs | `dealer-web/src/views/AdminView.vue` (Dealerships and staff tabs). Test KAN-65. |
| KAN-48 | BE-T08 Tenant filter and JWT security chain | `dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantFilter.java`. Test KAN-16. |
| KAN-49 | FE-T07 DMS list, edit, sell, audit drawer | `dealer-web/src/views/DmsView.vue` (already Review; left in this column). |
| KAN-50 | FE-T08 CRM list, edit, link, and unlink confirm | `dealer-web/src/views/CrmView.vue` (already Review; left in this column). |
| KAN-54 | BE-T12 Vehicle DMS controller | `dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleService.java` throws `VIN_DUP` and `SOLD_LOCKED`. Tests KAN-21 and KAN-22 sit with this feature in Review. |
| KAN-56 | FE-T09 Ad compliance five states and Ready/export latch | `dealer-web/src/views/AdsView.vue` (already Review; left in this column). |
| KAN-65 | TEST-23 AdminView | Feature KAN-44 is Review. |
| KAN-71 | BE-T16 Compliance check and OMVIC; Blocked skips AI | `dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckController.java` `POST /{id}/checks`. Blocked path skips AI in `ComplianceCheckService` (`AiStatus.SKIPPED`, `Recommendation.BLOCKED`). Test KAN-37. |

## Finished

| Key | Summary | Evidence or gap |
| --- | --- | --- |
| KAN-15 | Architecture: one MySQL and nine tables | `dealer-core/src/main/resources/db/migration/V1__init.sql` creates nine tables: `dealer`, `app_user`, `membership`, `vehicle`, `customer`, `customer_vehicle`, `listing`, `compliance_check`, `audit_event`. No open defect on this deliverable. No other key is Finished in this pass. |

## Do not claim

- Azure draft: `dealer-platform/infra/main.bicep` (KAN-19) is not deployed and is not Finished.
- Empty or source-scan-only tests: KAN-72 reads Vue and TypeScript source; it is not a finished product check. No test card is Finished by itself.
- Withdrawn design: `design/archive/01-Scope-and-Acceptance.md` through `design/archive/06-Delivery-and-Test-Plan.md` are not grading criteria (`design/SCOPE-BASELINE.md`).
