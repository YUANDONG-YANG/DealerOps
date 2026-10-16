# DealerOps AI instructions

These rules apply to every coding agent in this repository, including Claude, Codex, and Cursor. `AGENTS.md` and `CLAUDE.md` carry the same rules. Cursor also loads `.cursor/rules/`.

## Primary objective

Focus on delivering the requested product behavior quickly and accurately. Prefer a small, complete implementation over speculative architecture, broad refactoring, or unfinished abstractions.

The active implementation is the .NET 10 backend and React frontend. Java and Vue are retired legacy implementations. Do not modify the Java or Vue stacks unless the user explicitly requests legacy-stack work. Do not update multiple implementations for one feature unless the user asks for parity.

## Before changing code

- Read the relevant requirements and current design document before changing behavior. The `design/` directory is the source of truth for architecture, scope, API contracts, authentication, tenancy, permissions, and acceptance flows.
- Inspect the target module and search for existing services, helpers, API clients, components, and configuration before adding anything. Extend an existing implementation when it already owns the behavior.
- Identify the affected service and its callers before changing a public API, DTO, route, database table, or shared type.
- Keep the change within the requested scope. Do not fix unrelated issues unless they block the requested feature.

## Development-only workflow

This project is currently focused on feature development. Do not author tests as part of normal feature work.

- Do not create, expand, modify, or refactor unit, integration, end-to-end, or test-only code, including fixtures, mocks, assertions, test helpers, test configuration, or empty test classes.
- Preserve existing tests and test fixtures. Do not delete, disable, or weaken them to make a change pass.
- You may inspect or run existing checks when useful, but do not change test code or spend implementation time increasing test coverage unless the user explicitly switches the task to test work.
- Validate feature work with source review, compilation/builds, API inspection, and focused manual smoke checks as appropriate.

## Implementation standards

- Do not add or leave dead code. Remove unused classes, methods, fields, routes, components, and exports introduced or made obsolete by the change.
- Do not reimplement behavior that already exists. Search first, then extend the owning service, helper, component, or client.
- Use the simplest pattern that matches a real boundary or removes duplication. Follow patterns already used by the module; do not add an abstraction for one call or one future use.
- Do not hardcode connection strings, URLs, ports, credentials, tenant IDs, environment IDs, or provider settings. Use existing environment variables, application configuration, or constants.
- Preserve existing public behavior unless the requested change requires a contract change. When a contract changes, update all affected callers in the same change.
- Keep error handling, validation, authorization, pagination, and response envelopes consistent with the existing module and API contract.
- Do not make broad formatting-only changes or unrelated renames.

## Service boundaries

- The browser calls only `dealer-gateway`; it must not call `dealer-core` or `ai-service` directly.
- `DealerOps.Core` owns authentication, authorization, tenancy, business logic, and persistence.
- `DealerOps.AiService` owns AI-provider integration and must not access the application database.
- `DealerOps.Gateway` is the only API entry point exposed to the browser and owns routing, JWT validation, CORS, and downstream health checks.
- Keep internal service credentials and routes server-side. Never expose API keys or internal tokens to frontend code.
- The Java backend is retired. Do not port new behavior back to Java or change Java Flyway history as part of active .NET development.

## Frontend rules

- Follow `design/12-Frontend-UI-Conventions.md` and `design/13-Frontend-Engineering.md` for React frontend changes.
- Reuse existing API clients, shared components, formatting helpers, route guards, and state management patterns before creating new ones.
- Put API access in the existing API/client layer, not directly in page components.
- Route browser API calls through the gateway and use configured origins/URLs; never hardcode service-internal URLs in components.
- Keep retired Vue code unchanged unless legacy-stack work is explicitly requested.

## API and design documentation

- For API behavior, use `design/14-Backend-API-Contract.md` and `dealer-platform/openapi.yaml` as the current contract. Do not revive retired designs under `design/archive/`.
- When changing authentication, identity, tenancy, roles, permissions, gateway routing, BFF behavior, API contracts, or classroom acceptance flows, update the relevant `design/` document in the same change.
- Prefer editing an existing design document over creating a parallel one. Root `README.md`, `env.example`, and checklists may summarize a design, but the canonical decision belongs under `design/`.
- All new or edited repository text must be English-only: Markdown, YAML/JSON comments, Java/JS/C# comments, OpenAPI descriptions, commit messages, and pull request descriptions.
- Never write a machine-specific absolute path in Markdown. Use repository-relative paths such as `design/SCOPE-BASELINE.md`.

## Build and handoff

- Before declaring a change complete, build every affected module and perform a focused manual check when the feature has a user-visible flow.
- For .NET changes, build the affected solution or project with the repository's .NET 10 setup.
- For React changes, use the package manager and scripts already defined by `frontend/react/package.json`.
- Only use Maven or the Java toolchain when the user explicitly requests legacy Java work.
- Report the files changed, validation commands run, and any remaining limitation or failure. Do not claim success when a required build or smoke check failed.

## Service startup hygiene

- Before starting a .NET service locally, use its existing startup workflow and clean only its own generated output when needed. Never delete the repository root, another module's output, or shared user data.
- Start active services in dependency order: MySQL, `DealerOps.Core`, `DealerOps.AiService`, `DealerOps.Gateway`, then `frontend/react`.
- Use the readiness endpoints and environment configuration documented in `README.md`. Never commit credentials, API keys, local tokens, or machine-specific configuration.

## JIRA project members

Use these people when creating, assigning, or mentioning JIRA work for this project. There are four members.

| Display name | Initials | Notes |
| --- | --- | --- |
| Bedgel Fadhil Ndam Woukouo | BW | |
| Jackson Warga | JW | |
| Logan Jones | — | Photo avatar |
| Yuandong Yang | — | Current user ("You"); goes by Robin; full-stack developer |

- Address Yuandong Yang as the person in this chat.
- Do not add other assignees unless the user names them.
- The canonical roster and roles are in `design/TEAM.md`.

## Flyway migration names

These rules apply only to the retired Java `dealer-core` module. They do not govern active .NET development.

- Leave `backend/java/dealer-core/src/main/resources/db/migration/V1__init.sql` unchanged, and never edit a migration that has already run; add a new dated script instead. V1 was rewritten once on 2026-10-07 to define the username identity columns; databases created before that need the Flyway history repair in `design/15-Data-Auth-and-Gateway.md` §8.3.
- Every later versioned migration uses `V{YYYYMMDD}_{n}__{action}.sql`.
- `{YYYYMMDD}` is the calendar date the script is added; `{n}` starts at `1` for each date; `{action}` is a short English snake_case verb phrase.
- The separator between version and description is two underscores. Do not use `V2__...`, `V3__...`, or a single underscore between the number and action.

```text
V20260923_1__add_listing_search_index.sql
V20260923_2__add_customer_email_index.sql
```
