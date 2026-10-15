# DevOps operator guide

This folder is the procedure for the cloud deploy. Architecture stays in [design/07-Azure-Microservices-Architecture.md](../design/07-Azure-Microservices-Architecture.md) and [design/AI-CODING-LOCAL-AND-CLOUD.md](../design/AI-CODING-LOCAL-AND-CLOUD.md) §6–7.

The cloud path is **Terraform + Azure App Service**. There are no container images anywhere in this project: `terraform apply` creates the Azure resources, then the three .NET services are uploaded as zip packages and the React SPA is uploaded as static files. Local development runs the same four processes directly on the machine ([README](../README.md) "Local development startup").

| Piece | Where |
|---|---|
| Infrastructure as code | [deploy/terraform/](terraform/) (`main.tf`, `variables.tf`, `outputs.tf`) |
| App upload script | [deploy/terraform/deploy-apps.sh](terraform/deploy-apps.sh) — uploads .NET apps and React SPA after `terraform apply` |
| CI check | `.github/workflows/terraform.yml` — `fmt`, `init -backend=false`, `validate`. It never runs `plan` or `apply` |
| Compile CI | `.github/workflows/dealer-{web,core,gateway}.yml` and `ai-service.yml` |

CI does not deploy. An operator with the Azure subscription runs `terraform apply` and `deploy-apps.sh` by hand. There are no Azure credentials in this repository and no GitHub environment secrets for Azure.

## 1. What a push to `main` does

GitHub Actions starts the workflows whose path filters match the push. A pull request runs the same compile jobs. No workflow deploys anything.

| Changed paths | Workflow file | On `main` |
|---|---|---|
| `frontend/react/**` | `.github/workflows/dealer-web.yml` | Job `compile`: Node 20 `npm install` and `npm run build` |
| `backend/dotnet/**` | `.github/workflows/dealer-core.yml` | Job `compile`: `dotnet build` of the .NET solution |
| `deploy/terraform/**` | `.github/workflows/terraform.yml` | Job `validate`: `terraform fmt -check`, `init -backend=false`, `validate`. Log line `Terraform validated. Not applied (no subscription credentials in this repository).` |

Open runs at `https://github.com/YUANDONG-YANG/DealerOps/actions`.

Nothing that is built, shipped, or run in Azure is a container.

## 2. What the stack creates

One resource group, `dealerops-rg` by default. Names follow the pinned `${prefix}-` pattern in [design/AI-CODING-LOCAL-AND-CLOUD.md](../design/AI-CODING-LOCAL-AND-CLOUD.md) §6.

| Resource | Name | Role |
|---|---|---|
| App Service plan | `dealerops-plan` | One Linux plan, `B2` by default, for all three .NET apps |
| Linux Web App | `dealerops-gateway` | .NET 8. **The only public API origin.** YARP reverse proxy, JWT validation |
| Linux Web App | `dealerops-core` | .NET 8. Business APIs, EF Core, JWT issuing. Access restricted to Azure-internal callers |
| Linux Web App | `dealerops-ai` | .NET 8. `ai-service`. Restricted the same way |
| Static Web App | `dealerops-web` | Free tier. The built React SPA |
| MySQL Flexible Server | `dealerops-mysql` | `B_Standard_B1ms`, database `dealer_core`, TLS required |
| Key Vault | `dealerops-kv` | `INTERNAL-TOKEN`, `MYSQL-PASSWORD`, `JWT-SIGNING-SECRET`, and when configured `AIMANAGER-API-KEY` and `ADMIN-PASSWORD` |
| User-assigned identity | `dealerops-uai` | The identity the three apps use to read Key Vault |
| Log Analytics + App Insights | `dealerops-logs`, `dealerops-appi` | Logs and telemetry |

Five of those names are global, not just unique inside the resource group: the three `azurewebsites.net` hostnames, the Static Web App, the Key Vault DNS name, and the MySQL server name. `name_suffix` is appended to all of them, so a second subscription can deploy the same stack (§4).

App settings hold no secret values. Each secret is an App Service Key Vault reference (`@Microsoft.KeyVault(SecretUri=...)`) resolved through `dealerops-uai`.

`dealerops-core` and `dealerops-ai` keep the "not a browser entry point" rule from [design/15-Data-Auth-and-Gateway.md](../design/15-Data-Auth-and-Gateway.md) §10. App Service has no internal-only ingress on a Basic plan, so instead both apps set `ip_restriction_default_action = "Deny"` and allow only the `AzureCloud` service tag. `dealerops-gateway` runs inside Azure and gets through; a browser on the public internet is refused by the platform before the request reaches the JVM.

That tag is deliberately coarse. A rule built from the plan's own outbound addresses would be tighter, but those addresses only exist after `apply`, so they cannot appear in a `plan` — and they change when the plan scales. The network rule stops browsers, not another Azure-hosted caller, so `X-Dealer-Internal` and the JWT checks remain the real authorization, the same as locally.

## 3. One-time setup

Install on the operator machine:

| Tool | Version |
|---|---|
| Azure CLI (`az`) | current |
| Terraform | 1.9 or newer (CI pins 1.16.5) |
| .NET SDK | 8.0+ (`dotnet --version`) |
| Node + npm | Node 20 |

On macOS, Homebrew installs both CLIs. Terraform was pulled from `homebrew-core` in 2023 over the BSL license change, so it comes from HashiCorp's own tap, not `brew install terraform`:

```text
brew install azure-cli
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

```text
az login
az account set --subscription "<subscription id>"
az account show --query "{name:name, id:id}" -o table
```

`az login` opens a browser on the operator's own machine. On a remote shell, an agent session, or anywhere a browser cannot pop up, use the device-code flow instead: it prints a URL and a one-time code, and the command keeps polling until that code is entered in any browser (phone included):

```text
az login --use-device-code
```

The Azure for Students subscription keeps its spending limit on, so the subscription stops rather than billing when the credit runs out.

## 4. Apply the infrastructure

All secrets auto-generate when left empty, so there is nothing to configure:

```text
cd deploy/terraform
terraform init
terraform apply -auto-approve
```

That is it. No confirmation prompt — Terraform creates all Azure resources, generates safe random passwords for MySQL, JWT, internal token, and the admin account, and stores them in Key Vault.

After apply, retrieve the admin password to sign in:

```text
terraform output -raw admin_password
```

The admin username defaults to `admin`. Sign in at the web URL (`terraform output web_public_url`).

To customize anything, copy the example and edit:

```text
cp terraform.tfvars.example terraform.tfvars
```

All variables are optional. See `terraform.tfvars.example` for the full list with descriptions.

`terraform apply` takes roughly 10–15 minutes; MySQL Flexible Server is the slow resource. Read the result with:

```text
terraform output
```

Check the real result, not the shell exit code of a pipe: `terraform apply ... | tail` reports `0` even when Terraform failed. Look for `Apply complete!` or an `Error:` block.

If MySQL fails with `ProvisionNotSupportedForRegion`, the subscription has no MySQL capacity in that region. Azure for Students hits this in `canadacentral`, which is why MySQL has its own `mysql_location` (default `canadaeast`). Find a region that works, set `mysql_location`, and run `plan` / `apply` again; the resources that already exist are kept and only the missing ones are created:

```text
az mysql flexible-server list-skus --location canadaeast \
  --query "[0].supportedFlexibleServerEditions[?name=='Burstable'].supportedServerVersions[].name"
```

A region that answers with a version list (and not `InternalServerError`) can host the server. The apps stay in `location`; `dealer-core` reaches MySQL across regions over TLS, which adds a few milliseconds per query and is fine for a classroom demo.

The failed create leaves a hidden `dealerops-mysql` record behind in the old region. It does not show up in `az resource list`, but the next apply fails with `409 InvalidResourceLocation: The resource 'dealerops-mysql' already exists in location 'canadacentral'`. Delete that record through the ARM API, wait until it is gone, then `plan` and `apply` again:

```text
SUB=$(az account show --query id -o tsv)
az rest --method delete --url "https://management.azure.com/subscriptions/$SUB/resourceGroups/dealerops-rg/providers/Microsoft.DBforMySQL/flexibleServers/dealerops-mysql?api-version=2023-12-30"
```

If apply fails with a name conflict, one of the global names is already taken: an `azurewebsites.net` hostname such as `dealerops-core`, the vault DNS name `dealerops-kv`, or the MySQL server name `dealerops-mysql`. Set `name_suffix` in `terraform.tfvars` (for example `-sait`) and apply again; it is appended to all of them. A different `prefix` works as well and renames the whole stack.

State is a local `terraform.tfstate` next to the `.tf` files and is git-ignored, so one person holds it. Hand the file over, or re-import, before someone else applies.

## 5. Upload the apps

From the repository root, after `terraform apply`:

```text
deploy/terraform/deploy-apps.sh
```

That script reads every name and URL from `terraform output` and then, for one UTC timestamp:

1. stamps `PUBLISHED_AT` on `dealerops-core`, runs `dotnet publish`, zips and uploads DealerOps.Core
2. stamps `PUBLISHED_AT` on `dealerops-ai`, publishes and uploads DealerOps.AiService
3. stamps `PUBLISHED_AT` on `dealerops-gateway`, publishes and uploads DealerOps.Gateway
4. builds the React frontend with `VITE_GATEWAY_URL` set to the gateway URL, then uploads `dist/` to the Static Web App

Pass names to redeploy one app: `deploy/terraform/deploy-apps.sh core web`.

### Backend only, with a frontend built elsewhere

A team that writes its own SPA deploys the three .NET apps and skips the React frontend:

```text
deploy/terraform/deploy-apps.sh core ai gateway
```

The browser origin is the one thing that still has to match. `dealer-gateway` accepts exactly one origin, so set `cors_allowed_origin` in `terraform.tfvars` to where that SPA runs (`http://localhost:5173` while developing it, the hosted origin afterwards) and apply again. The SPA then calls `terraform output -raw gateway_public_url` as its API base URL and needs nothing else: `dealerops-core` and `dealerops-ai` are not reachable from a browser. The endpoints are in [dealer-platform/API.md](../dealer-platform/API.md), [design/14-Backend-API-Contract.md](../design/14-Backend-API-Contract.md), and the live Swagger UI from §6.

