# DealerOps reuse and adaptation notes

Updated: 2026-09-21

This file is for later AI coding and teammate handoff. Authoritative requirements live in `design/`.

Current effective documents: `00-Current-Development-Design.md`, `07-Azure-Microservices-Architecture.md`, `08-DevOps-and-Implementation.md`, `09-AI-Agent-Integration.md`, `10-Web-AI-Assistant.md`, `11-Requirements-Governance-and-Agile.md`, `12-Frontend-UI-Conventions.md`. `01`–`06` are historical drafts. Do not implement from their scope.

## Current requirement baseline

- Four independent application repos: `dealer-web`, `dealer-gateway`, `dealer-core`, `ai-service`. `dealer-platform` holds Bicep, Compose, and pipeline templates.
- `dealer-web`: Vue 3, Element Plus, MSAL.js. One app hosts both the staff console and the public vehicle page.
- `dealer-gateway`: Spring Cloud Gateway. The browser may only reach the gateway. core and ai-service are not public.
- `dealer-core`: Java 21, Spring Boot, JPA, Bean Validation, Flyway, MySQL 8.4. Holds all business data.
- `ai-service`: Java 21, Spring Boot. No database. Reuses `YUANDONG-YANG/ai-manager` in-process and exposes only internal REST.
- Roles are only `Platform.Admin` and `Dealer.User`. Do not build passwords. Entra JWT plus local membership decide dealership scope.
- Core business: dealerships, members, vehicles, customers, customer-vehicle links, listings, listing compliance checks, audit, in-store assistant.
- Out of scope: work orders, lead funnels, buyer site, OEM portal, payments, contracts, third-party ad sync, a second database, message queues, vector databases, a custom model SDK.

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
- Home-grown email/password/JWT `AuthController`, `JwtAuthenticationFilter`, and `SecurityConfig` must not be copied. Use Entra JWT validation and local membership.
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

- Dealer / membership / app_user: prefer the current `dealer-core` `V1__init.sql`. Use Carventory Company/User layering as a reading aid. Must become Entra OID. Do not store passwords.
- Vehicle: current SQL already has most required fields. Use Carventory Car DTO, filters, and service methods as a reading aid. v6 fields do not fully match older SQL. Lock fields before coding. Do not add mileage, color, or extra price fields on your own.
- Customer: use the four required fields in the current SQL. Use Carventory Buyer/Customer DTOs as a reading aid. Do not copy ID-document or other sensitive fields.
- Customer-vehicle: keep the unique constraint that one vehicle links to at most one customer. In the service layer, verify customer and vehicle belong to the same dealer.
- Listing: current SQL is a starting point. Implement stale checks with `content_version` and check snapshots. Use Carventory public DTOs as a reading aid. Do not leak cost, customer, or internal notes.
- Compliance: Carventory has no OMVIC fixed-rule + ai-manager flow. Implement the rule engine, AI states, stale-on-edit, TXT export, and 15-second timeout yourselves.
- Audit: current SQL already has `audit_event`. Use Carventory API-log shape as a reading aid. Audit must record actor, action, entity, time, and a necessary field summary. Do not record customer contact details or model keys.
- Frontend: only reuse list/form interaction from car-dealer-crm and Carventory. Official UI is Vue 3 + Element Plus. Pages follow `design/12-Frontend-UI-Conventions.md`. No KPI home page and no kitchen-sink admin.
- AI: do not copy AI from these two candidates. Per `design/09-AI-Agent-Integration.md`, reuse the existing private `ai-manager` JAR and write a thin adapter in `ai-service`.

## Suggested AI coding order

Finish each step before the next. Do not generate a large pile of non-running code at once:

1. Read this file and the effective design docs. Confirm you implement only the current scope.
2. Create independently buildable minimal projects for `dealer-core`, `dealer-gateway`, `ai-service`, and `dealer-web`.
3. Lock the MySQL Flyway schema, enums, version fields, foreign keys, and indexes. Do not copy PostgreSQL SQL as-is.
4. Implement Entra JWT validation, role checks, and dealer scope. Use test JWTs/stubs for integration tests first.
5. Implement vehicle, customer, customer-vehicle, and audit APIs. Derive `dealer_id` from server identity. Do not trust a client dealership id.
6. Implement listing drafts, fixed compliance rules, check snapshots, and stale protection.
7. Implement the `ai-service` ai-manager adapter: 15-second timeout, failure states, no fake Pass, CI stub, real calls verified separately.
8. Implement TXT export after a passing check. Then implement in-store Assistant resource filtering and read-only responses.
9. Implement Login, Admin, DMS, CRM, Ad compliance, Assistant, and the public vehicle page with Vue 3 + Element Plus.
10. Add gateway routes, Docker, Bicep, Key Vault, pipelines, and acceptance evidence last.

## Constraints that must travel with every AI coding request

- Read this file and the related effective design docs before changing code.
- Do not add modules outside the current scope. Extra features in reference projects are candidates only. Do not auto-implement them.
- Do not copy React, Laravel, password login, or PostgreSQL solutions into official modules.
- Every business read and write must verify the current user's dealer scope. Cross-dealer resources return 404. Admin hits on business URLs return 403/404 and must not leak fields.
- Every state change needs server rules, a transaction boundary, version-conflict handling, and tests.
- Changing key vehicle fields or listing body must stale old checks. AI failure must not return Pass.
- Do not put secrets, customer contact details, home addresses, or real accounts in code, logs, seed data, or commits.
- Change code first, then run the smallest tests that match the change. Do not claim unrun tests passed.

## Current status

- [x] Downloaded the Carventory reference copy.
- [x] Downloaded the Vue/MySQL CRM reference copy.
- [x] Finished the scope comparison between the real design docs and the candidate projects.
- [ ] Have not copied any reference source into official modules.
- [ ] Have not created buildable projects for the four apps.
- [ ] Have not verified JDK 21, Docker, Entra, Azure, or a model key.
- [ ] Have not run a real AI request or end-to-end acceptance.
