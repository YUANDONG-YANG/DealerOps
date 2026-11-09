# Weekly report — 19 – 25 October 2026 (ISO week 43)

| Field | Value |
| --- | --- |
| Phase | Sprint 1, week 2 of 3 |
| Active days | 19, 20, 21, 22, 23 October |
| Commits | 32 (`8f18e8c` … `d3ef34b`) |
| Contributors | Yuandong Yang (Robin) |
| Volume | +14,479 / −3,819 lines |
| Milestones | Instructor demonstration 21 October; Status Report 2 and deck 23 October |

## Progress against the sprint plan

We entered the week behind on the extension scope and ended it with that scope delivered, so the
week closed ahead of where the Sprint 1 plan had it. Both milestones landed: the instructor
demonstration on 21 October and Status Report 2 with its deck on 23 October. Below I group the work
by outcome rather than by commit.

**1. Closed the requirement gaps carried from week 1.** Several items previously marked "won't do"
were reopened and delivered — the ad rules, account handling, and the DMS/CRM pages (`8f18e8c`,
`02f6ecc`), followed by rate limiting, one table per view, and customer retention (`34f5db2`). Each
item was signed off against the requirement ledger so the reopened scope is traceable.

**2. Ran a manual bug hunt and cleared it the same day.** A hand-run browser CRUD walkthrough on
20 October surfaced ten defects that the automated suite had passed. All ten were fixed and
re-verified that day (`c872753`), with the findings logged in
`review/DealerOps-Browser-CRUD-Bug-Log-2026-10-20.md`. I want to keep this check: it caught things a
green test run did not.

**3. Shipped the bulk of the extension scope.** 21 October was the heavy build day — the buyer site,
payments, bill of sale, dashboard, and workshop reports (`c0cd793`), the dealership manager and staff
roles (`113b440`), and audit logs, the buyer-inquiry inbox, and buyer-site ad links (`e1ca446`).
22 October added type-ahead search, a disclaimer drawer, and explicit empty states (`6a5ee3b`) plus
buyer-site pages named by dealership and ad-compliance filters. A single design call this week was
that no business data is ever hard-deleted; photos, payments, and vehicle links are soft-deleted and
the retention job was dropped (`8181aa5`).

**4. Made deployment a single self-verifying command.** Deploy now publishes the local database to
Azure with `deploy.sh --seed` and confirms the import through the gateway before it reports success
(`d1451c2`, `f045bd6`). It also refuses to run Terraform from a dirty or stale checkout, which closes
off a class of "works on my machine" failures.

**5. Tightened the UI for the demo.** One link style and theme across the app (`cf09126`), real
values in place of dash placeholders, and themed icons instead of emoji. The demo seed was narrowed
to licensed Wikimedia photos (`09c20fa`) — a licensing decision, not a cosmetic one, and worth noting
before we show the product externally.

**6. Produced the client and course deliverables.** The client system design briefing page was
created and brought up to date (`aa308a6`, `9298d33`), and Status Report 2 and the deck were added
with the 21 October demonstration recorded in them (`edf99a1`, `515d36a`). The CPRG-305 Unit 6
bug-hunt submission and the rebaselined Assignment 2 test plan belong to the course track, not the
product.

## What was delivered

- The full extension scope in one week: buyer site, payments, bill of sale, dashboard, workshop
  reporting, audit logs, inquiry inbox, and the manager/staff role split.
- Ten manually found defects fixed and re-verified the same day.
- A deployment that refuses to run from a dirty checkout and verifies its own import.
- Status Report 2, the deck, and a demonstration given to the instructor on 21 October.

## Impediments and how they were handled

- **The end-to-end suite drifted twice** as the UI changed under it mid-week. I realigned Playwright
  with the current screens rather than let the suite rot (`34f5db2`, `28af891`), accepting the rework
  as the cost of extending UI and tests in the same sprint.
- **Kudu refused first-connection uploads**, which made deployment look broken. Adding a retry on the
  zip upload turned an intermittent failure into a non-issue (`480ae38`).
- **The report's evidence cut-off was 23 October while the sprint runs to 1 November.** The final
  week is therefore reported as planned work and will be confirmed in the next report — flagged here
  so the timeline reads honestly.

## What went well

The hand-run walkthrough is the clear win: it caught ten real defects a passing test suite had
missed, and it is now a standing step before we accept a change. The soft-delete decision also paid
off — settling it once and applying it across photos, payments, and links together avoided the
table-by-table drift we would otherwise have cleaned up later.

## Carried into the next week

Sprint 1 has one week left. Observability is still outstanding, and the Azure deployment is not yet
reliable on a second machine — both are the priority for the final week before Sprint 1 closes.
