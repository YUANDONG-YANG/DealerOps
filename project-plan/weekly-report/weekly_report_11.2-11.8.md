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

Sprint 2 was planned as a hardening sprint. That plan held for two days. Jackson's client change
document landed on 3 November with nine themes the client wanted ahead of the next review, and the
sprint pivoted to absorbing it. Status Report 3 went out the same afternoon, reporting against the
review instead of the polish we had scheduled.

Most of the nine themes are now in the .NET 10 and React build (`a4006b7`, `c981fbf`, `2173c9c`):
the Sold by / Sold to / Date sold fields on inventory, cost and work-order spend and list price in
the sell dialog, per-salesperson reporting across day, week, month and year, the Owner / Manager /
Sales tier split, server-side sorting, and the leads-customers-sale linkage. Admin deletes are
safer and join requests are split. The home page lost its sign-up button, and its sample ad now
points at sign-up instead (`d17858f`). Two items are still open, and I have flagged both with the
client: VIN matching only returns when the decoder answers, and the dealership inquiry meant to
replace public sign-up has not been started.

Two smaller pieces closed alongside the change request. The audit log now shows a readable location
next to each IP, with private addresses resolved locally and never sent to the lookup service
(`54b6664`). And the money rule was tightened to reject any cost carrying more than two decimals
rather than rounding it — a rounded value would be stored as a figure the user never typed
(`273fa1f`) — now applied to purchase cost, repair cost, list price and sold price alike.

Cloud data handling took real effort, because state drift from an earlier portal deletion keeps a
plain `terraform apply` from being reliable. The working mitigation is to fold demo data back into
the seed before each destroy (`bb2c78e`, `b9ae46f`, `ebc6056`). On top of that, the cloud-additions
seed is now safe to load twice (`911b9b9`), the MySQL client we use can authenticate to Azure
(`24db08d`), and a seed import that would leave an account bound to two dealerships is now reported
rather than waved through (`4218f4c`).

Review documentation was finished with the code: the client-change review captured for the
presentation (`1378090`), the development report brought into English with its findings fixed
(`e108829`), and the system design briefing checked against the running code (`a3e07e4`). The
CPRG-305-B course deliverables also went in (`a7d5d7a`).

On the team, Logan pushed Windows local-run scripts and docs to `origin/logan-robin` on 4 November;
the commit messages note login is not yet working there, and the branch is not merged into `V2`.
Fadhil and Logan also exercised the live demo on Azure — the per-person section above has the detail,
and Fadhil's end-to-end acceptance walkthrough is the most business activity any teammate account
recorded this week.

## What was delivered

- The bulk of the nine client themes from the 3 November review, built into .NET 10 + React within
  two days of receiving the change document.
- A readable client location on every audit row, with private addresses kept local.
- A repeatable cloud seed-and-backup path that survives a second run and reports its own failures.
- Status Report 3 and its deck, plus a design briefing that matches the running code.

## Impediments

- The sprint plan did not survive contact with the client. Hardening was the stated goal; the change
  request on day two took priority, and Status Report 3 reports against that. Not a fire to put out,
  but worth naming so the plan-versus-actual gap is on the record.
- Two themes are unfinished — VIN matching is decoder-dependent, and the dealership inquiry that
  replaces sign-up has not been started. Both are called out in the deck as open, not dressed up as
  done.
- Azure state drift is the standing risk to the cloud environment. The seed-before-destroy habit is
  the mitigation and it held three times this week, but it is a workaround, not a fix.

## What went well

- Framing the response in the client's own nine themes, each with a plain status, turned the review
  into a conversation about outcomes rather than a commit list.
- The W44 habit of backing up cloud data before every destroy earned its keep: three clean restores
  this week, no data lost.

## Next

- Close VIN matching and settle the dealership-inquiry design with the client.
- Confirm the rate-limit and service-level values currently shipping as defaults.
- Finish the manual acceptance pass; feature code is complete and acceptance is underway.
