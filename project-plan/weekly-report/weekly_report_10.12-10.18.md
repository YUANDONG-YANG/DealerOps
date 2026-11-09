# Weekly report — 12 – 18 October 2026 (ISO week 42)

| Field | Value |
| --- | --- |
| Phase | Sprint 1, week 1 of 3 (sprint runs 12 October – 1 November) |
| Active days | 12, 13, 14, 15, 16 October |
| Commits | 57 — the project's largest week (`7ac0bbb` … `2c1a215`) |
| Contributors | Yuandong Yang (Robin) |
| Volume | +89,850 / −36,984 lines |

## Progress against the plan

Sprint 1 opened with a decision that reshaped the rest of the plan: we moved the product onto a .NET 10 backend and a React frontend, retiring the Java and Vue implementations we had been carrying. The week's goal then became straightforward to state and hard to finish — stand the new stack up, get it deploying and running, and bring the existing feature set across so we lose no ground. By Thursday that was done. The stack runs locally with one command, deploys to Azure, and carries the authentication, compliance and public-dealer flows it replaced. It was the heaviest week of the project by volume, and it landed on plan.

## Summary of activities

**1. Committed to the .NET 10 + React stack.** The restructure (`0fc204c`) brought the .NET backend and React frontend into the repository and the Azure deployment was repointed off Java (`3232953`). I chose this over continuing on Java/Vue because the two were drifting apart in maintenance cost and the .NET stack fit the tenancy and gateway design better. The one rough edge was the runtime target: we shipped the switch before pinning it, so the version had to be corrected to .NET 10 and then matched in App Service (`5599f91`, `c17ea2a`). Java and Vue have been frozen since and are not being touched.

**2. Made the Azure deploy something a teammate can run.** The deployment was mine to run and nobody else's, which is a risk on a four-person team. Terraform now generates its own secrets so an apply needs no hand-configuration (`5aa3e90`), the state and variables are shared (`4b43347`), and the README is down to an apply plus pause/resume. Ports and the SPA hostname were pinned so the deployed app resolves predictably (`390289a`).

**3. Configured and secured the .NET services.** Shared file logging and OpenAPI filters went in (`dd079c3`), gateway config keys and timeouts were tidied, and — importantly — hardcoded AI credentials were pulled out and moved to configuration the same week they appeared (`54e5313`). I did not want secrets sitting in history any longer than they had to.

**4. Rebuilt the product features on the new stack.** Authentication, compliance and the public dealer flow were completed on .NET/React (`542e758`, `cf0837d`), along with team join requests and notifications (`7070014`) and the profile page and vehicle body type (`5e6e060`). A DMS edit drawer that was not repopulating its fields was fixed while the area was open (`4bf6de1`).

**5. Stood up automated tests and demo data.** The Playwright end-to-end suite was built from nothing, and running it surfaced real contract defects that were fixed in the same pass (`4aeac4b`). Admin member password reset and a sign-in method followed (`04d05e0`), and a post-deploy health check plus seed scripts and vehicle filters closed the week (`dc7ad55`).

**6. Refreshed documentation and closed early-week compliance work.** Backend, frontend and root READMEs were rewritten for the new stack (`8907005`, `2c1a215`). Earlier in the week, before the pivot, I enforced the platform administrator's data boundary — an admin must never read a dealership's records (`a50cf24`) — and added a guard that stops the app deploy early when Maven is not on JDK 21 (`813fd58`).

## What was delivered

- A .NET 10 + React product that builds, deploys to Azure and runs locally with one command.
- An end-to-end Playwright suite and seed data, built from nothing.
- Zero-configuration Terraform, with state shared and apply/destroy documented for any team member.
- The admin/dealership data boundary, enforced in code.

## Impediments and how they were handled

- **Two stacks in one repository.** For most of the week Java and Vue were still present and changing (693 and 156 files touched), so features effectively existed twice and every change risked being done in the wrong place. We ended it by declaring Java and Vue retired and off-limits, which is now a standing rule.
- **Runtime pinned late.** The .NET version was documented as 8, corrected to 10, then matched in App Service, because the switch went ahead before the target runtime was confirmed. Avoidable; next infrastructure change pins the target first.
- **Route mismatches between the new frontend and backend** only showed up at deploy time and were fixed there (`db19de3`).

## What went well

The pivot took five days from the first commit to a rewritten README, and the cloud deployment came along with it rather than being left to catch up. Taking the credentials out of code in the same week they went in (`54e5313`) kept a small problem from becoming a habit.

## Carried into the next week

The new stack runs but is still thin on delivered scope. Week 43 goes to filling it in and proving it out, with Status Report 2 due at the end of the week.
