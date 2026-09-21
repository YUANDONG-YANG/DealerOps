# AI-CODING · 本机四服务怎么起、云上最小资源叫什么

版本：现行有效 · 2026-09-21  
状态：**编码 AI 开工抄本文件。** 不改契约、不改 13–19 / BRIEF / `AI-CODING-BACKEND` / `AI-CODING-FRONTEND` / `AI-PROTOCOL`。  
**禁止**改 `dealer-platform/infra/main.bicep` 本体（半成品云稿不得冒充已部署）。  
**禁止**把现有 `docker-compose.yml` 改成假装四服务已实现。

原则与端口以 [15](15-Data-Auth-and-Gateway.md) / [19](19-Gateway-and-AI-Engineering.md) 为准。本文只写**可复制命令、名称模式、验收 curl**。

---

## 1. 端口表（与 15 / 19 / `env.example` 同一套，写死）

| 进程 | 环境变量 | 端口 | 浏览器 |
|---|---|---|---|
| dealer-web（Vite） | — | **5173** | 只出静态 + 跳 Entra |
| dealer-gateway | `GATEWAY_PORT` | **8080** | **唯一 API 源**（`VITE_GATEWAY_URL=http://localhost:8080`） |
| dealer-core | `CORE_PORT` | **8081** | 必须失败（产品入口不是 8081） |
| ai-service | `AI_PORT` | **8082** | 必须失败 |
| MySQL | — | **3306** | 不给浏览器 |

上游（Gateway 出站，跟 `env.example`）：

```text
CORE_URL=http://host.docker.internal:8081
AI_URL=http://host.docker.internal:8082
```

本机 IDE 直跑（不进容器）时可用 `http://127.0.0.1:8081` / `http://127.0.0.1:8082`。

---

## 2. 本机启动顺序 + 健康检查 URL

**事实：** 现有 `dealer-platform/docker-compose.yml` **只起 MySQL**，没有 web / gateway / core / ai-service。四服务按第 3 节目标片段由编码 AI 新建仓后落地，**现在不要改 compose 假装已齐**。

### 2.1 顺序（写死）

1. **MySQL**（现有 compose）
2. **dealer-core**（要库；Flyway）
3. **ai-service**（无库；可与 core 并行，但必须在 Gateway 之前就绪）
4. **dealer-gateway**（要能解析 `CORE_URL` / `AI_URL`）
5. **dealer-web**（只打 8080）

```text
# 1) 仅 MySQL（现状即可）
cd dealer-platform
docker compose up -d mysql

# 2) 等 3306
mysql -h 127.0.0.1 -P 3306 -u dealer -pdealer_dev_only -e "SELECT 1"

# 3–5) 各仓就绪后（仓尚未建齐时停在这一步，不要伪造进程）
# dealer-core  → CORE_PORT=8081
# ai-service   → AI_PORT=8082
# dealer-gateway → GATEWAY_PORT=8080
# dealer-web   → vite :5173
```

### 2.2 健康检查（编码时按此暴露，无 JWT）

| 进程 | URL | 期望 |
|---|---|---|
| MySQL | `mysql … -e "SELECT 1"` | 退出码 0 |
| dealer-core | `http://127.0.0.1:8081/actuator/health` | **200** |
| ai-service | `http://127.0.0.1:8082/actuator/health` | **200** |
| dealer-gateway | `http://127.0.0.1:8080/actuator/health` | **200** |
| dealer-web | `http://127.0.0.1:5173/` | **200**（Vite 开发页） |

Windows 用 `curl.exe`（不要用 PowerShell 的 `curl` 别名）：

```text
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8081/actuator/health
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8082/actuator/health
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:8080/actuator/health
curl.exe -s -o NUL -w "%{http_code}" http://127.0.0.1:5173/
```

四条健康检查都是 **200** 才算本机进程齐。健康口 **不要**要求 `Authorization` / `X-Dealer-Internal`。

---

## 3. 目标 compose（尚未落地 — 编码 AI 按此建）

**现状一句：** `dealer-platform/docker-compose.yml` 现在只有 `mysql:8.4`，映射 `3306:3306`，库名 `dealer_core`。

下面是 **目标** 片段。编码 AI 建四仓 Dockerfile 之后再写入 compose。**现在禁止把这段提交进现有 compose 冒充四服务已跑。**

