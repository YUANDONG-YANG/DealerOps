# DealerOps reuse and adaptation notes

Updated: 2026-09-21

Research notes for the copies under `references/`. Authoritative scope and coding order live in `design/`, especially [SCOPE-BASELINE.md](../design/SCOPE-BASELINE.md) and [IMPLEMENTATION-BRIEF.md](../design/IMPLEMENTATION-BRIEF.md). What may be copied at all is in [00-reuse-policy.md](00-reuse-policy.md). Do not implement from this file.

## Downloaded reference copies

### 1. `references/carventory`

Source: `https://github.com/mohammadumar-dev/carventory`

License: the repo includes an MIT License. It may be used as a code-reuse source. Keep original copyright notices and record source files when you actually copy code.

Most useful paths:

- `apps/backend/src/main/java/com/carventory/entity/`: entity modeling ideas.
- `apps/backend/src/main/java/com/carventory/dto/`: DTO and public/internal response split.
- `apps/backend/src/main/java/com/carventory/controller/`: vehicle, customer, company, and log API layout.
- `apps/backend/src/main/java/com/carventory/service/`: business service layering.
- `apps/backend/src/main/java/com/carventory/repository/`: Spring Data queries.
- `apps/backend/src/main/resources/db/migration/`: Flyway migration layout.
- `apps/frontend/`: staff-console information layout and inventory interaction. Reference interaction only. Do not port React code.

Do not take these as-is:

- PostgreSQL dialect, driver, and schema must become MySQL 8.4.
- Home-grown email/password/JWT `AuthController`, `JwtAuthenticationFilter`, and `SecurityConfig` must not be copied. Auth follows `design/15-Data-Auth-and-Gateway.md` §8.
- Do not port the React/Ant Design frontend. This project requires Vue 3 + Element Plus.
- Do not port `booking`, `invoice`, `seller`, `buyer`, password reset, email verification, Cloudinary, Marketplace, or other out-of-scope modules.
- The README claims production-ready, but the current history has few commits. Compile and test item by item before copying. Do not treat the README as acceptance evidence.
- `application.properties` uses Flyway and `hibernate.ddl-auto=update` together. The target project should let Flyway own schema.

Conclusion: Carventory is a business-code reference for `dealer-core`. Reuse entity/DTO/Service organization ideas. Do not use it as a whole-repo template.

### 2. `references/car-dealer-crm`

Source: `https://github.com/TooMuchRuss1a/car-dealer-crm`

Stack: Laravel 10, Vue 3, Inertia, PrimeVue, MySQL, Docker.

Useful for:

- `laravel/resources/js/Pages/CRM/`: form and list interaction for vehicles, customers, and orders.
- `laravel/app/Models/`: field ideas for vehicles, customers, photos, supply/orders.
- `laravel/database/migrations/`: MySQL vehicle and customer structure ideas.
- `docker-compose.yml`: local compose style for MySQL + PHP + Node.

Do not migrate: Laravel backend, Jetstream/Sanctum login, order and supply-chain business, or the full Inertia page set.

License note: `composer.json` marks MIT, but the repo root has no separately reviewed license file. Treat this as a reference copy only. Do not paste source into official repos until license coverage and copyright requirements are confirmed.

## Requirement-to-reuse mapping

- Dealer / membership / app_user: prefer the current `dealer-core` `V1__init.sql`. Use Carventory Company/User layering as a reading aid. Identity is username + salted password hash per `design/15-Data-Auth-and-Gateway.md` §8.
- Vehicle: current SQL already has most required fields. Use Carventory Car DTO, filters, and service methods as a reading aid. v6 fields do not fully match older SQL. Lock fields before coding. Do not add mileage, color, or extra price fields on your own.
- Customer: use the four required fields in the current SQL. Use Carventory Buyer/Customer DTOs as a reading aid. Do not copy ID-document or other sensitive fields.
- Customer-vehicle: keep the unique constraint that one vehicle links to at most one customer. In the service layer, verify customer and vehicle belong to the same dealer.
- Listing: current SQL is a starting point. Implement stale checks with `content_version` and check snapshots. Use Carventory public DTOs as a reading aid. Do not leak cost, customer, or internal notes.
- Compliance: Carventory has no OMVIC fixed-rule + ai-manager flow. Implement the rule engine, AI states, stale-on-edit, TXT export, and 15-second timeout yourselves.
- Audit: current SQL already has `audit_event`. Use Carventory API-log shape as a reading aid. Audit must record actor, action, entity, time, and a necessary field summary. Do not record customer contact details or model keys.
- Frontend: only reuse list/form interaction from car-dealer-crm and Carventory. Official UI is Vue 3 + Element Plus. Pages follow [12-Frontend-UI-Conventions.md](../design/12-Frontend-UI-Conventions.md). No KPI home page and no kitchen-sink admin.
- AI: do not copy AI from these two candidates. Per [09-AI-Agent-Integration.md](../design/09-AI-Agent-Integration.md), reuse the existing private `ai-manager` JAR and write a thin adapter in `ai-service`.

## Constraints that travel with any reuse

- Extra features in reference projects are candidates only. Do not auto-implement them.
- Do not copy React, Laravel, password login, or PostgreSQL solutions into official modules.
- Do not put secrets, customer contact details, home addresses, or real accounts in code, logs, seed data, or commits.

Coding order, dealer scope, and acceptance live in `design/`. Machine and account blockers live in [PREP-CHECKLIST.md](../design/PREP-CHECKLIST.md).
