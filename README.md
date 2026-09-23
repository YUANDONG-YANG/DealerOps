# Dealer Ops

Multi-tenant back office for independent used-car dealers. Each dealership has its own DMS, CRM, and ad-compliance data. A platform admin opens stores and binds staff; staff never see another store, and admins see no vehicle, customer, or listing records.

This checkout is the course implementation workspace. Course rules still treat `dealer-web`, `dealer-gateway`, `dealer-core`, and `ai-service` as **four independently built apps** (plus `dealer-platform` for IaC). They live as sibling folders here today.

Private GitHub: [YUANDONG-YANG/DealerOps](https://github.com/YUANDONG-YANG/DealerOps).

## In scope / out of scope

Approved scope is [design/SCOPE-BASELINE.md](design/SCOPE-BASELINE.md). Change it only with a re-sign or confirming email.

**In scope:** two roles (`Platform.Admin`, `Dealer.User`); Entra OAuth/OIDC + PKCE + JWT; browser traffic only through the gateway; spec PDF vehicle/customer fields; VIN unique per store; paired sell; sold purchase fields locked; one customer per vehicle; OMVIC rule check then real AI; Ready + TXT export only when the latest check is Passed and not Stale; DMS/CRM audit (who / what / when); read-only in-store Assistant (same AI component, no writes).

**Out of scope:** work orders, leads/follow-up, buyer site / public inventory, OEM portal, KPI dashboard, CSV import, Service Bus / outbox / second DB / vector store, third-party listing publish, payments, Image Studio, homemade auth or model SDK, extra vehicle fields (mileage, color, fuel, and similar).

`design/01`–`06` are **withdrawn** (not for grading or coding); see [design/archive/](design/archive/).

## Repo layout

| Path | Status |
|---|---|
| `dealer-web/` | Vue 3 + Element Plus + MSAL.js. Six pages (`/login`, `/admin`, `/dms`, `/crm`, `/ads`, `/assistant`). Host: `npm run dev` on `5173`. Optional `dealer-web/Dockerfile` serves Vite preview on `5173`. |
| `dealer-gateway/` | Spring Cloud Gateway on `8080`. Routes `/api/v1/**` to core and `/internal/v1/**` to AI (internal header required). |
| `dealer-core/` | Java 21 + Spring Boot + Flyway (`V1__init.sql`) + MySQL. Business APIs and JWT/membership are present; treat as in-progress, not a finished product. |
| `ai-service/` | Java 21, no database. In-process adapter for private `ai-manager`. Default Maven profile needs that JAR; `-Pstub` compiles without a real model. |
| `dealer-platform/` | Local Compose (MySQL + core + ai-service + gateway), `env.example`, OpenAPI, Bicep/pipeline placeholders. |
| `design/` | Current course design. Start here. |
| `PREP-CHECKLIST.md` | Machine and account blockers (JDK, Docker, Entra, Azure, model key). |
| `REUSE-PLAN.md` | Notes on `references/` (research only, not runtime modules). |

Browser calls only `http://localhost:8080` (`/api/v1`). Direct browser access to core (`8081`) or ai-service (`8082`) must fail. Compose stays MySQL plus the three Java apps. `dealer-web` is not a compose service: run it on the host (`npm run dev` in `dealer-web/`) or build the optional Vite-preview image in `dealer-web/Dockerfile`.

## How to read the docs

Do not use `design/01`–`06` as requirements (archived under [design/archive/](design/archive/)).

1. [design/SCOPE-BASELINE.md](design/SCOPE-BASELINE.md) — signed in/out of scope
2. [design/DEVELOPMENT-DESIGN.md](design/DEVELOPMENT-DESIGN.md) — backend scope, phases, invariants
3. [design/14-Backend-API-Contract.md](design/14-Backend-API-Contract.md) + [dealer-platform/openapi.yaml](dealer-platform/openapi.yaml) — public HTTP and DTOs
4. [design/AI-PROTOCOL-AND-RULES.md](design/AI-PROTOCOL-AND-RULES.md) — internal AI JSON and rule details
5. [design/18-Backend-Core-Engineering.md](design/18-Backend-Core-Engineering.md) / [design/19-Gateway-and-AI-Engineering.md](design/19-Gateway-and-AI-Engineering.md) plus the `design/AI-CODING-*.md` task guides

Frontend still follows [design/13-Frontend-Engineering.md](design/13-Frontend-Engineering.md) and [design/AI-CODING-FRONTEND.md](design/AI-CODING-FRONTEND.md). Map of every current doc: [design/README.md](design/README.md). Coding handbook (do not copy it wholesale): [design/IMPLEMENTATION-BRIEF.md](design/IMPLEMENTATION-BRIEF.md).

**Conflict priority:** course PPT hard items > specification PDF fields > `DEVELOPMENT-DESIGN` / `AI-PROTOCOL-AND-RULES` > `14` / `15` > task sheets.

Internal AI success/error bodies follow PROTOCOL (`{success, notes[]}` / `{success, summary}`; failures `{success:false, code, message}`). Public check failures stay `502 AI_UNAVAILABLE`. Do not implement `{failed, reason}`.

## Local run

Copy [dealer-platform/env.example](dealer-platform/env.example) to a local `.env`. Do not commit real keys.

```text
cd dealer-platform
docker compose up --build
```

That starts MySQL 8.4 on `3306` (`dealer_core` / `dealer` / `dealer_dev_only`), core on `127.0.0.1:8081`, ai-service on `127.0.0.1:8082`, and gateway on `8080`. MySQL-only is still `docker compose up -d mysql`. Web is not in this compose file.

```text
cd dealer-web
npm ci
npm run dev
```

SPA: `http://127.0.0.1:5173/`. Optional image (Vite preview, same port): `docker build -t dealer-web dealer-web` then `docker run --rm -p 5173:5173 dealer-web`. Copy `dealer-web/.env.example` to `dealer-web/.env` for Entra keys.

`ai-service` image defaults to Maven profile `stub` (no sibling `ai-manager` source in this tree). After `mvn -DskipTests install` in a sibling checkout named `ai-manager`, rebuild with `MAVEN_ARGS=-DskipTests`. Ports and boot order: [design/AI-CODING-LOCAL-AND-CLOUD.md](design/AI-CODING-LOCAL-AND-CLOUD.md). Cloud Bicep in `dealer-platform/infra/` is a draft — do not treat it as deployed.
