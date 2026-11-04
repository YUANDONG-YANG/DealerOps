# Dealer Ops: Local Development Startup (Windows)

This is the Windows version of the "Local development startup" section of the main README. The architecture, ports, credentials and run-configuration values are identical; only the install steps, shell commands and troubleshooting changed.

```text
Browser ──> dealer-web (5173) ──> dealer-gateway (8080) ──> dealer-core (8081) ──> MySQL (3306)
                                                                  └──> ai-service (8082) ──> LLM provider
```

You will end up with five programs running at the same time, started **in this order**. Wait for each one to be healthy before starting the next:

```text
MySQL → dealer-core → ai-service → dealer-gateway → dealer-web
```

**Words used below**

| Word | Meaning |
|---|---|
| PowerShell | The command-line app. Press the Windows key, type `PowerShell`, press Enter. Type a command, press Enter, and wait until the prompt comes back. All commands below are for **PowerShell**, not the old Command Prompt |
| Admin PowerShell | Same thing, but right-click it and choose **Run as administrator**. Only needed where stated |
| Repository root | The `DealerOps` folder you clone in Step 0. "Run from the repository root" means first `cd` into that folder |
| Run configuration | A saved "how to start this program" entry in IntelliJ |
| Readiness URL | A web address that shows `{"status":"UP"}` when a service has started correctly |

## Step 0. Install the tools and get the code

1. **Install the tools.** Open PowerShell and run these (each installs from the official source; accept any prompts):

   ```powershell
   winget install --id Microsoft.OpenJDK.21 -e
   winget install --id OpenJS.NodeJS.LTS -e
   winget install --id Git.Git -e
   winget install --id JetBrains.IntelliJIDEA.Community -e
   ```

   Close and reopen PowerShell afterwards so the new programs are found.

   If `winget` is not available, install each tool from its website instead: Microsoft Build of OpenJDK 21 (or Eclipse Temurin 21), Node.js LTS (v20 or newer), Git for Windows, and IntelliJ IDEA from https://www.jetbrains.com/idea/download/ (Community is free; students can get Ultimate free with a school email).

2. **Install MySQL 8.4.** Download **MySQL Installer** from https://dev.mysql.com/downloads/installer/ and choose **Custom**, then select **MySQL Server 8.4.x** (LTS) and **MySQL Shell/Command line client** if listed. During configuration:
   - Keep the port at `3306`.
   - Set a root password and remember it (Windows MySQL does not allow an empty one).
   - Keep "Start the MySQL Server at System Startup" ticked, so you won't have to start it by hand on later days.

3. **Install Maven (only needed if you want to run from the terminal).** If you will use IntelliJ for everything, skip this: IntelliJ has Maven built in. Otherwise, download the **Binary zip** from https://maven.apache.org/download.cgi, extract it to `C:\Tools\apache-maven-3.9.x`, and add its `bin` folder to your `Path` (see the next step for how).

4. **Set `JAVA_HOME` and `Path`.**
   1. Press the Windows key, type **Environment Variables**, and open **Edit the system environment variables → Environment Variables…**.
   2. Under **User variables**, click **New…**: name `JAVA_HOME`, value = your JDK 21 folder (for the winget install this is usually `C:\Program Files\Microsoft\jdk-21.x.x-hotspot`; check in File Explorer for the exact name).
   3. Select **Path → Edit → New** and add each of these if it is not already there:
      - `%JAVA_HOME%\bin`
      - `C:\Program Files\MySQL\MySQL Server 8.4\bin`
      - `C:\Tools\apache-maven-3.9.x\bin` (only if you installed Maven in step 3)
   4. Click OK on every window, then **close and reopen PowerShell**.

5. **Check everything.** Each command must print a version; if one says "not recognized", redo the step above:

   | Command | Must show |
   |---|---|
   | `java -version` | `21` (not 25) |
   | `mvn -v` | `3.9` or newer, and `Java version: 21` (skip if you skipped Maven) |
   | `node -v` | `v20` or newer |
   | `mysql --version` | `8.4` |
   | `git --version` | any version |

