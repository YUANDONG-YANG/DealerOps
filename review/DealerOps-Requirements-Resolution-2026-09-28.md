# Requirements Issue Resolution Record - 2026-09-28

Scope: as requested by the user, and based on the student capstone demo, resolve the six requirements-document issues of this pass; add no business features, database fields, approval steps, or test frameworks.

## Completed

1. Ad severity: every rule in 04 is unified to the existing BLOCK / REVIEW, covering the contact information, year, usage, warranty, financing, and leasing rules; consistent with scope erratum 4.
2. AI results: success returns PASSED and keeps hints; hints do not veto Ready; failure is AI_UNAVAILABLE. The classroom script in design/16 was corrected accordingly.
3. CASH financing trigger: the decision matrix was completed, the copyable protocol skeleton was corrected, and the PAYMENT definition was added; the existing matching rules are reused and no new detection algorithm is added.
4. Linking sold vehicles: the baseline allows linking an unlinked same-dealer in-stock or sold vehicle; a sold vehicle still cannot be unlinked. The text in the old tracking report and the Jira report that judged this behavior a defect was corrected.
5. Checklist scope: only display the checklist and analyze the ad text; add no answer fields for historical usage/warranty/annual mileage. Rule configuration, a dedicated disclaimer UI, and extra invalidation triggers remain deferred. Historical review recommendations are explicitly labeled as historical records.
6. Acceptance traceability: linked the existing BE/FE/CL items and added AT-24–28 (CASH payment, link after sale, CRM fields, soft hints pass, checklist display). Filled in traceability items such as login, noting partial coverage and evidence that needs manual checking; the minimal classroom demo set is unchanged.

## review directory check

The old reports are snapshots of their time and cannot be taken directly as current to-dos. The current working tree already has many changes, and this pass keeps them.

A read-only check found that the DC-1 PATCH merge, the DC-2 saving of the evaluated version, the DW-1 ad selection request sequence number and saved-object validation, and the GW-3 bounded executor with timeout cancellation already exist in the current code. These are not new fixes in this pass, their tests were not run in this pass, and this is not grounds to declare the whole code review closed.

The statement in the Jira progress report for KAN-23 / KAN-67 that "allowing a sold vehicle to be linked is a defect" has been corrected; the live Jira was not touched. Delivery evidence such as Azure, real AI, and course sign-off was not verified in this pass and was not marked complete.

## Validation in this pass

- 6 targeted document assertions passed: scope baseline, financing skeleton and PAYMENT definition, AI semantics, checklist scope, and acceptance mapping.
- AT-01–AT-28 total 28 IDs, all unique; the code fences in the documents changed in this pass are paired.
- The acceptance steps are definitions awaiting execution, not records of passed tests. This pass changed only Markdown; no application code was modified and nothing was deployed.

Entry points: [Ad requirements](../requirements/analysis/04-Ad-Compliance.md), [Acceptance steps](../requirements/analysis/06-Pages-and-Acceptance.md), [Traceability matrix](../requirements/analysis/Traceability-Matrix.md).
