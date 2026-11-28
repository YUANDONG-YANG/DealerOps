# Requirements Documents vs. Current Code Verification - 2026-09-28

> **Historical snapshot — superseded.** Every file:line reference below points at the retired Java
> `dealer-core` and Vue `dealer-web` stacks (`VehicleService.java`, `DmsView.vue`, Maven commands,
> gateway YAML CORS tests). The active implementation is .NET 10 under `backend/dotnet/` and React
> under `frontend/react/`, so the findings V-01–V-04, the build results, and the delivery-evidence
> items are no longer verifiable against current code and must not be reopened as current defects.
> Kept for the record of what was checked on 2026-09-28 and why. For current status start from
> `README.md` and `../DealerOps-Development-Progress-en.html`.

## Pre-commit fix update

Following the instruction "check, then commit and push the code", this pass completed the minimal fixes: V-01 now shows the sold date/price in the vehicle drawer; V-02 merges the existing CUSTOMER_VEHICLE events into customer history, and a deleted relationship can be queried through same-dealer audit proof; V-03 builds the occupied set from the customer's full linkedVehicles, lists only unlinked vehicles, and shows the VIN; V-04 supports demo keywords/questions and in-stock/sold status filters, keeps at most five resources, and does not provide an inventory total. CRM vehicle-detail navigation, the assistant read-only notice, and rule severity labels were also added.

The two outdated gateway CORS assertions were updated to match the existing configuration. CI no longer misuses -DskipTests and explicitly sets the test JWT_MODE=dev; the test dealership now fills in the existing required address. No test framework or test case was added.

Push limitation: the current GitHub OAuth credential lacks the workflow permission, so the CI command fix in dealer-core.yml stays local and is not included in the push; the remote still needs a follow-up to remove -DskipTests and set the test JWT_MODE explicitly. Business code and the fixes to existing tests were committed normally.

Local pre-commit validation: core 25/25, gateway 15/15, and AI stub 19/19 unit tests passed; the frontend type check and production build passed; the CRM multi-vehicle occupancy re-check passed; git diff --check passed. Outstanding live-environment acceptance is in the latest ANALYSIS-LOG entry. What follows is the pre-fix verification snapshot, kept to preserve the origin and scope judgment of each issue; it is not a current list of unfixed items. Other display/document differences and live-environment acceptance still need to be handled within the original scope.

## Conclusion and boundaries

The overall approach fits the lean direction of a student capstone project and needs no new services, databases, message queues, or complex frameworks. However, it cannot currently be marked "all requirements implemented and accepted": there are four business wrap-up items, two failing gateway tests, and several unsynchronized descriptions in the requirements analysis.

This pass uses the current working tree (including uncommitted changes) as the baseline, on HEAD a3a01ec6f88a6815bfa68b97f653200da6791ad0. The full original PDF under requirements, the DOCX brief, analysis/01–07, and the scope baseline were read, and the corresponding services, Vue pages, database constraints, and existing tests were checked. Old reviews were used only as leads and were not copied directly as current to-dos. This report verifies the implementation; it does not modify business code or expand scope. Source line numbers refer to the working tree at the time of reading.

Conclusions supported by source code are recorded separately from actual runtime evidence; no real login, database integration, browser end-to-end run, or paid model call was performed, and the live Azure environment, remote repositories, Scrum, and sign-off records were not verified. What is checked here is the advertising rule set defined for the course, not a legal review against current OMVIC regulations.

## 1. Four business differences to close first

### V-01: After a sale, the DMS page cannot show the sold date and price

- Requirement: PDF §3 Date car was sold / Price car was sold for; DMS-08 and UI-22 require the detail view to show all fields.
- Evidence: dealer-core/.../vehicle/VehicleService.java:257 returns soldOn and soldPrice; the vehicleForm in dealer-web/src/views/DmsView.vue:139 does not keep these two fields, and the detail template starting at :353 does not show them either; :348 no longer shows the Sell entry after a sale.
- Scenario: enter a sale date and price; after the sale, reopen the vehicle and only the purchase fields and audit are visible, so the sale information cannot be reviewed.
- Minimal handling: add two read-only sale fields to the existing vehicle drawer. No new page, report, or sales module is needed.
- Evidence level: confirmed in source; not reproduced in a browser.

