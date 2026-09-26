# Publish options

This note records the hosts that were actually considered for DealerOps, and which one is the easier free path to a public site. The procedure for the chosen host is [deploy/README.md](README.md). No prices below were invented: Railway figures are quoted from Railway's pricing reference as fetched on 2026-09-25 (`https://docs.railway.com/reference/pricing`).

## Recommendation

The easier free path for a public site that includes the Java gateway and Swagger is Railway. Vercel is easier only for the frontend and leaves the API unreachable. Azure and a custom domain cost money. GitHub Container Registry is free but not a public website. Cloudflare quick tunnels are free but not stable.

## Comparison

| Approach | What it runs | Public site | Cost |
|---|---|---|---|
| Azure Container Apps + ACR + MySQL Flexible Server | `dealer-web`, `dealer-gateway`, `dealer-core`, `ai-service`, and MySQL. Bicep is `dealer-platform/infra/main.bicep`. The GitHub job `.github/workflows/dealer-platform.yml` only compiles that file. | Possible after a paid deployment. Not what a push to `main` does. | Paid. MySQL Flexible Server bills while the server exists, including when the app is idle. |
| Vercel for `dealer-web` only | The static/SPA frontend. | A `*.vercel.app` hostname for the UI. | Vercel's free tier can host that frontend. It cannot run `dealer-gateway`, `dealer-core`, or MySQL, so Swagger and `/api/v1/**` are not on that site. |
| GitHub Container Registry plus local Docker Compose | Images for `dealer-web`, `dealer-core`, `dealer-gateway`, and `ai-service`, then Compose from `dealer-platform/docker-compose.yml` and `dealer-platform/docker-compose.ghcr.yml`. | No. The site is `http://localhost:5173/` and Swagger is `http://localhost:8080/swagger-ui/index.html` unless something else exposes the machine. | Free image publish on push to `main` via `.github/workflows/publish-ghcr.yml`. |
| Cloudflare quick tunnels (`trycloudflare.com`) | Whatever is already running on the machine, forwarded by `cloudflared`. | A public hostname only while the tunnel process is running. The hostname changes every restart. DNS stops when `cloudflared` stops. | Free. Not a fixed domain. |
| Custom domain `dealer-ops.app` on Cloudflare | DNS for a name this repo does not serve by itself. | Not live. Registering the zone is a separate purchase, and the zone was not left serving this app. | Not free. The zone must be registered and paid for. |
| Railway for the web, gateway, core, and MySQL | `dealer-web`, `dealer-gateway`, `dealer-core`, and MySQL (core does not boot without a database). `ai-service` is not required for the gateway process to start. | A `*.up.railway.app` hostname. The web app and Swagger are both public. Swagger is on the gateway host at `/swagger-ui/index.html`. Core is not given a public domain, so port `8081` is not the public page. | Chosen because it can run the Java services without buying a domain. The user identified Railway as the free host. Verified plan text is in the next section. |

## What Railway's pricing page says

Fetched from `https://docs.railway.com/reference/pricing` on 2026-09-25:

- **Free** is listed at **$0 / month**, described as "for running small apps with $1 of free credit per month." Per service on that plan the documented caps include 1 replica, 0.5 GB RAM, 1 vCPU, and a 4 GB image size.
- **Trial** is separate: a new Trial account receives a one-time grant of $5. Trial users cannot buy more credit without moving to Hobby.
- **Hobby** is **$5 / month**. That subscription includes $5 of resource usage. The same page says the Hobby plan is not free: the $5 subscription is charged even when usage is under $5.
- Service builds are free (build CPU, memory, base-image downloads, image exports, and image storage are not charged). Runtime CPU, RAM, egress, and volume storage are usage-priced on top of the plan.

A push-to-`main` stack that leaves MySQL and the Java services running draws on that monthly credit. This repo does not calculate a bill and does not switch the host because of it. The workflow is `.github/workflows/deploy-railway.yml`. It deploys only when the GitHub Actions secret `RAILWAY_TOKEN` is set.

## Why the other free options are not this public site

- **Vercel** is the smaller setup if the only artifact is the Vite build. The browser would still need a public gateway. Pointing the SPA at `http://localhost:8080` does not work for anyone except the machine running Compose.
- **GHCR** is the image archive. It stays. It does not replace a host.
- **Quick tunnels** need a person to keep `cloudflared` running, and the URL is not stable enough to bake into the web app or into gateway CORS.
- **`dealer-ops.app`** adds a paid registration and was not serving DNS for this app.
- **Azure** can run the full stack later. It is the paid design in `dealer-platform/infra/main.bicep`, not the automatic public entry.
