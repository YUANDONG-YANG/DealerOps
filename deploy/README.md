# Deploy DealerOps

Install Azure CLI, Terraform, .NET 10, Node.js/npm, MySQL client, and Python 3. Sign in and select the target subscription, then run from the repository root. This creates or updates Azure resources, publishes all apps, and loads the demo data:

```bash
az login
az account set --subscription "<subscription id>"
./deploy/deploy.sh --apply --seed
```

The command prints the frontend URL when deployment succeeds.

Before publishing, the app deployment script fetches the current branch's upstream and requires
the checkout to match it exactly. It also refuses tracked local edits and untracked files under
`backend/dotnet` or `frontend/react`, so all apps are built from the same pushed commit. Push
intended changes first, then rerun the deployment command.

## What `--seed` publishes

`--seed` copies the local development database (`dealer_core`, the one `start-local.sh` uses) to
Azure: every dealership, logo, vehicle, photo, ad, customer, lead, work order and sign-in. Landing
page images ship inside the React build. Before the apps are uploaded it exports the local rows to
`deploy/seed/dealer_core_seed.sql.gz`; after they are up it:

1. stops if the export has a column the deployed dealer-core has not created, so deploy schema
   changes (commit and push them) before data that uses them;
2. saves the current Azure rows to `deploy/seed/azure-backup-<time>.sql.gz`;
3. replaces every Azure row in one transaction, so a failure leaves Azure unchanged;
4. restarts dealer-core.

Sign in on the cloud with the local accounts. Both `.sql.gz` files stay out of git. To undo a sync:

```bash
SEED_FILE=deploy/seed/azure-backup-<time>.sql.gz deploy/seed/import-to-azure.sh
```

The two steps also run on their own: `deploy/seed/export-local-data.sh`, then
`deploy/seed/import-to-azure.sh`. `deploy/seed/load-demo-sql.sh` loads only the committed
`dealer-platform/seed` into Azure and keeps existing rows.

Frontend: [https://dealer-ops-dev.azurewebsites.net/](https://dealer-ops-dev.azurewebsites.net/)
