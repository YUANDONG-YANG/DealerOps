# Weekly report — 2 – 8 November 2026 (ISO week 45)

| Field | Value |
| --- | --- |
| Phase | Sprint 2 |
| Active days | 2, 3, 4, 5, 6 November (report written 6 November; the week is not finished) |
| Commits | 18 so far (`bb2c78e` … `a3e07e4`) |
| Contributors | See **Per-person contributions** below (Who → Branch → Code → Platform) |
| Volume | +26,926 / −4,148 lines |
| Milestones | Client change document 3 November; Status Report 3 presented 3 November |

## Team members (authors)

- **Yuandong Yang ("Robin")** — full-stack developer; sole commit author on `V2` this week.
- **Jackson Warga (JW)** — authored the 3 November client change document (the nine themes).
- **Logan Jones** — Windows local-run scripts on an unmerged side branch.
- **Bedgel Fadhil Ndam Woukouo (BW)** — live-demo acceptance / data entry on the Azure deployment.

## Per-person contributions (Who → Branch → Code → Platform)

> **Instructor note.** Each member's work is reported along two independent evidence trails: **Git
> history** (who committed code, on which branch) and the **Azure live-demo audit log** (who did what
> on the deployed application). A member can contribute on one trail and not the other — a
> requirements document or a live acceptance pass leaves no Git commit, and a code commit is not the
> same as exercising the running app. Both are shown so effort is visible wherever it actually landed.
> Git window ~2–8 November 2026; audit evidence from the Azure backup `azure-backup-20261101-221747`
> (DB timestamps in UTC; backup taken 2026-11-01 ~22:17 local time).

### 1. Yuandong Yang ("Robin")

- **Branch:** `V2` / `origin/V2` — **sole commit author this week** (recorded under two Git
  identities, `YUANDONG-YANG` and `robin`; same person).
- **Code (Git):** 18 of 18 weekly commits; +27,194 / -4,359 lines. Client change request into
  .NET 10 + React (`a4006b7`, `c981fbf`, `2173c9c`), home-page sign-up change (`d17858f`), audit
  location (`54b6664`), cloud/seed hygiene (`bb2c78e`, `b9ae46f`, `ebc6056`, `911b9b9`, `24db08d`,
  `4218f4c`), money-decimal rule (`273fa1f`), and documentation/course commits (`1378090`,
  `e108829`, `a3e07e4`, `a7d5d7a`).
- **Platform (Azure live demo):** accounts `lafe` and Google-login `yuandongyang061903` (plus test
  accounts `test` / `test1` / `test3`); ~20 audit events — logins, account/profile setup and
  environment self-test. `client_ip` 75.159.157.164 / .39 (test accounts from 68.146.239.134).

### 2. Bedgel Fadhil Ndam Woukouo (BW)

- **Branch:** `origin/fadhil-branch` — **no commits in this week's window** (his only Git commits are
  historical: `97c9e7c` 8 Oct, `c1b3485` 20 Oct).
- **Code (Git):** none this week.
- **Platform (Azure live demo):** account `Fadhil` (dealer 31); **18 audit events, the most live
  business activity of any teammate account** — created 2 vehicles, created/updated a listing,
  created a customer, linked customer to vehicle, created a lead with a note, ran 2 listing/VIN
  compliance checks, 6 logins. Span 01:30–03:14 UTC on 2 November. `client_ip` 75.159.157.39. This
  is a genuine end-to-end acceptance walkthrough that leaves no Git trace.

### 3. Logan Jones

- **Branch:** `origin/logan-robin` and `origin/V2-Windows-Test` — **not merged into `V2`**.
- **Code (Git):** 6 commits on 4 November — Windows local-run docs and scripts (`README-windows.md`,
  `start-local.ps1`): `0e06b7d`, `20e5ce6`, `0fbf677`, plus ports `4853f21`, `7055884`, `a17a1d1`;
  +724 / -325 lines across both side branches. Commit messages note login not yet working.
- **Platform (Azure live demo):** account `Logan` (dealer 32); 4 audit events — 2 logins plus
  account/profile setup, **no business data created**. `client_ip` 75.159.157.39.

### 4. Jackson Warga (JW)

- **Branch:** none — **no Git identity or commit on any branch**.
- **Code (Git):** none.
- **Platform (Azure live demo):** **no account on the Azure deployment; 0 audit events.**
- **Contribution is off both trails:** he authored the 3 November client change document that defined
  the nine themes Robin then implemented. Credit for that is the document, not code or platform
  activity.

