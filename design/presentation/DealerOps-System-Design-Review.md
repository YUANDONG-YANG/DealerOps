# DealerOps System Design Presentation Review

**Reviewed:** 2026-11-23  
**Scope:** Content structure, traceability, architecture communication, and basic HTML integrity of `DealerOps-System-Design.html`.

## Overall assessment

The presentation is comprehensive and useful as a detailed briefing, but it does not yet provide a clear, traceable path from business goals to implementation. Its current quality is approximately **7/10**: the material is broad and well organized, while the amount of detail and the weak links between business, data, APIs, and services make it harder to use as a guided system explanation.

The main gap is larger than a missing ERD. The document needs a connected narrative showing how a business action changes data, which application components perform that work, and where the relevant rules are enforced.

## Strengths

- Sections are grouped around product, architecture, development, and operations, with a contents panel and role-based reading guidance.
- The document includes business processes, service boundaries, tenancy, authorization, audit, failure cases, and role-specific task instructions.
- Tables and diagrams make many details scannable; responsive, dark-mode, and print styles are included.
- A static check found no broken in-page anchors.

## Findings and risks

### 1. The source-of-truth framing is inconsistent

The introduction calls this page the single source of truth, while the footer says it summarizes `design/` and that source documents take precedence. The repository's design and API documents are the authoritative references. Present this file as a guided overview and link each important decision to its canonical source.

### 2. Implementation, acceptance, and deployment claims are blended

The page uses phrases such as “feature code complete,” “implementation accepted,” and “verified against the source” alongside detailed claims about behavior and operations. These are different evidence states. Label claims as implemented, accepted, or deployed, and include the evidence source and verification date where it matters.

### 3. No connected business-to-data-to-system path

The page has business-flow material, a data-model section, API design, and service architecture, but readers must infer how these fit together. Add a traceable walkthrough for a representative end-to-end journey. For example:

1. State the business goal, actor, and requirement ID.
2. Show the workflow and its decision points.
3. Identify the records created, read, or changed at each step.
4. Show the page, Gateway route, owning service, and any external call.
5. State the authorization, validation, transaction, audit, and failure behavior.
6. Link to the canonical design document and implementation location where available.

Use the same requirement or flow IDs across the narrative, diagrams, data model, API references, and architecture views.

### 4. Add an ERD, connected to workflows

A clear ERD is missing as a reader-facing overview. Add one that identifies the main entities, relationship cardinalities, dealership ownership/tenant keys, and important lifecycle or audit relationships. Keep it aligned with the current database design, and annotate the relevant business flow IDs so readers can follow a workflow into the affected data. Avoid presenting the ERD as a standalone database inventory.

### 5. The presentation is very large for one briefing

The HTML is about 3,000 lines and combines executive overview, architecture reference, implementation details, and click-by-click user instructions. This breadth is useful as a reference, but it makes the main narrative difficult to follow. Keep a guided overview in the primary path and make deep implementation or role manuals optional linked sections or companion documents.

### 6. Inline SVG identifiers are duplicated

A static HTML parse found repeated IDs such as `ink`, `blue`, `ma`, `mg`, `mb`, `amber`, and `grey` across inline SVGs. SVG marker and definition references use IDs; duplicate document IDs can resolve unpredictably and may make diagram arrows or other referenced graphics incorrect. Prefix IDs per diagram and verify the rendered page in a browser.

### 7. Evidence links are not close to key claims

The document mentions code, screenshots, sprint deliverables, and supporting documents, but many strong claims do not identify their evidence nearby. Add direct links for material claims about implementation status, security boundaries, audit coverage, and deployment. This will make the presentation easier to review and maintain.

## Suggested document spine

Organize the main reading path as:

**Business goals and roles → workflows → data changes and ERD → API and service ownership → security and operational behavior → deployment topology.**

For each workflow, carry a compact traceability key through every layer, such as `FLOW-03` or the existing requirement ID. A reader should be able to start with a user outcome and follow it to the entities, route, owning service, enforcement rules, and deployment boundary without guessing.

## Checks performed

- Ran `sonar analyze secrets` on the HTML and the key current design references used for comparison; no secrets were reported.
- Checked in-page anchors and duplicate HTML IDs with a static parser. No broken in-page anchors were found; duplicate IDs were found in inline SVG content.
- This was a static review. The HTML was not rendered in a browser during this review, so the visual effect of duplicate SVG IDs remains to be confirmed.

## Follow-up review (2026-11-23)

The current HTML contains more material than the initial pass captured. In particular, it already has an ERD in §11.1, a business data flow in §11.2, a data matrix in §11.3, and `FLOW-*` references connecting several workflows to the ERD. Therefore, the earlier finding “Add an ERD” is **withdrawn for the current file**. The document already has the core business/data bridge the initial review thought was missing. The broad quality assessment should be revised upward to about **8/10**; the remaining work is primarily consistency, traceability into implementation, and presentation QA.

### Confirmed strengths in the current version

