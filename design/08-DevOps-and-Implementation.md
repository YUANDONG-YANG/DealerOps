# Repositories, pipelines, and roles (minimum)

Version v6.0 · 2026-09-21

## Repositories

```text
dealer-web        Vue + Dockerfile + its own pipeline
dealer-gateway    Spring Cloud Gateway + Dockerfile + pipeline
dealer-core       Spring Boot + Flyway + Dockerfile + pipeline
ai-service        Spring Boot + Dockerfile + pipeline
dealer-platform   Bicep + notes for each pipeline YAML + evidence
```

A change builds only that application. Do not use a monorepo. Contract fields live in each of core and ai-service’s own DTOs; there is no separate contracts repository.

## Pipelines (one set per application)

PR: Java compile + critical JUnit, or Vue build.  
main: build image (tag=commit SHA) → push ACR → run a Flyway Job if needed → deploy that application.  
A demo deploy needs a second person’s approval. Do not publish applications by clicking the portal by hand.

## Three people

- A: Vue pages (Admin/DMS/CRM/advertisements), login, web pipeline.
- B: ai-service, GitHub AI library integration, OMVIC checklist, first Bicep draft, ai pipeline. The pipeline must be able to read that private package.
- C: core, tenant isolation, Gateway, Entra, core pipeline.

## Sprints (aligned to the course’s three Reviews)

1. **Sprint 1**: four empty repositories can build independently; architecture diagram; two Entra roles configured.
2. **Sprint 2**: on Azure, sign in → Gateway → record one vehicle → **real AI** scans a piece of advertisement. Security: no plaintext secrets.
3. **Sprint 3**: two-dealership isolation, CRM association, checklist for three advertisement types, export, audit. Freeze features.

After class each person writes 1–2 paragraphs of progress. At Review each of the three presents one piece. See 11 for the detailed template.
