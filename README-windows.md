
1. Install prerequisites

powershell
winget install Microsoft.DotNet.SDK.10
winget install OpenJS.NodeJS.LTS
winget install Oracle.MySQL    # or use the MySQL Installer and pick MySQL 8.4 Server
winget install Git.Git

Reopen your terminal afterward, then verify with dotnet --version, node -v, and mysql --version.

2. Create the database

Open a MySQL shell (mysql -u root -p) and run the following. The exact database name, user and password are set in start-local.sh, so use whatever it uses (the README says database dealer_core, user dealer):

sql
CREATE DATABASE dealer_core;
CREATE USER 'dealer'@'localhost' IDENTIFIED BY '<password from start-local.sh>';
GRANT ALL ON dealer_core.* TO 'dealer'@'localhost';

Core creates the tables itself on first start, so there are no migrations.

3. Set environment variables

This is the fiddly part. The README says start-local.sh is the reference for them, so open it and copy every export X=... line. At minimum you’ll need things like the DB connection, a shared JWT secret (identical for Core and Gateway, or you’ll get 401s everywhere), INTERNAL_TOKEN, ADMIN_USERNAME / ADMIN_PASSWORD, and optionally AIMANAGER_API_KEY. dealer-platform/env.example also lists them. In PowerShell, each becomes:

powershell
$env:INTERNAL_TOKEN = "dev-internal-token"

These only last for that terminal window, so set them in each terminal for the services that need them.


After installing everything use the opened powershell and run:
powershell -ExecutionPolicy Bypass -File .\start-local.ps1
   


What it does, matching the bash script

Creates dealer-platform\.env.local from env.example on first run and loads it.
Replaces the JDBC URL with the ADO.NET string Server=127.0.0.1;...;User=dealer;Password=dealer_dev_only.
Sets the same environment variables: JWT_MODE=dev, DEV_JWT_SECRET, INTERNAL_TOKEN, CORS_ALLOWED_ORIGIN and the rest. Core and Gateway share the JWT secret, so you won’t get the 401 problem.
Starts Core, AI Service, Gateway and the React dev server, writing logs to log-sum\ (<name>.log, plus <name>.err.log for errors).
Waits for the health checks, sending the X-Dealer-Internal header to Core and AI Service but not to the Gateway.

Differences from the bash version

MySQL root password: the bash script assumes root has no password, which is the Homebrew default. The Windows MySQL installer makes you set one, so the script asks for it.
Starting MySQL: instead of brew services, it tries to start a Windows service named MySQL84, MySQL80 or MySQL. If that fails, start it from services.msc or run PowerShell as Administrator once.
Stopping: it uses taskkill /T so the child processes that dotnet run and npm spawn are stopped too.

Notes

The bash script’s error message mentions “.NET SDK 8”, but the README says .NET 10. Use whatever the .csproj files target; dotnet --version should be 10.x.
If you see “running scripts is disabled”, the -ExecutionPolicy Bypass flag above already handles it.
The lafe demo user only exists in the shared dev database. On your fresh local DB, log in as admin, or load the demo data with dealer-platform/seed/README.md.
If a service doesn’t come up, check log-sum\dealer-core.err.log first.