The equivalent by hand, for `DealerOps.Core`:

```text
cd backend/dotnet/DealerOps.Core
dotnet publish -c Release -o ./publish
cd publish && zip -r ../deploy.zip .
az webapp deploy \
  --resource-group dealerops-rg \
  --name dealerops-core \
  --type zip \
  --src-path ../deploy.zip
```

`--type zip` extracts to `/home/site/wwwroot/`, and the .NET 8 stack starts the app on its own. Each app binds `8080` inside the sandbox (`CORE_PORT` / `GATEWAY_PORT` / `AI_PORT`, with `WEBSITES_PORT` telling the platform where to route); App Service terminates HTTPS on 443 in front of it. The local `8081` / `8082` split only matters on a developer machine.

The first start after an upload takes about a minute: `dealer-core` runs EF Core `EnsureCreated` against `dealerops-mysql` before it answers health checks.

## 6. Verify

```text
terraform -chdir=deploy/terraform output
```

| Check | URL |
|---|---|
| Web UI | `https://<web_public_url>/` |
| Gateway health | `https://<gateway_public_url>/actuator/health` → `{"status":"UP"}` |
| Swagger UI | `https://<gateway_public_url>/swagger/index.html` |
| Core direct | `https://dealerops-core.azurewebsites.net/actuator/health` → refused by App Service, not 200 |
| AI direct | `https://dealerops-ai.azurewebsites.net/actuator/health` → refused by App Service, not 200 |

Sign in with the seeded administrator's username (or email/phone) and password, create a dealership, bind a staff login, record one vehicle, and run one ad check. That is the graded path.

Live logs while a service starts:

```text
az webapp log tail --resource-group dealerops-rg --name dealerops-core
```

## 7. Local development

Local is not a copy of the cloud and uses no Azure resource. The four processes run directly on the machine against a local MySQL 8 on `3306`; the startup order, the per-service `dev` values, and the health checks are in the [README](../README.md) under "Local development startup". Copy `dealer-platform/env.example` to a local `.env` or paste the same values into IDE run configurations.

Only the cloud environment uses Key Vault, TLS-required MySQL, and the Static Web App. A local machine and the Azure stack never share a database, a JWT signing secret, or an admin password.

## 8. Cost, pause, and teardown

`Standard_B2` App Service plan plus `B_Standard_B1ms` MySQL is the recurring cost; the Static Web App Free tier and Key Vault standard are negligible. Set `service_plan_sku = "B1"` for a cheaper plan, at the price of 1.75 GB of memory for three .NET apps.

Nothing in this stack stops on its own. Two options when you are not using it:

### Option A — Pause all resources (keep data, resume later)

Stop the three App Service apps and the MySQL server. No compute charges while stopped; only storage charges remain (a few cents per day).

**Pause (one command):**

```text
az webapp stop -g dealerops-rg -n dealerops-gateway && \
az webapp stop -g dealerops-rg -n dealerops-core && \
az webapp stop -g dealerops-rg -n dealerops-ai && \
az mysql flexible-server stop -g dealerops-rg -n dealerops-mysql
```

**Resume (one command):**

```text
az mysql flexible-server start -g dealerops-rg -n dealerops-mysql && \
az webapp start -g dealerops-rg -n dealerops-core && \
az webapp start -g dealerops-rg -n dealerops-ai && \
az webapp start -g dealerops-rg -n dealerops-gateway
```

Start MySQL first, then the apps — `dealer-core` connects to MySQL on startup and fails health checks if the database is not ready.

After resume, wait one to two minutes for `dealer-core` to finish starting and answer health checks:

```text
curl https://dealerops-gateway.azurewebsites.net/actuator/health
```

Note: Azure auto-starts a stopped MySQL Flexible Server after 30 days of inactivity. To avoid surprise charges, check `az mysql flexible-server show -g dealerops-rg -n dealerops-mysql --query state` periodically, or set a budget alert on the subscription.

### Option B — Destroy everything

Remove the entire stack when the demo is over:

```text
cd deploy/terraform
terraform destroy -auto-approve
```

`terraform destroy` deletes the MySQL server and its data. Export anything that must survive first. The provider is configured to purge the soft-deleted Key Vault so the same vault name works on the next apply.

To rebuild from scratch after a destroy: `terraform apply -auto-approve` — secrets are regenerated automatically.

## 9. Limits

- CI validates Terraform and never applies it. There is no automatic deploy on push to `main`.
- `terraform apply` creates infrastructure only. Application code reaches Azure through `deploy-apps.sh`, never through a CI job.
- Terraform owns the app settings. A setting changed by hand in the portal is reverted on the next apply, except `PUBLISHED_AT`, which the deploy step owns.
- `.env`, `terraform.tfvars`, and `terraform.tfstate` stay out of git. Secrets auto-generate; `terraform.tfvars` is only needed for overrides.
- There are no container images, no container registry, and no Compose file.
