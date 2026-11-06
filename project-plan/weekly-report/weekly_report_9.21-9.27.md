# Weekly report — 21 – 27 September 2026 (ISO week 39)

| Field | Value |
| --- | --- |
| Phase | Pre-sprint setup |
| Active days | 21, 22, 23, 25 September |
| Commits | 37 (`ff2c440` … `1694510`) |
| Contributors | Yuandong Yang (Robin) |
| Volume | +115,101 / −5,496 lines, including two imported reference projects |

## Summary of activities

**1. The workspace was opened.** `ff2c440` created the capstone repository with the design set,
the requirement material and the agent rules already in place, so the first day of coding started
from a written scope rather than from an empty folder.

**2. The English-only rule was applied to everything already written.** Four commits
(`3dbc479`, `8a38fa2`, `2bd31a1`, `8567a79`) translated the design fixtures, design contracts 18–19,
the AI protocol and the AI coding guides, and fixed the paths in them to be repository-relative.
This is the rule that still governs every document in the repository.

**3. The first backend took shape.** `dealer-core` (Java/Spring at this point) received its DTOs,
paging, tenant-isolation tests, the OMVIC rule work and the AI client (`8567a79`, `0535322`,
`030bf4f`), with customer and vehicle listing moved onto repository search queries and the audit
event order corrected (`0d40d02`). MySQL Testcontainers integration tests came with it.

**4. The four-service local stack was assembled.** `dda4b09` replaced the single-service
scaffolding with one Docker Compose stack shared by the SPA, the gateway, core and the AI service,
plus the CI workflows and tests to match. `dealer-web` was a Vue scaffold at this stage.

**5. Sign-in used Microsoft Entra.** `5296120` hardened the Entra dealer login — post-MSAL redirects
persisted, the active account set — and documented the classroom app registration.

**6. A public demo path was searched for.** The week spent eight commits on hosting: container
images published to GHCR (`1b694df`), Swagger served on the gateway (`847cbb4`), a named Cloudflare
tunnel for a fixed hostname (`c6f6b94`), demo hostnames locked on `dealer-ops.app` (`e773b2d`,
`dafb9c1`), then Vercel and Railway (`d7b7872`, `1c371aa`), and finally Cloudflare quick tunnels
recorded as the entry point (`e9db95f`, `1694510`).

**7. The specification became traceable requirements.** `2cecbe4` broke the client specification into
numbered requirements and reviewed the design against them; `2b6a12a` added an evidence checklist so
each finding can be verified by hand; `b4b4657` triaged the review down to the minimum the
specification actually requires.

## What was delivered

- A repository with the design set, requirement IDs and a design review recorded against them.
- A local stack of four services that builds and runs together, with CI on every push.
- Entra-based dealer sign-in, documented for classroom use.
- Container images in GHCR and a working public demo URL through a Cloudflare tunnel.

## Impediments

- **Free hosting kept not working out.** Railway needed a project token the team did not have, so
  the deploy workflow was written, then skipped (`a740be5`), then excluded (`1694510`). Cloudflare
  quick tunnels became the demo path by elimination.
- **Toolchain breakage.** The GitHub Actions runner needed Node 24 and the Bicep template would not
  compile (`02cf9f3`).
- **An agent-written fix had to be rolled back.** The A2/A3/B4 fixes were reverted and recorded as
  open issues instead (`aefd7b3`), re-reviewed (`ecf1c53`), re-issued as step-by-step instructions
  (`c82c176`), and only then accepted and closed (`8c1d199`, `4afb3e3`). Three commits of process
  for one change.

## What went well

- Writing the design and the requirement IDs before the feature code meant every later change had
  something to be checked against.
- Tenant isolation was tested from the first backend commits rather than retrofitted.

## Carried into the next week

The hosting question was still open, and the Entra decision — taken for convenience — had not yet
been checked against the client's own specification. Both were settled in W40.