```yaml
# === 目标（尚未落地） dealer-platform/docker-compose.yml ===
# 编码 AI 建齐四仓后再合并；Gateway 映射 8080；core/ai 不要绑 0.0.0.0 给全班扫。
services:
  mysql:
    image: mysql:8.4
    environment:
      MYSQL_DATABASE: dealer_core
      MYSQL_USER: dealer
      MYSQL_PASSWORD: dealer_dev_only
      MYSQL_ROOT_PASSWORD: dealer_root_dev_only
    ports:
      - "3306:3306"
    command: ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_0900_ai_ci"]

  dealer-core:
    build: ../dealer-core
    environment:
      CORE_PORT: "8081"
      MYSQL_URL: jdbc:mysql://mysql:3306/dealer_core?useSSL=false&allowPublicKeyRetrieval=true
      MYSQL_USER: dealer
      MYSQL_PASSWORD: dealer_dev_only
      INTERNAL_TOKEN: dealer-internal
      ENTRA_ISSUER: ${ENTRA_ISSUER}
      ENTRA_AUDIENCE: ${ENTRA_AUDIENCE:-api://dealer-api}
    # 本机演示 curl 才绑回环；不要 "8081:8081"
    ports:
      - "127.0.0.1:8081:8081"
    depends_on:
      - mysql

  ai-service:
    build: ../ai-service
    environment:
      AI_PORT: "8082"
      INTERNAL_TOKEN: dealer-internal
      AIMANAGER_API_KEY: ${AIMANAGER_API_KEY}
      AIMANAGER_GATEWAY_PROVIDER: ${AIMANAGER_GATEWAY_PROVIDER:-openai}
      AIMANAGER_GATEWAY_MODEL: ${AIMANAGER_GATEWAY_MODEL}
    ports:
      - "127.0.0.1:8082:8082"

  dealer-gateway:
    build: ../dealer-gateway
    environment:
      GATEWAY_PORT: "8080"
      CORE_URL: http://host.docker.internal:8081
      AI_URL: http://host.docker.internal:8082
      INTERNAL_TOKEN: dealer-internal
      CORS_ALLOWED_ORIGIN: http://localhost:5173
      ENTRA_ISSUER: ${ENTRA_ISSUER}
      ENTRA_AUDIENCE: ${ENTRA_AUDIENCE:-api://dealer-api}
    ports:
      - "8080:8080"
    extra_hosts:
      - "host.docker.internal:host-gateway"

  dealer-web:
    build: ../dealer-web
    environment:
      VITE_GATEWAY_URL: http://localhost:8080
      VITE_ENTRA_TENANT_ID: ${VITE_ENTRA_TENANT_ID}
      VITE_ENTRA_CLIENT_ID: ${VITE_ENTRA_CLIENT_ID}
      VITE_ENTRA_API_SCOPE: ${VITE_ENTRA_API_SCOPE:-api://dealer-api/access_as_user}
    ports:
      - "5173:5173"
```

`../dealer-*` 是四独立仓相对 `dealer-platform` 的约定路径；仓未检出时不要硬编空镜像。

---

## 4. Gateway CORS 与内部头（环境变量名写死）

| 项 | 写死值 |
|---|---|
| 本机 CORS origin | **`http://localhost:5173`** |
| 环境变量（Gateway） | **`CORS_ALLOWED_ORIGIN`**（本机默认即上一行；Azure 换成 web 的 HTTPS 源） |
| 内部请求头名 | **`X-Dealer-Internal`** |
| 环境变量（值） | **`INTERNAL_TOKEN`** |
| 本机默认值 | **`dealer-internal`** |
| Key Vault 秘密名 | **`INTERNAL-TOKEN`**（云上；仓内不写真实值） |

谁读 `INTERNAL_TOKEN`：**gateway**（谓词）、**core**（出站）、**ai-service**（守卫）。**web 不读。**

Gateway 预检允许头只列 `Authorization`、`Content-Type`。**不要**把 `X-Dealer-Internal` 放进 `Access-Control-Allow-Headers`。  
core:8081 / ai:8082：**不配**对 `http://localhost:5173` 的 CORS。

`AIMANAGER_API_KEY` **只**给 ai-service。`MYSQL_PASSWORD` **只**给 core。密钥不进 Git；仓内只有 `env.example` 空位。

---

## 5. 直连 8081 / 8082 必须失败（curl 期望）

一律 `curl.exe`。健康检查 200 **不算**产品入口。

### 5.1 无内部头打 AI 路径 → 404（不要 401）

```text
curl.exe -s -o NUL -w "%{http_code}" -X POST http://127.0.0.1:8080/internal/v1/ad-check
# 期望：404

curl.exe -s -o NUL -w "%{http_code}" -X POST http://127.0.0.1:8082/internal/v1/ad-check
# 期望：404

curl.exe -s -o NUL -w "%{http_code}" -X POST http://127.0.0.1:8082/internal/v1/assistant
# 期望：404
```

### 5.2 直连 core 无浏览器 CORS（产品入口不是 8081）

```text
curl.exe -s -D - -o NUL -X OPTIONS http://127.0.0.1:8081/api/v1/vehicles ^
  -H "Origin: http://localhost:5173" ^
  -H "Access-Control-Request-Method: GET"
# 期望：响应头里没有 Access-Control-Allow-Origin: http://localhost:5173

curl.exe -s -D - -o NUL -X OPTIONS http://127.0.0.1:8080/api/v1/vehicles ^
  -H "Origin: http://localhost:5173" ^
  -H "Access-Control-Request-Method: GET"
# 期望：有 Access-Control-Allow-Origin: http://localhost:5173
```

### 5.3 局域网 IP 直连 core / ai → 连不上

目标 compose 只把 8081/8082 绑 `127.0.0.1`。把 `127.0.0.1` 换成你的局域网 IPv4：

