# ai-service

Dealer Ops 内部 AI 适配器。端口 **8082**，无数据库，不对浏览器开放。进程内调用 `com.manager.AiManager`，**不**扫描、不启动 `com.gateway` / `AIApplication`。

内部 JSON 以 `design/AI-PROTOCOL-AND-RULES.md` 为准（不是任务单 T22 的 `{failed,reason}`）。

## 本机 ai-manager（2026-09-21 已接入）

源码在 **DealerOps 仓外**，未拷进本仓、未改该库业务代码。

| 项 | 值 |
|---|---|
| 本机绝对路径 | `D:\常用文件\SAIT\26fall\Capstone\Project Topics\ai-manager` |
| 远程 | https://github.com/YUANDONG-YANG/ai-manager （private） |
| 钉死 commit | `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a`（detached HEAD，`add main start in pom`） |
| Maven | `com.aimanager:aimanager:1.0.0-SNAPSHOT` |
| 本机 `.m2` | `C:\Users\Administrator\.m2\repository\com\aimanager\aimanager\1.0.0-SNAPSHOT\`（`mvn -DskipTests install` 已写入 jar/pom） |
| Java（库） | 17 / Spring Boot parent 3.2.5（17 字节码 JAR，本仓用 Java 21 依赖即可） |
| 公开 API | `com.manager.AiManager`：`request(String)`、`startConversation(id, systemMessage)`、`closeConversation` |
| 本目录 compile（2026-09-21） | **通过**：默认 `aimanager` profile，`mvn -DskipTests compile`，`BUILD SUCCESS`（`javac release 21`） |

## 本地 install

不要用当前 Cursor 进程默认的 JDK 11。本机 JDK 21：

`C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot`

PowerShell：

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.12.101-hotspot'
$env:PATH="$env:JAVA_HOME\bin;" + $env:PATH
java -version
```

在 **仓外 ai-manager 目录**（不要在本仓里改该库）：

```powershell
Set-Location 'D:\常用文件\SAIT\26fall\Capstone\Project Topics\ai-manager'
git checkout c07e1f2afe5dd692c20f3567ad3a42a90d31a87a
mvn -DskipTests install
```

然后在本目录：

```powershell
Set-Location 'D:\常用文件\SAIT\26fall\Capstone\Project Topics\DealerOps\ai-service'
mvn -DskipTests compile
```

默认 Maven profile `aimanager` 解析 `com.aimanager:aimanager:1.0.0-SNAPSHOT`。不要改系统全局 `JAVA_HOME` 来迁就本仓。

## 还没有 JAR 时：stub profile

```powershell
mvn -Pstub -DskipTests compile
```

`-Pstub` 会关掉默认的 `aimanager` profile，改用 `src/main/java-stub` 里的最小 `AiManager` / `AIResponse`（仅编译，不打真模型）。有 Key 时 stub 调用会走 502 `AI_PROVIDER_FAILED`。当前本机已有真实 JAR，日常不要用 stub。

## 环境变量

| 变量 | 默认 | 谁读 |
|---|---|---|
| `AI_PORT` | `8082` | 本服务 |
| `INTERNAL_TOKEN` | `dealer-internal` | 本服务校验 `X-Dealer-Internal`（与 PROTOCOL 一致） |
| `AIMANAGER_API_KEY` | 空 | 只给本服务 |
| `AIMANAGER_GATEWAY_PROVIDER` | `openai` | `groq` / `openai` / `claude` / `deepseek` |
| `AIMANAGER_GATEWAY_MODEL` | 空则用 `current` | 本服务 |

缺 Key：立刻 **503** `{ "success": false, "code": "AI_KEY_MISSING", "message": "AIMANAGER_API_KEY is missing or invalid." }`，不满 15s。

`dealer-platform/env.example` 只追加了缺的 `INTERNAL_TOKEN`；`AIMANAGER_*` 原先已有，未改值。

## 内部接口

- `POST /internal/v1/ad-check` — 成功 `{ "success": true, "notes": [{ "message" }] }`
- `POST /internal/v1/assistant` — 成功 `{ "success": true, "summary" }`
- 要求头 `X-Dealer-Internal: ${INTERNAL_TOKEN}`；缺头或错头 → **404**
- 失败：504 `AI_TIMEOUT` / 503 `AI_KEY_MISSING` / 502 `AI_PROVIDER_FAILED`，体 `{ "success": false, "code", "message" }`
- 超时：connect 2s + response 13s，适配器再包 15s `orTimeout`

不要对 `http://127.0.0.1:8082` 配浏览器 CORS。core 只经 Gateway 调用。
