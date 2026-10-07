# Publish options

The DevOps path is **Terraform + Azure App Service**, applied by an operator. Procedure: [deploy/README.md](README.md). There are no container images in this project, so GitHub Container Registry, Compose, Azure Container Apps, Cloudflare quick tunnels, and Railway are all removed, not merely unused.

## Current path

| Item | Value |
|---|---|
| Infrastructure | `deploy/terraform` creates one resource group: App Service plan, three Linux Web Apps (Java 21 SE), one Static Web App, MySQL Flexible Server, Key Vault, Log Analytics, Application Insights |
| Application deploy | `deploy/terraform/deploy-apps.sh` packages the three JARs and uploads them with `az webapp deploy --type jar`, then builds the SPA and uploads `dist/` to Static Web Apps |
| Public hostnames | `https://dealerops-gateway.azurewebsites.net` (API and Swagger) and the Static Web App origin (SPA). Both are stable; they do not change between deploys |
| What CI does | Compile each app, and `fmt` / `validate` the Terraform. CI has no Azure credentials and never applies or deploys |
| Secrets | Key Vault, read by the apps through a user-assigned identity. `terraform.tfvars` and `terraform.tfstate` stay on the operator machine |

`dealer-core` and `ai-service` get App Service hostnames but refuse every caller outside Azure, which keeps the §10 rule that the browser reaches the gateway only.

## Comparison

| Approach | What it runs | Public site | Role |
|---|---|---|---|
| Terraform + App Service | Three Java 21 SE JARs on one Linux plan, SPA on Static Web Apps, MySQL Flexible Server | `https://dealerops-gateway.azurewebsites.net` plus the Static Web App origin, for as long as the resource group exists | **Current path** |
| Local processes | `mvn spring-boot:run` per Java service, `npm run dev`, local MySQL 8 on 3306 | Localhost only | Development ([README](../README.md)) |
| Azure student VM | The previous demo: one `Standard_B2ms` VM running the whole stack from a Compose file | Retired with the containers | Removed |
| GHCR plus Compose | Four images built on push to `main`, pulled by a Compose overlay | Localhost until a tunnel was started | Removed |
| Cloudflare quick tunnels | `cloudflared` forwarding to local Compose | Public only while the process ran, with a hostname that changed on every start | Removed |
| Azure Container Apps (Bicep draft) | `dealer-platform/infra/main.bicep`, four container apps, never deployed | None | Removed, replaced by `deploy/terraform` |
| Railway | Would have run web, gateway, core, and MySQL | None | Removed earlier |

## Why App Service rather than Container Apps

Container Apps is the smaller change on paper: the Bicep draft already described it. It was dropped because it needs a container registry, four image builds, and a registry pull identity to deploy one line of Java, and the course stack has no other reason to own images. App Service runs the JAR that Maven already produces, which removes the Dockerfiles, the Compose files, and the GHCR workflow in one step and leaves one deploy verb (`az webapp deploy --type jar`) for all three services.

The costs of that choice, recorded so nobody re-opens it by accident:

- No internal-only ingress on a Basic plan, so `dealerops-core` and `dealerops-ai` rely on an `AzureCloud` service-tag access restriction instead ([deploy/README.md](README.md) §2). That blocks a browser but not another Azure-hosted caller, so the internal header and the JWT checks carry the real authorization.
- All three JVMs share one plan, so the plan SKU is a memory decision, not just a price decision. `B2` is the default for that reason.
- The SPA lives in a different service (Static Web Apps) from the APIs, so the SPA origin and the gateway origin differ and gateway CORS stays load-bearing.
