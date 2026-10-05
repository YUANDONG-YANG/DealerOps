# DevOps operator guide

This folder is the procedure for the live pipeline. Architecture stays in [design/AI-CODING-LOCAL-AND-CLOUD.md](../design/AI-CODING-LOCAL-AND-CLOUD.md) §7. Host comparison stays in [deploy/publish-options.md](publish-options.md).

The current DevOps path is Cloudflare. A push to `main` builds container images and pushes them to GitHub Container Registry (`ghcr.io`) through `.github/workflows/publish-ghcr.yml`. That publish is the automatic part. The public demo is a Cloudflare quick tunnel: `cloudflared` on the operator machine forwards HTTPS to local Compose (web on port 5173 and gateway on port 8080). CI does not start the tunnel. The hostnames exist only while those processes run, and the next start prints different hostnames. This is free, and it is a forward to local Compose, not a cloud deploy of the Java services.

Azure remains a backup. The student VM record is in [Backup: Azure student VM](#backup-azure-student-vm). `dealer-platform/infra/main.bicep` stays an optional course draft that CI compiles and does not deploy. Use that backup when the Cloudflare tunnel is not used. Railway is not a deploy target.

## 1. What a push to `main` does

GitHub Actions starts the workflows whose path filters match the files in the push. A pull request runs compile jobs and does not push images. No workflow deploys Railway, starts `cloudflared`, or updates the Azure backup VM.

| Changed paths | Workflow file | On `main` |
|---|---|---|
| `dealer-web/**` or `.github/workflows/dealer-web.yml` | `.github/workflows/dealer-web.yml` | Job `compile`: Node 20 `npm ci` and `npm run build` |
| `dealer-core/**` or `.github/workflows/dealer-core.yml` | `.github/workflows/dealer-core.yml` | Job `compile`: JDK 21 compile, unit tests, and Testcontainers ITs when Docker is present |
| `dealer-gateway/**` or `.github/workflows/dealer-gateway.yml` | `.github/workflows/dealer-gateway.yml` | Job `compile`: JDK 21 compile and unit tests |
| `ai-service/**` or `.github/workflows/ai-service.yml` | `.github/workflows/ai-service.yml` | Job `compile`: stub profile compile and unit tests (no paid model) |
| `dealer-platform/infra/**`, `dealer-platform/pipelines/**`, or `.github/workflows/dealer-platform.yml` | `.github/workflows/dealer-platform.yml` | Job `bicep`: `az bicep build` only. Log line `Bicep compiled. Not deployed (no subscription / no secret values in repo).` |
| Any of `dealer-web/**`, `dealer-core/**`, `dealer-gateway/**`, `ai-service/**`, `dealer-platform/docker-compose.yml`, `dealer-platform/docker-compose.ghcr.yml`, or `.github/workflows/publish-ghcr.yml` | `.github/workflows/publish-ghcr.yml` | Job `publish`: build all four images and push them to `ghcr.io` |

One push can start several workflows. A change under `dealer-core/**` starts `dealer-core` and `publish-ghcr`. The publish job still builds all four images so the web footer and Swagger share one timestamp.

A docs-only change outside those paths does not start these workflows. Use Actions → `publish-ghcr` → Run workflow (`workflow_dispatch`) when you need an image publish without a matching path change.

Open runs at `https://github.com/YUANDONG-YANG/DealerOps/actions`.

## 2. Where images go

Owner is lowercase. Tags are the full git commit SHA and `main`.

| App | Immutable tag | Moving tag |
|---|---|---|
| dealer-web | `ghcr.io/yuandong-yang/dealer-web:<sha>` | `ghcr.io/yuandong-yang/dealer-web:main` |
| dealer-core | `ghcr.io/yuandong-yang/dealer-core:<sha>` | `ghcr.io/yuandong-yang/dealer-core:main` |
| dealer-gateway | `ghcr.io/yuandong-yang/dealer-gateway:<sha>` | `ghcr.io/yuandong-yang/dealer-gateway:main` |
| ai-service | `ghcr.io/yuandong-yang/ai-service:<sha>` | `ghcr.io/yuandong-yang/ai-service:main` |

`<sha>` is `github.sha` for that run. `:main` moves to the newest successful publish on `main`. Packages pushed by `GITHUB_TOKEN` stay private until someone changes visibility in the GitHub UI.

Open one publish run: `https://github.com/YUANDONG-YANG/DealerOps/actions/workflows/publish-ghcr.yml`.

Open packages: `https://github.com/YUANDONG-YANG/DealerOps/packages`.

## 3. Publish timestamp

The `Stamp publish time` step runs once per `publish` job (`date -u +%Y-%m-%dT%H:%M:%SZ`). UTC, second precision. That string is baked into `dealer-web` as `VITE_PUBLISHED_AT` (footer `Published <timestamp>`) and into `dealer-core` as `PUBLISHED_AT` (Swagger info description). Swagger HTML is served by the gateway at `/swagger-ui/index.html`. Direct core stays loopback-only in Compose (`127.0.0.1:8081`).

Local `docker compose up --build` uses `Published local` until the GHCR overlay in section 4.

## 4. Local stack

Working directory: `dealer-platform` (from the repo root).

Source images:

```text
cd dealer-platform
docker compose up --build
```

Published images (pulls `:main` and recreates containers):

```text
cd dealer-platform
docker login ghcr.io
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml up --no-build --pull always
```

`docker login ghcr.io` asks for a GitHub username and a personal access token with `read:packages`. Type the token at the prompt. Do not commit it.

Leave this stack running before section 5. Web listens on `5173`. Gateway listens on `8080`.

## 5. Public demo (Cloudflare quick tunnels)

This is the current public demo. Install `cloudflared` on the operator machine. A quick tunnel does not need a Cloudflare account, a named tunnel, a Workers rewrite, or a purchased domain. CI does not run these commands.

From the repo root, with Compose already listening, start two processes and leave both running:

```text
cloudflared tunnel --url http://127.0.0.1:5173
cloudflared tunnel --url http://127.0.0.1:8080
```

Each process prints a `https://<name>.trycloudflare.com` hostname. The web process is the UI. The gateway process is the API and Swagger. Open Swagger at `https://<gateway-host>/swagger-ui/index.html`. Do not open core port `8081`.

The web container writes `gatewayUrl` into `dist/config.json` at start from `GATEWAY_PUBLIC_URL` (`dealer-web/docker-entrypoint.cjs`). The SPA resolver is `dealer-web/src/api/gateway.ts`. Put the public origins in `dealer-platform/.env` (copy from `dealer-platform/env.example`; do not commit it):

```text
GATEWAY_PUBLIC_URL=https://<gateway-host>
CORS_ALLOWED_ORIGIN=https://<web-host>
```

No trailing slash. Recreate the two containers so the browser calls the public gateway and the gateway allows that web origin. No image rebuild is required:

```text
cd dealer-platform
docker compose up -d --no-build --force-recreate --no-deps dealer-web dealer-gateway
```

If the stack was started with the GHCR overlay, add `-f docker-compose.yml -f docker-compose.ghcr.yml` to that command.

The hostname changes on the next `cloudflared` start, so repeat the `.env` update and the container recreate. When the processes stop, those origins stop working.

Cloudflare Pages is not this path. `dealer-gateway` and `dealer-core` do not run on Workers.

## 6. Backup: Azure student VM

Azure is the backup public demo, available when the Cloudflare tunnel is not used. A push to `main` does not recreate this machine and does not deploy `dealer-platform/infra/main.bicep`.

Web and gateway share one hostname. The runtime `gatewayUrl` on the VM is that same origin.

| Check | URL |
|---|---|
| Web UI | `https://dealerops-sait.canadacentral.cloudapp.azure.com/` |
| Gateway health | `https://dealerops-sait.canadacentral.cloudapp.azure.com/actuator/health` |
| Swagger UI | `https://dealerops-sait.canadacentral.cloudapp.azure.com/swagger-ui/index.html` |

Checked on 2026-09-28 from outside the VM: the web UI returned HTTP 200 with title Dealer Ops, gateway `/actuator/health` returned HTTP 200 `{"status":"UP"}`, and Swagger `/swagger-ui/index.html` returned HTTP 200. Open Swagger on the hostname above. Do not open core port `8081`.

`GATEWAY_PUBLIC_URL` and `CORS_ALLOWED_ORIGIN` on the VM are `https://dealerops-sait.canadacentral.cloudapp.azure.com` (no trailing slash).

| Resource | Value |
|---|---|
| Subscription | Azure for Students (`quotaId` `AzureForStudents_2018-01-01`), spending limit on |
| Region | `canadacentral` |
| Resource group | `dealerops-student-demo` |
| VM | `dealerops-demo`, size `Standard_B2ms` (2 vCPU, 8 GB) |
| Public DNS | `dealerops-sait.canadacentral.cloudapp.azure.com` |
| Public IP | `dealerops-demoPublicIP` |
| Network security group | `dealerops-demoNSG` |
| Virtual network | `dealerops-demoVNET` |
| Network interface | `dealerops-demoVMNic` |
| OS disk | created with the VM |

Caddy on the VM terminates TLS with a Let's Encrypt certificate for that hostname. Ports 80 and 443 are public. Port 22 is limited to the address used when the VM was created.

MySQL 8.4 and the four services (`dealer-web`, `dealer-gateway`, `dealer-core`, and the `ai-service` stub) run together from `dealer-platform/docker-compose.yml` on this one VM, with an on-VM memory cap file `docker-compose.vm-limits.yml`. `dealer-platform/infra/main.bicep` was not deployed. Images were built on the VM from this repo.

The active Azure for Students credit lot, checked before the VM was created, showed a closed balance of 100 USD and expires 2026-10-27. Cost Management actual cost from the grant start through 2026-09-28 was 6.31 CAD. `Standard_B2ms` in Canada Central is 0.0928 USD per hour. The spending limit stops the subscription when the credit runs out.

## 7. Two environments: cloud + local VM

The operator runs two independent copies of the stack, not one shared environment:

| Environment | Where | Reached via |
|---|---|---|
| Cloud | [Backup: Azure student VM](#backup-azure-student-vm) (section 6) | `https://dealerops-sait.canadacentral.cloudapp.azure.com/` |
| Local | A separate Windows VM (console/RDP, not this repo's host machine) | Section 4 (local stack) + section 5 (Cloudflare quick tunnel) run unmodified inside that VM |

The local VM runs the exact same `dealer-platform/docker-compose.yml` stack as section 4; there is no separate compose file for it. Steps inside that VM: install Docker Desktop (WSL2 backend), clone this repo, copy `dealer-platform/env.example` to `.env` and set `DEV_JWT_SECRET` plus `ADMIN_USERNAME` / `ADMIN_PASSWORD` (seeds the one platform admin — see [design/15-Data-Auth-and-Gateway.md](../design/15-Data-Auth-and-Gateway.md) §8), then `docker compose up --build`. `dealer-web` runs separately (`npm run dev`, or its own Docker image) same as section 4.

The two environments do not share a database, a JWT signing secret, or admin credentials — each `.env` is independent. Keep that in mind if you bind the same person's staff username on both: the password and the underlying account are not the same row.

## 8. Limits

- GHCR publish does not start `cloudflared` and does not update the Azure backup VM.
- Job `bicep` compiles `dealer-platform/infra/main.bicep` and does not deploy it.
- Railway is not a deploy target. There is no Railway workflow on push to `main`.
- The Java services are not deployed to Cloudflare Workers.
- Secrets, `.env`, and tokens stay out of git. The publish job uses the built-in `GITHUB_TOKEN`.
