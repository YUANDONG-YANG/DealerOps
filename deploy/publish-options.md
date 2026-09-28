# Publish options

The current DevOps path is Cloudflare. GitHub Actions publishes images to GHCR. An operator exposes the local Compose stack with a Cloudflare quick tunnel. Procedure: [deploy/README.md](README.md). Azure is the backup when that tunnel is not used. Railway is not a deploy target.

## Current path

| Item | Value |
|---|---|
| Automatic publish | `.github/workflows/publish-ghcr.yml` pushes `dealer-web`, `dealer-core`, `dealer-gateway`, and `ai-service` to `ghcr.io` on a matching push to `main` |
| Public demo | Cloudflare quick tunnels (`cloudflared tunnel --url`) from the operator machine to local web `5173` and gateway `8080` |
| Hostname | `https://<name>.trycloudflare.com` printed when `cloudflared` starts. It changes on the next start and stops when the process stops |
| Account | A quick tunnel does not need a Cloudflare account or a named tunnel |
| What CI does | Image publish. CI does not start `cloudflared` and does not deploy a host |

`dealer-gateway` and `dealer-core` stay on Compose. They are not rewritten onto Cloudflare Workers. Cloudflare Pages is not this path. A custom domain such as `dealer-ops.app` is not used.

## Comparison

| Approach | What it runs | Public site | Role |
|---|---|---|---|
| GHCR plus local Compose | Images for the four apps, then Compose from `dealer-platform/docker-compose.yml` and `dealer-platform/docker-compose.ghcr.yml` | Localhost until a tunnel is started | Automatic free publish |
| Cloudflare quick tunnels | Local Compose, forwarded by `cloudflared` on the operator machine. Web and gateway only | Public while the two processes run | Current public demo |
| Azure student VM | MySQL 8.4 and the four services on `dealerops-demo`. Record in [deploy/README.md](README.md) section 6 | `https://dealerops-sait.canadacentral.cloudapp.azure.com/` when that VM is running | Backup. A push to `main` does not update it |
| Azure Container Apps draft | `dealer-platform/infra/main.bicep`. `.github/workflows/dealer-platform.yml` compiles it | None from CI | Backup course draft. Not deployed |
| Railway | Would have run web, gateway, core, and MySQL | None | Removed. Not a deploy target |

## Backup: Azure student VM

| Item | Value |
|---|---|
| URL | `https://dealerops-sait.canadacentral.cloudapp.azure.com/` |
| Subscription | Azure for Students, spending limit on |
| Resource group | `dealerops-student-demo` |
| Region | `canadacentral` (Canada Central) |
| VM | `dealerops-demo`, `Standard_B2ms` (2 vCPU, 8 GB) |
| Public DNS | `dealerops-sait.canadacentral.cloudapp.azure.com` |
| Stack | MySQL 8.4, `dealer-web`, `dealer-gateway`, `dealer-core`, and the `ai-service` stub from `dealer-platform/docker-compose.yml` on that VM |
| TLS | Caddy with a Let's Encrypt certificate. Ports 80 and 443 are public. SSH is limited to the setup address. |

Web UI `/`, gateway `/actuator/health`, and Swagger `/swagger-ui/index.html` share that hostname. On 2026-09-28 each returned HTTP 200. This record stays so the VM can be used if Cloudflare is not used. CI does not deploy it. `dealer-platform/infra/main.bicep` was not the template for this VM and remains an undeployed course draft.

The student credit lot was 100 USD, expiring 2026-10-27. Actual cost through 2026-09-28 was 6.31 CAD. `Standard_B2ms` in Canada Central is 0.0928 USD per hour. The spending limit stops the subscription when the credit runs out.
