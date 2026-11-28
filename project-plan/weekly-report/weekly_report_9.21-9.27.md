# Weekly report — 21 – 27 September 2026 (ISO week 39)

| Field | Value |
| --- | --- |
| Phase | Pre-sprint setup |
| Active days | 21, 22, 23, 25 September |
| Commits | 37 (`ff2c440` … `1694510`) |
| Contributors | Yuandong Yang (Robin) |
| Volume | +115,101 / −5,496 lines, including two imported reference projects |

## Progress against plan

This was the setup week before Sprint 1, and the plan for it was to stand up the project scaffolding, get one backend running, and give the team a scope it could be held to. All three landed. The week closed with a four-service stack that builds and runs, a working backend, and the client specification broken into numbered requirements. Hosting was the one item that did not close cleanly and carried over.

## Summary of activities

**1. Project workspace and scope established.** The repository was opened with the design set, requirement material and agent rules already in place (`ff2c440`), so day one of coding started against a written scope rather than a blank folder. That choice paid off all week — every later change had a document to be checked against.

**2. First backend built and running.** The initial `dealer-core` (Java/Spring at this stage) got its DTOs, paging, the OMVIC compliance work and the AI client, with customer and vehicle listing moved onto repository search queries and the audit event order corrected (`8567a79`, `030bf4f`, `0d40d02`). Tenant-isolation and MySQL Testcontainers tests went in alongside the code rather than after it, which is the part I was most comfortable with going into the sprint.

**3. Four-service local stack assembled.** The earlier single-service scaffolding was replaced with one Docker Compose stack shared by the SPA, gateway, core and AI service, with matching CI (`dda4b09`). The frontend was still a Vue scaffold at this point. From here the team could run the whole system locally in one command.

**4. Dealer sign-in hardened on Microsoft Entra.** Post-MSAL redirects were made to persist and the active account set, and the classroom app registration was documented (`5296120`). This was taken for convenience to get a working login quickly; I flagged at the time that it had not yet been checked against the client spec.

**5. Public demo path investigated — unresolved.** Roughly eight commits went into finding a free public demo URL: images to GHCR (`1b694df`), Swagger on the gateway (`847cbb4`), a named Cloudflare tunnel, then Vercel and Railway, and finally Cloudflare quick tunnels recorded as the entry point (`1694510`). The paid-provider routes did not pan out and quick tunnels became the demo path mostly by elimination.

**6. Specification turned into traceable requirements.** The client specification was broken into numbered requirements and the design reviewed against them (`2cecbe4`), an evidence checklist added so each finding can be verified by hand (`2b6a12a`), and the review then triaged down to the minimum the spec actually requires (`b4b4657`). This gives the instructor and the team a single place to trace scope.

## What was delivered

- A repository carrying the design set, requirement IDs, and a design review recorded against them.
- A four-service local stack that builds and runs together, with CI on every push.
- Entra-based dealer sign-in, documented for classroom use.
- Container images in GHCR and a working public demo URL through a Cloudflare tunnel.

## Impediments and how they were handled

- **Free hosting kept falling through.** Railway needed a project token the team did not have, so the deploy workflow was written, then skipped (`a740be5`), then excluded entirely (`1694510`). Rather than keep sinking time into it, I fell back to Cloudflare quick tunnels as a good-enough demo path and moved on. Still open as a question, but low risk for the demo itself.
- **Toolchain breakage on CI.** The Actions runner needed Node 24 and the Bicep template would not compile; both were fixed in one pass (`02cf9f3`).
- **A coding-assistant fix had to be rolled back.** The A2/A3/B4 changes were reverted and logged as open issues (`aefd7b3`), re-reviewed, re-issued as step-by-step instructions, and only then accepted and closed (`8c1d199`, `4afb3e3`). That round trip cost about a day, and the lesson I took is to review assistant output against the spec before it lands, not after.

## What went well

- Writing the design and requirement IDs before feature code meant nothing was being built blind — there was always something to check against.
- Tenant isolation was tested from the first backend commits, not retrofitted, which removed a class of risk early.

## Carried into the next week

Two things stayed open. Hosting was unresolved beyond the quick-tunnel fallback, and the Entra sign-in decision still needed to be checked against the client's own specification. Both were taken up and settled in W40.
