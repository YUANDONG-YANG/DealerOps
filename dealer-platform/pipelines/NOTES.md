# Pipeline notes (GitHub Actions)

The operator procedure is [deploy/README.md](../../deploy/README.md). Architecture is [design/AI-CODING-LOCAL-AND-CLOUD.md](../../design/AI-CODING-LOCAL-AND-CLOUD.md) §7.

This checkout is one git repo. Compile workflows live at `.github/workflows/`, one per application, plus `terraform.yml` for `deploy/terraform`. If the course later splits four remotes, copy the matching compile file to that repo as `.github/workflows/ci.yml` and set `working-directory` to `.`.

**No workflow deploys.** CI compiles, tests, and validates Terraform; it holds no Azure credentials. The cloud release is `terraform apply` followed by `deploy/terraform/deploy-apps.sh`, run by an operator.

Key Vault secret names created by `deploy/terraform` (values never committed): `INTERNAL-TOKEN`, `MYSQL-PASSWORD`, `JWT-SIGNING-SECRET`, and optionally `AIMANAGER-API-KEY` and `ADMIN-PASSWORD`.
