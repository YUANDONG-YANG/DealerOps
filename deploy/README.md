# DevOps operator guide

This folder is the procedure for the live pipeline. Architecture stays in [design/AI-CODING-LOCAL-AND-CLOUD.md](../design/AI-CODING-LOCAL-AND-CLOUD.md) §7. Follow the steps below without asking anyone else.

A push to `main` builds container images and pushes them to GitHub Container Registry (`ghcr.io`). That GHCR publish, via `.github/workflows/publish-ghcr.yml`, is what still publishes automatically for free. Railway is excluded. Its free plan is only about $1 of credit per month, and the token `.github/workflows/deploy-railway.yml` reads is not a valid project token, so that job skips and exits 0. Do not add `RAILWAY_TOKEN`. This pipeline does not create Azure resources and does not buy a domain. CI does not start a Cloudflare tunnel. The current demo entry is a Cloudflare quick tunnel: `cloudflared` on the developer machine forwards HTTPS to local Compose (web and gateway). That is free, and it is not a cloud deploy of the Java services. Hostnames die when the process stops. Section 9 lists the current demo URLs. Host comparison is [deploy/publish-options.md](publish-options.md).

Leave any stack you already started running. The commands in "Local acceptance" are what you run later, when you choose to replace it with a newly published image.

## 1. What a push to `main` does

GitHub Actions starts only the workflows whose path filters match the files in the push. A pull request runs compile jobs and does not push images.

| Changed paths | Workflow file | On `main` |
|---|---|---|
| `dealer-web/**` or `.github/workflows/dealer-web.yml` | `.github/workflows/dealer-web.yml` | Job `compile`: Node 20 `npm ci` and `npm run build` |
| `dealer-core/**` or `.github/workflows/dealer-core.yml` | `.github/workflows/dealer-core.yml` | Job `compile`: JDK 21 compile, unit tests, and Testcontainers ITs when Docker is present |
| `dealer-gateway/**` or `.github/workflows/dealer-gateway.yml` | `.github/workflows/dealer-gateway.yml` | Job `compile`: JDK 21 compile and unit tests |
| `ai-service/**` or `.github/workflows/ai-service.yml` | `.github/workflows/ai-service.yml` | Job `compile`: stub profile compile and unit tests (no paid model) |
| `dealer-platform/infra/**`, `dealer-platform/pipelines/**`, or `.github/workflows/dealer-platform.yml` | `.github/workflows/dealer-platform.yml` | Job `bicep`: `az bicep build` only |
| Any of `dealer-web/**`, `dealer-core/**`, `dealer-gateway/**`, `ai-service/**`, `dealer-platform/docker-compose.yml`, `dealer-platform/docker-compose.ghcr.yml`, or `.github/workflows/publish-ghcr.yml` | `.github/workflows/publish-ghcr.yml` | Job `publish`: build all four images and push them to `ghcr.io` |
| Every push to `main` (no path filter), or a manual run | `.github/workflows/deploy-railway.yml` | Job `deploy`: Railway is excluded. The job skips and exits 0 |

One push can start several workflows. Example: a change under `dealer-core/**` starts `dealer-core` (`compile`) and `publish-ghcr` (`publish`). The publish job still builds all four images so the web footer and Swagger share one timestamp.

A docs-only change outside those paths does not start the compile or GHCR workflows. `.github/workflows/deploy-railway.yml` still starts on every push to `main`. Use Actions → `publish-ghcr` → Run workflow (`workflow_dispatch`) when you need an image publish without a matching path change.

Open runs at `https://github.com/YUANDONG-YANG/DealerOps/actions`.

## 2. Each workflow, job, success, and skip

There is no secret gate and no skip-for-missing-Azure step. `GITHUB_TOKEN` is supplied by Actions. The publish workflow sets `permissions: packages: write`.

### `.github/workflows/dealer-web.yml`

- Job `compile` on `ubuntu-latest`.
- Success: the job is green and the log shows `npm run build` finished.
- Skip: the whole workflow stays idle when the path filter does not match. There is no skipped image job.

### `.github/workflows/dealer-core.yml`

- Job `compile`.
- Success: `mvn -B test` is green. When the runner has Docker, `mvn -B verify -DskipTests` runs the Testcontainers MySQL 8.4 ITs.
- Skip inside the job: if `docker info` fails, the log line is `Docker is not available; skipping *IT (Flyway V1 on mysql:8.4).` The compile job can still succeed. Surefire does not run `*IT` in the unit-test step.

### `.github/workflows/dealer-gateway.yml`

- Job `compile`.
- Success: `mvn -B test` is green.
- Skip: workflow idle when paths do not match.

### `.github/workflows/ai-service.yml`

