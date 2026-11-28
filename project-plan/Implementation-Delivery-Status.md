# DealerOps Implementation and Delivery Status

Status date: 2026-10-23

## Delivery status (2026-10-23)

Yuandong Yang completed the DealerOps development alone and accepted the current implementation. On 2026-10-23 every previously open issue in Jira project KAN on sait-group2-private was transitioned to Finished on that confirmation. This section does not record CI run URLs, instructor signatures, or a separate test-execution log.

The active stack is .NET 10 (`DealerOps.Core`, `DealerOps.AiService`, `DealerOps.Gateway`) and React. Java and Vue are retired. The browser calls only the gateway. Core calls ai-service directly with the `X-Dealer-Internal` header. Passwords are stored as BCrypt hashes. Azure hosts four Linux App Service apps: web, gateway, core, and ai. Local password sign-in remains, and the current core also accepts Google and Firebase ID tokens as additional sign-in paths (`design/SCOPE-BASELINE.md` errata 1 and 9).

Implemented product behavior covers AUTH, DMS, CRM including the sales report, ads and OMVIC rules, the assistant, VIN decode, leads, work orders, photos, and membership and join requests. The 2026-10-21 extensions in `design/21-Feature-Extensions.md` are in the same build: the public `/disclaimer` page (AD-14), the buyer site, the payment ledger, the bill-of-sale template, optional vehicle fields, the KPI dashboard, lead stage history, and the workshop cost report. Live marketplace publishing, card payment processing, OCR, a message queue, and a second database are not built. There is no separate garage-billing invoice product.

`terraform apply` alone does not load demo data. `./deploy/deploy.sh --apply --seed` exports the local development database and replaces the Azure rows in one transaction after a backup. `deploy/seed/load-demo-sql.sh` loads the committed `dealer-platform/seed` and keeps existing rows; it does not truncate.

The sections below are the 2026-10-12 working record. Where they name Java `dealer-core` as the running service, or say delivery work is still outstanding, read them as history from that date.

## Working record (2026-10-12)

This document records the working-tree implementation of client-requested extensions as of 2026-10-12.

## Delivered scope

