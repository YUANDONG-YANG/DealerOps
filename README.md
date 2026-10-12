# Dealer Ops

Multi-tenant back office for independent used-car dealers: DMS (vehicles), CRM (customers and leads), and OMVIC ad compliance with a real AI review. A platform admin opens dealerships and binds staff; staff only see their own dealership.

Private GitHub: [YUANDONG-YANG/DealerOps](https://github.com/YUANDONG-YANG/DealerOps).

## Architecture at a glance

```text
Browser ──> dealer-web (5173) ──> dealer-gateway (8080) ──> dealer-core (8081) ──> MySQL (3306)
                                                                  └──> ai-service (8082) ──> LLM provider
```

| Folder | What it is |
|---|---|
| `dealer-web/` | Vue 3 + Element Plus frontend (Vite) |
| `dealer-gateway/` | Spring Cloud Gateway: the only API entry for the browser (`/api/v1/**`), validates JWT |
| `dealer-core/` | Spring Boot + Flyway + MySQL: all business APIs, login, and admin |
| `ai-service/` | Internal AI adapter around the vendored `ai-manager` sources; no database |
| `dealer-platform/` | `openapi.yaml`, `API.md`, `env.example` |
| `deploy/` | Terraform + Azure deployment ([deploy/README.md](deploy/README.md)) |
| `design/` | Design documents, the source of truth ([design/README.md](design/README.md)) |

The browser only talks to the gateway on `8080`. Core (`8081`) and ai-service (`8082`) listen on `127.0.0.1` and must not be called from the browser. Everything runs as plain processes; there are no containers.

## Local development startup

These steps are written for macOS and assume no prior setup. Follow them top to bottom and do not skip a check. On Windows, install the same tool versions from their official installers instead of Homebrew (Step 0) and set `JAVA_HOME` to the JDK 21 folder in System Environment Variables; Steps 1–6 in IntelliJ are the same.

You will end up with five programs running at the same time, started **in this order**. Wait for each one to be healthy before starting the next:

```text
MySQL → dealer-core → ai-service → dealer-gateway → dealer-web
```

**Words used below**

| Word | Meaning |
|---|---|
| Terminal | The command-line app. On macOS press `Cmd+Space`, type `Terminal`, press Enter. Type a command, press Enter, and wait until the prompt comes back |
| Repository root | The `DealerOps` folder you clone in Step 0. "Run from the repository root" means first run `cd` into that folder |
| Run configuration | A saved "how to start this program" entry in IntelliJ |
| Readiness URL | A web address that shows `{"status":"UP"}` when a service has started correctly |

### Step 0. Install the tools and get the code

1. **Install Homebrew** (the macOS package installer). Paste this into Terminal and follow the prompts (it asks for your Mac password; nothing appears as you type it, which is normal):

   ```text
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

   When it finishes, it prints two or three `echo ... eval ...` lines under **Next steps**. Copy and run them, then close and reopen Terminal.

2. **Install the tools**:

   ```text
   brew install openjdk@21 maven node mysql@8.4 git
   brew link --force mysql@8.4
   sudo ln -sfn "$(brew --prefix)/opt/openjdk@21/libexec/openjdk.jdk" /Library/Java/JavaVirtualMachines/openjdk-21.jdk
   ```

3. **Install IntelliJ IDEA** from https://www.jetbrains.com/idea/download/ (Community edition is free; students can get Ultimate free with a school email).

4. **Point Terminal at JDK 21.** Run this once so every new Terminal window uses JDK 21:

   ```text
   echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
   source ~/.zshrc
   ```

5. **Check everything.** Each command must print a version; if one says `command not found`, redo the step above:

   | Command | Must show |
   |---|---|
   | `java -version` | `21` (not 25) |
   | `mvn -v` | `3.9` or newer, and `Java version: 21` |
   | `node -v` | `v20` or newer |
   | `mysql --version` | `8.4` |
   | `git --version` | any version |

6. **Get the code.** The repository is private: ask the project owner to add your GitHub account first. Then:

   ```text
   mkdir -p ~/IdeaProjects && cd ~/IdeaProjects
   git clone https://github.com/YUANDONG-YANG/DealerOps.git
   cd DealerOps
   ```

   If Git asks for a password, use a GitHub personal access token, not your GitHub password. `~/IdeaProjects/DealerOps` is now your repository root.

### Step 1. Start MySQL and create the database

```text
brew services start mysql@8.4
mysql -u root
```

Wait about ten seconds after the first line. The second line opens the MySQL prompt, which looks like `mysql>`. A fresh Homebrew MySQL has no root password; if yours has one, use `mysql -u root -p` and type it.

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

You are back at the normal Terminal prompt. Check that the app user works:

```text
mysql -h 127.0.0.1 -P 3306 -u dealer -pdealer_dev_only dealer_core -e "SELECT 1"
```

It must print a small table containing `1`. A password warning above it is normal.

Tables are created automatically by Flyway when `dealer-core` starts.

### Step 2. Get an AI model key (optional)

`ai-service` carries the `ai-manager` library as vendored source, so there is nothing extra to clone or install. You can skip this step: without a key, everything starts and works except the AI features (ad check AI review and assistant answers), which fail with `AI_KEY_MISSING`.

To enable AI, get a free Groq key: sign up at https://console.groq.com, open **API Keys**, click **Create API Key**, and copy the key (it starts with `gsk_`). You paste it in Step 3. Never commit it or share it in chat. Other providers: [ai-service/README.md](ai-service/README.md).

### Step 3. Create the IntelliJ run configurations

1. **Open the project.** In IntelliJ choose **File → Open…**, select the `DealerOps` folder (the repository root, not a subfolder), and click **Trust Project** if asked. A progress bar at the bottom right shows the Maven import; wait until it disappears (the first time can take several minutes while it downloads libraries).
2. **Select JDK 21.** Open **File → Project Structure → Project → SDK**. If no `21` entry is listed, choose **Add SDK → JDK…** and pick `/Library/Java/JavaVirtualMachines/openjdk-21.jdk`. Then open **Settings → Build, Execution, Deployment → Build Tools → Maven → Importing** and set **JDK for importer** to the same JDK 21.
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

These are local-only values. Never reuse them in the cloud, and never commit API keys. Reference list: [dealer-platform/env.example](dealer-platform/env.example).

### Step 4. Start the three Java services

For each service, in the order below:

1. Clean it: delete **that service's own** `target/` folder, or in the **Maven** tool window expand the module and double-click **Lifecycle → clean**.
2. Choose its run configuration in the drop-down at the top right of IntelliJ and click the green **Run** (▶) button. A Run tab opens at the bottom with log output. It has started when you see a line like `Started DealerCoreApplication in ... seconds`. Do not close the tab; closing or stopping (■) it stops the service.
3. Open its readiness URL in a web browser. Move on only when the page shows `{"status":"UP"}`. If it does not, scroll the Run tab for the first `ERROR` line and check [Troubleshooting](#troubleshooting).

| Order | Run | Wait for |
|---|---|---|
| 1 | `dealer-core-local` | http://127.0.0.1:8081/actuator/health/readiness |
| 2 | `ai-service-local` | http://127.0.0.1:8082/actuator/health/readiness |
| 3 | `dealer-gateway-local` | http://127.0.0.1:8080/actuator/health/readiness |

<details>
<summary>Without IntelliJ (terminal, macOS/Linux)</summary>

Run each line in its own terminal from the repository root, in the order above. The checked-in application config files (`application.yml` / `application.yaml`) already default to the local values; only these overrides are needed. `JWT_MODE=dev` must be set explicitly on core and gateway: they refuse to start when it comes only from the config default. Each new terminal needs JDK 21 (see Step 0). `mvn clean` already deletes the service's `target/`. Wait for each readiness URL before starting the next line; leave `AIMANAGER_API_KEY=` empty if you have no key. Stop a service with `Ctrl+C`.

```text
cd dealer-core && SERVER_ADDRESS=127.0.0.1 LOG_DIR=../log-sum JWT_MODE=dev ADMIN_USERNAME=admin ADMIN_PASSWORD=admin123 ADMIN_EMAIL=admin@example.com mvn clean spring-boot:run
cd ai-service && SERVER_ADDRESS=127.0.0.1 LOG_DIR=../log-sum SPRING_PROFILES_ACTIVE=dev AIMANAGER_API_KEY=<your key> mvn clean spring-boot:run
cd dealer-gateway && LOG_DIR=../log-sum SPRING_PROFILES_ACTIVE=dev JWT_MODE=dev mvn clean spring-boot:run
```

</details>

### Step 5. Start the frontend

Only after the gateway is `UP`, open IntelliJ's terminal (**View → Tool Windows → Terminal**). It opens at the repository root. Run:

```text
cd dealer-web
cp .env.example .env    # first time only
npm ci                  # first time, or after package.json changes
npm run dev
```

When it prints `Local: http://localhost:5173/`, open that address in the browser. Leave this terminal running; `Ctrl+C` stops the frontend.

### Step 6. Sign in

| Account | Login | Password | Lands on |
|---|---|---|---|
| Platform admin | `admin` or `admin@example.com` | `admin123` | `/admin` |

There is no demo business data. As admin, create a dealership on `/admin`, then use **Bind staff** to create a staff account (username, email and/or phone, temporary password of at least 8 characters). Sign out and sign in as that staff user to reach `/dms`. Self-registered accounts land on `/no-access` until the admin binds them under **Admin → Members → Pending accounts**.

The admin is seeded from `ADMIN_USERNAME` / `ADMIN_PASSWORD` only on the first start; changing them later does not change an existing password. Sign-in design: [design/15-Data-Auth-and-Gateway.md](design/15-Data-Auth-and-Gateway.md) §8.

### Next time

Steps 0–3 are one-time setup. On later days:

1. Start MySQL if it is not running: `brew services start mysql@8.4`.
2. In IntelliJ, run `dealer-core-local`, `ai-service-local`, then `dealer-gateway-local`, waiting for each readiness URL.
3. In the IntelliJ terminal: `cd dealer-web` then `npm run dev`.

To stop, press `Ctrl+C` in the frontend terminal, then click Stop (■) on the gateway, ai-service, and core Run tabs.

### Useful URLs

| What | URL |
|---|---|
| Web app | http://localhost:5173/ |
| Swagger UI | http://localhost:8080/swagger-ui/index.html |
| OpenAPI JSON | http://localhost:8080/v3/api-docs |
| Logs | `log-sum/<service>-<date>.log` |

### Troubleshooting

| Symptom | Fix |
|---|---|
| core fails with a database or Flyway error | MySQL is not running, or Step 1 was skipped; re-run the `SELECT 1` check. Databases created before 2026-10-07 need the Flyway repair in [design/15-Data-Auth-and-Gateway.md](design/15-Data-Auth-and-Gateway.md) §8.3 |
| Compile errors such as `invalid target release` | The run configuration or terminal is not using JDK 21 |
| Ad check returns `AI_UNAVAILABLE` / `AI_KEY_MISSING` | Set `AIMANAGER_API_KEY` on ai-service and restart it |
| Login works but every API call returns 401 | `DEV_JWT_SECRET` differs between core and gateway |
| Browser shows CORS errors | Open the app at `http://localhost:5173`, not `127.0.0.1:5173` |
| `Port 8080 (or 8081, 8082, 5173) was already in use` | That service is already running in another tab or terminal. Stop the old one first, or run `lsof -i :8080` to find it |
| `brew: command not found` or `mysql: command not found` | Run the **Next steps** lines Homebrew printed (Step 0.1), or `brew link --force mysql@8.4`, then reopen Terminal |
| IntelliJ shows red code everywhere | The Maven import has not finished, or the project SDK is not 21. Wait, then open the **Maven** tool window and click **Reload All Maven Projects** (⟳) |
| `npm ci` fails | Check `node -v` is 20 or newer, then retry |
| Anything else | Check `log-sum/` first ([design/20-Observability.md](design/20-Observability.md)) |

## AI agent MCP servers

The repository ships shared MCP server configuration for coding agents: `.mcp.json` (Claude Code) and `.cursor/mcp.json` (Cursor).

| Server | Use | Setup |
|---|---|---|
| `github` | Actions runs and logs, pull requests, issues | Export `GITHUB_PERSONAL_ACCESS_TOKEN` (a fine-grained token with read access to this repository's Actions, contents, issues, and pull requests) before starting the agent |
| `atlassian` | JIRA work items | Sign in through the OAuth prompt the first time (`/mcp` in Claude Code, or the MCP settings page in Cursor) |

Claude Code asks each developer to approve project servers on first use. Never commit a token; the configs read it from the environment.

## More documentation

| Topic | Document |
|---|---|
| Approved scope (in / out) | [design/SCOPE-BASELINE.md](design/SCOPE-BASELINE.md) |
| Requirements (English) | [requirements/DealerOps-Requirements.md](requirements/DealerOps-Requirements.md) |
| Map of all design docs | [design/README.md](design/README.md) |
| API contract | [design/14-Backend-API-Contract.md](design/14-Backend-API-Contract.md), [dealer-platform/openapi.yaml](dealer-platform/openapi.yaml) |
| Testing and team acceptance | [design/TESTING-AND-ACCEPTANCE-GUIDE.md](design/TESTING-AND-ACCEPTANCE-GUIDE.md) |
| Cloud deployment (Terraform + Azure) | [deploy/README.md](deploy/README.md) |
| Delivery status | [project-plan/Implementation-Delivery-Status.md](project-plan/Implementation-Delivery-Status.md) |
| Contributor and AI-agent rules (including the current no-test-authoring rule) | [CLAUDE.md](CLAUDE.md) |
