# Assignment 3 traceability to Assignment 2

**FOUND.** The group’s Assignment 2 artefacts exist. Assignment 3 executes those cases. It does not invent a second ID series.

| Artefact | Repo-relative path |
|---|---|
| Test plan, v2.0, 23 October 2026 | `CPRG-305-B/group-assignment-2/DealerOps_Group_Assignment_2_Test_Plan.docx` |
| Test cases, 70 rows, same version | `CPRG-305-B/group-assignment-2/DealerOps_Group_Assignment_2_Test_Cases.xlsx` |

Plan identifier: `DO-CPRG305-GA2-TP-002`. Version v2.0 supersedes v1.0 of 13 October 2026. Group 12. Status in the plan: approved and ready for execution in Group Assignment 3. Every workbook row is still **Not executed (planned)**. Actual Result, Test Status, and Test Date are blank until execution.

Course templates under `CPRG-305-B/group-assignment-2/course-files/` are the blank Assignment 2 brief, plan template, and case template. They are not the group’s filled plan. Unit 6 Bug Hunt IDs `UC-01` through `UC-04` and `T-001` through `T-028` belong to a different activity. They are not DealerOps Assignment 2 cases.

## Group and peer file

Members of this group are only **Yuandong Yang** (QA lead), **Daniel Watson**, and **Xiaomei He**. The Assignment 3 peer template has four name slots. This group has three. Do not add a fourth person.

Peer review is an individual file, not part of the group plan. Do not edit:

- `CPRG-305-B/group-assignment-3/Yuandong_Yang_Peer_Assessment.docx`
- `CPRG-305-B/group-assignment-2/Yuandong_Yang_Peer_Assessment.docx`

## Assignment 3 marks (100)

From the Assignment 3 brief, Part A is 95 and Part B is 5.

| Criterion | Marks | What it traces to in Assignment 2 |
|---|---|---|
| Functional test | 35 | The 70 cases below, applied to the workflows in plan §4. Chapter 7 techniques. Behaviour is judged against the capstone requirements the workbook already names. |
| Performance test | 35 | No performance case family exists. See “Performance” below. Do not invent `PERF-*` IDs. |
| Documenting testing outcomes | 10 | Plan objective O8: each executed case records build, environment, data set, actor, and timestamp. |
| Defect tracking | 10 | Plan objective O8: the defect log reconciles with this case list. Defect rows live in the defect spreadsheet, not in this note. |
| Test-case execution progress | 5 | Plan §6: every High case in a full pass; at least 95% of the 70 cases before the final summary. Priority counts are below. |
| Peer review | 5 | The individual peer file. Out of the group document. |

The Assignment 3 brief also requires a dedicated test environment (Docker network or a virtual machine). It says a localhost submission is not accepted. The workbook’s Environment column still names a local E2E stack and the Azure demo. Those labels are what Assignment 2 planned. They are not a new Assignment 3 environment design.

## How the identifiers work

Assignment 2 does **not** use `UC-nnn` use-case IDs. The executable IDs are the workbook Test Case ID column. One-line objectives below are the workbook Test Description column, shortened to one line. Requirement IDs in the same row (`AUTH-*`, `DMS-*`, `CRM-*`, and the other families) are coverage tags from `requirements/DealerOps-Requirements.md`. They are not test-case IDs. A later note that numbers `CRM-01` as an execution case is using a different series from this workbook.

| Kind | Where | Meaning |
|---|---|---|
| `RV`, `UT`, `IT`, `SYS`, `AT`, `DEP` | Workbook column A | The 70 test cases Assignment 3 executes |
| `O1`–`O8` | Plan §2.3 | Testing objectives, not cases |
| `TI-*` | Plan §3 | Requirement groups that point at cases |
| §4 workflows | Plan §4 | Business workflows with no IDs |
| `CL-1`–`CL-6` | Workbook Comments on the `AT-*` rows | Classroom scripts already cited by those acceptance cases |
| `BE-*`, `FE-*`, `EXT-*` | Workbook Comments | Project acceptance labels the plan already cross-references |

