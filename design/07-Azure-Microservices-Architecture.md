# Architecture (minimum that still meets course hard requirements)

Version v6.0 · 2026-09-21

Four independent repositories, four independent pipelines, four deployable artifacts (three JARs and one static bundle). Browser and service-to-service HTTP both go through the Gateway. AI uses synchronous REST, not a queue.

| PPT domain | Unit | Technology | Owner |
|---|---|---|---|
| UI | dealer-web | Vue 3 | A |
| Auth | dealer-core (email, username, or phone + password; [15](15-Data-Auth-and-Gateway.md) §8) | JWT, BCrypt password hash | C configures |
| Data | dealer-core | Java 21 Spring Boot + Flyway + one MySQL | C |
| AI | ai-service | Java 21 Spring Boot, embeds the GitHub AI library, no database | B |
| Entry | dealer-gateway | Spring Cloud Gateway | C, A reviews |

## Diagrams

Three figures, in [diagrams/](diagrams/). They are hand-authored SVG: plain text that diffs in review, renders on GitHub, opens in any browser, and pastes into a slide. Edit the SVG itself; there is no export step and no binary original.

**Figure 1 — service boundaries and request paths.** Which process owns what, which hop carries which credential, and the one path that must fail.

![Service boundaries: the browser reaches only dealer-gateway, which is the single API origin; the gateway routes to dealer-core and ai-service, which deny callers outside Azure; dealer-core calls the AI back through the gateway with the internal header; direct browser access to 8081 and 8082 is refused at the platform edge.](diagrams/01-service-boundaries.svg)

core and ai-service are not public; only the Gateway may reach them. Bypassing the Gateway must fail. Sprint 1 must be able to walk through this figure. Each of the four boxes is a separately deployable unit with its own repository folder and its own CI workflow, which is what "microservices, not a monolith" has to mean concretely here.

**Figure 2 — Azure deployment and release path.** What each service is deployed *as*, what creates the infrastructure, and where secrets enter.

![Azure release path: a push to main runs compile, tests and terraform validate in GitHub Actions, which holds no Azure credentials; an operator runs terraform apply and deploy-apps.sh, which create the resource group and upload three JARs and the SPA bundle; secrets stay in Key Vault and are read through a user-assigned identity.](diagrams/02-azure-deployment.svg)

The red cross is not decoration: CI deliberately holds no Azure credential, so the only path to production is the operator machine. That is a known deviation — see the coverage table below.

**Figure 3 — AI ad-check workflow.** The deterministic rules run before the model, and every failure mode has a defined state.

![AI ad-check flow: a check posted through the gateway is guarded by dealer-core, then the deterministic OMVIC rule engine runs first; a hard block is persisted without calling the model, otherwise core calls ai-service back through the gateway, the model runs under a 13 second budget, and a failure returns 502 AI_UNAVAILABLE; core persists the result in one transaction and export unlocks only while the latest check is PASSED and not STALE.](diagrams/03-ai-ad-check-flow.svg)

Rules first is a cost and correctness decision, not an optimisation detail: an ad with a hard OMVIC block never reaches the model, so the demo cannot be mistaken for a model that "approves" something the checklist already rejected.

## Course requirement coverage

[`tech-stack/Non-Negotiable-Project-Requirements.pptx`](../tech-stack/Non-Negotiable-Project-Requirements.pptx) grades six pillars. Where each one is shown, and the two places this project does not meet the stated wording:

