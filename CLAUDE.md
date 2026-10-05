# DealerOps AI instructions

These rules apply to every coding agent in this repository, including Cursor, Codex, and Claude. `AGENTS.md` and `CLAUDE.md` carry the same rules. Cursor also loads `.cursor/rules/`.

## Code quality

- Do not add or leave dead code. Unused classes, methods, fields, routes, components, and exports must not stay in the change. When you touch a file, remove code that has no caller. Do not keep a speculative API for later.
- Do not reimplement behavior that already exists. Search the current module for a service, helper, component, or utility that already does the job, and extend that. A second copy of the same flow is not allowed.
- Use a design pattern when the change has a real boundary or removes duplication. Prefer a pattern the module already uses. Do not add a pattern that has no caller, and do not wrap a single call in a new abstraction.

## Development phase: no test authoring

**Development is not complete. Do not write TEST code until the user confirms feature development is complete and explicitly authorizes test work.**

- Do not create, expand, modify, or refactor unit, integration, or end-to-end tests, empty test skeletons, assertions, test fixtures, mocks, or test-only helpers/configuration. This includes fixes made only to get existing tests to compile or pass.
- Requests to review requirements, inspect code, fix features, build, commit, or push do not authorize test authoring. Do not infer development completion from a successful build or existing coverage.
- Use source review, compilation/builds, and manual feature checks as appropriate. Running existing tests does not authorize editing them; obey any separate restriction on running tests. Report test failures without changing test code during development.
- Test-writing instructions elsewhere in this document or linked plans are deferred, including empty-class and sprint-based test tasks. Keep existing tests; do not delete or disable them to bypass failures.
- This is a student capstone: implement only required behavior and avoid unnecessary complexity.

This development-phase gate takes precedence over conflicting test-writing instructions in project documents. Future test plans remain reference material until both conditions above are met.

## Language and path rules

- Reply to the user in **English only**. Do not use Chinese in chat, commits, comments, or project files.
- All new or edited project text must be English: Markdown, YAML/JSON comments, Java/JS comments, OpenAPI descriptions, commit messages, and pull request descriptions.
- Do not leave leftover Chinese in files you touch. Translate it; do not delete meaning.

Never write a machine-specific absolute path in `*.md`. Use repo-relative paths such as `design/SCOPE-BASELINE.md` and `dealer-core/src/main/resources/db/migration/V1__init.sql`. Use GitHub URLs or env-var placeholders (`$JAVA_HOME`, sibling checkout named `ai-manager`) instead of a local disk layout.

## Design documentation

Major or important design decisions must be documented under `design/`. That folder is the source of truth. Do not leave the design only in chat, only in a README, or only in code comments.

Document or update a design doc when the change affects auth or identity (including Entra / MSAL), tenancy and multi-dealer boundaries, roles and permissions, API contracts, gateway routing and BFF behavior, or classroom acceptance and demo flows. Other cross-cutting product or architecture choices that the team must not diverge on also belong in `design/`.

Canonical text is Markdown under `design/` (English only; repo-relative paths). Root `README`, `design/PREP-CHECKLIST.md`, `env.example`, and similar entry points may summarize or link, and must point at the `design/` doc.

When implementing or changing such a design, update the relevant `design/` document in the same change. Prefer editing an existing doc over inventing a parallel one. Add a new file only when the topic is new.

## JIRA project members

Use these people when creating, assigning, or mentioning JIRA work for this project. There are four members.

| Display name | Initials | Notes |
| --- | --- | --- |
| Bedgel Fadhil Nda… | BW | Surname is truncated in the source list; do not invent the rest |
| Jackson Warga | JW | |
| Logan Jones | — | Photo avatar |
| Yuandong Yang | — | Current user ("You") |

- Address Yuandong Yang as the person in this chat.
- Do not add other assignees unless the user names them.
- If a ticket needs the full spelling of Bedgel's surname, ask before writing it.

## Flyway migration names

Leave `dealer-core/src/main/resources/db/migration/V1__init.sql` unchanged.

Every later versioned migration in that folder uses `V{YYYYMMDD}_{n}__{action}.sql`.

- `{YYYYMMDD}` is the calendar date the script is added.
- `{n}` is the sequence for that date, starting at `1`. The next script the same day is `2`, then `3`.
- `{action}` is a short English snake_case verb phrase.
- The separator between version and description is two underscores. Flyway requires that.

```text
V20260923_1__add_listing_search_index.sql
V20260923_2__add_customer_email_index.sql
```

Do not use `V2__...`, `V3__...`, or a single underscore between the number and the action (`V20260923_1_add_....sql`). A single underscore makes Flyway treat the action as part of the version.