6. **Get the code.** The repository is private: ask the project owner to add your GitHub account first. Then:

   ```powershell
   mkdir $HOME\IdeaProjects
   cd $HOME\IdeaProjects
   git clone https://github.com/YUANDONG-YANG/DealerOps.git
   cd DealerOps
   ```

   If Git asks for a password, use a GitHub personal access token, not your GitHub password. `C:\Users\<you>\IdeaProjects\DealerOps` is now your repository root.

## Step 1. Check MySQL is running and create the database

MySQL Installer registers MySQL as a Windows service that starts automatically. To confirm, run:

```powershell
Get-Service MySQL*
```

The status should be `Running`. If it says `Stopped`, start it from an **Admin PowerShell** (use the service name shown in the list; it is usually `MySQL84`):

```powershell
net start MySQL84
```

Then open the MySQL prompt (it asks for the root password you set in Step 0.2):

```powershell
mysql -u root -p
```

At the `mysql>` prompt, paste all of these lines at once and press Enter (one-time setup):

```sql
CREATE DATABASE IF NOT EXISTS dealer_core CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER IF NOT EXISTS 'dealer'@'localhost' IDENTIFIED BY 'dealer_dev_only';
CREATE USER IF NOT EXISTS 'dealer'@'127.0.0.1' IDENTIFIED BY 'dealer_dev_only';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'localhost';
GRANT ALL PRIVILEGES ON dealer_core.* TO 'dealer'@'127.0.0.1';
FLUSH PRIVILEGES;
exit;
```

You are back at the normal PowerShell prompt. Check that the app user works:

```powershell
mysql -h 127.0.0.1 -P 3306 -u dealer -pdealer_dev_only dealer_core -e "SELECT 1"
```

It must print a small table containing `1`. A password warning above it is normal.

Tables are created automatically by Flyway when `dealer-core` starts.

## Step 2. Get an AI model key (optional)

`ai-service` carries the `ai-manager` library as vendored source, so there is nothing extra to clone or install. You can skip this step: without a key, everything starts and works except the AI features (ad check AI review and assistant answers), which fail with `AI_KEY_MISSING`.

To enable AI, get a free Groq key: sign up at https://console.groq.com, open **API Keys**, click **Create API Key**, and copy the key (it starts with `gsk_`). You paste it in Step 3. Never commit it or share it in chat. Other providers: `ai-service/README.md`.

## Step 3. Create the IntelliJ run configurations

1. **Open the project.** In IntelliJ choose **File → Open…**, select the `DealerOps` folder (the repository root, not a subfolder), and click **Trust Project** if asked. A progress bar at the bottom right shows the Maven import; wait until it disappears (the first time can take several minutes while it downloads libraries).
2. **Select JDK 21.** Open **File → Project Structure → Project → SDK**. If no `21` entry is listed, choose **Add SDK → Add JDK…** and pick your JDK 21 folder (the same one you used for `JAVA_HOME`, for example `C:\Program Files\Microsoft\jdk-21.x.x-hotspot`). Then open **File → Settings → Build, Execution, Deployment → Build Tools → Maven → Importing** and set **JDK for importer** to the same JDK 21.
3. **Create the three run configurations.** For each row in the table below:
   1. Choose **Run → Edit Configurations…**, click **+**, and pick **Spring Boot** (IntelliJ Community has no Spring Boot entry; pick **Application** instead).
   2. Type the **Name** from the table. Set the JDK drop-down to 21, the module drop-down (labelled `-cp`) to the **Module**, and **Main class** to the class from the table.
   3. If there is no **Environment variables** box, click **Modify options → Environment variables** to show it. Paste that service's line from below into it.
   4. Click **Apply**, then add the next one. Click **OK** when all three exist.

| Name | Module | Main class |
|---|---|---|
| `dealer-core-local` | `dealer-core` | `com.dealerops.core.DealerCoreApplication` |
| `ai-service-local` | `ai-service` | `ca.sait.dealerops.aiservice.AiServiceApplication` |
| `dealer-gateway-local` | `dealer-gateway` | `ca.sait.dealerops.gateway.GatewayApplication` |