Priority in the workbook: **49 High, 20 Medium, 1 Low** (`UT-12` only). Plan §4 says every High case runs in every regression pass.

Owners on the workbook Summary sheet: review `RV-01`–`RV-06` Yuandong Yang; unit `UT-01`–`UT-12` Daniel Watson and Xiaomei He; integration `IT-01`–`IT-26` Daniel Watson (platform) and Xiaomei He (ads and AI); system `SYS-01`–`SYS-12` Daniel Watson; acceptance `AT-01`–`AT-08` Yuandong Yang with the client representative; deployment `DEP-01`–`DEP-06` Yuandong Yang.

## Plan objectives (not case IDs)

| ID | Objective |
|---|---|
| O1 | Prove dealership isolation: cross-dealership access returns 404 with no business fields, and a spoofed `dealerId` never moves a write. |
| O2 | Prove authentication and role separation: sign-in, token, membership, manager-only, and admin-only cases pass; admin business calls are 403 with no business fields. |
| O3 | Prove the advertising compliance gate: ready and export only after a pass on the current content version. |
| O4 | Prove the AI review fails safe: timeout, failure, empty answer, or missing key is unavailable, and no prompt or assistant answer carries phone, email, or address. |
| O5 | Prove inventory and ledger integrity: sold lock, no second sale, version conflict, and ledger boundaries hold in the database. |
| O6 | Prove the service boundary: direct core and AI calls are refused, a forged internal header does not grant access, and CORS stays on the configured origins. |
| O7 | Prove the release is reproducible: clean checkout, Terraform recreate, release endpoint from the pushed commit, and a data rollback. |
| O8 | Produce reproducible evidence: build, environment, data set, actor, timestamp, and a defect log that matches the case list. |

## Workflows in the plan (no use-case IDs)

Plan §4 lists these workflows in risk order. They have no `UC-*` numbers. The cases that cover them are in the domain index.

| Workflow | Priority in the plan |
|---|---|
| Staff of dealership A requests a vehicle, customer, lead, listing, photo, or audit row of dealership B. | High |
| Sign in by username, email, or phone; administrator, manager, and staff reach only their own surface. | High |
| Write an advertisement, run the check, mark ready, export, and publish to the buyer site. | High |
| A compliant advertisement reaches the model; a timeout, outage, or missing key occurs. | High |
| Create, edit, photograph, repair, and sell a vehicle, then attempt further changes. | High |
| Use the public API; attempt core, the AI service, or an internal route directly. | High |
| Any business write, then read record history and the dealership and platform logs. | High |
| Add a customer, link a vehicle, work a lead to won or lost, and record notes. | Medium |
| Record payments on a sold vehicle, print the bill of sale, and read the dashboard. | Medium |
| A buyer browses a dealership and sends an inquiry. | Medium |
| Build from a clean checkout, deploy to Azure, seed, verify, and roll back. | High |
| Loading, empty, error, forbidden, and AI-unavailable states on every page. | Medium |

Plan §3 groups the same scope as test items: `TI-AUTH`, `TI-ROLE`, `TI-TENANT`, `TI-DMS`, `TI-CRM`, `TI-AD`, `TI-GW`, `TI-AUD`, `TI-PAY`, `TI-SHOP`, `TI-REL`. Each item’s case list is in that section of the plan. The tables below follow the workbook, which is the executable list.

Classroom scripts already attached to acceptance cases: `CL-1` is `AT-01`; `CL-2` and `CL-3` are `AT-02`; `CL-4` is `AT-03`; `CL-5` is `AT-04`; `CL-6` is `AT-05`. Comments on `SYS-02`, `SYS-04`, `SYS-05`, `SYS-06`, `IT-14`, `IT-15`, and `IT-17` point at the same scripts. There is no separate use-case catalogue.

## Requirements and design review (6)