### V-02: Link/unlink records do not appear in the visible customer detail history, and the unlink history API also returns 404

- Requirement: PDF §6, CRM-11, AUD-02/06; modification records should be kept as that record's change history.
- Evidence: CustomerService.java:140 and :169 write LINK/UNLINK as CUSTOMER_VEHICLE with entityId set to the relationship row id; CrmView.vue:143 queries only CUSTOMER history. AuditService.java:88 queries by exact entity type/id; :99 requires the relationship row to still exist, but CustomerService.java:168 has already deleted that row on unlink.
- Scenario: after a customer links or unlinks a vehicle, the operation does not appear in the detail Audit; querying by the deleted relationship id also returns no history. Having audit rows in the database is not the same as the user being able to see the history.
- Minimal handling: make LINK/UNLINK part of the customer's own audit history as well, or merge relationship events into the existing customer history query while keeping the tenant check. No separate Audit page or new audit system is needed.
- Evidence level: the write, delete, query, and page call chains were all verified; database integration was not run.

### V-03: A multi-vehicle customer causes occupied vehicles to be wrongly listed as linkable

- Requirement: CRM-06, UI-33; the picker should exclude already linked vehicles.
- Evidence: CustomerService.java:178 puts only the most recent vehicle into the customer list's linkedVehicle; CrmView.vue:177–188 uses only that one vehicle to build the occupancy table for other customers; :200–205 builds the candidates, and :406 disables them based on the occupancy table.
- Scenario: customer A links V1 and then V2; when customer B's picker is opened, V2 is recognized as occupied but V1 is still selectable. On submit the backend CustomerService.java:132 still returns VEHICLE_ALREADY_LINKED, so one vehicle is never persisted against multiple customers.
- Minimal handling: have the picker obtain the full set of linked vehicles; the existing customer detail linkedVehicles can be reused, with no new infrastructure. VIN search should also show the VIN; the label currently has only year/make/model.
- Evidence level: confirmed in source, and the current loadLinkedOwners function was extracted for a minimal execution: when the input list returns only the most recent vehicle 102, vehicle101Taken=false and vehicle102Taken=true. The input shape comes from the current CustomerService; this is a function-level reproduction, not a browser end-to-end test.

### V-04: The assistant treats the whole question as a database keyword, so the sample question cannot find existing vehicles

- Requirement: AI-03; the example "Which Toyota vehicles are in stock here" in design/10-Web-AI-Assistant.md:9.
- Evidence: AssistantResourceQuery.java:43 uses the full text as q; :47 and :62 pass it unchanged into search. VehicleRepository.java:22–25 matches the whole q against VIN/make/model, and CustomerRepository.java:18–21 also matches the whole q; results are capped at five. There is no inventory/customer total query.
- Scenario: with Toyota vehicles in the database, entering Toyota matches, but entering the full question usually matches nothing, and the AI receives an empty resource list. The existing AssistantAskIT.java:44–46 only asserts that the card count is at most 5, so an empty list also passes.
- Minimal handling: supporting a small set of fixed phrasings or simple keyword/status extraction needed for the demo is enough; no vector store, RAG framework, or multi-turn engine is needed. Total-count Q&A is not implemented, and the five-card count must not be treated as the inventory total.
- Evidence level: retrieval chain confirmed in source; no real model was called.

## 2. Requirements analysis descriptions that need to be synchronized, not used to expand features

1. **Field format constraints are written more strictly than the current scope.** 02/03 specify a 17-character VIN, a year range, email/phone formats, date ordering, amount bounds, and so on; Create/PatchVehicleRequest mainly checks required fields and length, and the customer DTO mainly checks required fields and length. The actual lengths also differ: make/model 80, VIN 32, customer name/email 160, phone 40. The current ruling in 08 explicitly defers A6. Recommendation: mark these derived validations in 02/03 as deferred and list the current state; do not restore the full strict validation just to remove the document difference. Required fields themselves are implemented, and a positive sold price is also validated.

2. **Admin editing of dealerships is a document conflict.** 06 UI-11 says create/edit; the backend already has GET/PATCH, but design/13:152 states explicitly that the classroom UI does not provide Edit, and admin.ts:42 and AdminView also provide only creation. Syncing the text to the current lean interface is enough; this must not be misreported as a missing PDF core feature.

