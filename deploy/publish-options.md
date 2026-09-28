# Publish options

The only current public demo is the Azure for Students virtual machine recorded in [deploy/README.md](README.md).

## Current demo

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

Web UI `/`, gateway `/actuator/health`, and Swagger `/swagger-ui/index.html` share that hostname. On 2026-09-28 each returned HTTP 200. This is not the Bicep Container Apps design and it is not Azure Database for MySQL.

The student credit lot was 100 USD, expiring 2026-10-27. Actual cost through 2026-09-28 was 6.31 CAD. `Standard_B2ms` in Canada Central is 0.0928 USD per hour. The spending limit stops the subscription when the credit runs out.

## Other hosts

Other hosts are unavailable for this project. Railway, Azure Container Apps, Cloudflare, Vercel, GitHub Container Registry as a public site, a custom domain, Oracle, and Muse are not in use. Do not treat them as a place to publish the demo.