| ID | Priority | Requirements cited | Objective |
|---|---|---|---|
| RV-01 | High | AUTH-07, AUTH-09 | Review how the dealership is resolved and how another dealership’s id is answered. |
| RV-02 | High | AD-07, AD-09, AD-11, AD-12 | Review the five ad-check states and the ready/export gate. |
| RV-03 | High | SEC-02, SEC-05, SHOP-05 | Review the gateway route table, CORS, internal-token guard, and rate limits. |
| RV-04 | High | AUD-03, AUD-04, AUD-16, AUD-17 | Review the audit record shape, stored values, and who may read them. |
| RV-05 | High | DMS-11, DMS-12, PAY-02, PAY-05 | Review the sold-vehicle lock and the payment-ledger invariants. |
| RV-06 | High | All Must requirements | Audit that every Must requirement in the requirements specification has a case before execution. |

## Unit (12)

| ID | Priority | Requirements cited | Objective |
|---|---|---|---|
| UT-01 | High | DMS-04 | VIN normalisation accepts 17 valid characters and rejects I, O, Q, and the wrong length. |
| UT-02 | Medium | DMS-01 | Money validation accepts two decimals and rejects extra decimals and negatives. |
| UT-03 | High | DMS-10 | A sale requires the sold date and sold price together. |
| UT-04 | High | AD-03, AD-07 | The rule engine blocks a cash ad with no advertised price. |
| UT-05 | High | AD-04 | A finance ad without an APR is blocked, and a cash price is still required. |
| UT-06 | Medium | AD-04 | Lease rules require the lease statement, APR, and excess-kilometre cost. |
| UT-07 | High | AD-11 | An outdated passed check maps to stale; an outdated other check maps to needs-AI. |
| UT-08 | High | AI-02, AD-09 | Every AI provider failure maps to unavailable, never to a pass. |
| UT-09 | High | CRM-12, AI-04 | Customer contact data never enters an AI prompt or an assistant answer. |
| UT-10 | High | AUD-04, AUD-13 | An update stores the replaced values, and the application log stays free of contact data. |
| UT-11 | Medium | PAY-01, PAY-02 | A payment stays inside the sold price and the sale window. |
| UT-12 | Low | SHOP-01 | The buyer-site slug from a legal name is stable and does not collide. |

## Integration and API (26)

| ID | Priority | Requirements cited | Objective |
|---|---|---|---|
| IT-01 | High | AUTH-11, AUTH-12 | Sign in with username, email, and phone and receive a JWT that carries the role. |
| IT-02 | High | AUTH-12, AUD-12 | A wrong password is refused and audited as a failed sign-in. |
| IT-03 | Medium | AUTH-15, AUD-12 | An unknown sign-in identifier is refused and the typed value is not stored. |
| IT-04 | High | SEC-02 | A business endpoint with no token, a bad signature, or an expired token is refused. |
| IT-05 | High | AUTH-08 | The platform admin is refused on every business endpoint, including the assistant. |
| IT-06 | High | AUTH-13 | A signed-in account with no dealership is refused on business endpoints. |
| IT-07 | High | AUTH-07 | A resource of another dealership answers 404 for every verb. |
| IT-08 | High | AUTH-09 | A spoofed dealerId cannot move a write to another dealership. |
| IT-09 | High | DMS-03 | A VIN is unique inside one dealership and may repeat in another. |
| IT-10 | High | DMS-11, DMS-12 | Purchase fields lock after a sale, and a vehicle cannot be sold twice. |
| IT-11 | Medium | DMS-13 | A write with an outdated version is refused. |
| IT-12 | High | CRM-05, CRM-06, CRM-07, CRM-09 | Linking follows one vehicle to one customer. |
| IT-13 | High | CRM-08, CRM-11 | A sold vehicle cannot be unlinked, and an in-stock unlink is audited. |
| IT-14 | High | AD-07 | A hard rule hit returns blocked and does not call the AI service. |
| IT-15 | High | AD-08, AI-01 | A compliant ad reaches the real AI review and is stored as passed. |
| IT-16 | High | AD-09, AI-02 | An AI timeout or failure is stored as unavailable and is never a pass. |
| IT-17 | High | AD-12, AD-13 | Ready and export are reachable only from a pass on the current content version. |
| IT-18 | High | SEC-02, SEC-05 | Core and the AI service refuse calls without the internal token, and the gateway does not forward a client copy. |
| IT-19 | Medium | DMS-08, AD-17 | Photo upload enforces type, size, and the per-vehicle count. |
| IT-20 | Medium | PAY-01, PAY-03, PAY-05 | The payment ledger enforces the balance, and reads are manager-only. |
| IT-21 | Medium | SHOP-02, SHOP-03, SHOP-04, SHOP-05 | The public buyer-site API lists only listed vehicles and files an inquiry as a lead. |
| IT-22 | High | AUD-10, AUD-11, AUD-17 | Audit reads are limited to the right role and dealership. |
| IT-23 | Medium | CRM-15 | Lead lifecycle rules hold, and a closed lead stops accepting changes. |
| IT-24 | Medium | WO-08 | Open work orders block a sale and settle their cost when done. |
| IT-25 | Medium | AI-03, AI-04 | The assistant answers read-only inside one dealership and degrades safely. |
| IT-26 | Medium | DMS-04, SEC-02 | VIN decode is public and validated, and it does not expose inventory. |