- Job `compile` with Maven profiles `stub,!aimanager` and `-Daimanager.stub=true`.
- Success: compile and unit tests are green. The log must not show a paid model call.
- Skip: workflow idle when paths do not match.

### `.github/workflows/dealer-platform.yml`

- Job `bicep`.
- Success: log line `Bicep compiled. Not deployed (no subscription / no secret values in repo).`
- That success is compile only. It does not log in to Azure and does not create a resource group.

### `.github/workflows/publish-ghcr.yml`

- Job `publish`.
- Steps: `Stamp publish time`, `Log in to GHCR`, `Build and push images`.
- Success: the log contains one `PUBLISHED_AT=` line, then for each app both `Image ghcr.io/yuandong-yang/<name>:<sha>` and `Image ghcr.io/yuandong-yang/<name>:main`, then `Published <timestamp>`. The job summary on the Actions run repeats that list.
- Failure is a red job, not a skip. A login or push failure is a permissions problem (see section 6). A `docker build` failure is an application build problem in that image's Dockerfile.
- The same job builds `dealer-web`, `dealer-core`, `dealer-gateway`, and `ai-service`. The `ai-service` image uses the Dockerfile's default stub Maven args. It does not install a paid model.

### `.github/workflows/deploy-railway.yml`

- Job `deploy` on `ubuntu-latest`. Script: `deploy/railway-deploy.sh`.
- Railway is excluded. The free plan is only about $1 of credit per month, and the token this workflow reads is not a valid project token. Do not add `RAILWAY_TOKEN`. Do not print any token. CI does not call `railway login`.
- Skip: the log contains `Railway deploy skipped because RAILWAY_TOKEN is not a valid project token.` The job exits 0, so a green run is a skip, not a public site.
- The Actions run list is `https://github.com/YUANDONG-YANG/DealerOps/actions/workflows/deploy-railway.yml`.

## 3. Where images go

Owner is lowercase. Tags are the full git commit SHA and `main`. Both tags come from the same workflow run as the timestamp.

| App | Immutable tag | Moving tag |
|---|---|---|
| dealer-web | `ghcr.io/yuandong-yang/dealer-web:<sha>` | `ghcr.io/yuandong-yang/dealer-web:main` |
| dealer-core | `ghcr.io/yuandong-yang/dealer-core:<sha>` | `ghcr.io/yuandong-yang/dealer-core:main` |
| dealer-gateway | `ghcr.io/yuandong-yang/dealer-gateway:<sha>` | `ghcr.io/yuandong-yang/dealer-gateway:main` |
| ai-service | `ghcr.io/yuandong-yang/ai-service:<sha>` | `ghcr.io/yuandong-yang/ai-service:main` |

`<sha>` is `github.sha` for that run (40 hex characters). Do not treat `latest` as a release. `:main` moves to the newest successful publish on `main`.

Open the run list: `https://github.com/YUANDONG-YANG/DealerOps/actions`.

Open one publish run: `https://github.com/YUANDONG-YANG/DealerOps/actions/workflows/publish-ghcr.yml`.

Open packages linked to this repo: `https://github.com/YUANDONG-YANG/DealerOps/packages`.

Each image is also labeled `org.opencontainers.image.source=https://github.com/YUANDONG-YANG/DealerOps` and `org.opencontainers.image.created=<timestamp>`.

Packages pushed by `GITHUB_TOKEN` are private to the repo until someone changes visibility in the GitHub UI. This workflow does not change visibility and does not print tokens.

## 4. Publish timestamp

The `Stamp publish time` step runs once per `publish` job:

```text
date -u +%Y-%m-%dT%H:%M:%SZ
```

Example of the shape (the value changes every run): `2026-09-25T16:48:01Z`. UTC, second precision, no milliseconds. The `Build and push images` step prints `PUBLISHED_AT=<that value>` before it builds, then passes that exact string into the images.

| Surface | How the value gets in | What a person sees |
|---|---|---|
| dealer-web | Docker build-arg `VITE_PUBLISHED_AT` baked by Vite into the JS bundle | Fixed footer on every page, including sign-in: `Published 2026-09-25T16:48:01Z` |
| dealer-core Swagger | Docker build-arg `PUBLISHED_AT` stored as container env `PUBLISHED_AT`. Spring reads `dealerops.published-at` at startup | Swagger UI info description under the title `dealer-core`: `Published 2026-09-25T16:48:01Z` |

Gateway and ai-service images are published in the same run so the stack matches, but they do not render the timestamp. Swagger HTML is rendered by dealer-core and **served by the gateway** at `/swagger-ui/index.html`. The OpenAPI document is `/v3/api-docs` on that same gateway. Direct core stays loopback-only in Compose (`127.0.0.1:8081`) and is not the page you open.

