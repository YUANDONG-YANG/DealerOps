# Weekly report — 26 October – 1 November 2026 (ISO week 44)

| Field | Value |
| --- | --- |
| Phase | Sprint 1, week 3 of 3 — sprint closes 1 November |
| Active days | 27, 28 October; 1 November |
| Commits | 8 — the project's quietest week (`c2eb39c` … `9741904`) |
| Contributors | Yuandong Yang (Robin) |
| Volume | +3,022 / −1,537 lines |

## Summary of activities

**1. Operators were given something to look at.** `c2eb39c` made authentication failures, tenant
rejections, downstream failures and API errors visible in the logs without ever logging a secret —
no token, no password, no key, no prompt. The same commit cleared the remaining Core build warnings
and the pnpm `allowBuilds` placeholder so both projects build clean.

**2. The English-only rule was finished.** `bc8a92c` translated the last Chinese text left in the
repository. The rule had been in place since W39; this is the commit that made the repository
actually comply with it.

**3. Commit authorship was fixed by rule.** `bda903c` requires every commit to be authored by the
repository's git user alone, with no agent co-author trailers. It is why the history reads as one
person's work rather than as a tool's.

**4. Small product and demo work.** Dealer logo avatars were made to fill their square
(`7f2cdbd`), and Wikimedia Commons photos were added for the Ford Explorer, Kia Sorento and Subaru
Crosstrek in the demo seed (`5752a10`).

**5. The Azure deployment was repaired for a second machine.** `e952e76` fixed the deployment
health probes, the Linux asset handling and the Windows data synchronisation — the problems that
appear when someone other than the author runs the deployment. `9741904` saved the Azure demo data
as a dated backup before further changes.

**6. Sprint 1 closed on 1 November** with the scope reported in Status Report 2 delivered, and the
change request that would define Sprint 2 arriving two days later.

## What was delivered

- Operational visibility into every authentication, tenancy, downstream and API failure, with no
  secret in any log line.
- A repository that is fully English, and an authorship rule that keeps the history clean.
- An Azure deployment that works from a Windows machine and probes healthy.
- A dated backup of the cloud demo data.

## Impediments

- **Three working days in the week.** 29, 30 and 31 October have no commits; the week's output is
  the smallest of the project.
- **Deployment problems only surfaced on someone else's machine**, which is the slowest way to find
  them. The Linux/Windows asset and synchronisation differences had not been visible to the author.

## What went well

- The quiet week was spent on the unglamorous items — logging, warnings, translation, authorship —
  that would otherwise have been carried into Sprint 2 and competed with the client's requests.
- Backing the cloud data up before touching it became routine here and has been followed since.

## Carried into the next week

Sprint 2 was described in the plan as hardening. The client's change document arrived on
3 November and took priority over that plan, which is what W45 reports.