## System, browser end to end (12)

| ID | Priority | Requirements cited | Objective |
|---|---|---|---|
| SYS-01 | High | AUTH-01, AUTH-08 | Route guards send each role to its own area in the browser. |
| SYS-02 | High | AUTH-06, AUTH-07, CRM-05 | One dealership records and links a vehicle and a customer; the other sees nothing. |
| SYS-03 | Medium | DMS-06, DMS-07, AUD-15 | The inventory list pages, searches, and filters, and stays newest first. |
| SYS-04 | High | AD-07 | A blocked ad is shown as blocked, and the browser makes no AI call. |
| SYS-05 | High | AD-08, AD-09 | A compliant ad passes, and an AI outage is shown as unavailable. |
| SYS-06 | High | AD-11, AD-12, AD-14 | Editing a passed ad makes it stale and stops the export. |
| SYS-07 | Medium | DMS-10, PAY-01, SALE-01 | Selling, recording payments, and printing the bill of sale works end to end. |
| SYS-08 | Medium | DASH-01, CRM-16, WO-08 | The dashboard and reports agree with the report endpoints. |
| SYS-09 | Medium | SHOP-01, SHOP-04 | The public buyer site lists ready ads, and an inquiry reaches the dealership inbox. |
| SYS-10 | Medium | AUD-17, PAY-05 | A manager and a staff member see different team, audit, and ledger surfaces. |
| SYS-11 | Medium | AD-09, AI-05 | Loading, empty, error, and AI-failure states are explicit on every page. |
| SYS-12 | Medium | SEC-02 | An expired session and a sign-out leave no usable credentials in the browser. |

## Acceptance (8)

| ID | Priority | Requirements cited | Objective |
|---|---|---|---|
| AT-01 | High | AUTH-02, AUTH-03, AUTH-14 | Classroom script 1: the admin opens two dealerships and binds one person to each. |
| AT-02 | High | AUTH-07, AUTH-08 | Classroom scripts 2 and 3: browser isolation, and the admin refused at the API. |
| AT-03 | High | AD-07 | Classroom script 4: a missing price and a missing APR stay blocked in the cloud. |
| AT-04 | High | AD-08, AI-01, AI-02 | Classroom script 5: real AI reviews a compliant ad once, within the timeout. |
| AT-05 | High | AD-11, AD-12 | Classroom script 6: after a price change, the old pass cannot export. |
| AT-06 | High | AUD-10, AUD-11, AUD-17, CRM-12 | Manager and admin audit walkthrough, with no contact data outside the trail. |
| AT-07 | High | AUTH-01, AD-16 | Client and instructor walkthrough of the agreed demo, with sign-off. |
| AT-08 | High | SEC-04, CRM-12 | Privacy and secret scrub of the evidence set before submission. |

## Deployment and release (6)

