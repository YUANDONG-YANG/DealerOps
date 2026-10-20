# Deploy DealerOps

Install Azure CLI, Terraform, .NET 10, Node.js/npm, MySQL client, and Python 3. Sign in and select the target subscription, then run from the repository root. This creates or updates Azure resources, publishes all apps, and loads the demo data:

```bash
az login
az account set --subscription "<subscription id>"
./deploy/deploy.sh --apply --seed
```

The command prints the frontend URL when deployment succeeds.

Frontend: [https://dealer-ops-dev.azurewebsites.net/](https://dealer-ops-dev.azurewebsites.net/)