| PPT pillar | Where it is demonstrated | Status |
|---|---|---|
| 01 · Microservices over monolith — separate deployable services, API-driven, own repo + pipeline, API gateway, **diagram required** | Figure 1; `.github/workflows/dealer-*.yml` and `ai-service.yml` | Met |
| 02 · Live cloud deployment — Azure preferred | Figure 2; [deploy/README.md](../deploy/README.md) | Met once `terraform apply` has been run against the subscription |
| 02 · **Containerization** — Docker packaging, Kubernetes or Container Apps | — | **Not met.** Containers were removed; the services deploy as JARs to App Service. [SCOPE-BASELINE.md](SCOPE-BASELINE.md) errata item 5 |
| 02 · Infrastructure as Code — Bicep, **Terraform**, or ARM | [deploy/terraform](../deploy/terraform); Figure 2 | Met — the PPT names Terraform explicitly |
| 02 · **CI/CD** — automated end to end, "no manual deployments to production — ever" | `.github/workflows/*` compile, test and validate only; release is operator-run | **Not met.** CI stops at the Azure boundary in Figure 2. Closing this needs a federated-credential deploy job |
| 03 · Security by design — OAuth2/JWT, TLS everywhere, no hardcoded credentials, RBAC | Figures 1 and 2; [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8–12 | Met |
| 04 · Full scope delivery, traceable | [SCOPE-BASELINE.md](SCOPE-BASELINE.md); [11-Requirements-Governance-and-Agile.md](11-Requirements-Governance-and-Agile.md) | Tracked per sprint |
| 05 · AI as a real feature, documented end to end with fallbacks | Figure 3; [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) | Met when the deploy carries a real model key |
| 06 · Agile process and participation | [11-Requirements-Governance-and-Agile.md](11-Requirements-Governance-and-Agile.md) | Team process, not architecture |

The two "not met" rows are decisions, not oversights, and neither is signed off yet. Raise both with the instructor before the Sprint 2 review rather than discovering them during grading.

## Identity

There are only two roles: `Platform.Admin` and `Dealer.User`.  
Passwords are not stored. An administrator binds `username` to `dealer_id`. Each request uses the JWT role plus local membership and ignores any dealership ID sent by the frontend.

## Data (one database)

`dealer`, `membership`, `app_user`, `vehicle`, `customer`, `customer_vehicle`, `listing`, `compliance_check`, `audit_event`.  
Business tables include `dealer_id`. Vehicles and customers must share this database. Administrator queries must not join vehicles or customers.

The AI service has no database: it calls the GitHub assistant library in-process. core sends public vehicles + advertisement text + the dealership’s public profile to ai-service, then writes missing items and explanations into `compliance_check`. Assistant Q&A is likewise filtered by core before it reaches that library.

## How a check runs

1. A dealership user POSTs `/api/v1/listings/{id}/checks` (via the Gateway).
2. core validates this dealership and the version, calls ai-service (via the Gateway), and waits at most 15 seconds.
3. The fixed checklist runs first; Azure OpenAI is called only if there is no hard block.
4. Results are stored in core. On failure the status is `UNAVAILABLE` and the page cannot click through as a pass.
5. After a pass, POST export and download TXT.

Do not use Service Bus, outbox, DLQ, or a second database. Do not deploy the GitHub component as a fifth container.

## Minimum Azure set

One resource group, created with **Terraform** (`deploy/terraform`): one Linux App Service plan, three Linux Web Apps on the Java 21 SE stack (`gateway`, `core`, `ai`), one Static Web App for the SPA, one MySQL Flexible Server, one Key Vault, one user-assigned identity, Log Analytics, and Application Insights. **No container registry and no container images:** App Service runs the JAR that Maven produces, and the SPA is uploaded as static files.

HTTPS everywhere; App Service terminates TLS. Secrets live in Key Vault and reach the apps as app-setting references resolved through the user-assigned identity, so no app setting holds a secret value. MySQL is reached over a TLS-required connection and its firewall admits Azure services plus named operator addresses; platform encryption left on is enough, and no VNet or private endpoint is added. `core` and `ai` get App Service hostnames but deny every caller except the `AzureCloud` service tag, which is how the "browser reaches the Gateway only" rule survives without an internal-only ingress. That rule is coarser than a private ingress: it stops a browser, not another Azure tenant, so the internal header and the JWT checks stay the real authorization.

One demo environment is enough. Local development runs the same four applications as plain processes against a local MySQL 8; there is no local orchestrator. Procedure: [deploy/README.md](../deploy/README.md) and the repository [README](../README.md).

## Acceptance

- Deploy only ai-service; web/core/gateway images stay unchanged.
- The browser can reach only the Gateway.
- A dealership A token against dealership B returns 404.
- An administrator cannot see vehicles.
- On Azure, walk through: open a dealership → record a vehicle → record a customer → real AI check → export.
