# Deploy DealerOps

Install Azure CLI, Terraform, .NET 10, Node.js/npm, MySQL client, and Python 3. Sign in and select the target subscription, then run from the repository root. This creates or updates Azure resources, publishes all apps, and keeps the data already in Azure:

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

Accounts and data that people create on the cloud demo live only in Azure, so a normal deploy
leaves out `--seed`. Use it only to load a first database or to reset the demo on purpose.

## Before `terraform destroy`

Run this first, and do not destroy if it fails:

```bash
deploy/seed/save-cloud-to-seed.sh
```

It saves the Azure rows added, changed or removed since its last run to
`deploy/seed/backups/azure-incr-<time>.sql.gz`, then writes the rows created on the cloud to
`dealer-platform/seed/sql/09_cloud_additions.sql`. Commit that file. Rows are matched by natural key, so
none are duplicated. The next `./deploy/deploy.sh --apply --seed` publishes them. It stops if an account saved earlier is missing from
Azure, so an empty database cannot erase the saved rows; rerun it with `--allow-removal` if those
accounts were removed on purpose. Changes to rows that existed before the database was built are
not carried.

The backup files stay out of git because of their size. For an exact copy of an earlier state, join
them in order, leaving out the newest ones to go further back:

```bash
cat deploy/seed/backups/azure-incr-*.sql.gz > deploy/seed/restore.sql.gz
SEED_FILE=deploy/seed/restore.sql.gz deploy/seed/import-to-azure.sh
```

## What `--seed` publishes

`--seed` copies the local development database (`dealer_core`, the one `start-local.sh` uses) to
Azure: every dealership, logo, vehicle, photo, ad, customer, lead, work order and sign-in. Landing
page images ship inside the React build. Before the apps are uploaded it exports the local rows to
`deploy/seed/dealer_core_seed.sql.gz`; after they are up it:

1. stops if the export has a column the deployed dealer-core has not created, so deploy schema
   changes (commit and push them) before data that uses them;
2. stops if an Azure account is missing from the import, so it cannot lock anyone out; set
   `ALLOW_ACCOUNT_REMOVAL=1` to remove those accounts on purpose;
3. saves the current Azure rows to `deploy/seed/azure-backup-<time>.sql.gz`;
4. replaces every Azure row in one transaction, so a failure leaves Azure unchanged;
5. restarts dealer-core.

The export first adds `dealer-platform/seed/sql/09_cloud_additions.sql` to the local database when
that file exists, so `--seed` also publishes rows saved from the cloud demo.

Sign in on the cloud with the local accounts. Both `.sql.gz` files stay out of git. To undo a sync:

```bash
SEED_FILE=deploy/seed/azure-backup-<time>.sql.gz deploy/seed/import-to-azure.sh
```

The two steps also run on their own: `deploy/seed/export-local-data.sh`, then
`deploy/seed/import-to-azure.sh`. `deploy/seed/load-demo-sql.sh` loads only the committed
`dealer-platform/seed` into Azure and keeps existing rows.

Frontend: [https://dealer-ops-dev.azurewebsites.net/](https://dealer-ops-dev.azurewebsites.net/)
