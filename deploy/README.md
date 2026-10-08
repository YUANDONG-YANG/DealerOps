# DevOps operator guide

This folder is the procedure for the cloud deploy. Architecture stays in [design/07-Azure-Microservices-Architecture.md](../design/07-Azure-Microservices-Architecture.md) and [design/AI-CODING-LOCAL-AND-CLOUD.md](../design/AI-CODING-LOCAL-AND-CLOUD.md) §6–7. Host comparison stays in [deploy/publish-options.md](publish-options.md).

The cloud path is **Terraform + Azure App Service**. There are no container images anywhere in this project: `terraform apply` creates the Azure resources, then the three Java services are uploaded as plain JARs and the SPA is uploaded as static files. Local development runs the same four processes directly on the machine ([README](../README.md) "Local development startup").

| Piece | Where |
|---|---|
| Infrastructure as code | [deploy/terraform/](terraform/) (`main.tf`, `variables.tf`, `outputs.tf`) |
| App upload script | [deploy/terraform/deploy-apps.sh](terraform/deploy-apps.sh) |
| CI check | `.github/workflows/terraform.yml` — `fmt`, `init -backend=false`, `validate`. It never runs `plan` or `apply` |
| Compile CI | `.github/workflows/dealer-{web,core,gateway}.yml` and `ai-service.yml` |

CI does not deploy. An operator with the Azure subscription runs `terraform apply` and `deploy-apps.sh` by hand. There are no Azure credentials in this repository and no GitHub environment secrets for Azure.

## 1. What a push to `main` does

GitHub Actions starts the workflows whose path filters match the push. A pull request runs the same compile jobs. No workflow deploys anything.

| Changed paths | Workflow file | On `main` |
|---|---|---|
| `dealer-web/**` | `.github/workflows/dealer-web.yml` | Job `compile`: Node 20 `npm ci` and `npm run build` |
| `dealer-core/**` | `.github/workflows/dealer-core.yml` | Job `compile`: JDK 21 compile, unit tests, and the Testcontainers ITs when the runner has a Docker engine |
| `dealer-gateway/**` | `.github/workflows/dealer-gateway.yml` | Job `compile`: JDK 21 compile and unit tests |
| `ai-service/**` | `.github/workflows/ai-service.yml` | Job `compile`: stub profile compile and unit tests (no paid model) |
| `deploy/terraform/**` | `.github/workflows/terraform.yml` | Job `validate`: `terraform fmt -check`, `init -backend=false`, `validate`. Log line `Terraform validated. Not applied (no subscription credentials in this repository).` |

Open runs at `https://github.com/YUANDONG-YANG/DealerOps/actions`.

The `dealer-core` integration tests are the one place a Docker engine is still used, and only on the CI runner or a developer machine: `dealer-core` starts a MySQL 8.4 container through Testcontainers. Nothing that is built, shipped, or run in Azure is a container.

## 2. What the stack creates

One resource group, `dealerops-rg` by default. Names follow the pinned `${prefix}-` pattern in [design/AI-CODING-LOCAL-AND-CLOUD.md](../design/AI-CODING-LOCAL-AND-CLOUD.md) §6.

| Resource | Name | Role |
|---|---|---|
| App Service plan | `dealerops-plan` | One Linux plan, `B2` by default, for all three Java apps |
| Linux Web App | `dealerops-gateway` | Java 21 SE. **The only public API origin.** Also serves Swagger UI |
| Linux Web App | `dealerops-core` | Java 21 SE. Business APIs, Flyway, JWT issuing. Access restricted to Azure-internal callers |
| Linux Web App | `dealerops-ai` | Java 21 SE. `ai-service`. Restricted the same way |
| Static Web App | `dealerops-web` | Free tier. The built Vue SPA |
| MySQL Flexible Server | `dealerops-mysql` | `B_Standard_B1ms`, database `dealer_core`, TLS required |
| Key Vault | `dealerops-kv` | `INTERNAL-TOKEN`, `MYSQL-PASSWORD`, `JWT-SIGNING-SECRET`, and when configured `AIMANAGER-API-KEY` and `ADMIN-PASSWORD` |
| User-assigned identity | `dealerops-uai` | The identity the three apps use to read Key Vault |
| Log Analytics + App Insights | `dealerops-logs`, `dealerops-appi` | Logs and telemetry |

