# Dealer Ops course design (minimal implementation)

## Development phase: no test authoring

**Development is not complete. Do not write TEST code until the user confirms feature development is complete and explicitly authorizes test work.**

- Do not create, expand, modify, or refactor unit, integration, or end-to-end tests, empty test skeletons, assertions, test fixtures, mocks, or test-only helpers/configuration. This includes fixes made only to get existing tests to compile or pass.
- Requests to review requirements, inspect code, fix features, build, commit, or push do not authorize test authoring. Do not infer development completion from a successful build or existing coverage.
- Use source review, compilation/builds, and manual feature checks as appropriate. Running existing tests does not authorize editing them; obey any separate restriction on running tests. Report test failures without changing test code during development.
- Test-writing instructions elsewhere in this document or linked plans are deferred, including empty-class and sprint-based test tasks. Keep existing tests; do not delete or disable them to bypass failures.
- This is a student capstone: implement only required behavior and avoid unnecessary complexity.


Version v6.0 · 2026-09-21

Deliver only what the course requires: business per [DealerOps-Specification.pdf](DealerOps-Specification.pdf), technology per [Non-Negotiable-Project-Requirements.pptx](Non-Negotiable-Project-Requirements.pptx). Do not expand scope.

- Backend Java 21 + Spring Boot, frontend Vue 3.
- Four independent repositories: web, gateway, core, ai-service. A separate platform repository holds Bicep/pipeline notes.
- One MySQL database. The AI service is stateless and uses synchronous REST; no message queue and no second database.
- Do not build AI from scratch: reuse the assistant library on your GitHub (default [YUANDONG-YANG/ai-manager](https://github.com/YUANDONG-YANG/ai-manager)), embedded in ai-service.

**Coding starts from [IMPLEMENTATION-BRIEF.md](IMPLEMENTATION-BRIEF.md).** The backend design document is [DEVELOPMENT-DESIGN.md](DEVELOPMENT-DESIGN.md) (scope, phases, invariants). Public HTTP/DTOs still follow 14 + OpenAPI; internal protocol/rule details are in [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md). Packaging is in 18 / 19; execute `AI-CODING-BACKEND` per repo. Frontend still follows 13. Acceptance is 16, ad fixtures 17; scope sign-off is `SCOPE-BASELINE`. `01`–`06` are withdrawn — see [archive/](archive/); do not treat them as requirements.

## Coding-AI entry points

Humans still confirm scope first via `SCOPE-BASELINE` and the BRIEF.

- **Backend design:** [DEVELOPMENT-DESIGN.md](DEVELOPMENT-DESIGN.md) (scope, phases, invariants).
- **Public HTTP/DTOs:** [14-Backend-API-Contract.md](14-Backend-API-Contract.md) + [../dealer-platform/openapi.yaml](../dealer-platform/openapi.yaml).
- **Internal protocol/rules:** [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md).
- **Packaging:** 18 / 19. Task list [AI-CODING-BACKEND.md](AI-CODING-BACKEND.md).
- **Frontend:** still [13-Frontend-Engineering.md](13-Frontend-Engineering.md) + [AI-CODING-FRONTEND.md](AI-CODING-FRONTEND.md).
- **Conflict order:** PPT > specification fields > DEVELOPMENT-DESIGN / PROTOCOL > 14 / 15 > task lists.

- [AI-CODING-FRONTEND.md](AI-CODING-FRONTEND.md) — `dealer-web` task list FE-T01–11 (shell, guards, MSAL, six-page wiring).
- [AI-CODING-BACKEND.md](AI-CODING-BACKEND.md) — backend task list BE-T01–23 (core / Gateway / ai-service).
- [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) — internal JSON and rule details.
- [AI-CODING-LOCAL-AND-CLOUD.md](AI-CODING-LOCAL-AND-CLOUD.md) — how to start the four local services, ports, and minimum cloud resource names.
- [AI-CODING-TESTS.md](AI-CODING-TESTS.md) — 28 test-implementation tasks (empty test skeletons; do not change contracts).
- [../dealer-platform/openapi.yaml](../dealer-platform/openapi.yaml) — public path/DTO alignment with 14; if internal sketches conflict, PROTOCOL wins.

## Effective documents

0. [Implementation brief (coding entry)](IMPLEMENTATION-BRIEF.md)
1. [Business specification PDF](DealerOps-Specification.pdf)
2. [Course hard-requirements PPT](Non-Negotiable-Project-Requirements.pptx)
3. [Approved scope (instructor/client sign-off)](SCOPE-BASELINE.md) **currently in force** — one-page In/Out and six hard items; confirm with the instructor before starting; re-sign if scope changes.
4. [Business and pages](00-Current-Development-Design.md)
5. [Architecture](07-Azure-Microservices-Architecture.md)
6. [Repos and Sprint](08-DevOps-and-Implementation.md)
7. [Ad AI (GitHub component)](09-AI-Agent-Integration.md)
8. [In-store assistant (same component)](10-Web-AI-Assistant.md)
9. [Tracking and Scrum](11-Requirements-Governance-and-Agile.md)
10. [Frontend UI conventions](12-Frontend-UI-Conventions.md)
11. [Frontend engineering (file split)](13-Frontend-Engineering.md) **currently in force** — routes, file split, page↔API; frontend still follows this document + `AI-CODING-FRONTEND`.
12. [Backend development design](DEVELOPMENT-DESIGN.md) **backend design document** — scope, phases, invariants.
13. [Backend API contract (DTOs/error codes)](14-Backend-API-Contract.md) **currently in force** — public HTTP, DTOs, pagination envelope, error codes; align with OpenAPI.
14. [Data / auth / gateway rulings](15-Data-Auth-and-Gateway.md) **currently in force** — tables, tenant/membership, Gateway, JWT, **dealer Entra auth (§8)**, rule pseudocode.
15. [Acceptance and test](16-Acceptance-and-Test.md) **currently in force** — 32 cases + 6 classroom scripts, mapped to NN-19; does not change contracts.
16. [Ad-check fixtures](17-Ad-Check-Fixtures.md) **currently in force** — 22 ad samples and expected states; classroom priority FX-01 / FX-03 / FX-10 / FX-11 / FX-12.
17. [Backend core engineering](18-Backend-Core-Engineering.md) **currently in force** — `dealer-core` packaging reference.
18. [Gateway and AI engineering](19-Gateway-and-AI-Engineering.md) **currently in force** — Gateway / ai-service packaging reference.

`01`–`06` are withdrawn; do not implement them. See [archive/](archive/). Path summary is in `../dealer-platform/API.md` (points at 14, not withdrawn `04`).

## Course hard items that must remain

Independent microservices + independent repos/pipelines, Spring Cloud Gateway, Azure Container Apps + Bicep + CI/CD, Entra OAuth/JWT/RBAC, HTTPS and Key Vault, real Azure OpenAI scanning ads, board and three all-hands Reviews.

## Explicitly out of scope

Buyer portal, OEM portal, work orders, lead funnel, Service Bus, outbox, second database, third-party auto-listing, payments, Image Studio, a custom model SDK.
