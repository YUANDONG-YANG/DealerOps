# Pre-coding gaps (only you can supply)

Items marked **Missing** block the matching module. Do not paste passwords into chat. Configure environment variables instead.

## Required first (blocks start of work)

| Item | Status | What you need to do |
|---|---|---|
| JDK 17 or 21 | **Missing**. This machine has JDK 11; Spring Boot 3 will not compile | Install Temurin 17 or 21 and point `JAVA_HOME` at it |
| Docker Desktop | **Missing** | Required to run MySQL locally and to build containers later |
| Teammate A/B/C names | **Missing** | Three names and who owns web / AI / core |
| Azure subscription | **Missing** | Student or school subscription that can create Container Apps, MySQL, ACR, Key Vault |
| Entra permissions | **Missing** (env / Azure AD, not code) | Create App Registration(s), App Roles `Platform.Admin` / `Dealer.User`, assign demo users. Design: [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §8.4. Ops steps: [README.md](../README.md) § Classroom Entra |
| Model key | **Missing** | ai-manager needs `AIMANAGER_API_KEY` (one of groq/openai/claude/deepseek). Course demos should use a real key that can be called reliably |
| ai-manager package | **No pinned release** | Publish an immutable version from commit `c07e1f2` to GitHub Packages, or allow local `mvn install` |

## Preferred before Sprint 1

| Item | Notes |
|---|---|
| Two demo Entra accounts plus one admin account | Used to demo isolation between two dealerships |
| Local or Azure redirect URL | Start with `http://localhost:5173` |
| Azure DevOps or GitHub Actions | The course requires independent CI/CD; you choose which |
| Budget cap | MySQL + Container Apps incur ongoing cost |

## Already available

- Business spec PDF, course hard-requirement PPT, and the lean design docs
- GitHub account `YUANDONG-YANG` and private repo `ai-manager`
- Node 20 / npm, Maven 3.6, Git
- Five empty repo skeletons in this directory, table SQL, API inventory, `.env.example`

## Do not put these in chat

Subscription passwords, Entra client secrets (an SPA should not have one), or the raw model key. Put them in local environment variables or Key Vault.