Local `npm run dev` in `dealer-web/` has no `VITE_PUBLISHED_AT`, so the footer says `Published local`. `docker compose up --build` from source uses the Dockerfile defaults `VITE_PUBLISHED_AT=local` and `PUBLISHED_AT=local`, so both UIs say `Published local` until you run the GHCR overlay.

## 5. Local acceptance of published images

Working directory: `dealer-platform` (from the repo root).

Source development (builds Dockerfiles on your machine; timestamp is `local`):

```text
cd dealer-platform
docker compose up --build
```

Published images (do this when you want the stack to show the timestamp from Actions; it pulls and recreates containers):

```text
cd dealer-platform
docker login ghcr.io
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.yml -f docker-compose.ghcr.yml up --no-build --pull always
```

`docker login ghcr.io` asks for a GitHub username and a personal access token with `read:packages`. Type the token at the prompt. Do not commit it, and do not put it in `dealer-platform/.env`.

`--no-build` is required. The base file still has `build:` for source work. Without `--no-build`, Compose may rebuild and overwrite the pulled tag.

`dealer-platform/docker-compose.ghcr.yml` only swaps in:

- `ghcr.io/yuandong-yang/dealer-core:main`
- `ghcr.io/yuandong-yang/ai-service:main`
- `ghcr.io/yuandong-yang/dealer-gateway:main`
- `ghcr.io/yuandong-yang/dealer-web:main`

MySQL stays `mysql:8.4`. Do not set `PUBLISHED_AT` in the overlay. The core image already carries it. The web timestamp is inside the built JS, not a runtime env var.

After the GHCR stack is up, open:

| Check | URL |
|---|---|
| Web UI (footer `Published …`) | `http://localhost:5173/` |
| Gateway (browser API origin) | `http://localhost:8080/` |
| Gateway health | `http://localhost:8080/actuator/health` |
| Swagger UI (description `Published …`) | `http://localhost:8080/swagger-ui/index.html` |
| OpenAPI JSON (same description) | `http://localhost:8080/v3/api-docs` |
| Core health (loopback) | `http://127.0.0.1:8081/actuator/health` |
| ai-service health (loopback) | `http://127.0.0.1:8082/actuator/health` |

Ports come from `dealer-platform/docker-compose.yml`: web `5173`, gateway `8080` on all interfaces, core `127.0.0.1:8081`, ai-service `127.0.0.1:8082`, MySQL `3306`. The SPA calls the gateway origin (`GATEWAY_PUBLIC_URL`, default `http://localhost:8080`), not core or ai-service. Swagger needs no `Authorization` header. `/api/v1/**` still requires a Bearer token.

Copy `dealer-platform/env.example` to a local `.env` if you need Entra values. Do not commit `.env`.

## 6. When something fails

1. Actions list: `https://github.com/YUANDONG-YANG/DealerOps/actions`. Open the red run. The job name is in section 2.
2. Publish log: search for `PUBLISHED_AT=` (stamp succeeded) and the first `Image ghcr.io/...` line that is missing (build or push failed on that app).
3. Packages page: `https://github.com/YUANDONG-YANG/DealerOps/packages`. An empty page after a green publish usually means the image is private and you are looking at a personal view that is not signed in as a collaborator. Open the run log first; the `Image` lines are the proof of push.
4. Container logs, after you have started Compose yourself, from `dealer-platform`:
   - Source stack: `docker compose logs dealer-web` (also `dealer-gateway`, `dealer-core`, `ai-service`, `mysql`)
   - GHCR stack: `docker compose -f docker-compose.yml -f docker-compose.ghcr.yml logs dealer-core`
5. Image pull errors (`unauthorized`, `denied`, `not found`):
   - `not found` / wrong name: confirm the publish job is green and the name is `ghcr.io/yuandong-yang/<app>:main` (owner lowercase).
   - `denied` or `unauthorized`: run `docker login ghcr.io` with `read:packages`. Repo Actions must allow the workflow token to write packages (Settings → Actions → General → Workflow permissions: read and write). The workflow already requests `packages: write`.
   - Push fails in Actions with `denied` even though the file sets `packages: write`: the repository's workflow-token policy is still read-only. Change that setting. Do not add a personal token to the repo to work around it, and do not print tokens into logs.
6. Web shows `Published local` while Swagger shows a timestamp, or the reverse: the two images were not built in the same `publish` job, or you mixed a source-built container with a GHCR container. Pull again with the overlay in section 5 and recreate only when you intend to switch to the published images.
7. Swagger returns 401 or an empty page: open `http://localhost:8080/swagger-ui/index.html` (or the public gateway origin in section 9, same path). Those paths are public on the gateway. A 401 on `/api/v1/**` is expected without a Bearer token. Do not switch the browser to core port `8081`.

## 7. What this automation does not do

