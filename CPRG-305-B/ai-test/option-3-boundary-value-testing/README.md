# Option 3 — Boundary Value Testing with AI

CPRG-305-B bonus option for the DealerOps capstone. This folder is the write-up only. It does not contain executable tests.

| Part | File |
|---|---|
| Prompt | `prompt.md` |
| Raw AI answer | `ai-response.md` |
| Reflection | `reflection.md` |
| Improved cases | `improved-test-cases.md` |

`improved-test-cases.md` holds the corrected set. All 40 generated cases were **executed** against
the running API on the project's private end-to-end stack. Two expected results were wrong, and four
cases the raw answer left unclassified now have answers.

Fields: register username (AUTH-16), work-order task (WO-01), completion note and cost (WO-03), and lead-list page size (LEAD-05 / NFR-01).

Bounds used, and the page-size disagreement with a "fixed at 10" reading, are in `reflection.md`.
