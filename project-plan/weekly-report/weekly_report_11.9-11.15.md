# Weekly report — 9 – 15 November 2026 (ISO week 46)

| Field | Value |
| --- | --- |
| Phase | Sprint 2 / Iteration 3 |
| Active days | 9 and 10 November |
| Commits | 16 (`53be389` … `8c36f2b`) |
| Contributors | Yuandong Yang (Robin), recorded under `robin` and `YUANDONG-YANG` |
| Volume | +5,973 / −332 lines |
| Milestones | Iteration 3 review resolved 10 November; no commits 11–15 November |

## Progress against the plan

The previous week ended with two client themes still open: the vehicle-source clarification and
the original request to record who a vehicle was acquired from. This week converted both into
explicit requirements and delivered them in the active .NET 10 and React stack. The week also
turned the review findings into executable acceptance coverage and refreshed the cloud seed so the
new data can be demonstrated. Work stopped after 10 November; the remainder of the calendar week
contains no recorded commits.

## Summary of activities

**1. Closed the DMS-19 review and delivered DMS-20.** The vehicle source `OTHER` now has a
dealership-scoped custom source name, with trim-before-length validation, legacy blank-value rules,
source filtering, option deduplication and the agreed PATCH semantics (`26b7eb5`, `1ebb62b`). The
original client request was preserved as DMS-20: every vehicle may record an acquired-from name and
address, both optional, audited, and locked once the vehicle is sold. The API contract, OpenAPI,
requirements, feature design and implementation were updated together.

**2. Strengthened audit evidence.** Audit events now carry the dealership snapshot and the actor
identity needed to explain who performed an action and in which dealership context (`26b7eb5`,
`60c513d`). Rejected requests are logged before they are returned, including the vehicle-source
validation paths. The UI then presents the username alone in the Actor column, while the browser
timezone is used when validating displayed audit times (`8c36f2b`, `daf1b3e`).

**3. Added the missing acceptance coverage.** API and UI Playwright cases cover the DMS-19 source
options, filtering, legacy records, permissions, audit behavior and page reset rules
(`5280ca9`, `71d11c8`, `c439e4f`). The project rules were tightened at the same time: every changed
feature must ship with Playwright coverage and a troubleshooting record (`7e98492`). This closes
the gap identified in the DMS-19 review instead of leaving the decisions as documentation only.

**4. Refreshed demo data and export tooling.** The cloud additions were refreshed from the 9
November backup, 60 more vehicles and vehicle-source seed data were added, and the export script
now prepares the V3 vehicle columns before exporting local data (`2bda07e`, `0e77d25`, `9fdd320`).
The earlier backup-before-destroy practice was repeated before the Terraform operation
(`53be389`).

**5. Kept iteration reporting aligned with the code.** Validation results, the V3 commit list and
the iteration 1–3 reports were recorded (`8431078`, `26b7eb5`). The DMS-19 review now records the
decisions for all findings R1–R6, including the acceptance additions and the choice to implement
the original acquisition-details request as DMS-20 (`a55b90d`, `1ebb62b`).

## What was delivered

- DMS-19 custom vehicle-source behavior, including API/UI validation, filtering and acceptance cases.
- DMS-20 acquired-from name and address fields across the vehicle lifecycle.
- Dealership-scoped audit actor and snapshot evidence, with rejected requests logged safely.
- Playwright coverage for the new behavior and a rule requiring coverage with every change.
- Refreshed V3 seed/export tooling and 60 additional demo vehicles.
- Updated iteration reports and resolved DMS-19 review findings.

## Impediments and how they were handled

- **The review exposed a scope mismatch.** The first DMS-19 interpretation only captured a custom
  category for `OTHER`, while the client's original request also asked for the acquisition party and
  address. Rather than silently treating the smaller interpretation as complete, the work split the
  concerns into DMS-19 and DMS-20 and implemented both.
- **The acceptance document was ahead of the test suite.** Several review scenarios had been written
  but were not automated. The missing API/UI cases were added in the same change and the project rule
  was updated so future changes cannot repeat the gap.
- **Cloud state remains sensitive to Terraform drift.** The backup-before-destroy workflow was used
  again, and the seed/export path was refreshed so the new vehicle data can be restored consistently.

## What went well

The team resolved the review findings as explicit product decisions, then carried those decisions
through requirements, API contract, implementation, tests and demo data in two active days. The
result is easier to accept and demonstrate because the client request and its edge cases now have
one traceable path.

## Carried into the next week

- Run the full manual acceptance pass against the completed DMS-19 and DMS-20 behavior.
- Confirm the remaining Sprint 2 hardening and service-level defaults.
- Keep the Azure backup and seed-refresh procedure in place before the next destructive deployment.