```text
curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 3 http://<LAN_IP>:8081/actuator/health
# 期望：连不上（exit != 0 / 超时），不是 200

curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 3 http://<LAN_IP>:8082/actuator/health
# 期望：连不上

curl.exe -s -o NUL -w "%{http_code}" --connect-timeout 3 http://<LAN_IP>:8080/actuator/health
# 期望：200（Gateway 才是对公入口）
```

若本机 `127.0.0.1:8081` 的 `curl` 仍返回 401：课堂只用来讲「无 CORS / 非产品入口」，**不能**当成「直连失败已验收」。

Azure：core / ai **internal** Ingress；对外 FQDN **只有** web + gateway。

---

## 6. Azure 最小资源名称模式

`main.bicep` 的 `prefix` 默认 **`dealerops`**。名称按下面拼，**不要另起一套花名**。

| 资源 | 数量 | 名称模式 | 例（prefix=`dealerops`） | `main.bicep` 现状 |
|---|---|---|---|---|
| Azure Container Registry | 1（Basic，admin 关） | `${prefix}acr` | `dealeropsacr` | **仅此项已写** |
| Container Apps Environment | 1 | `${prefix}-cae` | `dealerops-cae` | 未写 |
| Container App | **4** | `${prefix}-web` `${prefix}-gateway` `${prefix}-core` `${prefix}-ai` | `dealerops-web` … `dealerops-ai` | 未写 |
| MySQL Flexible Server | 1，库名 **`dealer_core`** | `${prefix}-mysql` | `dealerops-mysql` | 未写 |
| Key Vault | 1 | `${prefix}-kv` | `dealerops-kv` | 未写 |
| Application Insights | 1 | `${prefix}-appi` | `dealerops-appi` | 未写 |

Bicep **现状 = 仅 ACR**。不要把注释里的待补项当成已部署。不要在 Bicep 写 subscriptionId 或密钥明文。

### 何时才算云上验收

| Sprint | 云上业务？ |
|---|---|
| **Sprint 1** | **不必**云上跑业务。本机四进程 + 架构图 + Entra 两角色 +「直连 8081/8082 失败」能讲即可。ACR 占位够。 |
| **Sprint 2** | **必须**云上真路径：登录 → Gateway → 录一辆车 → **真实 AI** 检查广告。KV / MySQL / CAE / 四 Container App / Insights 必须补进同一 `main.bicep` 后再部署。core/ai internal；gateway/web external + HTTPS。 |
| **Sprint 3** | 不再加总线/第二库；隔离、CRM、三类广告、导出、审计跑满。 |

---

## 7. 流水线（默认 GitHub Actions，不再二选一）

**默认 CI：GitHub Actions。** 四应用仓 **各一份** `.github/workflows/ci.yml`。`dealer-platform` 不跑业务镜像。

| 仓 | JDK / Node | PR（先 echo/compile） | `main`（再 docker push） |
|---|---|---|---|
| dealer-gateway | **Java 21** | `echo` 仓名 → `mvn -B -DskipTests compile` | 镜像 `tag=$GITHUB_SHA` → push ACR `${prefix}acr` |
| dealer-core | **Java 21** | 同上 | 同上；需要时另跑 Flyway Job |
| ai-service | **Java 21** | 同上；CI **stub**，不打付费端点 | 同上 |
| dealer-web | Node 20 | `echo` 仓名 → `npm ci && npm run build` | 同上 |

最小骨架（Java 仓；web 把 compile 换成 `npm`）：

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]
jobs:
  compile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
      - run: echo "repo=${{ github.repository }}"
      - run: mvn -B -DskipTests compile
  image:
    if: github.ref == 'refs/heads/main'
    needs: compile
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "build-and-push ${{ github.sha }}"
      # docker build / tag=$GITHUB_SHA / acr login / docker push
      # ACR 名：${prefix}acr（例 dealeropsacr）。密钥用 GitHub Secrets，不进仓。
```

demo 发布要另一人批准。禁止门户手点改镜像冒充流水线。

---

## 8. Java 与密钥

- Java **三仓**（`dealer-gateway` / `dealer-core` / `ai-service`）统一 **21**。禁止一仓 21、一仓 17。
- `dealer-web` 无 JDK。上游 `ai-manager` 仍是 17 字节码 JAR，**不改该库**；21 运行时可以依赖它。
- **密钥不进仓：** `.env`、`AIMANAGER_API_KEY`、MySQL 真密码、`INTERNAL_TOKEN` 真值不进 Git。本地复制 `dealer-platform/env.example`。云上走 Key Vault `secretRef`。
- SPA **无** Entra client secret（PKCE）。`VITE_ENTRA_CLIENT_ID` 不是秘密。

---

## 编码 AI 禁止

- 改 13–19、BRIEF、`AI-CODING-BACKEND` / `AI-CODING-FRONTEND` / `AI-PROTOCOL`
- 改 `dealer-platform/infra/main.bicep` 冒充云已齐
- 把现有 compose 改成四服务已实现
- 第五个 auth 仓 / Service Bus / 密钥进仓 / 默认改用 Azure DevOps
