# Weekly report — 2 – 8 November 2026 (ISO week 45)

| Field | Value |
| --- | --- |
| Phase | Sprint 2 |
| Active days | 2, 3, 4, 5, 6 November (report written 6 November; the week is not finished) |
| Commits | 18 so far (`bb2c78e` … `a3e07e4`) |
| Contributors | Yuandong Yang (Robin); Logan on `origin/logan-robin` |
| Volume | +26,926 / −4,148 lines |
| Milestones | Client change document 3 November; Status Report 3 presented 3 November |

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
