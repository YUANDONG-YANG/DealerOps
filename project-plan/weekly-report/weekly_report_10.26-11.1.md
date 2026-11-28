# Weekly report — 26 October – 1 November 2026 (ISO week 44)

| Field | Value |
| --- | --- |
| Phase | Sprint 1, week 3 of 3 — sprint closes 1 November |
| Active days | 27, 28 October; 1 November |
| Commits | 8 — the project's quietest week (`c2eb39c` … `9741904`) |
| Contributors | Yuandong Yang (Robin) |
| Volume | +3,022 / −1,537 lines |

## Summary of activities

This was the last week of Sprint 1, and the plan for it was to close the sprint cleanly rather than
to start anything new. That is roughly what happened. It was also the lightest week of the project —
three active days, eight commits — so the goal was to land the loose ends before they followed us
into Sprint 2.

**1. Operational logging for the gateway and core services.** Authentication failures, tenant
rejections, downstream errors and API faults are now visible in the logs, and the change was written
so that no secret is ever written to a log line (`c2eb39c`). The same commit cleared the remaining
Core build warnings and the pnpm `allowBuilds` placeholder, so both projects build clean again —
small items, but they were starting to add noise to every build.

**2. Commit authorship tightened by rule.** We set a rule that every commit is authored by the
repository's git user alone, with no co-author trailers (`bda903c`). For a capstone this matters for
assessment: the history should read as the team's own work, and this keeps it that way.

**3. Product and demo polish.** Dealer logo avatars were adjusted to fill their square (`7f2cdbd`),
and real vehicle photos from Wikimedia Commons were added to the demo seed for the Ford Explorer,
Kia Sorento and Subaru Crosstrek (`5752a10`). Minor, but the demo is what the client and the
instructor actually see.

**4. Azure deployment fixed for a second machine.** The deployment broke when run from a machine
other than mine — health probes, Linux asset handling and Windows data sync all needed fixes
(`e952e76`). Before touching the live environment I saved the Azure demo data as a dated backup
(`9741904`), since the teammates' accounts exist only online.

**5. Sprint 1 closed on 1 November** with the scope promised in Status Report 2 delivered. The change
request that reshapes Sprint 2 landed two days later, so the close was clean but short-lived.

## What was delivered

- Log-level visibility into authentication, tenancy, downstream and API failures, with secrets kept
  out of the logs.
- An authorship rule that keeps the commit history attributable to the team.
- A working Azure deployment that probes healthy from a Windows machine, with the demo data backed up
  first.
- Demo seed polish: squared logo avatars and licensed vehicle photos.

## Impediments and how they were handled

- **Only three working days.** 29–31 October produced no commits, and this is the smallest week of
  the project. It fell at the end of a sprint with the planned scope already in hand, so I treated it
  as cleanup time rather than forcing new work into it.
- **Deployment only broke on someone else's machine.** The Linux/Windows asset and sync differences
  weren't visible on the machine the deployment was built on, which is a slow way to find a problem.
  The fix went in, and I now back up the cloud demo data before any change to that environment so a
  bad deploy can't cost us the teammates' online accounts.

## What went well

Spending a quiet week on logging, build warnings and authorship was the right call — none of it is
glamorous, but all of it would have competed with the client's change request had it slipped into
Sprint 2. Backing up before touching the live environment started here and has stuck as a habit.

## Carried into the next week

Sprint 2 was planned as a hardening sprint. The client's change document arrived on 3 November and
took priority over that plan; W45 reports where that led.
