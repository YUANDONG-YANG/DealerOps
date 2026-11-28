# Azure Deploy Verification (2026-11-01)

Question: can `./deploy/deploy.sh --apply --seed` publish all demo data and images to Azure?

Answer: not from the current Windows machine. The scripts' data path works on a POSIX shell with a populated local database, but the blockers below must be cleared first. Nothing was deployed to Azure in this check, so `terraform apply`, zip upload, Key Vault references, and pm2 are still unverified on real Azure.

No code or `design/` files were changed. This file is deliberately not linked from a tracked index, because `deploy-apps.sh --check` refuses tracked local edits.

## Status update (2026-11-01)

The user asked for all issues to be fixed. D3 to D8 are fixed in the working tree (not yet committed), and D1 and D2 are resolved on the Windows machine. `import-to-azure.sh`, `export-local-data.sh`, and `load-seed.sh` then ran unmodified with real Windows MySQL clients, with only `az` and `terraform` stubbed. Real Azure is still unverified. The table below records the original findings.

## Open issues

| ID | Severity | Where | Issue | Evidence | Smallest fix |
|---|---|---|---|---|---|
| D1 | Blocker (machine) | Operator machine | `az`, `terraform`, `mysql`, and `mysqldump` are not on `PATH`, only .NET SDK 9 is installed, and `python3` is the Microsoft Store stub. | `which`, `dotnet --list-sdks`, `python3 --version` | Install the tools from `deploy/README.md` and a real `python3`. |
| D2 | Blocker (data) | `deploy/seed/export-local-data.sh` | `--seed` copies the local `dealer_core`, but nothing listens on port 3306: Docker is stopped and the WAMP MariaDB service is stopped. Docker volumes could not be inspected. | `netstat`, `docker ps`, `Get-Service` | Start the database that holds the demo data, or rebuild it after D4 is fixed. |
| D3 | Blocker (Windows) | `deploy/seed/export-local-data.sh:35`, same `mysql -N` pattern in `import-to-azure.sh` | Windows `mysql.exe` ends lines with CRLF, so Git Bash table names carry `\r`. | `mysqldump: Couldn't find table: "app_user"`, with `$'app_user\r'` in the trace | Run from macOS, Linux, or a provisioned WSL, or strip `\r` from `mysql` output in the scripts. |
| D4 | Blocker (fresh database) | `dealer-platform/seed/sql/01_dealers_users.sql:227`, `scripts/gen_dealers_users.py` | `membership.dealer_role` has no default on a schema created by EF `EnsureCreated`, and the seed does not supply it. This breaks a rebuilt local database and `deploy/seed/load-demo-sql.sh` on fresh Azure. The script stops partway, leaving earlier rows loaded. | `ERROR 1364: Field 'dealer_role' doesn't have a default value` on MySQL 8.0.46 in strict mode | Add `dealer_role = 'staff'` to the seed's membership inserts and generator. |
| D5 | Functional | `backend/dotnet/DealerOps.Core/DealerOps.Core.csproj:21` | Only `SkiaSharp` is referenced, so the publish output has `runtimes/osx` and `runtimes/win*` but no Linux native library. Photo upload (`VehiclePhotoService.cs:76`) and enhancement (`:125`) should fail on Linux App Service. Serving stored photos does not use Skia. | Publish output inspected; not run on Linux | Add `SkiaSharp.NativeAssets.Linux.NoDependencies` at the same version. |
| D6 | Risk | `deploy/seed/import-to-azure.sh:110` | The check compares `COUNT(*) FROM dealer` with a catalog that lists only active dealers. An inactive local dealer makes the deploy exit 1 after the import has committed. Seed data has 30 of 30 active. | `PublicDealerController.cs:31` | Count `WHERE active = 1`. |
| D7 | Risk | `deploy/terraform/main.tf:338`, `InternalCallerGuard` | Core returns 404 for `/actuator/health` without `X-Dealer-Internal`, in Production, so the App Service health probe likely reports Core unhealthy. Effect on a single instance was not tested. | Core log: `Rejecting GET /actuator/health` | Exempt the health path, or remove the probe from Core. |
| D8 | Risk (demo) | `DealerOps.Gateway/Middleware/RateLimitSetup.cs` | Anonymous traffic is limited to 60 requests per minute per IP, and each logo and buyer photo counts. A full dealer directory is 31 requests, so fast browsing can produce broken images. | HTTP 429 observed after about 60 requests | Set a higher `anonymousPerMinute` for the demo if this appears. |

## Notes

- `deploy/README.md` links to `dealer-ops-dev.azurewebsites.net`, but it does not resolve, nor do the default gateway, core, Key Vault, or MySQL names. No `terraform.tfstate` exists on this machine, so the next apply creates a new stack.
- AI calls return `AI_KEY_MISSING` unless `aimanager_api_key` is set. No `terraform.tfvars` exists here.
- Seed user avatars are `randomuser.me` URLs (132 references), so they load from that site rather than Azure.
- The ten `dealer-platform/seed/images/lot_*.jpg` files are not loaded or referenced by any script or app code.
- After `--seed`, sign-ins are the local database's accounts. The Terraform-generated admin password does not apply if the local database already has that admin. The seed staff password is not in the repository.

## Validation performed

All of this ran in a temporary directory outside the repository.

| Check | Result |
|---|---|
| `terraform validate`, Terraform 1.17.1 with the committed lock file | Valid. `plan` stopped at Azure sign-in because `az` is missing. |
| `dotnet publish` of Core, AiService, Gateway on SDK 10.0.403 | All three succeed. NU1902 warning on `MySqlConnector` 2.4.0. |
| `npm ci` and `npm run build`, as `deploy-apps.sh` does | Succeeds. Gateway URL and all 9 landing images are in `dist/`. |
| `load-seed.sh` on fresh MySQL 8.0.46 | Fails per D4. Succeeds with the column default added in the scratch database and `SEED_PYTHON=python`. |
| Real `export-local-data.sh` and `import-to-azure.sh`, second MySQL as the target | Exit 0, with `az` and `terraform` stubbed and CRLF stripped to simulate a POSIX client. |
| Source and target comparison | Same row counts, and CRC32 sums match for photos, logos, audit rows, and users. |
| Through a local gateway | 30 of 30 logos return `image/png`. 6 of 6 buyer photos sampled from 12 dealers return valid JPEG. Admin login returns 200. |

Loaded data: 30 dealers with logos, 120 vehicles, 217 photos covering all 120 vehicles (44 enhanced, 71 MB originals, 17 MB enhanced), 120 customers, 120 listings, 86 leads, 295 work orders, 2097 audit events. The seed file is 104 MB compressed.
