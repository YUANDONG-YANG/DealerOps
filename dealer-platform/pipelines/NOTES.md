# Pipeline notes (GitHub Actions)

The operator procedure is [deploy/README.md](../../deploy/README.md). Architecture is [design/AI-CODING-LOCAL-AND-CLOUD.md](../../design/AI-CODING-LOCAL-AND-CLOUD.md) §7.

This checkout is one git repo. Compile workflows live at `.github/workflows/`. Image publish is `.github/workflows/publish-ghcr.yml` (GHCR, not Azure). If the course later splits four remotes, copy the matching compile file to that repo as `.github/workflows/ci.yml` and set `working-directory` to `.`.

`app.yml` is a leftover Azure DevOps stub. Do not copy it as the live pipeline.

The Bicep file under `dealer-platform/infra/` is an optional paid stack. The `bicep` job compiles it and does not deploy. Key Vault secret names used only by that optional stack (values never committed): `INTERNAL-TOKEN`, `MYSQL-PASSWORD`, `AIMANAGER-API-KEY`.