App settings hold no secret values. Each secret is an App Service Key Vault reference (`@Microsoft.KeyVault(SecretUri=...)`) resolved through `dealerops-uai`.

`dealerops-core` and `dealerops-ai` keep the "not a browser entry point" rule from [design/15-Data-Auth-and-Gateway.md](../design/15-Data-Auth-and-Gateway.md) §10. App Service has no internal-only ingress on a Basic plan, so instead both apps set `ip_restriction_default_action = "Deny"` and allow only the `AzureCloud` service tag. `dealerops-gateway` runs inside Azure and gets through; a browser on the public internet is refused by the platform before the request reaches the JVM.

That tag is deliberately coarse. A rule built from the plan's own outbound addresses would be tighter, but those addresses only exist after `apply`, so they cannot appear in a `plan` — and they change when the plan scales. The network rule stops browsers, not another Azure-hosted caller, so `X-Dealer-Internal` and the JWT checks remain the real authorization, the same as locally.

## 3. One-time setup

Install on the operator machine:

| Tool | Version |
|---|---|
| Azure CLI (`az`) | current |
| Terraform | 1.9 or newer (CI pins 1.16.5) |
| JDK + Maven | Java 21 |
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

`terraform.tfvars` is git-ignored; the secret values stay on the operator machine. The required and optional variables:

| Variable | Rule |
|---|---|
| `mysql_admin_password` | 12 characters or more |
| `internal_token` | The shared `X-Dealer-Internal` value. Must not be the local default `dealer-internal` |
| `jwt_signing_secret` | 32 bytes or more. `dealer-core` signs with it and `dealer-gateway` validates with it |
| `admin_username` / `admin_password` | Both or neither. Seeds the one platform admin on the first `dealer-core` start |
| `aimanager_api_key` | Optional. Empty deploys `ai-service` with no model key |
| `operator_ip_addresses` | Optional. Public IPv4 addresses that may reach MySQL directly |

Generate the secrets instead of inventing them, and write the whole file in one pass. Writing it with a single heredoc, rather than `cp`-ing the example and appending to it, avoids defining the same variable twice (Terraform rejects a `.tfvars` file that assigns one name more than once):

```text
cd deploy/terraform

MYSQL_PW=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | cut -c1-24)
INTERNAL_TOKEN=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | cut -c1-40)
JWT_SECRET=$(openssl rand -base64 48)
ADMIN_PW=$(openssl rand -base64 32 | tr -dc 'A-Za-z0-9' | cut -c1-16)
MY_IP=$(curl -s https://api.ipify.org)

cat > terraform.tfvars <<EOF
location                = "canadacentral"
static_web_app_location = "eastus2"
mysql_location          = "canadaeast"
prefix                  = "dealerops"
name_suffix             = ""
service_plan_sku        = "B2"
operator_ip_addresses   = ["${MY_IP}"]

mysql_admin_password = "${MYSQL_PW}"
internal_token        = "${INTERNAL_TOKEN}"
jwt_signing_secret    = "${JWT_SECRET}"
aimanager_api_key     = ""

admin_username = "admin"
admin_password = "${ADMIN_PW}"
EOF
```

`tr -dc 'A-Za-z0-9'` strips punctuation that can otherwise break a JDBC connection string or a shell-quoted value. `aimanager_api_key` empty is a valid choice: it deploys `ai-service` without a model key, so the assistant and ad-check endpoints answer with the documented failure codes instead of a model reply ([09-AI-Agent-Integration.md](../design/09-AI-Agent-Integration.md)) until a real key is added and `terraform apply` runs again. Write down `admin_username` / `admin_password` before moving on — section 6 needs them to sign in, and nothing echoes them back later.

Then:

```text
terraform init
terraform plan -out tfplan
terraform apply tfplan
```

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

If apply fails with a name conflict, `dealerops-core.azurewebsites.net` or a sibling hostname is already taken globally. Set `name_suffix` in `terraform.tfvars` (for example `-sait`) and apply again.

State is a local `terraform.tfstate` next to the `.tf` files and is git-ignored, so one person holds it. Hand the file over, or re-import, before someone else applies.

## 5. Upload the apps

From the repository root, after `terraform apply`:

```text
deploy/terraform/deploy-apps.sh
```