**dealer-core-local**

```text
CORE_PORT=8081;SERVER_ADDRESS=127.0.0.1;LOG_DIR=$PROJECT_DIR$/log-sum;MYSQL_URL=jdbc:mysql://127.0.0.1:3306/dealer_core?useSSL=false&allowPublicKeyRetrieval=true;MYSQL_USER=dealer;MYSQL_PASSWORD=dealer_dev_only;GATEWAY_PUBLIC_URL=http://localhost:8080;AI_BASE_URL=http://127.0.0.1:8082;INTERNAL_TOKEN=dealer-internal;JWT_MODE=dev;DEV_JWT_SECRET=dealer-dev-jwt-secret-change-me;ADMIN_USERNAME=admin;ADMIN_PASSWORD=admin123;ADMIN_EMAIL=admin@example.com
```

**ai-service-local** (put your key after `AIMANAGER_API_KEY=`)

```text
AI_PORT=8082;SERVER_ADDRESS=127.0.0.1;LOG_DIR=$PROJECT_DIR$/log-sum;SPRING_APPLICATION_NAME=ai-service;SPRING_PROFILES_ACTIVE=dev;INTERNAL_TOKEN=dealer-internal;AIMANAGER_API_KEY=;AIMANAGER_GATEWAY_PROVIDER=groq;AIMANAGER_GATEWAY_MODEL=qwen/qwen3.8-27b;AIMANAGER_GATEWAY_MAX_TOKENS=800
```

**dealer-gateway-local**

```text
GATEWAY_PORT=8080;CORE_URL=http://127.0.0.1:8081;AI_URL=http://127.0.0.1:8082;LOG_DIR=$PROJECT_DIR$/log-sum;SPRING_PROFILES_ACTIVE=dev;INTERNAL_TOKEN=dealer-internal;CORS_ALLOWED_ORIGIN=http://localhost:5173;JWT_MODE=dev;DEV_JWT_SECRET=dealer-dev-jwt-secret-change-me
```

These are local-only values. Never reuse them in the cloud, and never commit API keys. Reference list: `dealer-platform/env.example`.

## Step 4. Start the three Java services

For each service, in the order below:

1. Clean it: delete **that service's own** `target` folder, or in the **Maven** tool window expand the module and double-click **Lifecycle → clean**.
2. Choose its run configuration in the drop-down at the top right of IntelliJ and click the green **Run** (▶) button. A Run tab opens at the bottom with log output. It has started when you see a line like `Started DealerCoreApplication in ... seconds`. Do not close the tab; closing or stopping (■) it stops the service.
3. Open its readiness URL in a web browser. Move on only when the page shows `{"status":"UP"}`. If it does not, scroll the Run tab for the first `ERROR` line and check [Troubleshooting](#troubleshooting).

| Order | Run | Wait for |
|---|---|---|
| 1 | `dealer-core-local` | http://127.0.0.1:8081/actuator/health/readiness |
| 2 | `ai-service-local` | http://127.0.0.1:8082/actuator/health/readiness |
| 3 | `dealer-gateway-local` | http://127.0.0.1:8080/actuator/health/readiness |

### Alternative: without IntelliJ (PowerShell)

Requires Maven (Step 0.3). Run each block in its **own** PowerShell window, from the repository root, in the order above. Wait for each readiness URL before starting the next. `JWT_MODE=dev` must be set explicitly on core and gateway: they refuse to start when it comes only from the config default. Leave `AIMANAGER_API_KEY` empty if you have no key. Stop a service with `Ctrl+C`.

**dealer-core**

```powershell
cd dealer-core
$env:SERVER_ADDRESS = "127.0.0.1"
$env:LOG_DIR = "..\log-sum"
$env:JWT_MODE = "dev"
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "admin123"
$env:ADMIN_EMAIL = "admin@example.com"
mvn clean spring-boot:run
```

**ai-service**

```powershell
cd ai-service
$env:SERVER_ADDRESS = "127.0.0.1"
$env:LOG_DIR = "..\log-sum"
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:AIMANAGER_API_KEY = "<your key>"
mvn clean spring-boot:run
```

**dealer-gateway**

```powershell
cd dealer-gateway
$env:LOG_DIR = "..\log-sum"
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:JWT_MODE = "dev"
mvn clean spring-boot:run
```

These variables only last for that PowerShell window, which is what you want.

## Step 5. Start the frontend

Only after the gateway is `UP`, open IntelliJ's terminal (**View → Tool Windows → Terminal**). It opens at the repository root. Run:

```powershell
cd dealer-web
Copy-Item .env.example .env    # first time only
npm ci                         # first time, or after package.json changes
npm run dev
```

When it prints `Local: http://localhost:5173/`, open that address in the browser. Leave this terminal running; `Ctrl+C` stops the frontend.

If PowerShell says "running scripts is disabled on this system" when you run `npm`, run this once and retry:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Step 6. Sign in

| Account | Login | Password | Lands on |
|---|---|---|---|
| Platform admin | `admin` or `admin@example.com` | `admin123` | `/admin` |

There is no demo business data. As admin, create a dealership on `/admin`, then use **Bind staff** to create a staff account (username, email and/or phone, temporary password of at least 8 characters). Sign out and sign in as that staff user to reach `/dms`. Self-registered accounts land on `/no-access` until the admin binds them under **Admin → Members → Pending accounts**.

The admin is seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD` only on the first start; changing them later does not change an existing password.

## Next time

Steps 0–3 are one-time setup. On later days:

1. Make sure MySQL is running (`Get-Service MySQL*`; it normally starts with Windows).
2. In IntelliJ, run `dealer-core-local`, `ai-service-local`, then `dealer-gateway-local`, waiting for each readiness URL.
3. In the IntelliJ terminal: `cd dealer-web` then `npm run dev`.

To stop, press `Ctrl+C` in the frontend terminal, then click Stop (■) on the gateway, ai-service, and core Run tabs.

## Useful URLs

| What | URL |
|---|---|
| Web app | http://localhost:5173/ |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |
| Logs | `log-sum\<service>-<date>.log` |

## Troubleshooting

| Symptom | Fix |
|---|---|
| core fails with a database or Flyway error | MySQL is not running, or Step 1 was skipped; re-run the `SELECT 1` check. Databases created before 2026-10-07 need the Flyway repair in `design/15-Data-Auth-and-Gateway.md` §8.3 |
| Compile errors such as `invalid target release` | The run configuration or terminal is not using JDK 21. Check `JAVA_HOME` and the JDK drop-down in the run configuration |
| Ad check returns `AI_UNAVAILABLE` / `AI_KEY_MISSING` | Set `AIMANAGER_API_KEY` on ai-service and restart it |
| Login works but every API call returns 401 | `DEV_JWT_SECRET` differs between core and gateway |
| Browser shows CORS errors | Open the app at `http://localhost:5173`, not `127.0.0.1:5173` |
| `Port 8080 (or 8081, 8082, 5173) was already in use` | That service is already running in another tab or window. Stop the old one first, or find it with `netstat -ano \| findstr :8080`, then end it with `taskkill /PID <pid> /F` (the PID is the last column) |
| `mysql` / `java` / `node` / `mvn` "is not recognized" | The program is not on your `Path`. Redo Step 0.4 and **reopen PowerShell** |
| `net start MySQL84` says the service name is invalid | Run `Get-Service MySQL*` and use the exact name it shows |
| `mysql -u root -p` says access denied | Wrong root password. Use the one you set in the MySQL Installer |
| IntelliJ shows red code everywhere | The Maven import has not finished, or the project SDK is not 21. Wait, then open the **Maven** tool window and click **Reload All Maven Projects** (⟳) |
| `npm ci` fails | Check `node -v` is 20 or newer, then retry |
| Anything else | Check the `log-sum` folder first (`design/20-Observability.md`) |
