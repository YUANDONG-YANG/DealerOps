# DealerOps reference pack (for later AI coding)

This directory holds research conclusions only. It does not hold this course's business code.  
Official scope is in `design/`.

Currently effective: `00-Current-Development-Design.md` and `07`–`12`. `01`–`06` are historical drafts.

**Read the implementation brief before writing code. Do not start from this directory:**  
`design/IMPLEMENTATION-BRIEF.md`  
The brief stays in `design/`. Do not copy it here.

Adaptation notes for the local reference copies: [REUSE-PLAN.md](REUSE-PLAN.md).

## Read order

| Order | File | When to read |
|------|------|--------|
| 1 | [00-reuse-policy.md](00-reuse-policy.md) | Before work: what to copy, what is forbidden |
| 2 | [01-github-repos.md](01-github-repos.md) | Compare tables, pick interaction samples, do not fork a whole repo |
| 3 | [04-uiux-patterns.md](04-uiux-patterns.md) | When writing `dealer-web`; `design/12-Frontend-UI-Conventions.md` is authoritative |
| 4 | [03-ai-manager.md](03-ai-manager.md) | When writing `ai-service` |
| 5 | [02-omvic.md](02-omvic.md) | When writing listing fixed rules and copy; no code to copy |

## How to use this while coding

- Stack is fixed: **Java + Vue 3 + Element Plus + Entra**. Four app repos: `dealer-web`, `dealer-gateway`, `dealer-core`, `ai-service` (the platform repo also stores Bicep/Compose). Do not treat any dealership course repo as the base.
- Pages are only: **Login, Admin, DMS, CRM, Ad compliance, Assistant**. No buyer site. No KPI home page.
- GitHub course projects: copy **interaction rhythm** only (tables, filters, drawers, confirms). Fields, state machines, isolation, Entra, and compliance follow the design docs.
- If this directory still has cloned source (for example `carventory/`), open it locally to inspect interaction only. Do not wire it into Compose. Do not use it as scaffolding.

## One-line conclusion

GitHub has many dealership course projects. **None of them can be the whole-repo base for this course.** Copy interaction, not business.