3. **Detail views, lists, and navigation only partially meet the 06 description.** DMS lacks the linked customer and ad status, and the list lacks date added; the CRM list shows the most recently linked vehicle instead of the purchase count, the detail view shows only the vehicle description with no VIN or navigation entry, and inventory status is not shown separately. These correspond to DMS-08, CRM-04/10, and UI-20/22/30/32. The V-01 sale fields take priority; the rest should either get small display additions for the demo or have the existing acceptance boundary stated clearly, and must not be written up as fully satisfied.

4. **The ad page has check results, but the display requirements are not all implemented.** UI-41 requires showing the vehicle condition and the dealership's public contact information, but the current AdsView/AdWorkspace has no corresponding information area; the backend check does read this data. UI-43 requires distinguishing rule results, but AdWorkspace.vue:98 shows only message, not ruleId/severity, so the user cannot directly tell BLOCK from REVIEW. A minimal change can add only the display of existing data and a severity label, without adding a check questionnaire or approval flow.

5. **Assistant capabilities and notice text need to be accurate.** 05 AI-03 mentions inventory/customer counts, but the current retrieval has no aggregation; the UI-51 notice "read-only, does not modify data" also does not appear in AssistantView. A real read-only chain exists, but that does not support claiming that count Q&A is also done.

6. **The audit/AI output format is not fully implemented as the analysis documents describe.** AUD-04 specifies before/after, but currently only changed field names and boolean flags are stored; this satisfies basic who/what/when and keeps contact information out of the audit, and adding full diff snapshots is not recommended for the capstone. AI-05 specifies code/severity/explanation, but the adapter currently returns message notes; structured rule ruleId/severity come from the fixed rule engine. Rule results should be distinguished from AI hints.

7. **The production discussion in original PDF §8 should not be automatically upgraded to mandatory.** A dedicated domain, backup strategy, configurable rules, and a dedicated disclaimer are not business features on the same level as the original field list. The current source actually already has a one-line disclaimer (AdWorkspace.vue:87), so the old review saying "no disclaimer" is outdated; a new disclaimer page is still not needed.

None of these differences was quietly rewritten as "passed" in this pass. This report gives only the verification results and the minimal handling direction.

## 3. Main requirements confirmed in current source

- **Roles / multi-tenancy (AUTH-01–14 core flows)**: TenantFilter looks up the active membership by JWT identity and does not use a client-supplied dealerId; the binding is re-checked on every request; Admin is rejected on business paths, and Dealer.User cannot call admin paths; JwtRoleMapper treats a dual-role user as Admin first, which does not grant dealer business permissions. TenantGuard, dealerId-scoped queries, and the Hibernate filter together provide isolation. Real sign-in under the earlier external sign-in plan and cross-dealer integration still need live acceptance.
- **DMS (DMS-01/02/03/05/06/07/09–15)**: the fields exist; required-field DTOs, a per-dealer VIN unique index, search pagination, the sale pair/positive price, rejection of repeated sales, the purchase-field lock, version checks, audit, and condition invalidating the ad version are all implemented. Strict format validation is not counted as done; for the detail display see V-01.
- **CRM (CRM-01/02/03/05/07/08/09/11/12)**: four required fields; create, edit, and search; same-dealer in-stock and sold vehicles can both be linked; a one-vehicle-one-customer unique index; sold vehicles cannot be unlinked; cross-dealer ids do not exist; contact fields are not used as audit values. For the link picker and visible history see V-02/03.
- **Ads (core backend flows of AD-01–13)**: a one-draft-per-vehicle unique constraint; CASH with APR/PAYMENT enters the financing rules; LEASE has a separate branch; the 20,000 km boundary; hard rules skip AI; success keeps soft hints and AI notes; failure saves UNAVAILABLE and returns AI_UNAVAILABLE; the check saves the content version evaluated at the start; Ready/TXT validate the current pass and version. Text export reads public vehicle/dealership data and does not proactively attach customer data or purchase cost. The frontend checklist is for display only and switches by kind/medium.
- **Basic audit properties (AUD-01/02/03/05/07)**: create/edit/sale/link operations write events with actorUsername/action/createdAt, and business service transactions include the audit write; there is no external audit edit/delete API. Visible history is not fully complete; see V-02.
- **Six pages and architecture (UI page list, ARC-01/02/05/06)**: six Vue routes exist and role guards exist; one core business database with nine tables; the public API is /api/v1, and the error body contains code/message and may include fieldErrors.
- **Implemented parts of JWT/AI/privacy (SEC-01/02/05/07, AI-01/02/04)**: login and token acquisition through the earlier sign-in SDK, and issuer/audience/expiry validation paths for the earlier external sign-in plan, exist; the AI adapters call the GitHub component API; ad requests build only public vehicle/dealership DTOs, and assistant resource cards contain no customer contact fields or purchase cost. Live evidence for the model key, real responses, deployment isolation, and HTTPS/Key Vault is not automatically proven by the presence of source code.
- **Deferred/excluded items**: leads, work orders, Image Studio, external publishing, complex rule configuration, extra vehicle fields, quotas/rate limiting, and full production-grade audit are not restored. Having edits to other vehicle/dealership fields trigger more invalidations remains deferred as A5.