- The ERD groups tables by domain, shows cardinalities and tenant keys, and labels important flows.
- Separate business-flow and event-to-table diagrams show module hand-offs, writes, reads, and audit effects.
- §17 feature deep-dives connect user-visible rules to services, endpoints, tables, and failure behavior.
- The sections now link the business, data, and system layers more explicitly than the first review recorded.

### Additional findings

1. **A local image reference is broken.** The image source `../../project-plan/StatusReports3/img.png` resolves to a file that does not exist. Remove the reference, restore the intended image, or point it at the correct asset. A static check of local HTML references found this missing path.

2. **The VIN conflict code is inconsistent with the API contract.** The task walkthrough and feature deep-dive use `VIN_DUPLICATE`; the current API contract specifies `VIN_DUP` with HTTP 400. Align the page with the contract (or explicitly document a newer contract change if one exists).

3. **Some claims still need direct evidence and dates.** The document now supplies a document map and a verification table, but many individual behavior claims remain hard to audit without opening several files. Add links from important `FLOW-*` entries to the relevant API section, canonical design section, and implementation location where appropriate.

4. **The design-to-implementation trace stops short of code-level ownership.** The feature deep-dives name service classes and tables in places, but the main ERD and data-flow figures do not consistently point to route/API IDs or owning services. Add a compact route/service reference keyed by `FLOW-*` so the reader can follow each flow from diagram to API contract to service implementation.

5. **The claimed overall-document coverage is still too broad for a single briefing.** With an ERD and integrated flow views now present, the issue is no longer a missing conceptual spine. The page still combines executive briefing, architecture reference, feature specifications, and a lengthy user manual. Consider making §17–18 collapsible or companion references and keeping the main guided path focused on a few representative end-to-end flows.

### Follow-up static checks

- Re-ran secrets scanning on the HTML and this review record; no secrets were reported.
- Rechecked document IDs and inline SVG IDs: no duplicates were found in the current HTML version. This supersedes the duplicate-ID finding in the first pass.
- Checked local image, script, stylesheet, and page links: one missing image path was found as described above.
- Confirmed the canonical API contract names the VIN conflict `VIN_DUP` (400), while the presentation also uses `VIN_DUPLICATE`.
- No browser rendering was performed, so visual layout, print output, and the broken image's on-screen effect were not inspected.

## Final consistency pass (2026-11-23)

The current version has a substantially developed end-to-end structure: §8.0 maps requirements, actors, workflow, data, routes, owning services, enforcement, and deployment; §11 links ERD entities to `FLOW-*`; §17 provides feature-level implementation paths. The earlier suggestion that traceability stops before API/service ownership is therefore **withdrawn as a broad finding**. The remaining gaps are localized accuracy and evidence issues. The overall assessment for the current file is **8/10** pending corrections below and rendered visual QA.

### Confirmed issues to correct

1. **VIN duplicate error is wrong in name, status, and surrounding references.** The traceability matrix says `409 VIN_DUPLICATE`; feature and user-manual text repeat `VIN_DUPLICATE`; §7 also lists it as 409. The current API contract specifies **400 `VIN_DUP`**. Correct all occurrences, including the flow matrix and the source-code walkthrough.

2. **The sale data path names a column that the current schema does not define.** The worked example and feature deep-dive say `vehicle.sold_to_customer_id`. The current data design records a typed buyer in `vehicle.sold_to_name`; a CRM buyer is read through the `customer_vehicle` link. Replace the nonexistent column reference with the actual link-based model.

3. **Optimistic locking is described too broadly.** §11 and the ERD subtitle say writes carry a `version`. The API contract limits versioned writes to `dealer`, `vehicle`, `customer`, and `listing`; operations such as link/unlink, payments, work orders, and lead notes do not all carry a version. Scope the claim to versioned resources/actions.

4. **Tenant-key coverage is overstated.** The traceability example says every listed row carries `dealer_id`, including `audit_event`. Platform audit rows can have no dealership (`dealerId` may be empty), so qualify the statement and distinguish tenant-owned business rows from platform-level audit rows. The ERD should identify the nullable/platform scope accurately.

5. **The customer-vehicle link is incorrectly described as soft-deleted.** §11's soft-delete list and the ERD dagger mark `customer_vehicle` as soft-deleted. The current data design says an in-stock unlink deletes the association (V1 has no soft-delete column; the entity choice is hard delete), while a sold association cannot be removed. Correct the legend and table text to match the chosen implementation.

6. **The ERD says every dealership has exactly one active owner.** Empty dealerships are explicitly supported before the first owner is bound. Use “at most one active owner; an owner is assigned when the dealership is bootstrapped” or equivalent, and preserve the separate rule that a dealership with active staff must retain an owner.

7. **The schema references incorrectly point to Flyway.** The ERD caption and evidence paragraph direct readers to Flyway scripts as the schema source. The current `15-Data-Auth-and-Gateway.md` says the active .NET backend uses EF Core and Java/Flyway material is historical. Replace those references with the active EF Core schema/startup patches and label any historical SQL material as historical only.