### Audit activity summary (Azure live demo)

| Member | Account(s) | Audit events | Business data created? | client_ip | When (UTC, 2 Nov) |
| --- | --- | --- | --- | --- | --- |
| Yuandong Yang (Robin) | `lafe`, `yuandongyang061903` (+3 test) | ~20 | Setup / self-test | 75.159.157.164 / .39 | 01:21–04:16 |
| Bedgel Fadhil (BW) | `Fadhil` | **18** | **Yes** — vehicles, listing, customer, lead, checks | 75.159.157.39 | 01:30–03:14 |
| Logan Jones | `Logan` | 4 | No | 75.159.157.39 | 02:07–03:13 |
| Jackson Warga (JW) | — | 0 | — | — | — |

**Audit fact on shared IP (stated, not interpreted).** The live sessions for `Fadhil` and `Logan`
and one of Robin's addresses all originate from `75.159.157.39`, all within the same ~2-hour window
on the evening of 1 November (local). The most likely reading is a single joint demo/acceptance
session on one network; each account's events are attributed above to its named owner. The fact is
recorded here for the instructor to weigh.

## Summary of activities

**1. The client review arrived and was implemented in two days.** Jackson's change document of
3 November listed nine themes. `a4006b7`, `c981fbf` and `2173c9c` put them into the .NET 10 and
React build: Sold by / Sold to / Date sold on the inventory; cost, work-order spend and list price
shown in the sell dialog; day, week, month and year periods with per-salesperson figures; the
Owner / Manager / Sales tier split; server-side column sorting; leads, customers and the sale tied
together; safer admin deletes and split join requests; and the home page with the sign-up button
removed, its sample ad pointed at sign-up instead (`d17858f`). Seven of the nine themes are done,
VIN matching is partial and the dealership inquiry that would replace sign-up is not started.

**2. The audit trail gained a location.** `54b6664` records a readable place beside the IP address
on each audit row, with private addresses labelled locally and never sent to the lookup service.

**3. Cloud data handling was made repeatable.** Demo data was saved into the seed before each
Terraform destroy (`bb2c78e`, `b9ae46f`, `ebc6056`); `911b9b9` made the cloud-additions seed safe to
load twice; `24db08d` picked a MySQL client that can actually authenticate to Azure; and `4218f4c`
reports an account bound to two dealerships after a seed import instead of letting it through.

**4. A business rule was tightened.** `273fa1f` refuses a work-order cost with more than two
decimals rather than rounding it, because every amount is stored to two decimals and rounding would
persist a figure the user never saw. The same rule now covers purchase cost, repair cost, list
price and sold price.

**5. Reporting and documentation.** The 3 November client-change review was recorded for the sprint
presentation (`1378090`), the development report was translated to English with its review findings
fixed (`e108829`), and the system design briefing was verified line by line against the running
code and expanded on architecture and business flows (`a3e07e4`).

**6. Course work.** `a7d5d7a` added the CPRG-305-B bonus testing tasks — five options with prompts,
AI responses, corrected test cases and reflections.

**7. Teammate branch.** Logan pushed Windows compatibility work to `origin/logan-robin` on
4 November (`20e5ce6`, `0e06b7d`). Not merged into `V2`.

## What was delivered

- Seven of the nine client themes from the 3 November review, in the build, within two days.
- Client location on every audit row, with private addresses kept private.
- A seed and backup path that survives being run twice and names its own failures.
- Status Report 3 and its deck, and a design briefing that matches the code.

## Impediments

- **Sprint 2 was planned as hardening and became a change request.** The plan written at sprint
  start was overtaken on day two; the report presented on 3 November covers the review rather than
  the planned polish.
- **Two themes are not finished.** VIN matching works only when the decoder answers, and the
  dealership inquiry that should replace public sign-up has not been started. Both are named
  openly in the Status Report 3 deck rather than being reported as done.
- **Azure state drift** from an earlier portal deletion still makes a plain `terraform apply`
  unreliable, which is why demo data is saved to the seed before each destroy.

## What went well

- The change request was answered in the client's own terms — nine themes, three statuses — rather
  than as a list of commits.
- Backing up the cloud data before every destroy, established in W44, paid off three times this week.

## Next

- Finish VIN matching and decide with the client on the dealership inquiry that replaces sign-up.
- Confirm the rate-limit values and service-level targets that currently ship as defaults.
- Complete the manual acceptance pass; the feature code is complete and acceptance is in progress.