| ID | Priority | Requirements cited | Objective |
|---|---|---|---|
| DEP-01 | High | SEC-03 | A fresh checkout builds and starts all four applications. |
| DEP-02 | High | SEC-04 | Start-up schema creation and column patches are safe to re-run. |
| DEP-03 | High | SEC-04 | The committed demo seed loads, and its reset removes only seeded data. |
| DEP-04 | High | SEC-03, SEC-04 | Terraform builds the cloud stack with secrets in Key Vault and HTTPS only. |
| DEP-05 | High | SEC-03 | The one-command deployment refuses an unclean tree and publishes a verified build. |
| DEP-06 | Medium | SEC-04 | Data rollback and a stack rebuild both work after a failed release. |

## Domain index

These are the Assignment 2 cases whose requirement tags, or whose objective, cover the areas Assignment 3 asked about. Tags come from the workbook Requirement ID column.

| Area | Test-case IDs |
|---|---|
| Auth and roles | IT-01, IT-02, IT-03, IT-04, IT-05, IT-06, SYS-01, SYS-12, AT-01, AT-02. Role split also in IT-20, IT-22, SYS-10, AT-06. |
| Tenancy | RV-01, IT-07, IT-08, SYS-02, AT-02. |
| Inventory | UT-01, UT-02, UT-03, IT-09, IT-10, IT-11, IT-19, IT-24, IT-26, SYS-03, SYS-07, RV-05. |
| CRM and leads | IT-12, IT-13, IT-23, SYS-02, SYS-08, SYS-09, UT-09. |
| Assistant | UT-09, IT-05 (admin refused on the assistant URL), IT-25, SYS-11. |
| Gateway and service boundary | RV-03, IT-04, IT-18, IT-26, SYS-12, DEP-01. |

Advertising compliance, audit, payments, and the buyer site are in the same workbook (`TI-AD`, `TI-AUD`, `TI-PAY`, `TI-SHOP` in plan §3). They are not extra Assignment 2 IDs.

The plan says those requirement families are specified in `requirements/DealerOps-Requirements.md`, and that the API and tenant behaviour used as expected results live in `design/14-Backend-API-Contract.md` and `design/15-Data-Auth-and-Gateway.md`. `design/SCOPE-BASELINE.md` is the delivery baseline for the same families (auth, tenancy, DMS, CRM, assistant, gateway, and the later payment, shop, and audit extensions). Cite a requirement ID only when it appears on a workbook row or in those documents. This note does not add requirement IDs that the workbook did not cite.

## Performance

Assignment 2 has no performance, load, soak, or response-time case IDs. Plan §2.4 and §5 put production-scale load, soak, and disaster-recovery testing out of scope, and they say the capstone has no performance requirement to verify.

Sentences that do exist, and that are not case IDs:

- Plan §2.1: a normal gateway request completes in under 3 seconds; an AI review returns within its 15-second timeout or is recorded as unavailable; lists are 10 rows; a photo is at most 2 MB and a vehicle holds at most 10 photos; the assistant returns at most 5 cards.
- Plan §6 system phase names response-time smoke checks and does not number them.
- The 15-second AI limit is already inside `UT-08`, `IT-16`, `SYS-05`, and `AT-04`.

The functional mark uses the 70 cases. The performance mark cannot be satisfied by relabelling those cases. A speed measurement needs its own evidence and must not be given an Assignment 2 ID that was never written.

## Explicitly not in the Assignment 2 case list

Plan §5 excludes: internal correctness of the AI provider, vPIC, Google, and Firebase; legal or OMVIC approval of an advertisement; real marketplace publishing and card payment processing; OCR, message queues, a second database, and a dealership switcher; the retired Java and Vue stacks; native mobile apps; other students’ peer assessments. Do not add test-case IDs for those.

## Counts

| Prefix | Range | Count |
|---|---|---|
| RV | RV-01 to RV-06 | 6 |
| UT | UT-01 to UT-12 | 12 |
| IT | IT-01 to IT-26 | 26 |
| SYS | SYS-01 to SYS-12 | 12 |
| AT | AT-01 to AT-08 | 8 |
| DEP | DEP-01 to DEP-06 | 6 |
| Total | | 70 |
