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

Frontend: [https://dealer-ops-dev.azurewebsites.net/](https://dealer-ops-dev.azurewebsites.net/)
