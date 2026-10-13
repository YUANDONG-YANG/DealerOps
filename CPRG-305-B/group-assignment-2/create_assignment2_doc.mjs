import fs from 'node:fs/promises';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, PageBreak, ShadingType, BorderStyle } from '/Users/robin/IdeaProjects/DealerOps/node_modules/docx/dist/index.mjs';

const out = '/Users/robin/IdeaProjects/DealerOps/CPRG-305-B/group-assignment-2/DealerOps_Group_Assignment_2_Test_Plan.docx';
const blue = '1F4E78';
const light = 'D9EAF7';
const gray = 'F2F2F2';
const members = 'Yuandong Yang (Robin), Bedgel Fadhil Ndam Woukouo, Jackson Warga, and Logan Jones';
const today = 'October 13, 2026';

function p(text='', opts={}) {
  return new Paragraph({
    style: opts.style,
    alignment: opts.align,
    spacing: { after: opts.after ?? 100, line: 276 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 21, color: opts.color })]
  });
}
function bullet(text, level=0) { return new Paragraph({ bullet: { level }, spacing: { after: 60 }, children: [new TextRun({ text, size: 20 })] }); }
function heading(text, level=1) { return new Paragraph({ heading: level===1?HeadingLevel.HEADING_1:HeadingLevel.HEADING_2, spacing: { before: 220, after: 100 }, children: [new TextRun({ text, bold: true, color: blue, size: level===1?26:23 })] }); }
function cell(text, header=false, width=1200) {
  return new TableCell({ width: { size: width, type: WidthType.DXA }, shading: header ? { fill: blue, type: ShadingType.CLEAR } : undefined, margins: { top: 80, bottom: 80, left: 90, right: 90 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: String(text), bold: header, color: header ? 'FFFFFF' : '000000', size: header ? 17 : 16 })] })] });
}
function table(headers, rows, widths) {
  const border = { top: { style: BorderStyle.SINGLE, size: 4, color: 'B7C9D6' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'B7C9D6' }, left: { style: BorderStyle.SINGLE, size: 4, color: 'B7C9D6' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'B7C9D6' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'D9E2F3' }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D9E2F3' } };
  return new Table({ width: { size: 9360, type: WidthType.DXA }, borders: border, rows: [new TableRow({ children: headers.map((h,i)=>cell(h,true,widths?.[i]??1500)) }), ...rows.map((r,ri)=>new TableRow({ children: r.map((v,i)=>cell(v,false,widths?.[i]??1500)), cantSplit: true }))] });
}
function page() { return new Paragraph({ children: [new PageBreak()] }); }

const children = [];
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 900, after: 180 }, children: [new TextRun({ text: 'DealerOps', bold: true, size: 40, color: blue })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Group Assignment 2: Developing a Testing Plan', bold: true, size: 30 })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 320 }, children: [new TextRun({ text: 'Software Testing and Deployment (CPRG-305-B)', size: 23 })] }));
children.push(table(['Project','Group','Members','Course / version / date'], [['DealerOps capstone testing plan', 'Group 12 (team G2)', members, `CPRG-305-B · v1.0 · ${today}`]], [1800,1600,3600,2360]));
children.push(p('Submission note: This group document is paired with the separate Excel test-case document. Each group member submits the required peer assessment individually.', { italics: true, size: 18, after: 180 }));

children.push(heading('Rubric mapping'));
children.push(p('For the course rubric (Group Assignment Developing a Testing Plan Rubric), each criterion is addressed in the following locations:', { size: 20 }));
children.push(table(['Rubric criterion','Marks','Location in this plan'], [
 ['Description of the applications/systems being tested','/4','§2.1 System description; §2.2 Business purpose and stakeholders'],
 ['Testing objective','/4','§2.3 Testing objective'],
 ['Scope and limitation of the Test Plan','/4','§2.4 Scope and limitations; §4 Features to Be Tested; §5 Features Not to Be Tested'],
 ['Sources of business expertise','/4','§2.5 Sources of business expertise'],
 ['Sources of development expertise','/4','§2.6 Sources of development expertise'],
 ['Requirements for the testing environments and their management','/4','§11 Environmental Needs'],
 ['Testing details for development phase','/33','§6 Test Approach (SDLC levels, per Everett 2007 Ch. 5) + §6A Testing details per development phase (Review, Unit, Integration, System, Acceptance, Deployment, Regression)'],
 ['Sources of test data','/33','§11A Sources of test data'],
 ['Overall testing schedule','/5','§13 Schedule — Overall master schedule'],
 ['Peer review (individual submission)','/5','Separate individual file (Yuandong_Yang_Peer_Assessment.docx)']
], [4400,900,4060]));

children.push(heading('1. Test Plan Identifier'));
children.push(table(['Field','Value'], [['Test plan identifier','DO-CPRG305-GA2-TP-001'],['System under test','DealerOps web application and service platform'],['Document owner',members],['Baseline','DealerOps gateway, dealer-core, ai-service, and dealer-web source available at the assignment baseline'],['Plan status','Ready for review and execution planning'],['Date created',today]], [2200,7160]));

children.push(heading('2. Introduction'));
children.push(heading('2.1 System description',2));
children.push(p('DealerOps is a multi-tenant dealership operations platform built as four cooperating applications. The Vue 3 single-page client (dealer-web) is served to the browser and talks only to the dealer-gateway (Spring Cloud Gateway) on port 8080. The gateway authenticates the request, applies CORS and route policy, then forwards business requests to dealer-core (Spring Boot, port 8081) and forwards internal AI requests to ai-service (Spring Boot, port 8082) with an X-Dealer-Internal header. dealer-core owns identity, dealership membership and role authorization, vehicle and customer workflows, inventory listings, compliance evaluation, leads, work orders, photos, audit, and persistence to MySQL via Spring Data JPA with Flyway migrations. ai-service is an internal-only service that reviews structured ad facts and powers a constrained assistant.'));
children.push(p('The principal business workflow is: a dealership user signs in, manages vehicle and customer records, prepares a listing, runs a compliance check, triggers an AI ad check, marks the listing Ready, and exports only a listing that satisfies the readiness and compliance rules. The platform must protect dealer boundaries, prevent changes to sold inventory, prevent unsafe or misleading ad claims from being treated as approved, and avoid exposing internal service ports or sensitive information.'));
children.push(heading('2.2 Business purpose and stakeholders',2));
children.push(table(['Stakeholder / user','Need and quality expectation'], [['Dealer sales and inventory staff','Fast, accurate vehicle and customer workflows; clear validation and readiness feedback.'],['Dealer managers / administrators','Reliable membership, role, audit, listing, and export controls.'],['Customers and leads','Correctly scoped records and safe contact-data handling.'],['Capstone team / client representative','Traceable requirements, reproducible testing, and release evidence.'],['Course instructor / evaluator','Evidence that the test plan covers the rubric, risks, SDLC levels, and at least 50 test cases.']], [2600,6760]));
children.push(heading('2.3 Testing objective',2));
children.push(p('The business purpose of testing DealerOps is to protect the dealer’s brand, inventory data, and customers while demonstrating that the capstone product is release-ready. Testing is explicitly aligned to perceived business risk; each objective below exists because the business impact of failure is high.'));
children.push(table(['Objective','Business need / risk addressed','How success is measured'], [
 ['O1 — Prove tenant isolation','A dealer must never see or modify another dealer’s inventory, customers, or audit records. Cross-dealer disclosure would breach customer trust and dealer contracts.','All Dealer A ↔ Dealer B boundary cases pass; zero unauthorized read/write observed; audit record present for every attempt.'],
 ['O2 — Prove authentication and role control','Only authenticated users with the right role can perform business actions. Weak auth or role gaps allow data exposure or fraud.','Login, token-expiry, role, and admin-only cases pass; no unauthenticated or wrong-role success recorded.'],
 ['O3 — Prove listing readiness and export gating','A listing can only be marked Ready/exported with current PASSED compliance evidence. Publishing a non-ready listing creates misleading claims and reputational risk.','All compliance and readiness cases pass; export is impossible when evidence is missing or stale; UI matches API gating.'],
 ['O4 — Prove failure-safe AI behaviour','AI ad check must never silently fail-open. A false PASS would allow a misleading ad to publish.','On provider failure, timeout, missing key, or empty output, verdict is Unavailable/Block, not PASS; no secret or PII leaks.'],
 ['O5 — Prove inventory lifecycle integrity','A SOLD vehicle must not be edited; price and status changes must invalidate stale readiness. Protects accounting and listing accuracy.','State-transition cases pass; sold-lock enforced on API and UI; stale-evidence flag raised on edit.'],
 ['O6 — Prove secure service boundary','Only the gateway is publicly reachable; direct access to dealer-core/ai-service is blocked. Exposed ports undermine the whole security model.','Direct 8081/8082 access blocked; internal-header spoof rejected; CORS restricted to configured origin.'],
 ['O7 — Produce reproducible evidence','The team, client, and instructor can re-run the plan and compare results.','All cases executed with recorded build id, data snapshot, actor, and timestamp; defect log reconciled with cases.']
], [2200,4000,3160]));
children.push(heading('2.4 Scope and limitations of the Test Plan',2));
children.push(p('The plan covers the four services in the DealerOps monorepo at the current baseline: dealer-web, dealer-gateway, dealer-core, and ai-service, plus the MySQL schema managed by Flyway and the configured external calls to vPIC and the AI provider. In-scope levels are requirements/design review, unit, integration, system, and acceptance testing. In-scope data is synthetic multi-dealer data covering identity, inventory, listings, compliance evidence, customers, leads, work orders, photos, audit records, and AI prompt/response fixtures. In-scope non-functional checks are smoke latency on the gateway path, basic negative/security boundary checks, and failure-safe behavior for AI and database outages.'));
children.push(table(['Limitation / out of scope','Reason / boundary'], [
 ['Production-scale load, long-running soak, and disaster-recovery testing','The capstone test environment is a local workstation plus Testcontainers; results would not be representative.'],
 ['Internal correctness of third-party providers (vPIC, model provider)','We validate our adapter, timeout/error mapping, and failure-safe handling; the provider’s internal algorithms are outside our control.'],
 ['Real legal or OMVIC compliance determination','The ad-check prompt explicitly disclaims legal approval; we test the project contract, not legal compliance.'],
 ['Payment, accounting, external CRM integrations','No such route or implementation exists in the current baseline.'],
 ['Native iOS/Android apps','Deliverable is a browser-based client. Responsive-browser checks are included, native apps are not.'],
 ['Live-production customer data','PII rule: synthetic data only in all test artifacts and evidence.']
], [3200,6160]));
children.push(heading('2.5 Sources of business expertise',2));
children.push(p('Business (domain) expertise is the knowledge of what the product should do, from the point of view of dealership operations, customers, and the client. The following sources are used for test planning and execution:'));
children.push(table(['Business expertise source','What it informs','How we use it'], [
 ['Client / industry partner (capstone sponsor)','Dealer workflow priorities, acceptance thresholds, OMVIC / ad-check context, demo expectations.','Review ambiguous business rules before writing expected results; sign off on acceptance scenarios.'],
 ['Capstone product owner (course team / instructor)','Classroom acceptance criteria, demo flow, assignment constraints.','Confirm scope boundaries and the "must demo" acceptance list.'],
 ['Project requirements and user stories under design/','Explicit requirement statements and acceptance criteria (REQ-AUTH, REQ-TENANT, REQ-INV, REQ-COMP, REQ-AI, REQ-GW, REQ-CRM, REQ-WEB).','Each test case cites a Req ID; traceability table in §3 shows coverage.'],
 ['SAIT subject-matter courses and textbook (Everett 2007, course notes)','IEEE 829-style test plan structure, risk-based testing, documentation standards.','Shape the plan structure and the pass/fail/suspension language.'],
 ['Dealership-domain reference materials (vehicle status flows, VIN validation, OMVIC ad guidance)','Vehicle lifecycle (DRAFT→READY→SOLD), VIN format, "ad must not mislead" rules.','Define boundary values and risk-based priorities for inventory, listing readiness, and ad-check cases.'],
 ['Group member Yuandong Yang (Robin, full-stack lead)','Cross-service business flow and current product behavior.','Resolves day-to-day business/behavior questions during case drafting; escalates to client if blocked.']
], [2800,3400,3160]));
children.push(heading('2.6 Sources of development expertise',2));
children.push(p('Development (technical) expertise is the knowledge of how the system is built, which lets us design accurate, low-flakiness tests and interpret failures correctly. The following sources are used:'));
children.push(table(['Development expertise source','What it informs','How we use it'], [
 ['dealer-gateway, dealer-core, ai-service, dealer-web source and configuration','Actual routes, ports (8080/8081/8082), filters, security config, Flyway migrations, env vars.','Determine real endpoints, status codes, and headers for cases rather than guessing from docs.'],
 ['Spring Boot 3.3.x and Spring Cloud Gateway reference docs','Framework behavior, auto-config, filter order, timeout handling.','Clarify platform defaults so unexpected behavior is identified as a defect, not a test error.'],
 ['Spring Security reference docs','JWT resource-server, authentication filter, authorization rules.','Define auth negative cases and expected 401/403 behaviors.'],
 ['Spring Data JPA, Hibernate, Flyway, MySQL docs','Persistence, schema migration naming (V{YYYYMMDD}_{n}__…), transaction and locking behavior.','Design integration data checks and reset procedures.'],
 ['Vue 3 and Vite docs','Frontend reactivity, routing, build output, env handling.','Design system/UI cases and understand browser-side failures.'],
 ['Existing checked-in test suites and Testcontainers setup','What is already covered, where gaps are, how MySQL is spun up.','Avoid duplicating coverage; reuse the current Testcontainers harness.'],
 ['Course instructor and SAIT course notes (Chapter 5 — testing across the SDLC)','SDLC level definitions, entry/exit criteria, risk-based test design.','Shape §6 Test Approach and §6A per-phase details.'],
 ['Role-C team member Logan Jones (dealer-gateway, dealer-core)','Service internals, SQL schema, security filter order.','Technical review of auth/tenant/gateway cases.'],
 ['Role-B team member Jackson Warga (ai-service, dealer-platform)','AI client, timeouts, prompt builder, internal-only enforcement.','Technical review of AI boundary and failure-safe cases.'],
 ['Role-A team member Bedgel Fadhil Ndam Woukouo (dealer-web)','UI state machine, API error handling in the client, guard components.','Technical review of UI and workflow cases.']
], [2800,3400,3160]));
children.push(heading('2.7 Why quality matters',2));
children.push(p('A tenant-isolation or authorization failure could disclose or modify another dealer’s inventory and customer data. A readiness or compliance failure could publish a misleading listing. A sold-record mutation could corrupt operational and financial records. An internal-route or AI failure could expose service topology or sensitive data. Quality is therefore measured through zero open Critical defects, no cross-tenant data exposure, no unauthorized business mutation, correct readiness gating, and reproducible execution of all planned high-risk cases.'));

children.push(heading('3. Test Items'));
children.push(p('The traceability IDs below are used by the Excel test-case document. The document contains cases across review, unit, integration, system, and acceptance levels.'));
children.push(table(['Req ID','Requirement / risk statement','Test item(s)'], [
 ['REQ-AUTH','Users authenticate with valid credentials; protected APIs reject missing, invalid, or unauthorized identity.','TI-AUTH / UT-01–UT-02 / IT-01–IT-03 / AT-01'],
 ['REQ-TENANT','Dealer data is isolated by authenticated dealer membership; client-supplied dealer IDs cannot switch context.','TI-TENANT / UT-03 / IT-04–IT-05 / AT-02'],
 ['REQ-INV','Vehicle inventory supports validation, update, sale, photos, and sold-record locking.','TI-INV / UT-04–UT-05 / IT-06–IT-10 / SYS-01–SYS-02'],
 ['REQ-COMP','Listings require current passing compliance evidence before Ready or export; changes invalidate stale evidence.','TI-COMP / UT-06–UT-07 / IT-11–IT-13 / SYS-03 / AT-03'],
 ['REQ-AI','AI is internal-only, time-bounded, failure-safe, resource-scoped, and free of secret/contact leakage.','TI-AI / UT-08–UT-10 / IT-14–IT-16 / SYS-04 / AT-04'],
 ['REQ-GW','Gateway is the public boundary; route, CORS, timeout, health, and internal-header policies are enforced.','TI-GW / IT-17–IT-18 / SYS-05'],
 ['REQ-CRM','Customer, lead, work-order, and audit flows return correct tenant-scoped data and preserve audit expectations.','TI-CRM / IT-19–IT-20 / SYS-06 / AT-05'],
 ['REQ-WEB','The web client uses public gateway routes, handles blocked/unavailable AI states, and enables actions only when API state permits.','TI-WEB / SYS-07–SYS-10 / AT-06–AT-10']
], [1500,5040,2820]));

children.push(heading('4. Features to Be Tested'));
children.push(table(['Feature','Workflow / use case','Business risk / importance','Priority'], [
 ['Authentication and roles','Register or log in; call protected API; enforce role and membership','Unauthorized access would expose or change dealership data.','High'],
 ['Tenant isolation','User from Dealer A requests Dealer B vehicle, customer, listing, or audit record','Cross-dealer disclosure or mutation is a critical privacy and integrity risk.','High'],
 ['Inventory lifecycle','Create/update vehicle; add photo; sell vehicle; attempt locked edits','Inventory accuracy affects pricing, sales, and reporting.','High'],
 ['Listing readiness and export','Change listing; run compliance check; Ready; export','Incorrect publication can create misleading claims and reputational risk.','High'],
 ['AI ad check and assistant','Submit structured facts; AI passes/blocks; provider unavailable or slow','AI failure must fail safe and must not expose secrets or unsupported claims.','High'],
 ['Gateway and internal boundaries','Use public API; attempt direct core/AI or invalid internal header','Exposed ports or route confusion weakens the security boundary.','High'],
 ['Customers, leads, work orders, audit','Create/read/update records and audit events within tenant','Incorrect CRM records affect customer service and accountability.','Medium'],
 ['Photos and catalog lookup','Upload allowed image; reject oversized/invalid content; lookup VIN/catalog','Bad content or incorrect catalog data degrades listings.','Medium'],
 ['Web client guards and feedback','Complete listing workflow; handle blocked/unavailable states','UI may enable a business action that the API must reject.','Medium']
], [1900,2800,3360,1300]));

children.push(heading('5. Features Not to Be Tested'));
children.push(table(['Excluded item','Reason / boundary'], [
 ['Third-party provider correctness (vPIC or model provider internal algorithms)','The plan verifies our adapters, timeout/error mapping, and response handling; the external provider’s internal correctness and availability are outside the team’s control.'],
 ['Production-scale load and disaster recovery','The assignment environment is a local/Testcontainers environment; a separate performance/DR engagement would be required.'],
 ['Actual legal or OMVIC approval','The ad-check prompt explicitly does not provide legal approval. We test the project contract, not legal compliance.'],
 ['Payment processing, accounting, or external CRM integrations','No implementation or route is present in the current DealerOps architecture.'],
 ['Peer assessment content for other students','Each member submits the peer assessment individually; it is not part of this group test plan artifact.'],
 ['Mobile-native application behavior','The current deliverable is the browser-based dealer-web client. Responsive browser checks may be performed, but native apps are not in scope.']
], [3000,6360]));

children.push(heading('6. Test Approach (Strategy Across SDLC)'));
children.push(table(['Test level / phase','Purpose and techniques','Entry criteria','Exit criteria'], [
 ['Requirements and design review','Traceability review, boundary-value analysis, abuse-case review, walkthrough of routes, roles, tenant boundaries, and failure codes.','Current requirements, source, and architecture are available.','All high-risk requirements have an owner, test IDs, and an agreed expected result; ambiguities logged.'],
 ['Unit testing','White-box tests for validation, role/tenant guards, state transitions, prompt boundaries, timeout mapping, and error handling. Use the existing framework test suites.','Feature code compiles; unit test data is deterministic.','All planned unit cases pass; no Critical/Major defect remains in the changed unit.'],
 ['Integration testing','Black-box/API and component integration using MockMvc/WebTestClient, gateway routing, Testcontainers MySQL/Flyway, and controlled AI responses.','Services/build are available; schema migrates cleanly; seeded users and dealer data exist.','All high-priority integration cases pass; tenant, auth, persistence, and service-boundary evidence captured.'],
 ['System testing','End-to-end browser/API workflows through dealer-gateway; regression, exploratory, negative, security-boundary, and usability checks.','Gateway, core, AI, database, and web build are deployed to the test environment.','All planned system cases executed; no open Critical/Major release blocker; readiness workflow demonstrated.'],
 ['Acceptance testing','Client-style scenarios for login, inventory, compliance, export, and safe AI failure behavior. Use realistic synthetic dealership data.','System test exit met; acceptance data and scripts approved.','Acceptance owner signs off or records explicit deferrals; final summary states release readiness and residual risk.']
], [1800,3300,2130,2130]));
children.push(p('Coverage target: execute 100% of High-priority cases and at least 95% of all planned cases; achieve 100% coverage of the traceability rows above; record evidence for every executed case. A case is not considered passed because the UI “looks right”—the expected API status, response shape, persistence effect, tenant boundary, and error code must be observed where applicable.'));

children.push(heading('6A. Testing details for each development phase'));
children.push(p('This section expands §6 into a per-phase execution playbook so another tester can pick it up and run it. Each phase lists its purpose, activities, techniques, tools, deliverables, owner, and the test-case IDs in the companion workbook.'));

children.push(heading('6A.1 Requirements and design review phase',2));
children.push(p('Purpose: lock in a shared understanding of what will be tested, before writing any case or code. Verifies that each requirement is testable and that risks are identified early (shift-left).'));
children.push(table(['Attribute','Detail'], [
 ['Activities','Walkthrough of requirements under design/; traceability of each REQ-* ID to a test item (TI-*); abuse-case brainstorming; risk ranking (High/Medium/Low); confirmation of ambiguous business rules with client/instructor; approval of the test item traceability table in §3.'],
 ['Techniques','Static review, requirement inspection, boundary-value analysis on the written requirement, abuse-case / "misuse" review, risk-based prioritization.'],
 ['Tools / artifacts','Markdown requirements in design/, this plan, the test case workbook, GitHub issue tracker for ambiguities.'],
 ['Entry criteria','Current baseline requirements, acceptance criteria, and architecture docs are available.'],
 ['Exit criteria','Every REQ-* ID has at least one test item and one owner; all identified ambiguities are either resolved or logged as a known assumption in the case.'],
 ['Deliverables','Approved §3 traceability table; risk log; list of logged assumptions.'],
 ['Owner','Yuandong Yang (QA lead)'],
 ['Test cases','ST-01 to ST-05 (5 cases).']
], [1800,7560]));

children.push(heading('6A.2 Unit testing phase',2));
children.push(p('Purpose: verify individual classes and methods in isolation before integration. Catches defects at the lowest cost.'));
children.push(table(['Attribute','Detail'], [
 ['Activities','Write/execute JUnit tests for validation, auth/tenant guards, state transitions, prompt boundaries, timeout mapping, and error handling. Review existing checked-in unit tests to avoid duplicate coverage.'],
 ['Techniques','White-box (statement/branch), boundary-value analysis, equivalence partitioning, state transition.'],
 ['Tools','JUnit 5, Mockito, Spring Boot test slices (@WebMvcTest, @DataJpaTest), Maven Surefire. Target source build: Corretto JDK 21.'],
 ['Entry criteria','Feature code compiles; unit test data is deterministic (no network, no real DB).'],
 ['Exit criteria','All planned unit cases pass; no Critical/Major defect remains in the changed unit; unit summary attached to the build run.'],
 ['Deliverables','Surefire reports, unit case evidence rows in the workbook (UT-01…UT-10), defect log for failed cases.'],
 ['Owner','Logan Jones (dealer-core, dealer-gateway) and Jackson Warga (ai-service, dealer-platform).'],
 ['Test cases','UT-01 to UT-10 (10 cases).']
], [1800,7560]));

children.push(heading('6A.3 Integration / API testing phase',2));
children.push(p('Purpose: verify that modules and services work together: controller → service → repository → MySQL, and gateway → core / gateway → ai-service.'));
children.push(table(['Attribute','Detail'], [
 ['Activities','Call REST endpoints through MockMvc/WebTestClient; exercise gateway routing to a real core/AI stack; verify persistence with Testcontainers MySQL and Flyway; verify tenant isolation; verify AI timeout, missing-key, and failure-safe mapping; verify internal-header spoofing attempts are rejected.'],
 ['Techniques','Black-box API testing, equivalence partitioning, negative testing, state transition, cross-tenant matrix (A↔B), controlled failure injection on AI stub.'],
 ['Tools','Spring Boot MockMvc / WebTestClient, Testcontainers MySQL 8.x, Flyway, WireMock or local stub for the AI provider, HTTP CLI (httpie/curl) for ad-hoc checks.'],
 ['Entry criteria','Unit exit met; services/build available; schema migrates cleanly; seeded users and dealer data exist.'],
 ['Exit criteria','All High-priority integration cases pass; tenant, auth, persistence, and service-boundary evidence captured; no open Critical defect in auth/tenant/gateway/compliance.'],
 ['Deliverables','API response and DB-check evidence, integration case rows (IT-01…IT-20), defect log.'],
 ['Owner','Logan Jones (gateway/core/data) with Jackson Warga for AI boundary and failure-mapping cases.'],
 ['Test cases','IT-01 to IT-20 (20 cases).']
], [1800,7560]));

children.push(heading('6A.4 System testing phase',2));
children.push(p('Purpose: verify complete end-to-end workflows through the real stack (dealer-web → dealer-gateway → dealer-core/ai-service → MySQL), as a user would experience them.'));
children.push(table(['Attribute','Detail'], [
 ['Activities','Browser-driven end-to-end workflows (create vehicle, upload photo, run compliance check, mark Ready, export; AI unavailable fail-safe; session expiry; sold-vehicle read-only; direct 8081/8082 blocked). Smoke latency on the gateway path.'],
 ['Techniques','Black-box end-to-end, regression on previously-passing workflows, exploratory, negative, security-boundary (direct-port attempt), basic performance smoke.'],
 ['Tools','Chrome and a secondary Chromium browser; browser devtools (network, console, storage); gateway and service logs; screenshot evidence.'],
 ['Entry criteria','Integration exit met; gateway, core, AI, DB, and web build deployed to the test environment; synthetic data loaded.'],
 ['Exit criteria','All planned system cases executed; no open Critical/Major release blocker; readiness workflow demonstrated end-to-end.'],
 ['Deliverables','Screenshots, console/network logs, system case rows (SYS-01…SYS-10), defect log.'],
 ['Owner','Bedgel Fadhil Ndam Woukouo (UI/workflow) with Logan Jones for boundary and gateway cases.'],
 ['Test cases','SYS-01 to SYS-10 (10 cases).']
], [1800,7560]));

children.push(heading('6A.5 Acceptance testing phase',2));
children.push(p('Purpose: confirm the product meets client/stakeholder needs and is ready for the capstone demo. Uses client-style scenarios on synthetic dealership data.'));
children.push(table(['Attribute','Detail'], [
 ['Activities','Walk a client representative or instructor-reviewer through the acceptance scenarios: dealer sign-in, cross-tenant isolation check, listing readiness and export, AI fail-safe, audit filtering, non-admin denial, user-readable error messages, browser compatibility, PII scrub.'],
 ['Techniques','Scenario-based acceptance, usability check, confirmation testing, pre-submission data scrub for real PII.'],
 ['Tools','Staging environment; browser; synthetic acceptance dataset; evidence checklist.'],
 ['Entry criteria','System exit met; acceptance dataset and scripts approved; residual defects dispositioned.'],
 ['Exit criteria','Acceptance reviewer signs off or records explicit deferrals; final summary states release readiness and residual risk; no real PII in evidence.'],
 ['Deliverables','Signed acceptance checklist, acceptance case rows (AT-01…AT-10), final test summary.'],
 ['Owner','Group consensus with instructor/client representative; Yuandong Yang (QA lead) owns final summary.'],
 ['Test cases','AT-01 to AT-10 (10 cases).']
], [1800,7560]));

children.push(heading('6A.6 Deployment / release phase',2));
children.push(p('Purpose: verify the build is deployable, configurable, and observable. Catches defects introduced by packaging, configuration, migrations, or operational handoff — the "and Deployment" half of the course.'));
children.push(table(['Attribute','Detail'], [
 ['Activities','Build the full stack with the project Maven wrapper (JDK 21, Corretto); apply Flyway migrations from a clean MySQL; start services with env-var-driven config; verify /actuator/health and gateway routing; verify logs are English-only (per CLAUDE.md) and contain no secrets; verify dealer-web Vue/Vite build artifacts; verify rollback by restoring a previous commit and running migrations in a non-destructive order.'],
 ['Techniques','Configuration test, migration test, smoke test, log inspection, rollback drill.'],
 ['Tools','Maven wrapper, Docker (for MySQL only — Testcontainers, no app Docker locally per project rule), gateway health probe, log-sum/ service log collector.'],
 ['Entry criteria','System and acceptance phases produce no open release blocker; build identifier recorded.'],
 ['Exit criteria','Clean build reproducible from a fresh checkout; services start, migrate, and respond on their configured ports (8080/8081/8082) with correct health; no secret or Chinese-only log line present; rollback drill succeeds without data loss on reversible migrations.'],
 ['Deliverables','Deployment checklist, migration/rollback evidence, final test summary and release recommendation.'],
 ['Owner','Yuandong Yang (release/full-stack) with Logan Jones for migrations.'],
 ['Test cases','Deployment smoke bundle = IT-17 (gateway health) + IT-16 (AI port blocked) + SYS-05 (direct 8081/8082 blocked) + AT-06 (golden workflow on fresh build).']
], [1800,7560]));

children.push(heading('6A.7 Regression and release-readiness phase',2));
children.push(p('Purpose: whenever a defect is fixed or a build changes, run the linked and surrounding cases again before closing the defect or shipping the release.'));
children.push(table(['Attribute','Detail'], [
 ['Activities','For each closed defect, re-execute the linked test case; also execute the regression bundle (all High-priority cases). Verify no new Critical/Major defects. Run a short smoke pass against the final build.'],
 ['Techniques','Confirmation testing, regression, risk-based re-run.'],
 ['Tools','Same tooling as integration/system/acceptance; CI pipeline (GitHub Actions) if available for unit/integration.'],
 ['Entry criteria','Fix build available with recorded build id; defect reproducer and linked case id attached.'],
 ['Exit criteria','All linked cases pass; regression bundle has no open Critical/Major; final test summary approved.'],
 ['Deliverables','Regression evidence, updated defect log with Retest Pass/Fail, final test summary and release recommendation.'],
 ['Owner','QA lead with service owners for fixes.'],
 ['Test cases','All High-priority IDs across UT/IT/SYS/AT are the regression bundle.']
], [1800,7560]));

children.push(heading('7. Item Pass/Fail Criteria'));
children.push(table(['Decision','Objective rule'], [['Pass','Observed result matches the expected result, required data is correctly persisted or rejected, security and tenant boundaries hold, and no unhandled error or information leak occurs. Performance smoke thresholds are met: normal gateway request ≤3 seconds excluding intentionally delayed AI; AI hard timeout behavior returns within 15 seconds.'],['Fail','Any expected status/body/state differs; unauthorized access succeeds; another tenant’s data is exposed; a blocked or stale listing becomes Ready/exportable; a sold record is mutated; or a service crashes/leaks secrets.'],['Severity','Critical: data exposure/loss, auth bypass, unsafe export, or release-blocking outage. Major: high-impact feature failure with limited workaround. Minor: low-impact validation, wording, or cosmetic issue. Critical and Major defects must be resolved or formally waived before release.']],[1500,7860]));

children.push(heading('8. Suspension and Resumption Criteria'));
children.push(table(['Condition','Suspension action','Resumption action'], [
 ['Test environment unavailable for >30 minutes or database cannot migrate','Pause affected cases; preserve logs and mark environment blocker.','Confirm service health, schema migration, and one smoke case pass before continuing.'],
 ['Any open Critical defect in auth, tenant isolation, sold-lock, compliance gate, or export','Stop dependent execution and raise a release-blocking defect.','Developer supplies fix/build; targeted retest and regression of linked cases pass.'],
 ['Two or more open Major defects in the same workflow','Pause that workflow to prevent misleading failure counts.','Triage owner confirms workaround or fix; all linked cases are re-executed.'],
 ['Seed data missing, corrupted, or contaminated with real PII','Stop cases using that data; quarantine and regenerate synthetic data.','Data owner verifies reset script and privacy checklist; one data-integrity smoke test passes.'],
 ['AI provider unavailable or key absent','Do not suspend the whole plan; execute failure-safe cases and mark live-provider cases blocked with evidence.','Provider/key restored or approved stub enabled; rerun live-provider cases and retain unavailable-path evidence.']
], [2500,3440,3420]));

children.push(heading('9. Test Deliverables'));
children.push(table(['Deliverable','Description','Owner / evidence'], [
 ['Test plan (this document)','Scope, risks, environment, SDLC approach, schedule, responsibilities, and traceability.','Group; approved by all three members before execution.'],
 ['Test case document','Excel workbook containing 50+ detailed cases with IDs, requirements, phases, data, steps, expected results, status, and evidence fields.','Group; separate submission artifact.'],
 ['Execution evidence','API responses, screenshots, logs, database checks, and build/test reports linked to case IDs.','Assigned tester for each run; stored in course/project evidence location.'],
 ['Defect log','ID, reproduction steps, expected/actual, severity, owner, status, retest result, and linked case.','Tester / QA lead.'],
 ['Final test summary','Executed/pass/fail/blocked counts, defect trend, residual risk, and release recommendation.','QA lead; completed after acceptance testing.']
], [1900,4500,2960]));

children.push(heading('10. Testing Tasks and Responsibilities'));
children.push(table(['Role','Measurable responsibilities','Owner'], [
 ['QA lead / plan coordinator','Maintain this plan and traceability; review 100% of High-priority cases; publish weekly status and final summary.','Yuandong Yang (Robin)'],
 ['Gateway / core API and security tester','Execute auth, tenant, gateway, AI-boundary, negative, and error-mapping cases on dealer-gateway and dealer-core; attach response evidence.','Logan Jones'],
 ['AI service and platform tester','Execute AI prompt-boundary, timeout, failure-safe, and dealer-platform cases; verify internal-only enforcement.','Jackson Warga'],
 ['Workflow and UI tester','Execute inventory, customer, listing, readiness, export, photo, and browser system cases on dealer-web; attach screenshots.','Bedgel Fadhil Ndam Woukouo'],
 ['Developer support / triage','Provide build identifiers, investigate failures, fix defects, and document root cause without changing test evidence.','Team member who owns the affected service'],
 ['Acceptance reviewer','Review client-facing scenarios and approve or record residual risk before final submission.','Group consensus / instructor or client representative']
], [2200,5200,1960]));

children.push(heading('11. Environmental Needs'));
children.push(table(['Item','Requirements / setup and management','Responsible'], [
 ['Hardware','Developer machine with 4+ CPU cores, 8+ GB RAM, 10+ GB free disk; browser at 1440×900 or equivalent; Docker resources sufficient for MySQL/Testcontainers.','Team'],
 ['Backend runtime','Java 21 (Corretto 21); Maven wrapper; Spring Boot 3.3.5 services. dealer-gateway listens on 8080, dealer-core on 8081, ai-service on 8082.','Logan Jones / Jackson Warga'],
 ['Database','MySQL Testcontainers for integration tests; Flyway migrations applied from dealer-core; use isolated schema/database per run and reset synthetic records between suites.','Logan Jones'],
 ['Frontend/browser','dealer-web Vue/Vite build; current supported Chrome and one secondary Chromium-based browser; use browser devtools only for evidence, never direct service ports from the UI.','Bedgel Fadhil Ndam Woukouo'],
 ['Network / security','Gateway is the public entry point. Core and AI direct ports must be blocked from browser access. Internal AI calls require X-Dealer-Internal; browser CORS allows only configured public headers.','Logan Jones'],
 ['Configuration','Use environment variables for DB URL/credentials, JWT secret, CORE_URL, AI_URL, INTERNAL_TOKEN, vPIC URL, and AI timeouts. Never place real keys or PII in the workbook or screenshots.','Yuandong Yang (QA lead)'],
 ['Build/version control','Record Git commit/build identifier, Java/Maven versions, service ports, browser version, and database image for every execution batch.','Yuandong Yang (QA lead)'],
 ['Backup and reset','Before destructive data tests, record seed IDs; restore by re-running deterministic seed/reset scripts. Do not reuse another test’s sold or blocked record without resetting its state.','Logan Jones']
], [1900,5600,1860]));
children.push(p('Synthetic data matrix: use at least two dealers (Dealer A and Dealer B), one admin and one business user per dealer, an unbound user, valid/invalid VINs, model years at and outside allowed boundaries, vehicles in draft/ready/sold states, customers with and without linked vehicles, listings with current/pass, current/block, stale, and missing compliance evidence, and AI responses for success, timeout, missing key, provider failure, empty output, and prompt-boundary cases. Never use production customer contact information.'));

children.push(heading('11A. Sources of test data'));
children.push(p('Test data is a first-class deliverable for this plan. The rubric weighs it heavily because incorrect, missing, or production-sourced data can invalidate every result above it. This section describes where each data category comes from, how it is created and reset, how it is kept private, and which test cases consume it.'));

children.push(heading('11A.1 Data strategy and privacy rules',2));
children.push(bullet('Synthetic-only rule: no real customer, dealer, or employee PII enters any test input, screenshot, log, or evidence file. If real PII is discovered, the affected evidence is quarantined and regenerated.'));
children.push(bullet('Deterministic rule: every data set is reproducible by re-running a seed script or Flyway migration; no case depends on hand-crafted ad-hoc rows that cannot be rebuilt.'));
children.push(bullet('Isolation rule: each test run uses its own schema (Testcontainers) or a dedicated test database; destructive cases never share state with other cases without an explicit reset.'));
children.push(bullet('Boundary rule: every category includes at least one valid value, one invalid value, and one boundary value to exercise acceptance and rejection paths.'));
children.push(bullet('No-secret rule: API keys, JWT secrets, DB credentials, and the AI provider key are environment variables, not test data. Evidence captures masked values only.'));

children.push(heading('11A.2 Data source inventory',2));
children.push(table(['Data category','Primary source','Generation method','Privacy / anonymization','Reset / setup','Consumed by cases'], [
 ['Dealership records (Dealer A, Dealer B)','Seed script in dealer-core (Flyway test migration)','Hand-crafted deterministic rows (dealer_id, name, status)','Fictitious dealer names; no real dealership identity','Flyway re-run on fresh schema; Testcontainers per run','ST-02, IT-04, IT-05, SYS-05, AT-02'],
 ['Users and credentials (admin + sales per dealer, unbound user)','Seed script; passwords generated by BCrypt at seed time','Deterministic username pattern (admin@dealer-a.example); random high-entropy password written to .env.test','Fake @dealer-a.example / @dealer-b.example domains; no real email','Reseeded with the dealers; password reset via seed script','UT-01, UT-02, IT-01, IT-02, IT-03, SYS-07, SYS-10, AT-01, AT-07'],
 ['JWT tokens','Issued by the running dealer-core at test time','AuthController.login called with seed credentials; short-lived tokens for expiry tests','No PII in claims beyond userId and dealerId','Reissue each run; expired tokens generated with past exp claim','UT-02, UT-03, IT-01, IT-03, SYS-07'],
 ['Vehicles (DRAFT, READY, SOLD, invalid-VIN)','Seed script + Faker-style VIN generator','Deterministic VINs with correct check digit for valid rows; hand-crafted invalid-length VIN for negative cases','Fictitious owner metadata only','Reseeded; sold vehicles reset to DRAFT via reset script','ST-03, UT-04, UT-05, IT-06, IT-07, IT-08, SYS-01, SYS-08, AT-06, AT-08'],
 ['Vehicle photos','Checked-in sample images under src/test/resources (2 MB JPEG and 6 MB JPEG for size boundary); a mislabeled .exe for mime-type negative','Static files committed to the repo under a test fixtures folder','Public-domain / self-generated images only','No reset needed; files are read-only fixtures','IT-09, IT-10, SYS-02'],
 ['Listings and compliance evidence (PASS, BLOCK, STALE, MISSING)','Seed script + ComplianceEvaluator fixtures','Pre-built evidence records with controlled timestamps so stale/current branches can be triggered','N/A — compliance records are structural','Reseeded; a mutate-then-check procedure recreates STALE on demand','UT-06, UT-07, IT-11, IT-12, IT-13, SYS-03, AT-03'],
 ['Customers and leads','Seed script; synthetic Faker names, test emails','Deterministic rows per dealer; one customer linked to Dealer B only (for cross-tenant case)','Fake names, @customer-test.example domain','Reseeded per run','IT-19, IT-20, SYS-06, AT-05'],
 ['Work orders and audit records','Seed script + runtime-generated events from executed test cases','Seed baseline; additional rows produced by the actions in IT-19/SYS-06','N/A — references synthetic customer IDs only','Audit table truncated on run reset','IT-20, SYS-06, AT-05'],
 ['AI provider responses (PASS, BLOCK, timeout, 5xx, empty, missing-key)','WireMock stub or in-process AI stub bean','Response fixtures stored under src/test/resources/ai/*.json; delay and status configured per test','No real provider output; prompts contain only synthetic listing facts','Stub reset between cases; provider key omitted via env var for missing-key test','ST-04, UT-08, UT-09, UT-10, IT-14, IT-15, IT-16, SYS-04, AT-04'],
 ['vPIC VIN lookup responses','WireMock stub mirroring the real vPIC JSON shape','Snapshot of real vPIC JSON structure for a few representative VINs, with fields anonymized','Snapshot does not include any customer or dealer data','Stub always returned from fixture; no live call during tests','IT-08, SYS-01'],
 ['Gateway/network data (hostnames, ports, CORS origin)','Env-var configuration','application-test.yml plus env vars (gateway=8080, core=8081, ai=8082, CORS origin=http://localhost:5173)','No sensitive data (hostnames are localhost)','Driven by environment, resettable','ST-05, IT-17, IT-18, SYS-05'],
 ['Browser-side data (session storage, local storage)','Produced at runtime by dealer-web during system cases','Observed via devtools; cleared via logout action in SYS-10','No PII beyond synthetic token payloads','Browser profile reset between acceptance runs','SYS-07, SYS-10, AT-08'],
 ['Negative / abuse data (SQLi probes, oversized payloads, forged X-Dealer-Internal header)','Hand-crafted fixtures listed in the plan','String literals and request snippets stored in the workbook alongside the case','No live attack data; synthetic patterns only','N/A — produced at run time','IT-05, IT-18, SYS-05']
], [1700,1700,1700,1500,1400,1360]));

children.push(heading('11A.3 Data setup, reset, and traceability procedure',2));
children.push(bullet('Setup: on each test run, (a) Testcontainers starts an isolated MySQL 8; (b) Flyway migrates to the latest versioned schema; (c) a V{YYYYMMDD}_{n}__seed_test_data.sql script loads dealers, users, vehicles, listings, customers, and audit baseline; (d) stubs (AI, vPIC) are started with their fixtures.'));
children.push(bullet('Reset: between destructive case groups, the data owner (Logan Jones) truncates mutable tables (vehicles.status back to DRAFT, listings.status back to NOT_READY, audit cleared) and re-runs the seed; the reset step is logged in the case evidence.'));
children.push(bullet('Traceability: every workbook row names its primary data category in the Pre-Conditions column; this section is the source of truth for how that data is produced.'));
children.push(bullet('Rotation: synthetic data is reviewed every assignment baseline; any accidental resemblance to a real dealer/customer is corrected and the plan version is bumped.'));

children.push(heading('11A.4 Data risks and contingencies',2));
children.push(table(['Data risk','Impact','Mitigation'], [
 ['Real PII enters a screenshot or log','Privacy breach; invalidates evidence','Synthetic-only rule; pre-submission scrub (AT-10); immediate quarantine if found.'],
 ['Shared stale data between cases','False failures or false passes','Isolation rule + per-run Testcontainers; destructive cases followed by reset.'],
 ['AI stub drift from provider contract','Tests pass but live provider fails','Snapshot refresh when the provider contract changes; a smoke IT case runs against the live provider when safe.'],
 ['Secret leaks via env file','Credential compromise','.env.test ignored by git; secrets stored only in CI/local env; evidence masks values.'],
 ['Seed script and Flyway schema out of sync','Setup fails; blocks execution','Seed script versioned alongside schema; CI job runs migrate+seed smoke before test batches.']
], [2700,2500,4160]));

children.push(heading('12. Staffing and Training Needs'));
children.push(table(['Role','Skills required','Training / preparation','Responsible'], [
 ['QA lead','Traceability, defect triage, report writing, risk-based prioritization','30-minute review of rubric and IEEE-style plan; confirm severity rules and evidence naming.','Yuandong Yang (Robin)'],
 ['Gateway/core API and security tester','HTTP, JWT, Spring Security, gateway routes, Flyway, negative testing','Review route/security configuration and internal-header contract before execution.','Logan Jones'],
 ['AI service and platform tester','HTTP, prompt-boundary analysis, timeout/error mapping, platform integration','Review AI client, timeout and error mapping, and internal-only enforcement.','Jackson Warga'],
 ['Workflow/UI tester','Vue browser workflows, API state interpretation, screenshot evidence','Walk through inventory-to-export acceptance flow and blocked/unavailable UI states.','Bedgel Fadhil Ndam Woukouo'],
 ['All members','Clear case writing, reproducible steps, communication','Peer review all High cases; calibration run of one pass and one fail case.','Group']
], [1900,3000,3260,1200]));

children.push(heading('13. Schedule'));
children.push(p('The individual case schedule below is distinct from the master testing schedule. Dates are a practical execution baseline for the assignment and can be updated with actual dates without changing case IDs.'));
children.push(heading('Test-case writing and review schedule',2));
children.push(table(['Activity','Start','End','Responsible','Status'], [
 ['Draft requirements/design review cases ST-01–ST-05','Oct 13, 2026','Oct 13, 2026','Yuandong Yang (Robin)','Planned'],
 ['Draft unit cases UT-01–UT-10','Oct 13, 2026','Oct 14, 2026','Logan Jones / Jackson Warga','Planned'],
 ['Draft integration cases IT-01–IT-20','Oct 13, 2026','Oct 15, 2026','All members by assigned area','Planned'],
 ['Draft system and acceptance cases SYS-01–SYS-10, AT-01–AT-10','Oct 14, 2026','Oct 15, 2026','Bedgel Fadhil Ndam Woukouo / QA lead','Planned'],
 ['Peer review, deduplication, traceability check, and approval','Oct 15, 2026','Oct 16, 2026','All members','Planned']
], [3100,1300,1300,2200,1460]));
children.push(heading('Test execution and reporting schedule',2));
children.push(table(['Phase / activity','Start','End','Dependency / output'], [
 ['Environment and synthetic-data smoke','Oct 16, 2026','Oct 16, 2026','Services/build available; environment checklist and seed evidence.'],
 ['Unit execution and review','Oct 16, 2026','Oct 17, 2026','Code build complete; unit result summary and defects.'],
 ['Integration/API execution','Oct 17, 2026','Oct 19, 2026','Unit exit met; API responses, DB checks, gateway/AI boundary evidence.'],
 ['System/browser execution','Oct 20, 2026','Oct 21, 2026','Integration exit met; end-to-end workflow evidence.'],
 ['Acceptance execution','Oct 22, 2026','Oct 22, 2026','System exit met; stakeholder scenarios and sign-off/deferrals.'],
 ['Defect retest and regression','Oct 23, 2026','Oct 24, 2026','Fix builds available; linked retest and regression evidence.'],
 ['Final results analysis and summary','Oct 25, 2026','Oct 25, 2026','All executable cases complete or dispositioned; release recommendation.']
], [2600,1300,1300,4160]));
children.push(heading('Overall master schedule',2));
children.push(table(['Milestone','Date','Completion evidence'], [
 ['Plan and case baseline approved','Oct 16, 2026','Approved DOCX and 50+ case workbook; traceability check complete.'],
 ['Environment ready','Oct 16, 2026','Build/version record, service health, schema migration, and synthetic-data smoke pass.'],
 ['Integration exit','Oct 19, 2026','High-risk auth, tenant, persistence, gateway, AI failure, and compliance cases executed.'],
 ['System exit','Oct 21, 2026','Browser/API workflows through gateway complete; no critical blocker.'],
 ['Acceptance exit','Oct 22, 2026','Client-style workflows accepted or residual risk recorded.'],
 ['Final test summary','Oct 25, 2026','Pass/fail/blocked counts, defect disposition, and release recommendation.']
], [3100,1600,4660]));

children.push(heading('14. Risks and Contingencies'));
children.push(table(['Risk','Likelihood','Impact','Mitigation / contingency','Owner'], [
 ['Cross-tenant authorization defect','Medium','High','Run Dealer A/B matrix on every affected endpoint; stop release on any disclosure or mutation.','Logan Jones'],
 ['AI provider unavailable, missing key, or slow','High','Medium/High','Use controlled failure cases; verify 503/502/504 mapping and safe UI latch; rerun live cases when available.','Jackson Warga'],
 ['Database/Testcontainers resource failure','Medium','High','Reserve Docker resources, capture image/version, and use isolated schema reset; keep environment blocker separate from product defect.','Logan Jones'],
 ['Incomplete/ambiguous business rule','Medium','Medium','Record question, identify affected IDs, obtain client/instructor decision, and update expected result before execution.','Yuandong Yang (QA lead)'],
 ['Build delivery delay','Medium','High','Prioritize static review and unit cases; maintain a known-good build; shift dependent dates without marking unexecuted cases as passed.','Service owners'],
 ['Real PII enters test evidence','Low','High','Synthetic-only data rule, pre-submission evidence scrub, and immediate quarantine/deletion if discovered.','All members'],
 ['Browser UI enables an action despite API state','Medium','Medium','Use API as source of truth; add UI system case and verify server-side rejection as a separate integration case.','Bedgel Fadhil Ndam Woukouo']
], [2200,1000,1100,3900,1160]));

children.push(heading('15. Approvals'));
children.push(p('Signatures can be added by the group and instructor/client representative before execution. The absence of a signature in this working baseline does not convert unexecuted cases into passes.'));
children.push(table(['Name','Role / title','Signature','Date'], [['Yuandong Yang (Robin)','QA lead / group member','________________________','________________'],['Bedgel Fadhil Ndam Woukouo','Workflow/UI tester / group member','________________________','________________'],['Jackson Warga','AI service and platform tester / group member','________________________','________________'],['Logan Jones','Gateway/core API and security tester / group member','________________________','________________'],['Instructor or client representative','Reviewer (if required)','________________________','________________']], [2600,2700,2500,1560]));

children.push(heading('16. References'));
children.push(p('Everett, G. D., & McLeod, R. (2007). Software testing: Testing across the entire software development life cycle. Wiley-IEEE Computer Society Press. (Course textbook; Chapter 5 informs the SDLC-level approach used in §6 and §6A.)'));
children.push(p('DealerOps project repository. (2026). DealerOps gateway, dealer-core, ai-service, and dealer-web source code and configuration. Internal project source.'));
children.push(p('International Organization for Standardization. (2017). ISO/IEC/IEEE 29119-2:2013 software testing—Test processes (used as a terminology and planning reference consistent with the IEEE 829-style structure in the course template).'));
children.push(p('Spring. (2024). Spring Boot reference documentation (3.3.x). https://docs.spring.io/spring-boot/docs/3.3.x/reference/html/'));
children.push(p('Spring. (2024). Spring Cloud Gateway reference documentation. https://docs.spring.io/spring-cloud-gateway/reference/'));
children.push(p('Spring. (2024). Spring Security reference documentation. https://docs.spring.io/spring-security/reference/'));
children.push(p('Vue.js. (2024). Vue documentation. https://vuejs.org/guide/'));
children.push(p('SAIT. (2026). CPRG-305-B Group Assignment 2: Developing a Testing Plan rubric and template. Course material.'));

children.push(heading('Appendices'));
children.push(heading('Appendix A — Test case workbook mapping',2));
children.push(p('The companion workbook DealerOps_Group_Assignment_2_Test_Cases.xlsx contains 55 detailed test cases: ST-01–ST-05 (requirements/design review), UT-01–UT-10 (unit), IT-01–IT-20 (integration), SYS-01–SYS-10 (system), and AT-01–AT-10 (acceptance). It uses the supplied Test Case Development Template columns to make execution auditable.'));
children.push(heading('Appendix B — Submission note',2));
children.push(p('The peer assessment is intentionally not included in the group plan. Each group member completes and submits the required peer assessment individually using the course form and the rubric’s 1–3 scale.'));

const doc = new Document({ creator: 'DealerOps group', title: 'DealerOps Group Assignment 2 Test Plan', subject: 'CPRG-305-B testing plan', sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }] });
await fs.writeFile(out, await Packer.toBuffer(doc));
console.log(out);
