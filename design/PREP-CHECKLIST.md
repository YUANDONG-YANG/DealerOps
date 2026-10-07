# Pre-coding gaps (only you can supply)

Items marked **Missing** block the matching module. Do not paste passwords into chat. Configure environment variables instead.

## Required first (blocks start of work)

| Item | Status | What you need to do |
|---|---|---|
| JDK 17 or 21 | **Missing**. This machine has JDK 11; Spring Boot 3 will not compile | Install Temurin 17 or 21 and point `JAVA_HOME` at it |
| MySQL 8.4 | **Missing** | Install and start it locally on `3306`, then create database `dealer_core` and user `dealer` ([README](../README.md)) |
| Terraform 1.9+ and Azure CLI | **Missing** | Only the operator who runs the cloud deploy needs them ([deploy/README.md](../deploy/README.md)) |
| Docker engine | Optional | Only the `dealer-core` Testcontainers integration tests use one. Nothing that ships is a container |
| Teammate A/B/C names | **Missing** | Three names and who owns web / AI / core |
| Azure subscription | **Missing** | Student or school subscription that can create App Service, Static Web Apps, MySQL Flexible Server, and Key Vault |
| Platform admin credentials | **Missing** (env, not code) | Set `ADMIN_USERNAME` / `ADMIN_PASSWORD` so `dealer-core` seeds the one platform admin on startup. Design: [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8 |
| Model key | **Missing** | ai-manager needs `AIMANAGER_API_KEY` (one of groq/openai/claude/deepseek). Course demos should use a real key that can be called reliably |
| ai-manager package | **No pinned release** | Publish an immutable version from commit `c07e1f2` to GitHub Packages, or allow local `mvn install` |

## Preferred before Sprint 1

| Item | Notes |
|---|---|
| Two demo staff usernames/passwords plus one admin account | Used to demo isolation between two dealerships; admin creates staff logins on `/admin` |
| Azure DevOps or GitHub Actions | The course requires independent CI/CD; you choose which |
| Budget cap | The App Service plan and MySQL Flexible Server bill continuously. `terraform destroy` is the off switch |

## Already available

- Business spec PDF, course hard-requirement PPT, and the lean design docs
- GitHub account `YUANDONG-YANG` and private repo `ai-manager`
- Node 20 / npm, Maven 3.6, Git
- Five empty repo skeletons in this directory, table SQL, API inventory, `.env.example`

## Do not put these in chat

Subscription passwords, `ADMIN_PASSWORD` / staff passwords, or the raw model key. Put them in local environment variables or Key Vault.