## 4. Validation performed in this pass

- dealer-web: npm run build succeeded, including vue-tsc --noEmit and the Vite build. The large bundle is only a warning and is not treated as a capstone defect in this pass. This build does not run __tests__; tsconfig explicitly excludes that directory.
- dealer-core: mvn -o -Dmaven.repo.local=<local-maven-repository> test, 25 passed, 0 failures, 0 errors.
- dealer-gateway: the same offline command, 2 of 15 failed, 0 errors. The failures are CorsHeadersTest.corsOriginIsEnvNotLocalhostOnly (:19) and GatewayNotPublicTest.yamlRoutesInternalHeaderAndOmitsInternalFromCors (:23). They still check the deleted YAML CORS configuration; the current policy is centralized in CorsConfig.java:26–33. These two existing tests need adjusting, and the duplicate configuration must not be re-added just to make them pass. This is a real CI blocker and does not prove the actual CORS behavior is broken.
- ai-service: mvn -o -e -Dmaven.repo.local=<local-maven-repository> -Pstub,!aimanager -Daimanager.stub=true test, 19 passed, 0 failures, 0 errors. The first compile reported an error on the local snakeyaml JAR path; a diagnostic retry completed compilation and tests, and the first environment error was not taken as a code defect. The stub does not call a real model, so this result cannot prove that real AI has been accepted.
- CRM multi-vehicle occupancy function: the minimal reproduction from V-03 was executed, confirming that the earlier linked vehicle is missed.
- Testcontainers integration tests were not run: the docker command is not available in the current tool environment. The core test phase already excludes the *IT/it groups. The 25 passing unit tests must not be written up as full business acceptance.
- The existing frontend specs use vitest, but package.json has no test script or vitest dependency; the CL-4/CL-5 files only scan source and are not real browser/real AI acceptance. This pass did not introduce a new test framework for verification.

## 5. Delivery evidence that still needs independent confirmation

1. The integration step at .github/workflows/dealer-core.yml:39 uses mvn verify -DskipTests, which skips the tests; this step name cannot be used to claim database integration was executed. The existing Failsafe run should be used normally and its report confirmed; the test framework does not need to be expanded.
2. dealer-platform/infra/main.bicep:2 states explicitly that it is a template not deployed from this repository. Private core/AI ingress, HTTPS, Key Vault references, and MySQL backup settings are all defined, but the actual Azure state was not verified in this pass.
3. The Compose default AI build uses the stub; ChainableRequest.send always returns stubFailure. Real AI acceptance must use the real component build with valid configuration. Filling in a key alone does not turn the stub into a real model.
4. Four module directories and four workflows do not mean four remote repositories have been delivered; real external sign-in configuration, remote repos/pipelines, Scrum materials, Review, and customer/instructor confirmation all need actual evidence. This pass does not mark them complete on their behalf.

## Recommended minimal wrap-up order

First add the sold-information display, link audit visibility, the picker occupancy gap, and the assistant demo phrasings; sync the over-commitments in the documents above and fix the two existing gateway tests. Then follow the existing minimal classroom scripts AT-01/03/12/13/17/19, and re-check the V-01–04 scenarios and AT-25/26. There is no need to use this as a reason to refactor the project, and this report should not become an enterprise feature list.
