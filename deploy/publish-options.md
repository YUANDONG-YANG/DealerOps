# Publish options

This note records the hosts that were considered for DealerOps, and which path is the current demo entry. The procedure is [deploy/README.md](README.md). No prices below were invented: Railway figures are quoted from Railway's pricing reference as fetched on 2026-09-25 (`https://docs.railway.com/reference/pricing`).

## Decision

Railway is excluded. It is not a free host for this stack. The free plan is only about $1 of credit per month. The token `.github/workflows/deploy-railway.yml` reads is not a valid project token, so that workflow skips and exits 0. Do not add `RAILWAY_TOKEN`. Do not buy a domain. Do not deploy to Railway or Azure.

Cloudflare can be the demo entry, and it already is, as quick tunnels. They are free. They are not a cloud deploy of the Java services. `cloudflared` on the developer machine forwards HTTPS to local Compose (web on port 5173 and gateway on port 8080). Hostnames die when that process stops. Current URLs are in [deploy/README.md](README.md) section 9.

Cloudflare Pages could host the Vue frontend (`dealer-web`) for free later. `dealer-gateway` and `dealer-core` do not run on Cloudflare Workers. The backend is not deployed to Cloudflare.

What still publishes automatically for free is GHCR images via GitHub Actions. A push to `main` builds and pushes `dealer-web`, `dealer-core`, `dealer-gateway`, and `ai-service` to GitHub Container Registry through `.github/workflows/publish-ghcr.yml`. Local Compose in [deploy/README.md](README.md) section 5 can run that stack on the machine.

## Comparison

| Approach | What it runs | Public site | Cost |
|---|---|---|---|
| Azure Container Apps + ACR + MySQL Flexible Server | `dealer-web`, `dealer-gateway`, `dealer-core`, `ai-service`, and MySQL. Bicep is `dealer-platform/infra/main.bicep`. The GitHub job `.github/workflows/dealer-platform.yml` only compiles that file. | Possible after a paid deployment. Not what a push to `main` does. | Paid. MySQL Flexible Server bills while the server exists, including when the app is idle. |
| Vercel for `dealer-web` only | The static/SPA frontend. | A `*.vercel.app` hostname for the UI. | Vercel's free tier can host that frontend. It cannot run `dealer-gateway`, `dealer-core`, or MySQL, so Swagger and `/api/v1/**` are not on that site. |
| GitHub Container Registry plus local Docker Compose | Images for `dealer-web`, `dealer-core`, `dealer-gateway`, and `ai-service`, then Compose from `dealer-platform/docker-compose.yml` and `dealer-platform/docker-compose.ghcr.yml`. | No. The site is `http://localhost:5173/` and Swagger is `http://localhost:8080/swagger-ui/index.html` unless something else exposes the machine. | Free image publish on push to `main` via `.github/workflows/publish-ghcr.yml`. This is the automatic free publish. |
| Cloudflare quick tunnels (`trycloudflare.com`) | Local Compose, forwarded by `cloudflared` on the developer machine. Web and gateway only. | Current demo entry. A public hostname only while the tunnel process is running. The hostname changes every restart. DNS stops when `cloudflared` stops. | Free. Not a cloud deploy of the Java services. Not a fixed domain. |
| Cloudflare Pages (later, frontend only) | The Vue build of `dealer-web`. | A Pages hostname for the UI, if that is set up later. | Pages can host that frontend for free. `dealer-gateway` and `dealer-core` do not run on Workers, so the backend is not on Cloudflare. |
| Custom domain `dealer-ops.app` on Cloudflare | DNS for a name this repo does not serve by itself. | Not live. Registering the zone is a separate purchase, and the zone was not left serving this app. | Not free. The zone must be registered and paid for. Do not buy a domain. |
| Railway for the web, gateway, core, and MySQL | Would have run `dealer-web`, `dealer-gateway`, `dealer-core`, and MySQL. | Not used. `.github/workflows/deploy-railway.yml` skips and exits 0. | Excluded. The free plan is only about $1 of credit per month. Do not add `RAILWAY_TOKEN`. |

## What Railway's pricing page says

Fetched from `https://docs.railway.com/reference/pricing` on 2026-09-25:

- **Free** is listed at **$0 / month**, described as "for running small apps with $1 of free credit per month." Per service on that plan the documented caps include 1 replica, 0.5 GB RAM, 1 vCPU, and a 4 GB image size.
- **Trial** is separate: a new Trial account receives a one-time grant of $5. Trial users cannot buy more credit without moving to Hobby.
- **Hobby** is **$5 / month**. That subscription includes $5 of resource usage. The same page says the Hobby plan is not free: the $5 subscription is charged even when usage is under $5.
- Service builds are free (build CPU, memory, base-image downloads, image exports, and image storage are not charged). Runtime CPU, RAM, egress, and volume storage are usage-priced on top of the plan.

A stack that leaves MySQL and the Java services running would draw on that monthly credit. This repo does not calculate a bill. Railway is excluded for that reason. The workflow file `.github/workflows/deploy-railway.yml` remains in the repo and skips. Do not add `RAILWAY_TOKEN`.

## Why the other options are not a cloud backend

- **Quick tunnels** are the current demo entry. They need `cloudflared` on the developer machine, and the URL dies when that process stops. They forward to local Compose. They do not deploy `dealer-gateway` or `dealer-core`.
- **Cloudflare Pages** could host the Vue frontend later. Workers do not run those Java services, so Pages is not a backend deploy.
- **Vercel** is the same shape as Pages: a frontend host. The browser would still need a public gateway. Pointing the SPA at `http://localhost:8080` does not work for anyone except the machine running Compose.
- **GHCR** is the image archive and the automatic free publish. It stays. It does not replace a host.
- **`dealer-ops.app`** adds a paid registration and was not serving DNS for this app. Do not buy a domain.
- **Azure** can run the full stack later. It is the paid design in `dealer-platform/infra/main.bicep`, not the automatic public entry.
