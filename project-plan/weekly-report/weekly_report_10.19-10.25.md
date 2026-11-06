# Weekly report — 19 – 25 October 2026 (ISO week 43)

| Field | Value |
| --- | --- |
| Phase | Sprint 1, week 2 of 3 |
| Active days | 19, 20, 21, 22, 23 October |
| Commits | 32 (`8f18e8c` … `d3ef34b`) |
| Contributors | Yuandong Yang (Robin) |
| Volume | +14,479 / −3,819 lines |
| Milestones | Instructor demonstration 21 October; Status Report 2 and deck 23 October |

## Summary of activities

**1. Requirement gaps were closed.** `8f18e8c` and `02f6ecc` worked through the ad rules, the
account handling and the DMS/CRM pages; `34f5db2` added rate limiting, one table per view and
customer retention and realigned the end-to-end tests. Requirements that had been marked "won't do"
were reopened and delivered, with per-item evidence recorded in the requirement ledger.

**2. A manual bug hunt, and the fixes the same day.** A browser CRUD walkthrough on 20 October
found ten defects; `c872753` fixed them and the suite was re-run
(`review/DealerOps-Browser-CRUD-Bug-Log-2026-10-20.md`). Finding them by hand, rather than by test,
is the point worth keeping.

**3. The big feature week.** 21 October alone delivered the buyer site, payments, the bill of sale,
the dashboard and the workshop reports (`c0cd793`), the dealership manager and staff roles
(`113b440`), and the audit logs, buyer-inquiry inbox and buyer-site ad links (`e1ca446`).
22 October added type-ahead search, a disclaimer drawer and explicit empty states (`6a5ee3b`),
buyer-site pages named by dealership and ad compliance filters (`c2da1c5`), and the decision that
no business data is ever hard-deleted — photos, payments and vehicle links are soft-deleted and the
retention job was dropped (`8181aa5`).

**4. Deployment became one command that verifies itself.** `d1451c2` publishes the local database to
Azure with `deploy.sh --seed`; `480ae38` retries zip uploads when Kudu refuses the first connection;
`f045bd6` verifies the import through the gateway before reporting success; `afce6fc` refuses to run
Terraform unless the checkout is clean and pushed; `18643a3` requires the latest checkout;
`2b5523e` quietens the scripts to show only real errors.

**5. The interface was made consistent.** One link style and theme colours across the app
(`cf09126`), dash placeholders replaced by the real state of each value (`28f1ba0`), emoji check
marks replaced by themed icons (`a376e56`). The demo seed was limited to licensed Wikimedia photos
(`09c20fa`), which is a licensing decision, not a cosmetic one.

**6. Client-facing and course deliverables.** The client system design briefing page was created
(`aa308a6`) and updated with the week's work (`9298d33`); the Sprint 1 status report and
presentation deck were added (`edf99a1`) and the 21 October instructor demonstration recorded in it
(`515d36a`). The CPRG-305 Unit 6 bug-hunt app and submission (`d4738f4`, `203bafc`) and the
rebaselined Assignment 2 test plan (`d3ef34b`) belong to the course rather than the product.

## What was delivered

- Buyer site, payments, bill of sale, dashboard, workshop reporting, audit logs, inquiry inbox and
  the manager/staff role split — the extension scope, in one week.
- Ten manually found defects fixed and re-verified the same day.
- A deployment that refuses to run from a dirty checkout and verifies its own import.
- Status Report 2, the deck, and a demonstration given to the instructor on 21 October.

## Impediments

- **The end-to-end suite had to be realigned twice** (`34f5db2`, `28af891`) because the UI moved
  under it during the same week it was being extended.
- **Kudu refused first-connection uploads**, which made deployment look broken until the retry was
  added.
- **The report's evidence cut-off was 23 October while the sprint ran to 1 November**, so the final
  week had to be reported as planned work and confirmed later.

## What went well

- The hand-run walkthrough caught ten real defects the automated suite had passed — it is now part
  of how a change is accepted.
- Keeping every record (soft delete instead of purge) was decided once and applied across photos,
  payments and links together, rather than table by table.

## Carried into the next week

Sprint 1 had one week left, with observability and the English-only sweep outstanding and the Azure
deployment not yet reliable on a second machine.
