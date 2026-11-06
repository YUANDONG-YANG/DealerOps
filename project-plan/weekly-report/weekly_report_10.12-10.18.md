# Weekly report — 12 – 18 October 2026 (ISO week 42)

| Field | Value |
| --- | --- |
| Phase | Sprint 1, week 1 of 3 (sprint runs 12 October – 1 November) |
| Active days | 12, 13, 14, 15, 16 October |
| Commits | 57 — the project's largest week (`7ac0bbb` … `2c1a215`) |
| Contributors | Yuandong Yang (Robin) |
| Volume | +89,850 / −36,984 lines |

## Summary of activities

**1. The stack changed.** `0fc204c` restructured the repository and added the .NET backend and the
React frontend beside the existing Java and Vue code. `3232953` switched the Azure deployment from
Java to .NET and React, `5599f91` corrected the documented runtime from .NET 8 to .NET 10 and
`c17ea2a` set the App Service runtime to match. This is the decision the rest of the project rests
on: Java and Vue became legacy the same week and have not been changed since.

**2. Deployment became something a teammate could run.** `5aa3e90` auto-generates every Terraform
secret so an apply needs no manual configuration, `e808b78` and `52b1e9c` cut the deploy README down
to an apply plus pause/resume instructions, `58381c6` reduced `deploy/` to Terraform files only, and
`4b43347` shared the Terraform state and variables so any team member can apply or destroy.
`390289a` fixed the Azure ports and pinned the SPA to a fixed hostname.

**3. The .NET services were fitted out.** A shared file-logging project and OpenAPI filters
(`dd079c3`), gateway configuration keys renamed to camelCase (`e84e3eb`), the core AI timeout raised
and the gateway's core-swagger route dropped (`61d6baf`), and hardcoded AI credentials removed in
favour of configuration (`54e5313`, after `2dd4279` documented start-up without credential files).

**4. Authentication, compliance and the public flow were completed on the new stack**
(`542e758`, `cf0837d`), together with team join requests and notifications (`7070014`), the profile
page and vehicle body type (`5e6e060`), and a fix for the DMS edit drawer not repopulating its
fields (`4bf6de1`).

**5. Testing and demo data arrived.** `4aeac4b` added the Playwright end-to-end suite, fixed the
contract defects it found and seeded demo data; `04d05e0` added admin member password reset and the
sign-in method and adapted the tests; `dc7ad55` verified web and backend health after a deploy and
added seed scripts and vehicle filters.

**6. Documentation was rewritten for the new stack** — backend and frontend READMEs, the stack and
requirements-fit notes (`8907005`), the .NET local start-up guide (`f1c3748`, `a6a6edd`), one-command
local development (`3f4388a`) and finally the root README (`2c1a215`).

**7. Before the pivot, on 12 October**, `a50cf24` enforced the platform administrator's
business-data boundary — the rule that an admin never reads a dealership's records — and `813fd58`
stopped the app deploy early when Maven was not on JDK 21.

## What was delivered

- A .NET 10 + React product that builds, deploys to Azure and runs locally with one command.
- An end-to-end Playwright suite and seed data, from nothing.
- Zero-configuration Terraform: secrets generated, state shared, apply and destroy documented.
- The admin/dealership data boundary, enforced in code.

## Impediments

- **Two stacks in one repository.** For most of the week the Java and Vue code was still present and
  changing (693 and 156 files touched), so the same feature existed twice. The rule that Java and
  Vue are retired and must not be edited was written to end exactly that cost.
- **The .NET version was wrong twice** — documented as .NET 8, then corrected to 10, then matched in
  App Service — because the switch was made before the target runtime was confirmed.
- **Route mismatches between the new frontend and backend** only appeared at deploy time
  (`db19de3`).

## What went well

- The pivot took five days from first commit to a rewritten README, with the cloud deployment
  carried along rather than left behind.
- Credentials were taken out of the code in the same week they appeared (`54e5313`), not later.

## Carried into the next week

The new stack was running but thin on delivered scope. W43 was spent filling it in and proving it,
with Status Report 2 due at the end of it.