That script reads every name and URL from `terraform output` and then, for one UTC timestamp:

1. stamps `PUBLISHED_AT` on `dealerops-core`, packages `dealer-core`, and uploads the JAR
2. stamps `PUBLISHED_AT` on `dealerops-ai`, packages `ai-service` (real `ai-manager` dependency, installed locally from the sibling checkout) and uploads the JAR
3. stamps `PUBLISHED_AT` on `dealerops-gateway`, packages `dealer-gateway`, and uploads the JAR
4. builds `dealer-web` with `VITE_GATEWAY_URL` set to the gateway URL and `VITE_PUBLISHED_AT` set to the same timestamp, then uploads `dist/` to the Static Web App

After the run, the web app's bottom-left footer and `<gateway>/actuator/release` show the new time for every deployed app ([design/20-Observability.md](../design/20-Observability.md) §5).

Pass names to redeploy one app: `deploy/terraform/deploy-apps.sh core web`.

The equivalent by hand, for `dealer-core`:

```text
cd dealer-core
mvn -B -DskipTests package
az webapp deploy \
  --resource-group dealerops-rg \
  --name dealerops-core \
  --type jar \
  --src-path target/dealer-core-0.0.1-SNAPSHOT.jar
```

`--type jar` lands the file as `/home/site/wwwroot/app.jar`, which the Java 21 SE stack starts on its own. Each app binds `8080` inside the sandbox (`CORE_PORT` / `GATEWAY_PORT` / `AI_PORT`, with `WEBSITES_PORT` telling the platform where to route); App Service terminates HTTPS on 443 in front of it. The local `8081` / `8082` split only matters on a developer machine.

The first start after an upload takes a minute or two: `dealer-core` runs Flyway against `dealerops-mysql` before it answers health checks.

## 6. Verify

```text
terraform -chdir=deploy/terraform output
```

| Check | URL |
|---|---|
| Web UI | `https://<web_public_url>/` |
| Gateway health | `https://<gateway_public_url>/actuator/health` → `{"status":"UP"}` |
| Swagger UI | `https://<gateway_public_url>/swagger-ui/index.html` |
| Core direct | `https://dealerops-core.azurewebsites.net/actuator/health` → refused by App Service, not 200 |
| AI direct | `https://dealerops-ai.azurewebsites.net/actuator/health` → refused by App Service, not 200 |

Sign in with the seeded `admin_username` / `admin_password`, create a dealership, bind a staff login, record one vehicle, and run one ad check. That is the graded path.

Live logs while a service starts:

```text
az webapp log tail --resource-group dealerops-rg --name dealerops-core
```

## 7. Local development

Local is not a copy of the cloud and uses no Azure resource. The four processes run directly on the machine against a local MySQL 8 on `3306`; the startup order, the per-service `dev` values, and the health checks are in the [README](../README.md) under "Local development startup". Copy `dealer-platform/env.example` to a local `.env` or paste the same values into IDE run configurations.

Only the cloud environment uses Key Vault, TLS-required MySQL, and the Static Web App. A local machine and the Azure stack never share a database, a JWT signing secret, or an admin password.

## 8. Cost and teardown

`Standard_B2` App Service plan plus `B_Standard_B1ms` MySQL is the recurring cost; the Static Web App Free tier and Key Vault standard are negligible. Set `service_plan_sku = "B1"` for a cheaper plan, at the price of 1.75 GB of memory for three JVMs.

Nothing in this stack stops on its own. Remove it when the demo is over:

```text
cd deploy/terraform
terraform destroy
```

`terraform destroy` deletes the MySQL server and its data. Export anything that must survive first. The provider is configured to purge the soft-deleted Key Vault so the same vault name works on the next apply.

## 9. Limits

- CI validates Terraform and never applies it. There is no automatic deploy on push to `main`.
- `terraform apply` creates infrastructure only. Application code reaches Azure through `deploy-apps.sh`, never through a CI job.
- Terraform owns the app settings. A setting changed by hand in the portal is reverted on the next apply, except `PUBLISHED_AT`, which the deploy step owns.
- Secrets, `.env`, `terraform.tfvars`, and `terraform.tfstate` stay out of git.
- There are no container images, no container registry, and no Compose file. The `dealer-core` Testcontainers ITs are the only remaining use of a Docker engine, on CI runners and developer machines.
