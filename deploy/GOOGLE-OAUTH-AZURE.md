# DealerOps Google OAuth and Azure Deployment Record

Last updated: 2026-10-15

This document records the real Google OAuth Client configured for "Sign in with Google" in the current DealerOps project, and how it relates to the Azure App Service deployment architecture. It records only the Client ID, which is safe to expose in the frontend, and does not record the Client Secret.

## 1. Current project architecture

DealerOps cloud deployment uses Terraform + Azure App Service and does not use containers:

```text
Browser
  │
  ├─ Local Vue:   http://localhost:5173
  ├─ Local React: http://localhost:5174
  └─ Azure:       https://dealer-ops-dev.azurewebsites.net
                    │
                    └─ React SPA (Vite build, hosted by Node 20 + pm2)
                         │
                         └─ dealerops-gateway (the only public API entry point)
                              ├─ dealerops-core
                              └─ dealerops-ai
```

Google sign-in happens in the React browser client:

1. React loads Google Identity Services (`https://accounts.google.com/gsi/client`).
2. Google generates an ID token in the browser.
3. The frontend sends the ID token to the backend Google sign-in endpoint.
4. The backend verifies the token and establishes DealerOps' own login session.

Therefore, this project uses the browser mode of Google Identity Services, which requires configuring **Authorized JavaScript origins**. The current code does not use the Google OAuth server-side redirect flow, so no Authorized redirect URI needs to be configured.

Related code:

- `frontend/react/src/auth/google.ts`
- `frontend/react/src/pages/LoginPage.tsx`
- `frontend/react/src/auth/login.ts`

## 2. Google Cloud OAuth configuration

Google Cloud project:

- Project name: `My First Project`
- Project ID: `plasma-crossbar-443700-j7`
- OAuth app name: `DealerOps`
- OAuth Client name: `DealerOps Web`
- Application type: `Web application`
- OAuth status: `Enabled`

Real Client ID:

```text
660111025309-k8qneu1ifuhgtptb3onimtq988bb1pku.apps.googleusercontent.com
```

The Client ID is public frontend configuration and may appear in the Vite build output. It is not a password.

Currently configured Authorized JavaScript origins:

```text
http://localhost:5173
http://localhost:5174
https://dealer-ops-dev.azurewebsites.net
```

Note: an origin contains only the scheme, host, and port. Do not append a path. For example:

```text
Correct: https://dealer-ops-dev.azurewebsites.net
Wrong:   https://dealer-ops-dev.azurewebsites.net/login
Wrong:   https://dealer-ops-dev.azurewebsites.net/
```

Google Cloud management console:

```text
https://console.cloud.google.com/auth/clients?project=plasma-crossbar-443700-j7
```

## 3. Local development configuration

The local Client ID has been written to:

```text
frontend/react/.env.local
```

Its content is:

```dotenv
VITE_GOOGLE_CLIENT_ID=660111025309-k8qneu1ifuhgtptb3onimtq988bb1pku.apps.googleusercontent.com
```

`.env.local` is ignored by the repository's `.gitignore` and must not be committed to Git. To run the React frontend on another development machine, create this file yourself, or set the environment variable with the same name before starting or building.

## 4. Azure build and release configuration

### Boundary between Terraform and Google OAuth

Terraform currently manages the Azure infrastructure and does not create the Google OAuth Client directly. This is by design because:

- Azure resources belong to the Azure subscription and are managed by the `azurerm` provider;
- The OAuth Client belongs to the Google Cloud project and is managed in the Google Cloud Console;
- The Google OAuth Client ID is public frontend configuration, not an Azure Key Vault secret;
- Running `terraform apply` does not create a duplicate OAuth Client and does not rotate the Client Secret;
- After Terraform creates or confirms the Azure Web App domain, the release script compiles the same Client ID into the React SPA.

Recommended full sequence:

```bash
cd "$(git rev-parse --show-toplevel)"

# 1. Create or update Azure resources, and release all services
./deploy/deploy.sh --apply

# 2. Show the frontend URL that Terraform actually assigned
terraform output -raw web_public_url

# 3. To re-release only the React SPA (Terraform already applied), run:
./deploy/deploy.sh web
```

With the default `web_app_name = "dealer-ops-dev"`, the frontend URL output by Terraform should be:

```text
https://dealer-ops-dev.azurewebsites.net
```

If you change the Azure frontend domain through `name_suffix` or `web_app_name`, you must also add the new origin to the Google OAuth Client; Terraform does not automatically change the OAuth configuration in Google Cloud.

The Azure release script is:

```text
deploy/terraform/deploy-apps.sh
```

When releasing the `web` target, the script runs the React build and injects:

```bash
VITE_GATEWAY_URL="${gateway_url}" \
VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-660111025309-k8qneu1ifuhgtptb3onimtq988bb1pku.apps.googleusercontent.com}" \
VITE_PUBLISHED_AT="${published_at}" \
  npm run build
```

This means:

- The current DealerOps Client ID is used by default;
- The release operator can also override `VITE_GOOGLE_CLIENT_ID` with an external environment variable;
- The Client ID is written into the React static assets at build time;
- The Client Secret does not need to be placed in Azure App Service, Key Vault, frontend files, or the Git repository;
- `VITE_GATEWAY_URL` is still determined by the Terraform output; the Google Client ID and the backend gateway URL are two independent settings.

Standard release flow:

```bash
cd "$(git rev-parse --show-toplevel)/deploy/terraform"

# If the infrastructure has not been created yet
terraform init
terraform apply -auto-approve

# Release all services and the React frontend
./deploy-apps.sh

# Re-release only the frontend
./deploy/deploy.sh web
```

After the release completes, the frontend URL comes from:

```bash
terraform output -raw web_public_url
```

With the current default configuration, it should be:

```text
https://dealer-ops-dev.azurewebsites.net
```

## 5. OAuth testing mode and user management

The OAuth consent screen is currently External / Testing mode. Google accounts used to sign in must be added to the Test users list of the OAuth consent screen; otherwise, non-test accounts may see "Google hasn't verified this app" or be unable to continue the authorization.

Management path:

```text
Google Auth Platform → Audience → Test users
```

Before moving to production use, confirm that:

1. The app name and support email are correct.
2. The test users in the OAuth consent screen cover the actual test accounts.
3. If the app targets a large number of external users, evaluate whether to publish the app and complete Google verification.
4. Only the Google scopes the project actually needs are requested; Google sign-in should currently use only the minimum scopes required for identity.

## 6. Custom domain

If a custom domain is bound to the Azure Web App later, for example:

```text
https://dealerops.example.com
```

you must add that origin to the Authorized JavaScript origins of the same OAuth Client in Google Cloud:

```text
https://dealerops.example.com
```

Also confirm that:

- The Azure Web App HTTPS certificate and binding are in effect;
- The origin the browser actually visits exactly matches the origin configured in Google Cloud;
- The backend CORS setting `CORS_ALLOWED_ORIGIN` is also changed to the production frontend domain;
- If the Azure default domain and local development are kept, the old origins can remain.

Do not put URLs with paths into Authorized JavaScript origins.

## 7. Troubleshooting

### 7.1 `origin_mismatch`

The cause is usually that the current browser address is not in Authorized JavaScript origins. Check:

```text
Scheme + host + port in the browser address bar
```

Compare it character by character with the Google Cloud configuration. Common differences include:

- `http` versus `https`;
- `localhost` versus `127.0.0.1`;
- A different port;
- A custom domain is in use but has not been added yet;
- The origin incorrectly includes `/login` or another path.

### 7.2 Google sign-in button does not appear

Confirm that the following is present during the React build:

```text
VITE_GOOGLE_CLIENT_ID
```

You can check the local file:

```bash
grep '^VITE_GOOGLE_CLIENT_ID=' frontend/react/.env.local
```

For Azure releases, confirm that the updated `deploy/terraform/deploy-apps.sh` is being used, and run again:

```bash
./deploy-apps.sh web
```

Vite environment variables are injected at build time; changing only the Azure App Service runtime environment variables does not change the static JS files that have already been generated.

### 7.3 Backend rejects the token after sign-in

This is usually not a Google origin problem. Check that:

- The Google Client ID used by the backend matches the frontend;
- The Gateway URL points to the current Azure gateway;
- The backend Google token verification endpoint has been deployed;
- The user has been activated by an administrator in DealerOps or linked to the corresponding dealership;
- In the browser Network tab, the request is sent to the Gateway rather than to core or ai-service.

### 7.4 Azure page still shows the old frontend

Rebuild and upload the React SPA:

```bash
cd "$(git rev-parse --show-toplevel)/deploy/terraform"
./deploy-apps.sh web
```

Then clear the browser cache or verify in a private window. In Azure App Service, React is a static build output; after changing the source code or `.env.local`, you must run `npm run build` again and upload `dist`.

## 8. Security notes

- The Client ID can be public; it must be sent to Google with the frontend application.
- The Client Secret must not be committed to Git, written into React, uploaded inside `.env.local`, written into chat logs, or placed in any browser-accessible configuration.
- This project's Google Identity Services browser sign-in needs only the Client ID; do not add the Client Secret to `VITE_*` variables for frontend sign-in.
- If a server-side OAuth authorization-code flow is adopted in the future, the Client Secret should be stored in Azure Key Vault and read by the backend through a managed identity.
- If you suspect the Client Secret has leaked, rotate the Secret for that OAuth Client in Google Cloud and update all backend secure storage accordingly; do not delete the entire Client ID unless you are sure that all deployed frontends must be invalidated immediately.

## 9. Change summary

Work completed in this configuration:

1. Created the Google OAuth consent / branding configuration with the app name `DealerOps`.
2. Created a real OAuth Client of type Web application named `DealerOps Web`.
3. Configured the local origin: `http://localhost:5173`.
4. Configured the Azure origin: `https://dealer-ops-dev.azurewebsites.net`.
5. Wrote the Client ID to the local `frontend/react/.env.local`.
6. Updated `deploy/terraform/deploy-apps.sh` so that the Azure React build injects `VITE_GOOGLE_CLIENT_ID`.
7. Verified the release script syntax with `bash -n`.