- It does not create an Azure resource group, log in to Azure, push to Azure Container Registry, or run a Bicep deployment. `dealer-platform/infra/main.bicep` remains in the repo as an optional paid design. Job `bicep` only compiles it.
- A push to `main` does not deploy a public website. Railway is excluded (section 8). It does not deploy to Azure, Vercel, or Cloudflare. CI does not start a Cloudflare tunnel. The current demo entry is the quick tunnels in section 9, which forward to local Compose and die when `cloudflared` stops.
- It does not deploy the Java services to Azure or to Cloudflare Workers. Private GHCR images are pulled only when `docker login ghcr.io` has `read:packages`. When that login is missing, build the Dockerfiles from this repo (section 5).
- It does not commit secrets, `.env`, or tokens. The publish job uses the built-in `GITHUB_TOKEN`. The Railway workflow does not print a token. Do not add `RAILWAY_TOKEN`.
- It does not stop or recreate containers on a developer machine. Section 5 is manual.
- An older GitHub Release tag is not this image publish. Confirm images with the `publish-ghcr` run log or the packages page, not with a release.

## 8. Railway is excluded

Railway is not a deployment target. There is no durable public website from this repo. Do not buy a domain. Do not create Azure resources. Do not start `dealer-platform/infra/main.bicep`. Do not use `dealer-ops.app`. Do not add `RAILWAY_TOKEN`. The current demo entry is the Cloudflare quick tunnels in section 9. The comparison of host options is [deploy/publish-options.md](publish-options.md).

The free Railway plan is only about $1 of credit per month, so it is not treated as a free host for MySQL and the Java services. `.github/workflows/deploy-railway.yml` still runs on every push to `main` and calls `deploy/railway-deploy.sh`. The token that workflow reads is not a valid project token, so the script skips. The log says `Railway deploy skipped because RAILWAY_TOKEN is not a valid project token.` and the job exits 0. A green run does not change a Railway project and does not publish a site.

What still publishes automatically for free is the GHCR image push in `.github/workflows/publish-ghcr.yml`. Local Compose in section 5 is how you run the stack. The public demo URLs, while `cloudflared` is running, are in section 9.

| Check | Where |
|---|---|
| Workflow file | `.github/workflows/deploy-railway.yml` |
| Actions log | `https://github.com/YUANDONG-YANG/DealerOps/actions/workflows/deploy-railway.yml` |
| Expected log | `Railway deploy skipped because RAILWAY_TOKEN is not a valid project token.` |
| What you can run now | Section 5, from `dealer-platform`, using the GHCR images |
| Current demo URLs | Section 9 |

## 9. Live demo (Cloudflare quick tunnels)

These URLs are the current demo entry. They are free Cloudflare quick-tunnel hostnames. `cloudflared` on the developer machine forwards HTTPS to local Compose (web and gateway). They are not a cloud deploy of the Java services, not a Cloudflare Pages or Workers deploy, not a purchased domain, not `dealer-ops.app`, and not a Railway or Azure deploy. The names die when `cloudflared` stops. The next start gets different hostnames. Leave the existing `cloudflared` processes running for the whole demo. Do not start a second pair of tunnels while these hostnames are still up.

Cloudflare Pages could host the Vue frontend (`dealer-web`) for free later. `dealer-gateway` and `dealer-core` do not run on Cloudflare Workers. The backend is not deployed to Cloudflare.

Checked while the tunnels were up: both URLs returned HTTP 200.

| Check | URL |
|---|---|
| Web UI | `https://distinction-cir-accurately-experts.trycloudflare.com/` |
| Gateway | `https://scenes-moving-tray-exhaust.trycloudflare.com/` |
| Swagger UI | `https://scenes-moving-tray-exhaust.trycloudflare.com/swagger-ui/index.html` |

Open Swagger on the gateway host above. Do not open core port `8081`.

From the repo root, with Compose already listening on web `5173` and gateway `8080` (`dealer-platform/docker-compose.yml`), start two quick tunnels and leave both processes running:

```text
cloudflared tunnel --url http://127.0.0.1:5173
cloudflared tunnel --url http://127.0.0.1:8080
```

The web container writes `gatewayUrl` into `dist/config.json` at start from `GATEWAY_PUBLIC_URL` (`dealer-web/docker-entrypoint.cjs`). The SPA resolver is `dealer-web/src/api/gateway.ts`. For this demo that value is the public gateway origin `https://scenes-moving-tray-exhaust.trycloudflare.com` (no trailing slash). The gateway allows the browser through `CORS_ALLOWED_ORIGIN`, set to the public web origin `https://distinction-cir-accurately-experts.trycloudflare.com`. Recreate `dealer-web` and `dealer-gateway` from `dealer-platform` after those hostnames exist so the browser calls the public gateway, not `http://localhost:8080`. No image rebuild is required for that env change. When the tunnels stop, those two origins stop working.
