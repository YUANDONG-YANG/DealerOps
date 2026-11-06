# Weekly report — 28 September – 4 October 2026 (ISO week 40)

| Field | Value |
| --- | --- |
| Phase | Pre-sprint setup |
| Active days | 28, 29, 30 September |
| Commits | 12 (`a3a01ec` … `ff40dfd`) |
| Contributors | Yuandong Yang (Robin) |
| Volume | +3,972 / −1,981 lines |

## Summary of activities

**1. The week's one real decision: authentication was reversed.** The design had been built on
Microsoft Entra. Reading it back against the client specification showed the client had asked for
dealership accounts the platform itself issues and controls. Four commits carried the reversal
through: `4a24836` turned the design back to username and password, `b546a7e` implemented
admin-issued username/password sign-in in place of Entra, and `7686be7` and `ff40dfd` swept the
README and the remaining documents so no instruction still pointed at Entra.

Two commits earlier in the same week had still been trying to make Entra workable — `d26da40`
documented signing in with a personal Microsoft account as a hosting alternative, and `495a1b9`
kept Security Defaults on and used Authenticator MFA instead. Those are the attempts that led to
the reversal rather than contradictions of it.

**2. Hosting was settled, for the moment.** `a208c7e` made Cloudflare the DevOps and demo path,
kept Azure as the backup and dropped the automatic Railway deploys for good. `a3a01ec` recorded
that the Azure student VM was the only demo host actually available to the team.

**3. Review material and team rules were filed.** `5b1ce86` added the code-review notes, the
architecture diagrams and the Cursor team rules; `fef7200` put the same standing agent rules in
front of Codex and Claude so all three assistants work to one set of instructions; `d30c7f0` moved
setup and reuse notes out of the repository root.

**4. Requirements verification was realigned** with the fixed workflows (`fe79a00`).

## What was delivered

- Username/password authentication issued and controlled by the platform, replacing Entra end to
  end — design, implementation and documentation in the same week.
- One documented hosting path (Cloudflare for the demo, Azure in reserve) instead of three
  half-working ones.
- One shared rule set for the three coding assistants used on this project.

## Impediments

- **The Entra work from W39 was thrown away.** The sign-in hardening, the app registration
  documentation and the MFA setup were all sunk cost. The cause was choosing a technology before
  checking it against the client's written requirement.
- **A short week.** Three working days, and most of their capacity went to the reversal rather than
  to new scope.

## What went well

- The reversal was complete in one pass. The sweep commits exist precisely so that no stale Entra
  instruction was left behind to confuse a teammate later, and none was.
- Deciding against the clever option (federated identity) in favour of the specified one kept the
  authentication model simple enough that it has not needed changing since.

## Carried into the next week

Running the stack locally was still awkward, and the AI provider was unresolved. W41 took both on.
