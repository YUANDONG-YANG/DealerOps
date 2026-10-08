# DealerOps Implementation and Delivery Status

Status date: 2026-10-08

This document records the working-tree implementation of client-requested extensions. The delivery is not complete until clean builds, manual acceptance, and target-database migration checks finish.

## Delivered scope

| Feature | Implementation | Public API and access |
|---|---|---|
| Public landing and VIN decode | Landing page, sample vehicle presentation, NHTSA vPIC decoder; DMS Add vehicle prefills make/model/year without saving | `GET /api/v1/vehicle-catalog/vin/{vin}` is anonymous via Gateway |
| Leads and follow-up | Customer/lead creation, stage and owner changes, due dates, overdue filter, append-only notes, CRM cross-link, audit | `/api/v1/leads/**`; Dealer.User JWT plus dealership tenant checks |
| Reconditioning work orders | Vehicle tasks, assignee/due date, status flow, completion cost updates repair cost, open tasks block sale | `/api/v1/vehicles/{vehicleId}/work-orders`, `/api/v1/work-orders/{id}`; Dealer.User JWT plus tenant checks |
| Image Studio | JPEG/PNG upload, original/enhanced viewing, AUTO/BRIGHTEN/SHARPEN presets, delete, MySQL storage, audit | `/api/v1/vehicles/{vehicleId}/photos/**`; Dealer.User JWT plus tenant checks |
| Email/phone registration and sign-in | Registration uses display name, password, and exactly one email or phone; login uses that registered identifier and password; internal username is generated and is not accepted for sign-in | `POST /api/v1/auth/register`, `POST /api/v1/auth/login`; anonymous through Gateway |
| Admin account provisioning | Pending-account list and bind existing account without replacing its login details; new admin-created accounts require one email or phone | `GET /api/v1/admin/pending-users` and admin member routes; Platform.Admin only |

Google, Entra ID, other social-provider authentication, and all provider credentials have been removed. No Firebase SDK, Firebase Authentication, Firestore, or Firebase Hosting is used. Password authentication remains local to dealer-core, and dealer-core issues the DealerOps JWT.

## Gateway and security routing

Browsers call the Gateway only. `dealer-core-public` forwards all `/api/v1/**` endpoints to dealer-core, including the leads, work-order, member, pending-user, registration, login, and VIN APIs. The photo-specific route matches `/api/v1/vehicles/*/photos` and descendants before the catch-all; it intentionally skips `CacheRequestBody` so multipart and binary image content are not decoded into strings. Both routes use Gateway security. Only login, registration, and public VIN decode are anonymous; all business-data operations require a DealerOps JWT, and dealer-core performs its own role and tenant authorization. `/internal/v1/**` remains reserved for core-to-ai-service calls.

## Database and configuration

- `V20261008_1__add_sales_leads.sql`
- `V20261008_2__add_work_orders.sql`
- `V20261008_3__add_google_identity.sql` (historical migration; adds the app-user email column)
- `V20261008_4__add_vehicle_photos.sql`
- `V20261008_5__replace_google_subject_with_oauth_identity.sql` (historical schema migration retained for Flyway history)
- `V20261008_6__add_email_phone_login_identifiers.sql` (adds phone and unique nullable email/phone login identifiers)
- `V20261008_7__drop_user_identity.sql` (removes the unused third-party identity table)

`V1__init.sql` is unchanged. The currently active authentication configuration is in `dealer-core/src/main/resources/application.yml`; no OAuth client IDs, client secrets, callback URLs, or identity-provider setup are required. The seeded platform admin requires `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and exactly one of `ADMIN_EMAIL` or `ADMIN_PHONE`. Local reference values are documented in [README.md](../README.md) and `dealer-platform/env.example`.

## Repository references

- Classroom-review HTML prototype: [DealerOps-Prototype.html](prototype/DealerOps-Prototype.html).
- Scope and architecture decisions: [design/SCOPE-BASELINE.md](../design/SCOPE-BASELINE.md), [design/15-Data-Auth-and-Gateway.md](../design/15-Data-Auth-and-Gateway.md), [design/19-Gateway-and-AI-Engineering.md](../design/19-Gateway-and-AI-Engineering.md), [design/21-Feature-Extensions.md](../design/21-Feature-Extensions.md).
- HTTP contract and static API inventory: [design/14-Backend-API-Contract.md](../design/14-Backend-API-Contract.md), [dealer-platform/openapi.yaml](../dealer-platform/openapi.yaml), [dealer-platform/API.md](../dealer-platform/API.md).
- Manual feature acceptance: [design/16-Acceptance-and-Test.md](../design/16-Acceptance-and-Test.md), with extension scenarios EXT-01–EXT-10 in [design/21-Feature-Extensions.md](../design/21-Feature-Extensions.md).
- Project-plan source files: `Assignment Project Plan_Fall25.docx` and `Assignment Status Reports.docx`. This Markdown addendum is the current implementation record; future sprint status reports must use actual sprint evidence and must not be backfilled with assumed meetings or outcomes.

## Verification and remaining delivery work

The latest compile/build and formatting checks must be recorded after the email/phone authentication changes. Database migration execution against a target database, full manual acceptance, a live deployment/demo, and completion of future Sprint 1–3 reports remain outstanding. The repository's development-phase instructions prohibit authoring tests until the user confirms feature development is complete and explicitly authorizes test work; no tests were created or modified for this delivery.
