# Weekly report — 5 – 11 October 2026 (ISO week 41)

| Field | Value |
| --- | --- |
| Phase | Pre-sprint setup (Sprint 1 opens 12 October) |
| Active days | 5, 7, 8 October |
| Commits | 25 (`0cfa8ea` … `71355dd`) |
| Contributors | Yuandong Yang (Robin); Fadhil on `origin/fadhil-branch` |
| Volume | +14,896 / −3,771 lines |

## Progress against plan

This was the last week before Sprint 1, so the goal was a working environment rather than
shipped features: an AI service that responds, a local stack anyone on the team can start the same
way, and infrastructure that matches the two environments we actually run. All three landed.
Planning documents and the API contract also moved forward on the Java/Vue stack, and a teammate
began exploratory .NET work off to the side. We went into the sprint set up to build, which was the
point of the week.

**1. The AI service was brought online on a free provider.** The work on 7 October took it from
configured to actually answering. We settled on Groq as the local provider (`1d427e0`), and when the
model we first picked turned out to be retired, we swapped to an active free-tier model and fixed the
request format the free tier expects (`8d09897`, `a4ae0b9`). Key-file mapping was documented so the
next person does not have to guess where the credential lives. No card is attached and no key sits in
the repository.

**2. Local start-up became repeatable.** A startup guide now exists (`5e3f9e9`), and the start
script insists on clean service targets before it runs (`24ebe26`), so a stale build can no longer be
mistaken for a running change — a small guard that saves a familiar kind of wasted debugging.

**3. Infrastructure was split to match the two environments.** MySQL moved to its own region after a
capacity constraint, and Terraform plan files are no longer tracked (`90b8e7e`). The split between the
Azure VM and the local VM is now written down, and a stale Entra redirect-URI line carried over from
week 40 was removed (`0cfa8ea`).

**4. Repository cleanup and a coding standard.** Personal documents and screenshots that had been
committed by accident were removed, and a no-hardcoding rule was added to the project's code-quality
constraints. That rule is still in force today.

**5. Feature and contract work continued on Java/Vue.** Most of the week's volume sits in commits
labelled only "update": the API contract and backend engineering designs (`c5199ad`), the
traceability and review records (`1d22190`, roughly 200 files), the Maven build, the Vue phone-input
component (`71355dd`) and the project-plan assignment documents. The messages hide how much changed,
which made this week harder to reconstruct than it should have been.

**6. First .NET code appeared on a teammate branch.** Fadhil pushed a .NET backend and frontend to
`origin/fadhil-branch` on 8 October (`97c9e7c`). It stayed on that branch, but it is the first .NET
code in the project and it arrived six days before the mainline stack decision.

## What was delivered

- An AI service that answers, on a free-tier provider with no card attached and no key in the repo.
- A documented one-command local start-up with a clean-target guard.
- A Terraform layout that survives the region constraint, with plan files out of version control.
- A cleaned repository and a no-hardcoding rule now baked into the code-quality constraints.

## Impediments and how they were handled

- **The provider retired our chosen model mid-week.** This is why the model name changed twice before
  requests succeeded. Because the provider is swappable by configuration, the fix was a config change
  rather than a code change.
- **Personal files reached a public repository.** Removing them cost a commit, and the removal is still
  visible in history. The file-hygiene and no-hardcoding rules date from this and have held since.
- **Commit messages were poor.** Nine of the week's 25 commits say only "update", and the largest
  touched around 200 files. Reconstructing the week took longer than it needed to; clearer messages are
  the obvious lesson going into the sprint.

## What went well

The AI-provider problem was solved cheaply and cleanly — free tier, swappable by configuration, no
credential committed — which is the kind of decision that keeps paying off later. The standards written
in reaction to the hygiene slip are the ones the team still works under weeks on.

## Carried into the next week

Sprint 1 opened on 12 October with the product still on Java and Vue while working .NET and React code
sat on a teammate's branch. Resolving that mismatch is the first thing week 42 had to deal with.
