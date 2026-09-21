> Superseded v1.0 historical draft. Do not implement from this document. Read the current document index in [README.md](README.md) for the 00 business design and the 07/08/09 microservice, DevOps, and AI component designs. The original requirements have been located and verified; they do not include a manufacturer portal or a buyer self-service site.

# Three-person implementation and test plan

## Effort baseline

Assuming 10 weeks, 3 people, about 9 hours per person per week: about 270 person-hours total — about 220 for implementation and routine tests, 50 reserved for integration, defects, the report, and the demo. This is an estimate, not a school rule or a delivery guarantee.

If the actual capacity is only about 6 hours per person per week, the total is about 180 person-hours. Narrow how work orders and statistics are presented, and re-check AI and course delivery requirements; do not promise the 270-hour scope unchanged.

## Three-person responsibilities

### A: B-side / C-side experience and vehicle management, about 70 person-hours

Owns the Vue project and layout, login UI, vehicle list/detail/forms, inventory-related Java APIs, C-side list/detail, and main responsive styles. Integrates the enquiry entry with C and the advertisement component with B.

Work packages: A1 page skeleton and login 12h; A2 vehicle frontend and backend 24h; A3 C-side display 16h; A4 dashboard page and interaction wrap-up 10h; A5 related tests and API docs 8h.

### B: shared backend foundation and advertisement checks, about 72 person-hours

Owns the Java project, database-migration foundation, session permissions, advertisement edit page and API, fixed rules, one real AI adapter, and the manager review and publish flow.

Work packages: B1 project/auth/migration foundation 14h; B2 advertisement frontend/backend and version invalidation 18h; B3 fixed rules and AI 24h; B4 publish transaction and history 8h; B5 related tests and docs 8h.

### C: work orders, CRM, and sale close-out, about 78 person-hours

Owns work-order frontend and backend, enquiry submit, customer/lead/follow-up pages and APIs, the sale transaction and sales pages, and statistics queries.

Work packages: C1 simple reconditioning work orders 12h; C2 CRM and enquiry 26h; C3 sale transaction and pages 20h; C4 statistics queries 6h; C5 related tests and docs 14h.

Everyone contributes frontend, backend, and tests so the entire back office is not on one person. B defining the shared foundation does not mean B writes every module’s backend. C’s transaction work is reviewed by A; B’s publish rules are reviewed by C; A’s APIs and pages are reviewed by B.

The reserved 50h is shared; if C falls behind early, A takes the sales read-only list and B takes statistics queries, with no new features.

## Relative weekly schedule

### Week 1: confirm and prepare

The three people confirm this design, the rubric, actual hours, and B-side/C-side scope; the client confirms rule boundaries and supplies or the team builds de-identified samples; AI service and call limits are decided. The team aligns Java/MySQL/Node versions and prepares the repository and API discussion.

Done when: scope can be explained, fields and states have no disagreement, and whether AI is available is explicit. Do not wait until week 8 to discover a model service cannot be used.

### Week 2: baseline skeleton

A builds frontend layout and login; B builds auth, migrations, and seed accounts; C builds work-order/CRM data structures and sample APIs. Deliver one runnable local instance only.

Done when: after staff login a vehicle can be added and seen after refresh, and unauthorized APIs are rejected.

### Week 3: inventory and reconditioning

A finishes inventory; C finishes work orders and the available gate; B implements advertisement draft, fixed template, and contentVersion.

Done when: a vehicle with a work order cannot be marked available; after reconditioning an advertisement can be prepared; editing the current advertisement affects version.

### Week 4: pre-publish checks

B finishes fixed rules, mock, and a minimal real AI call; A wires C-side display; C wires visitor enquiry and the lead list.

Done when: one blocking sample, one normal sample, and one real AI request can be shown. If the real service is constrained, adjust acceptance with the client promptly; do not hide the problem.

### Week 5: B-side / C-side connected

A manager checks and publishes a vehicle; C-side can browse and enquire; B-side can assign and record follow-up. Add version-conflict and AI-degradation handling.

Done when: intake through enquiry follow-up runs end to end; integration must happen before week 5 — the three people must not each write for a full term and stitch at the end.

### Week 6: sale close-out

C implements the sale transaction; A builds the dashboard; B helps with audit and API consistency.

Done when: after a sale the advertisement unpublishes automatically, leads close, and statistics update; two concurrent sales succeed at most once.

### Week 7: exceptions and AI evaluation

Each person finishes critical automated tests for their modules, the 24-sample check evaluation, and permission and stale-check tests.

Done when: core acceptance cases pass, known defects have owners, and feature work stops.

### Week 8: demo environment

Configure a single instance and MySQL persistence; prepare reproducible start steps, backup/restore, and fictional demo data. Use HTTPS when cloud is available; otherwise finish a local demo pack and state the deployment scope honestly.

### Week 9: report and defence

Assemble the business-flow diagram, ER diagram, APIs, test evidence, AI results, and individual contributions. Record one full backup demo; prepare a normal path and an offline path.

### Week 10: buffer

Fix defects that affect the demo, final regression, and rehearsal. Do not add image enhancement, payments, or third-party publishing.

## Requirement-to-acceptance mapping

- US-01 → T01/T02, A+B.
- US-02 → T03/T04, A.
- US-03 → T05/T06, C.
- US-04 → T07/T08/T09/T10, B.
- US-05 → T11/T12/T13, B+A.
- US-06 → T14/T15/T16, C+A.
- US-07 → T17/T18/T19, C.
- US-08 → T20, C+A.
- Shared quality → T21/T22/T23/T24, all three.

## Acceptance cases

