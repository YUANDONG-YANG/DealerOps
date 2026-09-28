# Current student demo

This folder is the operator record for the live public demo. The only current public site is the Azure virtual machine below. A push to `main` does not recreate that machine.

## Live site

Web and gateway share one hostname. The runtime `gatewayUrl` is that same origin.

| Check | URL |
|---|---|
| Web UI | `https://dealerops-sait.canadacentral.cloudapp.azure.com/` |
| Gateway health | `https://dealerops-sait.canadacentral.cloudapp.azure.com/actuator/health` |
| Swagger UI | `https://dealerops-sait.canadacentral.cloudapp.azure.com/swagger-ui/index.html` |

Checked on 2026-09-28 from outside the VM: the web UI returned HTTP 200 with title Dealer Ops, gateway `/actuator/health` returned HTTP 200 `{"status":"UP"}`, and Swagger `/swagger-ui/index.html` returned HTTP 200. Open Swagger on the hostname above. Do not open core port `8081`.

`GATEWAY_PUBLIC_URL` and `CORS_ALLOWED_ORIGIN` on the VM are `https://dealerops-sait.canadacentral.cloudapp.azure.com` (no trailing slash).

## Virtual machine

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

MySQL 8.4 and the four services (`dealer-web`, `dealer-gateway`, `dealer-core`, and the `ai-service` stub) run together from `dealer-platform/docker-compose.yml` on this one VM, with an on-VM memory cap file `docker-compose.vm-limits.yml`. There is no Azure Database for MySQL and there are no Container Apps. `dealer-platform/infra/main.bicep` was not deployed. Images were built on the VM from this repo.

The active Azure for Students credit lot, checked before the VM was created, showed a closed balance of 100 USD and expires 2026-10-27. Cost Management actual cost from the grant start through 2026-09-28 was 6.31 CAD. `Standard_B2ms` in Canada Central is 0.0928 USD per hour. The spending limit stops the subscription when the credit runs out.

## What a push to `main` does

A push to `main` builds container images and pushes them to GitHub Container Registry through `.github/workflows/publish-ghcr.yml`. That publish does not update this VM and does not create a public site of its own. The public demo remains the VM above until someone changes it on the machine. Compile and Bicep workflows in `.github/workflows/` do not deploy Azure resources.

## Other hosts

Other hosts are unavailable for this project. Railway, Azure Container Apps, Cloudflare, Vercel, a custom domain, Oracle, and Muse are not the demo. Do not deploy them. The files for those older ideas can stay in the repo; they are not a live host.
