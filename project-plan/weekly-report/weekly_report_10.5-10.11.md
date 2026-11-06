# Weekly report — 5 – 11 October 2026 (ISO week 41)

| Field | Value |
| --- | --- |
| Phase | Pre-sprint setup (Sprint 1 opens 12 October) |
| Active days | 5, 7, 8 October |
| Commits | 25 (`0cfa8ea` … `71355dd`) |
| Contributors | Yuandong Yang (Robin); Fadhil on `origin/fadhil-branch` |
| Volume | +14,896 / −3,771 lines |

## Summary of activities

**1. A working AI provider was chosen and made to work.** Seven commits on 7 October took the AI
service from "configured" to "answering": Groq became the local provider (`1d427e0`), an active
free-tier model was selected after the first one had been retired (`8d09897`), the request shape
was fixed for the free tier (`a4ae0b9`), the key file mapping was documented (`8b8e84f`,
`b3e7937`) and the service's local application name was corrected (`a2ba23b`).

**2. Local start-up stopped being folklore.** `5e3f9e9` added the local startup guide and
`24ebe26` made the start script require clean service targets first, so a stale build could not be
mistaken for a running change. `7f3fc70` rewrote the stray `read.md` into the real `README.md`.

**3. Terraform and the two-environment split.** `90b8e7e` moved MySQL to its own region and stopped
tracking Terraform plan files; `0cfa8ea` documented the split between the Azure VM and the local VM
and removed a stale Entra redirect-URI line left over from W40.

**4. Repository hygiene, after a mistake.** `4f6fd2c` removed personal documents and screenshots
that had been committed by accident and repaired the character encoding of `CLAUDE.md`. `b1931a5`
added the no-hardcoding rule to the code-quality constraints and resynchronised `AGENTS.md` with
`CLAUDE.md`, which is why those two files still carry identical rules today.

**5. Feature and contract work continued on the Java/Vue stack.** The commits labelled only
"update" on 7 and 8 October changed, between them, the API contract and backend engineering designs
(`c5199ad`, 37 files), the traceability and review records (`1d22190`, 200 files), the Maven build
(`4d3d355`), the Vue phone input component (`71355dd`) and the project-plan assignment documents
(`bcd08ef`). They are the week's bulk, and their messages do not say so.

**6. Teammate branch.** Fadhil pushed a .NET backend and frontend to `origin/fadhil-branch` on
8 October (`97c9e7c`). It stayed on that branch, but it is the first .NET code in the project and
it preceded the mainline stack change by six days.

## What was delivered

- An AI service that actually answers, against a free-tier provider with no card attached.
- A documented one-command local start-up and a clean-target guard.
- A Terraform layout that survives a region constraint, with plan files out of version control.
- The no-hardcoding rule and a repository cleaned of accidentally committed personal files.

## Impediments

- **The free-tier model was withdrawn by the provider mid-week**, which is why the model name
  changed twice before requests succeeded.
- **Personal files reached a public repository.** Removing them cost a commit and the history still
  contains the removal. The no-hardcoding and file-hygiene rules date from this.
- **Commit messages were poor.** Nine of the week's 25 commits say only "update", and the largest
  of them touched 200 files. Reconstructing this week took longer than any other.

## What went well

- The AI provider problem was solved cheaply: free tier, swappable by configuration, no credential
  in the repository.
- The rules written after the hygiene mistake are the ones still enforced six weeks later.

## Carried into the next week

Sprint 1 opened on 12 October with the product still on Java and Vue, while working .NET and React
code existed on a teammate's branch. That tension is what W42 resolved.