These are the plan. There is no application code yet, so they have not been executed and are not marked passed.

1. T01: valid login, wrong password, access back office after logout; expect success/401/401.
2. T02: Visitor reads CRM; Staff sends publish and sale requests; expect 401 or 403 and no data change.
3. T03: add a vehicle, refresh, duplicate VIN/stock number; expect persistence, duplicate 409.
4. T04: negative price, illegal mileage, overlong description, and unknown photoKey; expect 400; zero mandatory fees may be saved.
5. T05: manager marks available while a work order is in progress; expect 409; success after the work order is done.
6. T06: new work order on AVAILABLE is rejected; return to preparation unpublishes and voids checks, then work orders are allowed.
7. T07: rule-boundary samples; expect IDs that match the fixed rules; prices use decimal types.
8. T08: real AI, timeout, invalid JSON; expect SUCCESS/UNAVAILABLE/INVALID_RESPONSE; failure is not shown as success.
9. T09: prompt injection inside the advertisement and a fabricated quote; expect no tool action; bad evidence is filtered or the result is invalid.
10. T10: draft edited during a check; expect the check to target the old snapshot, stale=true, and the new draft cannot be published from it.
11. T11: publish with no check, a BLOCK, or a stale version; expect 409; Staff cannot publish even with a crafted request.
12. T12: AI findings unacknowledged / degradation unacknowledged / missing reviewNote; expect 400 or 409; a correct manager review can publish.
13. T13: price change on a published vehicle; expect same-transaction return to DRAFT, invisible on C-side; restore only after re-check and publish.
14. T14: C-side enquiry; expect one customer + lead; back office can view and follow up; no automatic outbound message.
15. T15: retry and concurrent submit with the same submissionKey; expect at most one customer/lead; the response does not leak an existing record.
16. T16: C-side reads an unpublished vehicle or enquires on a sold vehicle; expect detail 404, enquiry 409; public API has no PII.
17. T17: manager records a sale; expect one sale, SOLD/CLOSED/WON, other open leads LOST, follow-up dates cleared.
18. T18: two concurrent sale requests; expect at most one success, unique sale.vehicle_id, no partial updates.
19. T19: fault injected mid-sale; expect full rollback; no half-state such as WON while the vehicle is still available.
20. T20: statistics before/after a sale and at a month boundary; expect Toronto-month calculation; sale amount equals the sales-record total.
21. T21: deactivated user, missing CSRF, enquiry rate limit; expect 403/403/429 and no unauthorized side effects.
22. T22: two people edit at once / stale-page state action; expect 409, input kept, latest record not overwritten.
23. T23: application restart and database backup/restore; expect business data kept; session may expire and require re-login.
24. T24: desktop B-side, mobile C-side, empty list, load error, keyboard form; expect operable UI with no critical occlusion.

## Automated test scope

JUnit unit-tests price and state rules; Spring Boot plus a real MySQL test instance verifies transactions, foreign keys, and concurrency. Do not use H2 alone in place of MySQL to prove row-lock behaviour.

API integration tests cover unauthorized access, stale checks, duplicate enquiry, and sale rollback. Browser automation keeps only one full business happy path and one post-price-change intercept path; remaining UI is checked manually against the acceptance table so a three-person team is not trapped by low-value UI tests.

Online AI evaluation is separate from offline tests. Automated tests do not call paid services by default; real evaluation is triggered manually and records call count, duration, and billing information from the provider; unknown cost must not be written as 0.

## Demo data and 8-minute script

Prepare 1 manager, 2 staff, 6 fictional vehicles, 3 work orders, 8 leads, including one in reconditioning, one with a public advertisement, and one sold. Images use only clearly licensed demo assets or project placeholder images; do not copy real customer photos. Seed data has no real contact details.

1. 0:00–1:00: explain single-store B-side/C-side; add or open DEMO-001 in reconditioning.
2. 1:00–2:00: show the unfinished work-order restriction, complete the work order, manager marks available.
3. 2:00–3:30: advertisement checks; show one fixable issue, edit and re-check; show a real AI suggestion and manager review.
4. 3:30–4:30: publish, open C-side vehicle detail, submit an enquiry with fictional details.
5. 4:30–5:30: return to B-side, view the lead, assign, record follow-up.
6. 5:30–6:30: record the sale; show vehicle sold, advertisement unpublished, other leads auto-closed.
7. 6:30–7:30: refresh C-side and Dashboard; verify results match.
8. 7:30–8:00: show one AI-unavailable or stale-review intercept; explain limits and follow-up improvements.

Seed reset is allowed only in development/demo environments, must name the target database, and is not exposed to C-side or ordinary staff. Before a formal demo prepare a database backup, a screen recording, and a failure-degradation note.

## Pre-coding handoff checklist

- [x] Original-brief scope and team constraints recorded.
- [x] Web B-side / C-side split made explicit.
- [x] MVP, exclusions, roles, and main acceptance designed.
- [x] Screen sketches, business states, data dictionary, and API draft prepared.
- [x] AI boundaries, failure paths, and sample evaluation method designed.
- [x] Three-person work packages, relative schedule, tests, and demo script prepared.
- [ ] Teammate names, actual available hours, course rubric, and due dates confirmed.
- [ ] Client accepts the scope and limited advertisement rules, and supplies or reviews samples.
- [ ] AI service, call quota, demo environment, and specific dependency versions confirmed.
- [ ] Coding phase: create repositories, migrations, application, and tests; not implemented yet.

Unconfirmed items may still proceed as research and team-meeting prep; real-service integration, industry accuracy, and a final delivery date must not be treated as already locked.
