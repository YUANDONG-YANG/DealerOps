# DealerOps test environment

CPRG-305-B Group Assignment 3. Group: Yuandong Yang, Daniel Watson, Xiaomei He.

Checked on 2026-11-02. Credentials, connection strings, and API keys are not copied here.

The system under test is the active .NET 10 stack and the React frontend. Java and Vue are retired. They are not the system under test. An earlier Java execution record is not evidence for this build.

| Part | Project | Role |
|---|---|---|
| Gateway | `backend/dotnet/DealerOps.Gateway` | Only browser API entry. |
| Core | `backend/dotnet/DealerOps.Core` | Business APIs, sign-in, persistence. |
| AI service | `backend/dotnet/DealerOps.AiService` | AI provider adapter. No database. |
| Web | `frontend/react` | React SPA. |

## Formal environment

The formal test environment for this assignment is the Azure Linux App Service stack documented in `deploy/README.md`. It is not a Docker Compose network and not a virtual machine. `deploy/terraform/main.tf` states there is no container registry and no container image. App Service runs the published .NET apps and a Node static host directly.

`deploy/README.md` names the public web entry:

`https://dealer-ops-dev.azurewebsites.net/`

`deploy/terraform/outputs.tf` names the gateway as the only API origin the browser may call. With the committed defaults (`prefix` = `dealerops`, empty `name_suffix`, web app name `dealer-ops-dev`) the public URLs are:

| Surface | Name | URL |
|---|---|---|
| Web | `dealer-ops-dev` | `https://dealer-ops-dev.azurewebsites.net/` |
| Gateway | `dealerops-gateway` | `https://dealerops-gateway.azurewebsites.net` |
| Gateway health | same host | `https://dealerops-gateway.azurewebsites.net/actuator/health` |
| Swagger | same host | `https://dealerops-gateway.azurewebsites.net/swagger/index.html` |

Core (`dealerops-core`) and the AI service (`dealerops-ai`) are not browser entries. Their site config denies public IP access and allows the AzureCloud service tag so the gateway can call them. The browser calls only the gateway.

Other documented resource names, from `deploy/terraform/main.tf` defaults: resource group `dealerops-rg`, plan `dealerops-plan` (Linux, SKU default `B2`, region default `canadacentral`), MySQL Flexible Server `dealerops-mysql` (database `dealer_core`, region default `canadaeast`), Key Vault `dealerops-kv`, identity `dealerops-uai`, Log Analytics `dealerops-logs`, Application Insights `dealerops-appi`. Secrets stay in Key Vault references. They are not written here.

## What was observed on 2026-11-02

`./deploy/deploy.sh --apply` was already running. It was not started, stopped, or repeated for this note. It later exited 0. Terraform apply in that run completed with 24 resources added, 0 changed, and 0 destroyed. The script printed:

- Web `https://dealer-ops-dev.azurewebsites.net`
- Gateway health `https://dealerops-gateway.azurewebsites.net/actuator/health`
- Swagger `https://dealerops-gateway.azurewebsites.net/swagger/index.html`
- Publish stamp `2026-11-02T20:18:01Z`
- Commit `54b66640447ae77c72da4c51df815e5a8079760d`

After that exit, `GET /actuator/health` on the gateway returned HTTP 200 JSON: `status` UP, `components.core.status` UP, `components.ai.status` UP.

A read during the earlier upload had returned the platform unavailable page. That read is not the finished health result.

Local ports are not the formal environment.

## Facts safe to paste into the test report

- Formal environment: Azure Linux App Service described in `deploy/README.md` and `deploy/terraform/main.tf`. No Compose file and no container image for this stack.
- Web entry: `https://dealer-ops-dev.azurewebsites.net/` (`dealer-ops-dev`, Node `20-lts`).
- Only browser API: `https://dealerops-gateway.azurewebsites.net` (`dealerops-gateway`, .NET 10). Health path `/actuator/health`. Swagger `/swagger/index.html`.
- Core `dealerops-core` and AI `dealerops-ai` are .NET 10 and are not public browser origins.
- On 2026-11-02 `deploy/deploy.sh --apply` exited 0 and gateway health returned HTTP 200 with core and ai UP.
- Java and Vue are retired and are not evidence for this build.
