# DealerOps weekly reports

One report per calendar week, from the first commit on 21 September 2026 to the current week.
Weeks are ISO weeks (Monday to Sunday); the project happens to start on a Monday, so every week
is a clean seven-day block.

| Week | Report | Sprint | Commits | Theme |
| --- | --- | --- | --- | --- |
| 21 – 27 Sep | [weekly_report_9.21-9.27](weekly_report_9.21-9.27.md) | Pre-sprint setup | 37 | Workspace, design baseline, first Java/Vue stack, public demo experiments |
| 28 Sep – 4 Oct | [weekly_report_9.28-10.4](weekly_report_9.28-10.4.md) | Pre-sprint setup | 12 | Authentication reversed from Entra to the client's username/password |
| 5 – 11 Oct | [weekly_report_10.5-10.11](weekly_report_10.5-10.11.md) | Pre-sprint setup | 25 | Local stack, Groq as the AI provider, Terraform and repository hygiene |
| 12 – 18 Oct | [weekly_report_10.12-10.18](weekly_report_10.12-10.18.md) | Sprint 1 | 57 | Stack change: .NET 10 + React replace Java + Vue, in the cloud too |
| 19 – 25 Oct | [weekly_report_10.19-10.25](weekly_report_10.19-10.25.md) | Sprint 1 | 32 | Delivery extensions, manual bug hunt, one-command deploy, Status Report 2 |
| 26 Oct – 1 Nov | [weekly_report_10.26-11.1](weekly_report_10.26-11.1.md) | Sprint 1 close | 8 | Observability, English-only sweep, Azure deployment fixes |
| 2 – 8 Nov | [weekly_report_11.2-11.8](weekly_report_11.2-11.8.md) | Sprint 2 | 18 | The 3 November client change request, Status Report 3, seed tooling |

## How these reports were produced

They are reconstructed from the repository's own record — commits, their changed files and the
dated artefacts under `design/`, `requirements/`, `review/` and `project-plan/` — and were written
on 6 November 2026, after the fact. Three limits follow from that and apply to every week:

- **The record shows what was done, not what was planned.** Where a report says what carried into
  the following week, that is read from the next week's commits, not from a plan written at the time.
  The sprint-level plans live in `project-plan/StatusReports1` and `project-plan/StatusReports2`.
- **The mainline history is the lead's.** `main`, `robin` and `V2` carry Yuandong Yang's commits.
  Teammates' work sits on `origin/fadhil-branch` (8 and 20 October) and `origin/logan-robin`
  (4 November) and is noted in the week where it appears, but it is not merged into the mainline.
- **Some commit messages are only "update".** Those commits are described here by the files they
  changed. The habit stops after 16 October; from Sprint 1 onwards every message names its change.

Counts are commits reachable from `V2` on 6 November 2026.
