# DealerOps AI Log

Updated: 2026-10-12

Each member records their own AI use: the task, the affected artifact, which output was accepted or rejected, and how it was checked. Jackson publishes or links this log on the team site by 2026-10-31. Never include passwords, tokens, or private customer records.

| Team Member | AI Tool | Purpose | Date | Output and human review |
|---|---|---|---|---|
| Yuandong Yang | Claude Code | Analyse the project plan, status report, and Sprint 1 task list against the rubric and the repository requirements; align the sign-in rule (email, username, or phone) across `README.md`, `Implementation-Delivery-Status.md`, and the Sprint 0 report; write the update instructions; restore the course template in the project plan and apply the content changes. | 2026-10-12 | Findings and instructions recorded in `Implementation-Delivery-Status.md`. Yuandong chose the sign-in rule and reviewed the edits. |
| Yuandong Yang | OpenAI Codex | Apply the update instructions to the project plan, status report, and Sprint 1 workbook; create the separate Research and AI Logs. | 2026-10-12 | Workbook changes kept. Plan and report wording revised afterwards, and the course template restored in the plan. |
| Yuandong Yang | Claude Code | Diagnose the failing dealer-core, dealer-gateway, and ai-service CI runs; fix the admin business-read gap, the stale `version` after a sale, the sold-price error code, and the OpenAPI path; vendor the `ai-manager` sources into ai-service; check the project-plan files against the requirements and correct the MVP backlog, the Tool text, and four workbook notes. | 2026-10-12 | All five workflows passed on `a50cf24`. Yuandong chose to vendor `ai-manager` and reviewed the document corrections. |
