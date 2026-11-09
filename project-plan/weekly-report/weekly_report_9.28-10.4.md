# Weekly report — 28 September – 4 October 2026 (ISO week 40)

| Field | Value |
| --- | --- |
| Phase | Pre-sprint setup |
| Active days | 28, 29, 30 September |
| Commits | 12 (`a3a01ec` … `ff40dfd`) |
| Contributors | Yuandong Yang (Robin) |
| Volume | +3,972 / −1,981 lines |

## Summary of activities

This was a setup week ahead of Sprint 1, and the plan was to lock down the foundation
decisions — authentication, hosting, and the engineering ground rules — before any feature work
started. We got through all three, though not the way I expected: most of the capacity went into
undoing an authentication choice rather than building on it. Three working days, one contributor,
and a late pivot that was better caught now than mid-sprint.

**1. Authentication was moved back to the client-specified model.** The design had been carrying
Microsoft Entra federated sign-in. Re-reading it against the written client specification, it was
clear the client had actually asked for dealership accounts that the platform issues and controls
itself. So we reversed it: the design went back to admin-issued username/password, the
implementation followed, and a documentation sweep removed the stale Entra references so nobody
on the team would be working from the old assumption later (`4a24836`, `b546a7e`). Two earlier
commits that week (`d26da40`, `495a1b9`) were still trying to make Entra viable — a personal
Microsoft account workaround and keeping Security Defaults with Authenticator MFA. Those were the
dead ends that forced the decision, not leftovers from it.

**2. Hosting was narrowed to a single demo path.** We had three half-working options and no clear
answer. Cloudflare became the DevOps and demo path, Azure stayed as the backup, and the automatic
Railway deploys were dropped (`a208c7e`). The practical constraint behind this is that the Azure
student VM is currently the only demo host the team actually has access to, so the plan now matches
what we can run.

**3. Engineering ground rules and review material were put in place.** Code-review notes,
architecture diagrams, and a shared agent rule set went into the repo, with the same standing rules
applied across the three coding tools the team uses so everyone works to one standard (`5b1ce86`).
Setup and reuse notes were moved out of the repository root, and requirements verification was
realigned with the corrected workflows (`fe79a00`).

## What was delivered

- Platform-issued username/password authentication — design, implementation, and docs all brought
  into line in the same week — in place of Entra.
- One documented hosting path (Cloudflare for the demo, Azure in reserve) instead of three
  unfinished ones.
- A single shared rule set governing the coding tools used on the project.

## Impediments and how they were handled

The Entra work from the prior week (sign-in hardening, app-registration docs, MFA setup) was
effectively sunk cost. Root cause: a technology was chosen before it was checked against the
client's written requirement. I'd rather absorb that loss in a setup week than discover it after
sprint features depend on it, so the fix was to reverse cleanly and in one pass rather than patch
around it. The other constraint was simply a short week — three active days — so new scope took a
back seat to getting the foundation right.

## What went well

The reversal landed in a single pass. Because the documentation sweep went in alongside the code,
no stale Entra instruction was left behind to trip up a teammate later. Choosing the specified
option over the more elaborate federated-identity approach also kept the auth model simple enough
that it hasn't needed to change since.

## Carried into the next week

Running the stack locally was still awkward and the AI provider was unresolved. Both are the
priority for W41.