| Feature | Implementation | Public API and access |
|---|---|---|
| Public landing and VIN decode | Landing page, sample vehicle presentation, NHTSA vPIC decoder; DMS Add vehicle prefills make/model/year without saving | `GET /api/v1/vehicle-catalog/vin/{vin}` is anonymous via Gateway |
| Leads and follow-up | Customer/lead creation, stage and owner changes, due dates, overdue filter, append-only notes, CRM cross-link, audit | `/api/v1/leads/**`; Dealer.User JWT plus dealership tenant checks |
| Reconditioning work orders | Vehicle tasks, assignee/due date, status flow, completion cost updates repair cost, open tasks block sale | `/api/v1/vehicles/{vehicleId}/work-orders`, `/api/v1/work-orders/{id}`; Dealer.User JWT plus tenant checks |
| Image Studio | JPEG/PNG upload, original/enhanced viewing, AUTO/BRIGHTEN/SHARPEN presets, delete, MySQL storage, audit | `/api/v1/vehicles/{vehicleId}/photos/**`; Dealer.User JWT plus tenant checks |
| Email, username, or phone sign-in | Registration uses a username, display name, password, and an email and/or phone; login accepts the email, username, or phone plus the password (`@` → email, else username, else phone) | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`; anonymous through Gateway |
| Admin account provisioning | Pending-account list and bind existing account without replacing its login details; new admin-created accounts require an email and/or phone | `GET /api/v1/admin/pending-users` and admin member routes; Platform.Admin only |

Google, Entra ID, other social-provider authentication, and all provider credentials have been removed. No Firebase SDK, Firebase Authentication, Firestore, or Firebase Hosting is used. Password authentication remains local to dealer-core, and dealer-core issues the DealerOps JWT.

## Gateway and security routing

Browsers call the Gateway only. `dealer-core-public` forwards all `/api/v1/**` endpoints to dealer-core, including the leads, work-order, member, pending-user, registration, login, and VIN APIs. The photo-specific route matches `/api/v1/vehicles/*/photos` and descendants before the catch-all; it intentionally skips `CacheRequestBody` so multipart and binary image content are not decoded into strings. Both routes use Gateway security. Only login, registration, and public VIN decode are anonymous; all business-data operations require a DealerOps JWT, and dealer-core performs its own role and tenant authorization. `/internal/v1/**` remains reserved for core-to-ai-service calls.

## Database and configuration

- `V20261008_1__add_sales_leads.sql`
- `V20261008_2__add_work_orders.sql`
- `V20261008_3__add_google_identity.sql` (historical migration; adds the app-user email column)
- `V20261008_4__add_vehicle_photos.sql`
- `V20261008_5__replace_google_subject_with_oauth_identity.sql` (historical schema migration retained for Flyway history)
- `V20261008_6__add_email_phone_login_identifiers.sql` (adds phone and unique nullable email/phone login identifiers)
- `V20261008_7__drop_user_identity.sql` (removes the unused third-party identity table)

`V1__init.sql` is unchanged. The currently active authentication configuration is in `backend/java/dealer-core/src/main/resources/application.yml`; no OAuth client IDs, client secrets, callback URLs, or identity-provider setup are required. The seeded platform admin requires `ADMIN_USERNAME` and `ADMIN_PASSWORD`; `ADMIN_EMAIL` and `ADMIN_PHONE` are optional extra sign-in names. Local reference values are documented in [README.md](../README.md) and `dealer-platform/env.example`.

## Repository references

- Classroom-review HTML prototype: [DealerOps-Prototype.html](prototype/DealerOps-Prototype.html).
- Scope and architecture decisions: [design/SCOPE-BASELINE.md](../design/SCOPE-BASELINE.md), [design/15-Data-Auth-and-Gateway.md](../design/15-Data-Auth-and-Gateway.md), [design/19-Gateway-and-AI-Engineering.md](../design/19-Gateway-and-AI-Engineering.md), [design/21-Feature-Extensions.md](../design/21-Feature-Extensions.md).
- HTTP contract and static API inventory: [design/14-Backend-API-Contract.md](../design/14-Backend-API-Contract.md), [dealer-platform/openapi.yaml](../dealer-platform/openapi.yaml), [dealer-platform/API.md](../dealer-platform/API.md).
- Manual feature acceptance: [design/16-Acceptance-and-Test.md](../design/16-Acceptance-and-Test.md), with extension scenarios EXT-01–EXT-10 in [design/21-Feature-Extensions.md](../design/21-Feature-Extensions.md).
- Project-plan source files: `Assignment Project Plan_Fall25.docx` and `Assignment Status Reports.docx`. This Markdown addendum is the current implementation record; future sprint status reports must use actual sprint evidence and must not be backfilled with assumed meetings or outcomes.

## Verification and remaining delivery work

On 2026-10-12, commit `a50cf24` passed all five GitHub Actions workflows on `main`: dealer-core compile, 20 unit tests and 44 Testcontainers integration tests; dealer-gateway 10 unit tests; ai-service compile; dealer-web build; Terraform validate. The same change closed three gaps found in the 2026-10-12 CI failures:

- `Platform.Admin` could read every dealership's vehicles, customers, listings, audit and assistant results. All business reads now require a bound dealer user, as `design/15-Data-Auth-and-Gateway.md` §2.4 states (AUTH-08, SEC-05).
- The sell and vehicle PATCH responses returned the pre-update `version`, so the next edit failed with `VERSION_CONFLICT`. A sold price of zero or less now returns `SOLD_PAIR_REQUIRED`.
- ai-service needed the private `ai-manager` repository at build time. Its sources are now vendored into ai-service (`design/09-AI-Agent-Integration.md`), so CI needs no token.

Database migration execution against a target database, full manual acceptance, a live deployment/demo, and completion of future Sprint 1–3 reports remain outstanding. The repository's development-phase instructions prohibit authoring tests until the user confirms feature development is complete and explicitly authorizes test work; no tests were created or modified for this delivery.

## Project-plan document review (2026-10-12)

Reviewed files: `Assignment Project Plan_Fall25.docx`, `Assignment Status Reports.docx`, and `Sampletasklist.xlsx` in this folder, checked against the repository on 2026-10-12.

### Current state after the management update

| File | Content | State |
|---|---|---|
| `Assignment Project Plan_Fall25.docx` | Timeline, core and extension backlog, methodology, Sprint 1–3 ownership, communication, and open follow-up | Updated October 12; student IDs and external confirmation remain pending |
| `Assignment Status Reports.docx` | Status reports, 30 marks per sprint (90 total) | Sprint 0 baseline retained; Sprint 1–3 contain pending prompts, with no fabricated outcomes |
| `Sampletasklist.xlsx` | Sprint 1 task list, one sheet per member | 10 tasks × 3 h = 30 h per member; 120 team hours; actual fields remain blank |

Timeline: three 3-week sprints from 2026-10-12 to 2026-12-13. Sprint 1 allocates 30 h per member; Sprint 2 and Sprint 3 retain 27 h each, for 84 h per member overall. Sprint 1 dates, roles, and totals agree between Word and Excel. The due date is one day after each task's start date.

Separate [Research Log](Research-Log.md) and [AI Log](AI-Log.md) documents now exist in this folder. Jackson owns publication or linking in the team site by October 31. No team-site URL or publication is claimed. Human review and actual instructor scope approval remain pending.

### Historical findings before the update

| Criterion | Assessment | Gap |
|---|---|---|
| MVP (4) | The Must stories form a clear MVP | None |
| Methodology (4) | Scrum plus Jira, GitHub, and Terraform; daily, weekly, and sprint cadence described | No research or justification for picking Scrum over alternatives such as Kanban |
| Sprint plans (3) | Owners and stakeholders are clear | Sprint 2 and Sprint 3 each list only one Should story (NFR-04) |
| Sprint 1 task plan (6) | 27 h per member; no task over 3 h; weekly breakdown is visible | Start and due dates are identical timestamps; tasks lack measurable done criteria |

### Historical issues before the update

1. **Task order in `Sampletasklist.xlsx`: fixes are scheduled before the defects are found.**
   - The ad and assistant fix is set for 10-21, but the walkthroughs that report those defects run 10-21 to 10-26: Jackson's on 10-21 and 10-23, Bedgel's on 10-23 and 10-26.
   - The DMS/CRM fix is set for 10-19, but Bedgel's sale walkthrough is on 10-19 and the CRM walkthrough on 10-21.
   - Seeding the two-dealership demo data (10-14) falls on the same day as Logan's cross-dealership walkthrough, which needs that data.
2. **Requirement IDs in the plan and the task list do not match.**
   - DMS-07 (Should), CRM-04, and AI-05 (Should) are in the docx Sprint 1 backlog, but no task in the spreadsheet cites them. The 10-16 vehicle task performs DMS-07's search and filter without naming the ID; CRM-04 and AI-05 have no task at all. The two Should stories are the plan's only evidence for the "Must/Should mix" criterion.
   - CRM-09, AD-03/08/10, AUD-01–06, SEC-07, ARC-04/06/07 appear in the spreadsheet but not in the Sprint 1 backlog.
3. **The plan predates the delivered extensions.**
   - The 2026-10-08 extensions recorded above (leads, work orders, Image Studio, VIN decode, email/username/phone sign-in) are not in the plan background, the sprint backlogs, or any task.
   - No task schedules acceptance of EXT-01–EXT-10.
4. **The sign-in identifier was described three different ways.** *Resolved 2026-10-12.*
   - The Sprint 0 report said admin-issued username and password.
   - This document said email or phone only, with the username rejected for sign-in.
   - [design/15-Data-Auth-and-Gateway.md](../design/15-Data-Auth-and-Gateway.md) says email, username, or phone.
   - Decision: email, username, and phone all sign in, as `design/15` §8 and `AuthService.findForSignIn` already implement. This document, the README, and the Sprint 0 report now match.
5. **Minor gaps.**
   - The docx table of contents is out of date: it is missing the Sprint 2 and Sprint 3 stakeholder communication plans, and the page numbers need a refresh.
   - The cadence text gives a two-week client meeting and "about monthly" sprints, while the sprints are three weeks long.
   - No Research Log or AI Log document exists yet.
   - The MVP table cites the Business Canvas for its IDs, while the IDs are defined under `requirements/analysis/`.

Verified as consistent: all five workflows exist under `.github/workflows/`, and the NN-05 containerization decision is recorded in [design/11-Requirements-Governance-and-Agile.md](../design/11-Requirements-Governance-and-Agile.md).

### Update instructions for the project-plan files

Status: applied to the three local artifacts on 2026-10-12, with the refinements recorded under Done. The checklist below preserves the requested update scope; external team-site publication and course approvals remain open.

The repository rules apply:
- All file text is English.
- Requirement IDs must match `requirements/analysis/` and [design/21-Feature-Extensions.md](../design/21-Feature-Extensions.md).
- Sprint 1–3 status sections stay blank until each sprint ends. Do not invent meetings, feedback, or outcomes.
- Sign-in wording everywhere is "email, username, or phone plus password".

#### Step 1 — `Sampletasklist.xlsx` (Sprint 1 task list)

Rules for all four sheets:
- Keep the sheet layout, the columns B–K, and the `=SUM(G3:G…)` total. Extend the total range when you add a row.
- Every task is 3 h. Each member goes from 9 tasks / 27 h to 10 tasks / 30 h: the rubric's top band asks for 25–30 h, and the plan allows 27–36 h.
- Due date = start date + 1 day, so the start and due times are no longer identical.
- Sort the rows by start date.
- Begin each task with a verb. In `NOTES`, cite the requirement IDs and name the evidence the task produces (for example, "pass/fail per ID recorded on the Jira card").

**Bedgel (Role A)**

| Start | Change |
|---|---|
| 10-14 | Sign-in walk: add sign-in by email, username, and phone. Notes: AUTH-01/03/08/11/12/17 |
| 10-16 | Vehicle task already covers search and filter. Notes: DMS-01/03/05/07 (Should) |
| 10-21 | Customer task: add the customer detail view (linked vehicles and audit history). Notes: CRM-01/02/04/05/06/08/11 |
| Thu 10-22 (new) | Walk VIN decode prefill and Image Studio upload, enhance, delete, and isolation in the browser; record outcomes. Notes: EXT-01, EXT-08–EXT-10; VIN-01–04, IMG-01–05 |
| Other rows | Unchanged |

**Jackson (Role B)**

| Start | Change |
|---|---|
| 10-14 | Real-model ad run: add "confirm AI notes display apart from rule findings". Notes: AI-01/02, AI-05 (Should), AD-08 |
| Thu 10-22 (new) | Walk self sign-up, admin binding of a pending account, sign-in by email, username, and phone, and the sign-in name rules; record outcomes. Notes: EXT-05–EXT-07; AUTH-16–AUTH-22 |
| Other rows | Unchanged |

**Logan (Role C)**

| Start | Change |
|---|---|
| 10-21 | Audit review: add the changed-field summary with masked customer contact fields. Notes: AUD-01/02/03/05/06, AUD-04 (Should) |
| Thu 10-22 (new) | Walk lead follow-up and reconditioning work-order rules across two dealerships; record outcomes. Notes: EXT-02–EXT-04; LEAD-01–09, WO-01–07 |
| Other rows | Unchanged |

**Yuandong (Lead)**

Every fix now comes after the walkthroughs that feed it, and the demo data exists before the first walkthrough that uses it (10-14).

| Start | Task | Feeds from |
|---|---|---|
| Mon 10-12 | Seed two-dealership demo data and document the steps (moved from 10-14) | — |
| Wed 10-14 | Create Sprint 1 Jira cards with requirement IDs, owners, and evidence fields (moved from 10-12) | — |
| Fri 10-16 | Review and merge team pull requests against their requirement IDs (moved from 10-23) | — |
| Mon 10-19 | Fix confirmed login, role, and membership defects (moved from 10-16) | Bedgel 10-14; Logan 10-12/10-14 |
| Wed 10-21 | Run Terraform validate and plan; record the apply/teardown checklist (moved from 10-26) | — |
| Fri 10-23 | Fix confirmed DMS and CRM defects (moved from 10-19) | Bedgel 10-16/19/21; Logan 10-16/19 |
| Mon 10-26 | Confirm all five GitHub Actions workflows pass on main; record run links (moved from 10-28) | — |
| Tue 10-27 (new) | Fix confirmed extension defects. Notes: EXT-01–EXT-10 | All 10-22 extension walkthroughs |
| Wed 10-28 | Fix confirmed ad-check and assistant defects (moved from 10-21) | Jackson 10-14 to 10-26; Bedgel 10-23/26 |
| Fri 10-30 | Consolidate Sprint 1 evidence, update the status report, and rehearse the showcase | — |

#### Step 2 — `Assignment Project Plan_Fall25.docx`

1. **Background:** after the first sentence about the four applications, add: "On October 8, 2026 the team also delivered VIN decode, lead follow-up, reconditioning work orders, Image Studio, and self sign-up with sign-in by email, username, or phone; their acceptance is scheduled in Sprint 1."
2. **MVP Backlog:**
   - Add a row: `VIN-01–04 / LEAD-01–09 / WO-01–06 / IMG-01–05` | Dealer user | decode a VIN, follow up leads, track reconditioning work orders, and manage vehicle photos | vehicle preparation and sales follow-up stay in one system.
   - Add a row: `AUTH-16–21` | Staff member | register and sign in with an email, username, or phone and a password | staff can reach the system before an admin binds them.
   - Make sure the Business Canvas product backlog lists the same IDs. They come from `requirements/analysis/` and `design/21-Feature-Extensions.md`.
3. **Project Management Methodology:** add 2–3 sentences of justification, so the plan meets the rubric's "adequate research" level.
   - Scrum fits fixed three-week course sprints with a showcase at each one.
   - Kanban was considered but has no sprint boundary for course reviews.
   - Waterfall does not fit a team that is still in acceptance and defect fixing.
4. **Daily, Weekly, and Sprint Cadence:**
   - Replace "Every two weeks: a client meeting" with "Once per sprint, in week 2: a client meeting".
   - Replace "Each sprint (about monthly)" with "Each three-week sprint (the monthly cadence)".
5. **Sprint 1 Backlog:**
   - Add a row: `AUD-01/02/03/05/06, AUD-04 (Should)` | Dealer user | see who changed a vehicle or customer and which fields changed | changes are traceable without exposing customer contact values.
   - Add a row: `EXT-01–EXT-10` (VIN, LEAD, WO, IMG, AUTH-16–22) | Dealer user | use the 2026-10-08 extensions as specified | the extensions pass manual acceptance.
6. **Sprint 1 Resource Plan:** append the new 10-22 extension walkthrough to Bedgel, Jackson, and Logan, and the 10-27 extension fixes to Yuandong.
7. **Sprint 2 and Sprint 3 Backlogs:** add Should stories so each sprint mixes Must and Should items. Confirm each one works in the build before listing it.
   - Sprint 2: SEC-06 (ad copy passed to AI as data), alongside the existing AI demo row.
   - Sprint 2: LEAD-06 (overdue lead filter) and WO-07 (open work-order count on the DMS list).
   - Sprint 3: CRM-10 (vehicle and customer detail link to each other) and DMS-13 (`VERSION_CONFLICT` on concurrent edits).
8. **Table of contents:** add "Sprint 2 Stakeholder Communication Plan" and "Sprint 3 Stakeholder Communication Plan", then refresh all page numbers.

#### Step 3 — `Assignment Status Reports.docx`

- In the Sprint 0 "What can we improve next sprint?" cell, change "a 27-hour task list each" to "a 30-hour task list each", to match Step 1.
- The Sprint 0 summary already states sign-in by email, username, or phone (edited 2026-10-12).
- Leave the Sprint 1–3 sections blank.

#### Step 4 — outside the repository

- Create the separate Research Log and AI Log on the team site, with the columns from the plan template: Team Member, Topic/AI Tool, Source/Purpose, URL, Date.
- Jackson owns them, per his 10-30 task.

#### Done

- 2026-10-12: one sign-in rule (email, username, or phone) in this document, `README.md`, and the Sprint 0 report.
- 2026-10-12: the workbook assigns ten 3-hour tasks per member, adds extension walkthroughs, moves fixes after the relevant checks, and schedules demo data before isolation checks. Scope confirmation, deadline checks, and backlog mapping are included in Robin's management task. Totals remain formulas.
- 2026-10-12: the plan includes extension acceptance, explicit audit coverage, optional Should scenarios, methodology rationale, and week-2 client communication. Separate ownership pages replace cramped one-page sections; headings replace the stale page-number contents list.
- 2026-10-12: reports distinguish the historical baseline from current identity rules and leave future outcomes unreported. Pending prompts identify the evidence needed at sprint close, including feedback, actual hours, and submission confirmation.
- 2026-10-12: separate repository Research and AI Logs were created from the actual document-assistance session. Publishing them to the team site, supplying student IDs and actual URLs, and obtaining instructor approval are still pending.

### Review of the applied update (2026-10-12)

Content check against Steps 1–4 passed. Specifically:
- Each sheet has 10 × 3 h = 30 h, with `=SUM(G3:G12)` totals.
- Each fix is dated after the walkthroughs that feed it, and the demo data is ready on 10-12.
- DMS-07, CRM-04, AI-05, and AUD-04 each have an owning task.
- Extension acceptance is planned in all three sprints.
- Sprint 2 and Sprint 3 each list Should stories.
- The Sprint 0 report states the sign-in rule and the 30-hour plan.
- The weekly loads stated in the plan match the workbook (Bedgel, Jackson, Logan 9/12/9 h; Robin 9/9/12 h).

The following must be fixed before submission. These are graded course documents, so they must read as the team's plan, not as notes from an AI agent.

1. **Remove self-undermining sentences from `Assignment Project Plan_Fall25.docx`.**
   - "This is the current planning rationale, not evidence of a past methodology research exercise." This concedes the rubric's "adequate research" criterion; delete it.
   - Also delete or rephrase these:
     - "Implementation does not by itself establish acceptance."
     - "they must not be described as formally approved"
     - "The actual team-site URL remains pending and must not be invented."
     - "Instructor and client names, approval evidence, … remain pending because verified values were not supplied."
   - Delete the repository's test-authoring rule ("…requires the user to confirm feature completion…"). It is an instruction to coding agents and means nothing to a grader.
   - Where a value is genuinely unknown, use a plain placeholder such as "Team-site URL: to be added by Oct 31 (Jackson)".
2. **Restore the course template skeleton in the plan.** Graders mark against the template, so its headings must be findable. Restore:
   - the header block: Student Name/ID, Weight 10%, Marks /17;
   - the Instructions section and a Table of Contents;
   - the template section titles: "Minimum Viable Product (MVP) Backlog", "Deliverables Outside of Minimum Viable Product", "Tool", "Daily, Weekly, and Sprint Cadence", and for each sprint "Sprint N Plan on a Page", "Sprint N Goal", "Sprint N Backlog", "Sprint N Resource Plan", "Sprint N Stakeholder Communication Plan";
   - the "Sprint 1 Plan" section with the Research Log and AI Log table headers.

   Keep the new content (extension table, completion conditions, task scheduling, open risks) under or after those headings.
3. **Align the plan with the workbook.** Logan's Sprint 1 resource text names only work orders; the workbook task also covers lead follow-up (LEAD-01–09). Add "lead follow-up".
4. **Status report wording.** The "Pending sprint close…" prompts are fine. Remove these meta-instructions: "Never infer meetings, approvals, feedback, or completed work from a plan.", "write None only if confirmed", and "Its identity-history notes describe earlier decisions, not the current login contract." Replace the last one with "Sign-in later changed to email, username, or phone on October 8."
5. **Logs.**
   - `Research-Log.md` should hold research only. Its single row is an AI-assisted repository review, which belongs in `AI-Log.md`. Leave the research table empty until members add real sources.
   - In `AI-Log.md`, the Team Member cell must name the person only.
   - Add the Claude Code session of 2026-10-12 to `AI-Log.md`: it analysed the plan documents, aligned the sign-in rule across `README.md`, this document, and the Sprint 0 report, and wrote these update instructions. Yuandong reviewed the output.

All five review items were applied on 2026-10-12:
- The project plan was rebuilt from the course template (commit `05fb55a`), restoring the header block, Instructions, table of contents, and the template section titles. Two TOC entries were added for the Sprint 2 and Sprint 3 stakeholder plans. The current content was applied under those headings:
  - the extension background and MVP rows;
  - the Scrum-versus-Kanban/Waterfall rationale and the week-2 client meeting;
  - the Sprint 1–3 backlog rows, including the Should stories;
  - each member's extension work, with Logan's lead follow-up;
  - the 30-hour timeline;
  - the task-list, dependency, and log notes under "Sprint 1 Plan".
- The self-undermining and agent-facing sentences are gone. Codex's "Open Risks" table was not carried over; the scope and NN-05 confirmation now sits in Robin's Sprint 1 resource text. Word refreshes TOC page numbers on open (`updateFields`).
- The status report meta-instructions were removed, and the identity note now reads as a dated change.
- `Research-Log.md` holds only an empty research table. `AI-Log.md` records the Claude Code and Codex sessions under Yuandong Yang.

### Consistency check (2026-10-12, after the CI fixes)

The three project-plan files were checked against `requirements/DealerOps-Requirements.md`, `design/21-Feature-Extensions.md`, and the repository.

Consistent:
- Every requirement ID cited in the plan, the status report, and the workbook is defined, and every ID marked Should is a Should.
- The workbook has ten 3-hour tasks per member, each due the day after it starts, with `=SUM(G3:G12)` totals of 30 h. Weekly loads match the plan (9/12/9 h; Robin 9/9/12 h). Each fix comes after the walkthroughs that feed it, and the demo data is ready on October 12.
- The plan's hour table adds up (30 + 27 + 27 = 84 h per member), and the October 8 deployment claims match `deploy/evidence/RELEASE-2026-10-08.md`.

Corrected:
1. The MVP backlog listed only some of the Must stories. It now covers every Must ID: the missing AUTH, DMS, CRM, AD, AUD, ARC, SEC and NFR IDs were added to their existing rows. AD-17 is left out because IMG-01–05 supersede it.
2. The Tool section described four application repositories and a platform repository. DealerOps is one repository with one workflow per application; the text now says so.
3. Four notes on Robin's workbook sheet read as instructions to a writer ("do not invent review feedback", "no deployment is implied", and similar). They now state the planned evidence.

