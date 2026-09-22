# Pipeline notes (GitHub Actions)

Default CI is GitHub Actions (`design/AI-CODING-LOCAL-AND-CLOUD.md` §7). This folder no longer uses Azure DevOps as the product pipeline.

This checkout is still one git repo. Workflows live at `.github/workflows/` and each job sets a working directory. If the course later splits four remotes, copy the matching file to that repo as `.github/workflows/ci.yml` and set `working-directory` to `.`.

| App | Workflow in this repo | PR | `main` |
|---|---|---|---|
| dealer-core | `.github/workflows/dealer-core.yml` | JDK 21 compile + unit tests (`*IT` and `TenantFilterTest` skipped); Failsafe ITs use Testcontainers MySQL 8.4 when Docker is present | echo image `tag=$GITHUB_SHA` (ACR push after secrets exist) |
| dealer-gateway | `.github/workflows/dealer-gateway.yml` | JDK 21 compile + unit tests | same image echo |
| ai-service | `.github/workflows/ai-service.yml` | `mvn -Pstub,!aimanager -Daimanager.stub=true` (no paid model, no GitHub Packages) | same image echo |
| dealer-web | `.github/workflows/dealer-web.yml` | Node 20 `npm ci && npm run build` | same image echo |
| dealer-platform | `.github/workflows/dealer-platform.yml` | `az bicep build` only; does not build business images | no deploy |

Demo image push uses GitHub Environment `demo` (second-person approval). Required secrets are **not** in git:

- `ACR_LOGIN_SERVER` (example `dealeropsacr.azurecr.io`)
- Azure login for ACR push (set after the subscription exists)

Key Vault secret names (values at deploy, never committed): `INTERNAL-TOKEN`, `MYSQL-PASSWORD`, `AIMANAGER-API-KEY`.

`app.yml` is a leftover Azure DevOps stub. Do not copy it as the live pipeline.