8. **The §16.1 screenshot reference remains broken.** `../../project-plan/StatusReports3/img.png` does not exist. Fix or remove the Figure 13.4 image and its evidence claim.

9. **The flow table contains a malformed sentence.** FLOW-06 says “the vehicle writes the orders roll into stay audited.” Rewrite it as a clear statement of the work-order cost roll-up and its audit behavior.

### Earlier review findings superseded

- The current document has an ERD, a business data-flow diagram, and a data matrix; the previous “missing ERD” finding remains withdrawn.
- The current §8.0 traceability table does connect business outcomes to data, routes, services, errors, and deployment. The prior broad criticism that it stops before API/service ownership is withdrawn.
- A current static parse found **19 inline SVGs with no duplicate HTML IDs**, no broken fragment links, and one missing local image resource. This supersedes the first-pass duplicate-ID concern.

### Checks performed in this pass

- Re-ran `sonar analyze secrets` on the presentation, review record, and current API, data/auth, extension, and architecture references; no secrets were reported.
- Parsed local resource paths and in-page anchors; only the Sprint 3 `img.png` reference is missing, and all in-page fragments resolve.
- Compared the VIN error, sale data model, versioning, tenant keys, membership ownership, unlink behavior, and schema-source statements against the current API/data design documents.
- Did not render the HTML in a browser, so visual layout, SVG appearance, and print output still need visual inspection.

## Current-version recheck (2026-11-23)

The HTML changed since the previous pass. Several prior findings are now corrected in the page. This section reflects the current file, not the earlier snapshot.

### Previous findings now resolved in the HTML

- VIN duplicate references now consistently use **400 `VIN_DUP`** in the inspected locations.
- The sale walkthrough now uses `sold_to_name` for typed buyers and `customer_vehicle` for CRM buyers; the invented `sold_to_customer_id` reference is gone.
- Tenant-key wording distinguishes dealership audit rows from platform audit rows with an empty `dealer_id`.
- The owner rule now allows an unbound dealership to have no owner and states that active staff require an owner.
- The broken Sprint 3 image reference has been repaired; the local-resource check now resolves all referenced files.
- The ERD now identifies EF Core and the active `DealerOps.Core` startup patches as the live schema owner in its caption/evidence block.
- The earlier grammar issue in the FLOW-06 sentence is no longer present in the inspected table row.

### Remaining findings

1. **API error envelope description is still inaccurate.** §12 says every failure, including Gateway-generated errors and downstream failures, uses `{ code, message, requestId, fieldErrors }`. The current API contract says Gateway-generated 401/403/404 errors carry only `{code,message}`, `fieldErrors` is optional, and a Gateway downstream-connection failure uses `{code,message}` while forwarding downstream error bodies unchanged. Describe the envelope as status/source-dependent and point to the contract for the variants.

2. **Pagination field name differs from the contract.** §12 lists `{ items, page, size, total }`; `design/14-Backend-API-Contract.md` specifies `{items,page,size,totalElements}`. Use the contract's `totalElements` name.

3. **The soft-delete description still includes `customer_vehicle`.** §11's table/callout and the ERD dagger still say a customer-vehicle link is soft-deleted. `design/15-Data-Auth-and-Gateway.md` §4 says unlinking an in-stock vehicle removes the link row (V1 has no soft-delete column; it may be deleted/hard-deleted), while a sold link cannot be removed. Correct the ERD legend and soft-delete list to match the chosen implementation.

4. **One stale Flyway reference remains in the ERD introduction.** The nearby ERD evidence block now correctly says EF Core owns the live schema, but the paragraph introducing the diagram still says the authoritative schema is in document 15 “with the Flyway scripts it names.” The same file labels Java/Flyway snippets historical. Remove or clearly qualify this remaining reference so the section does not contradict itself.

5. **Versioning differs between the presentation and the current API contract.** The presentation lists `dealer`, `vehicle`, `customer`, `listing`, `work_order`, and `sales_lead` as versioned. `design/21-Feature-Extensions.md` does specify versions for work orders and leads, while `design/14-Backend-API-Contract.md` §1.3 currently lists only dealer, vehicle, customer, and listing. The presentation aligns with the extension requirements, but the canonical API contract has not caught up. Reconcile the contract and presentation so callers have one authoritative list.

6. **The FLOW-02 example says every row in its data list carries `dealer_id`.** It then correctly qualifies that platform-level audit rows may omit it, but the blanket wording still includes the `audit_event` entity. Consider saying “each dealership-owned business row” and separately describing the optional tenant key on audit rows.

### Static checks and current assessment

- Secrets scan passed for the HTML, review record, and current API, data/auth, architecture, extensions, and observability references.
- Static parsing found no duplicate IDs, no broken in-page links, and no missing local resources.
- Compared the current claims above against the current API/data design documents. No browser render, screen-reader review, or print rendering was performed.
- The document's end-to-end structure is now strong: §8.0 traces business goals through workflow, data, route, service, enforcement, and deployment; §11 and §17 reinforce those links. Current quality is approximately **8.5/10**, with the remaining score deductions concentrated in the contract mismatches above and the need for visual QA.
