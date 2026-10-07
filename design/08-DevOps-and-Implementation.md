# Repositories, pipelines, and roles (minimum)

Version v6.0 · 2026-09-21

## Repositories

```text
dealer-web        Vue, built to dist/ + its own compile pipeline
dealer-gateway    Spring Cloud Gateway, packaged as a JAR + pipeline
dealer-core       Spring Boot + Flyway, packaged as a JAR + pipeline
ai-service        Spring Boot, packaged as a JAR + pipeline
dealer-platform   env.example, OpenAPI, API notes (no business code)
deploy            Terraform for the Azure resources + the app upload script
```

A change builds only that application. Do not use a monorepo. Contract fields live in each of core and ai-service’s own DTOs; there is no separate contracts repository.

## Pipelines (one set per application)

PR and `main`: Java compile + critical JUnit, or Vue build. Terraform changes additionally run `fmt -check` and `validate`. **No pipeline deploys**: CI holds no Azure credentials.

Cloud release is two operator commands: `terraform apply` in `deploy/terraform`, then `deploy/terraform/deploy-apps.sh`, which packages each JAR, uploads it with `az webapp deploy --type jar`, builds the SPA against the gateway URL, and uploads `dist/` to the Static Web App. Flyway needs no separate job: `dealer-core` migrates on startup. A demo deploy needs a second person's approval. Do not publish applications by clicking the portal by hand.

## Three people

- A: Vue pages (Admin/DMS/CRM/advertisements), login, web pipeline.
- B: ai-service, GitHub AI library integration, OMVIC checklist, first Terraform draft, ai pipeline. The pipeline must be able to read that private package.
- C: core, tenant isolation, Gateway, login/JWT, core pipeline.

## Sprints (aligned to the course’s three Reviews)

1. **Sprint 1**: four empty repositories can build independently; architecture diagram; the two JWT roles (`Platform.Admin`, `Dealer.User`) defined.
2. **Sprint 2**: on Azure, sign in → Gateway → record one vehicle → **real AI** scans a piece of advertisement. Security: no plaintext secrets.
3. **Sprint 3**: two-dealership isolation, CRM association, checklist for three advertisement types, export, audit. Freeze features.

After class each person writes 1–2 paragraphs of progress. At Review each of the three presents one piece. See 11 for the detailed template.
