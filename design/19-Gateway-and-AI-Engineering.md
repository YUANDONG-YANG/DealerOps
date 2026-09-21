# 19 · Gateway 与 ai-service 工程设计

- 状态：**现行有效（v6 Gateway YAML 级 / ai-service 适配器级）**
- **路由、JWT、CORS、内部头、直连失败、为何无独立 auth 仓、为何无 Service Bus：以 [15](15-Data-Auth-and-Gateway.md) 为准。** 本文不另定原则，只写成可拆文件的配置与适配器边界。
- **ai-manager 接法以 [09](09-AI-Agent-Integration.md) 为准**（进程内嵌、`AiManager`、禁止扫 `com.gateway`、超时自做）。
- **HTTP 路径与 JSON 以 [14](14-Backend-API-Contract.md) 为准。** 对外只有 `/api/v1/**`；内部只有 `/internal/v1/ad-check` 与 `/internal/v1/assistant`。本文不另造路径、不另造错误码、不写业务表。
- 店内助手产品流以 [10](10-Web-AI-Assistant.md) 为准（Vue → Gateway → core 过滤 → 经 Gateway 调内部助手）。本文只写 ai-service 侧适配器。
- 夹具如何制造「AI 不可用」以 [17](17-Ad-Check-Fixtures.md) **FX-12** 为准。
- **不管** `dealer-core` 包结构、实体、Flyway、规则引擎实现（留给 18）。**不改** BRIEF / README / `13`–`17` / SCOPE / SQL。

编码仓：`dealer-gateway`、`ai-service`（尚未按本文拆文件时，按下列目录新建即可）。

---

## 0. 冲突顺序与本文边界

| 问什么 | 去哪 |
|---|---|
| 浏览器能否打 8081/8082、CORS 谁配、内部头叫什么、JWT claim | **15** |
| `/api/v1/**` 与 `/internal/v1/**` 的 JSON、502 `AI_UNAVAILABLE` | **14** |
| `AiManager` API、commit、禁止暴露的组件 Gateway | **09** |
| 固定 OMVIC 清单伪代码 | **15 §6**（在 **core** 跑，本文不重写） |
| 夹具正文与 FX-12 | **17** |
| Gateway `application.yaml` 片段、JWT 过滤器挂哪、ai-service 适配器目录与超时 | **本文** |

禁止：第五个 auth 仓 / GitHub 组件独立容器；Service Bus / 向量库 / 自研模型 SDK；把 `com.gateway` 或库内 `/api/ai/**` 当对外 API；`ai-manager` 当第五微服务。

---

## 1. dealer-gateway

### 1.1 栈与建议目录

**Spring Cloud Gateway**，**Java 21**（与 07 / 15 §12 一致；三 Java 仓同版本，禁止 gateway 21、ai-service 17）。不连 MySQL，不调模型 SDK，不写业务。

```
dealer-gateway/
  pom.xml
  src/main/resources/application.yaml
  src/main/java/ca/sait/dealerops/gateway/
    GatewayApplication.java
    config/
      SecurityConfig.java          # 资源服务器：issuer/audience 见 15 §8
      CorsConfig.java              # 或 yaml cors；只允许 web origin
    filter/
      InternalRouteFilter.java     # /internal/v1/** 无 X-Dealer-Internal → 404
```

包名自定，**不要**用上游库的 `com.gateway`。职责到此为止（15 §7）：路由、验用户 JWT、挡 internal、剥敏感头、转发 `/api/v1` 的 `Authorization`。

环境变量名跟 `dealer-platform/env.example`：

| 变量 | 用途 |
|---|---|
| `GATEWAY_PORT` | 监听 **8080** |
| `CORE_URL` | 上游 core（本地 `http://host.docker.internal:8081` 或本机 `http://127.0.0.1:8081`） |
| `AI_URL` | 上游 ai-service（本地 `http://host.docker.internal:8082`） |
| `ENTRA_ISSUER` / `ENTRA_AUDIENCE` | JWT 验签（15 §8） |

内部共享秘密 **`INTERNAL_TOKEN`** 已由 **15 §7 / §11** 裁定（KV 名建议 `INTERNAL-TOKEN`）。`env.example` 尚未列出该项：**不要在本文去改 env.example**；开工时本地 `.env` / KV 按 15 补，web **不读**。

### 1.2 路由表（`application.yaml` 级）

浏览器与服务间 HTTP 只进本进程。`/api/v1/**` **禁止**转发到 ai-service。

```yaml
server:
  port: ${GATEWAY_PORT:8080}

spring:
  cloud:
    gateway:
      globalcors:
        add-to-simple-url-handler-mapping: true
        cors-configurations:
          '[/**]':
            allowedOrigins:
              - "http://localhost:5173"
            allowedMethods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
            allowedHeaders: [Authorization, Content-Type]
            exposedHeaders: []
            allowCredentials: false
      default-filters:
        - DedupeResponseHeader=Access-Control-Allow-Origin Access-Control-Allow-Credentials, RETAIN_UNIQUE
      routes:
        - id: dealer-core-public
          uri: ${CORE_URL}
          predicates:
            - Path=/api/v1/**
          filters:
            - PreserveHostHeader
            # 用户 JWT 原样转发；不要剥 Authorization
        - id: ai-service-internal
          uri: ${AI_URL}
          predicates:
            - Path=/internal/v1/**
            - Header=X-Dealer-Internal, ${INTERNAL_TOKEN}
          filters:
            - RemoveRequestHeader=Authorization   # 用户 JWT 不进 ai-service（15 §7）
        - id: not-found
          uri: no://op
          predicates:
            - Path=/**
          filters:
            - SetStatus=404
```

**浏览器打 `/internal/v1/**` 必须失败（15 §7，三道缺一答辩会被问穿）：**

1. Gateway 谓词：无头 `X-Dealer-Internal: <INTERNAL_TOKEN>` → **404**（不要 401，以免承认路径）。上表无头则走不进 `ai-service-internal`，落到 404。
2. core 出站自加该头；**不要**把用户 JWT 转给 ai-service。
3. ai-service 缺该头同样 **404**。即使直连 8082 也失败。

`Access-Control-Allow-Headers` **不要**列出 `X-Dealer-Internal`（15 §13）。CORS **只**在 Gateway（以及对 5173 的 Vite）；core / ai-service 不配浏览器 CORS。

Azure：只允许 web 的 HTTPS origin（替换 `localhost:5173`）。本机预检只服务 Vite。

### 1.3 JWT（Entra → 两角色）

映射写死，与 15 §8.1 同一函数，本文不改 claim 表：

- App Role `value`：`Platform.Admin`、`Dealer.User`
- `iss` = `ENTRA_ISSUER`，`aud` = `ENTRA_AUDIENCE`（默认 `api://dealer-api`）
- `roles[]` 是 RBAC 唯一来源；`scp` 不是角色；`groups` 忽略
- `Platform.Admin` 与 `Dealer.User` 同时出现 → **Admin 赢**
- 无法映射 → Gateway **401**，进不了 core 业务

Gateway 与 core **都要**验签。Gateway 验过仍须把 **`Authorization: Bearer`** 转给 core（core 再验，防将来误开 8081）。

SPA：MSAL + PKCE，无 client secret。Gateway **不签发**令牌。

### 1.4 CORS 只在 Gateway

允许的 web origin（本地）：**`http://localhost:5173`**（与 `VITE_GATEWAY_URL=http://localhost:8080` 对照）。  
允许头：`Authorization`、`Content-Type`。Cookie 不是本课方案。

core:8081 / ai:8082：**不配**对 5173 的 ACAO。这是「直连失败」的一部分，不是可选项。

### 1.5 如何证明直连 core:8081 / ai:8082 失败

与 15 §10 同一套端口（`env.example`）：web `5173`、gateway **`8080`**、core **`8081`**、ai **`8082`**。

| 演示 | 期望 |
|---|---|
| 页面 `fetch('http://localhost:8081/api/v1/vehicles')`（带或不带 Bearer） | 浏览器拦（无 CORS）。产品入口不是 8081 |
| 同一请求走 `http://localhost:8080/api/v1/vehicles` + Bearer | 200 或业务错（401/403/404…） |
| 页面 `fetch('http://localhost:8082/internal/v1/ad-check')` | 无 CORS；即便用非浏览器客户端，无内部头 → **404** |
| 页面 `fetch('http://localhost:8080/internal/v1/ad-check')`（无内部头） | Gateway **404** |
| Azure | core / ai **internal** Ingress；对外 FQDN 只有 web + gateway |

compose 映射：Gateway 8080；core/ai 不要绑 `0.0.0.0` 给全班扫。课堂备一手：`curl` 8081 若仍通，讲「无 CORS / 无公网 / 需内网」，**不要**靠关防火墙当唯一证据。

### 1.6 答辩半页指针（Auth 域 = Entra）

PPT 的 Auth 域要的是 **OAuth/OIDC + JWT + RBAC**，禁止自研认证。本课 Auth 单元 **就是 Microsoft Entra ID**（07 表），**不是**第五个 Java 仓、不是 GitHub 组件容器。

课堂收束（细节与「为何无 Service Bus」整段在 **15 §8.2 / §9**，此处不重复）：

- 身份在 Entra；应用侧只有验票（Gateway + core）与绑店（core `membership`）
- Gateway 不发牌；管理员「发账号」= 绑 `entra_oid` → `dealer_id`
- 再写 `dealer-auth` 会撞密码表 / 第五流水线 / 第五 Container App

---

## 2. ai-service

### 2.1 定位

Java 21 Spring Boot，**无数据库**，无 Flyway，无业务表。进程内依赖 GitHub 私有库 **ai-manager** JAR，**不**给组件单独容器（07 / 09）。

钉死（09，只计划、不改该库源码）：

- 仓库：`https://github.com/YUANDONG-YANG/ai-manager`（private）
- 分支 `main`，commit **`c07e1f2afe5dd692c20f3567ad3a42a90d31a87a`**
- Maven 坐标现状：`com.aimanager:aimanager:1.0.0-SNAPSHOT`（SNAPSHOT 不适合发布号，见 §2.8）
- 只用 `com.manager.AiManager`：`request(String)`、`startConversation(id, systemMessage)`、`closeConversation`
- **不要**扫描 `com.gateway`，**不要**启动 `AIApplication`，**不要**暴露库内 `/api/ai/request`、`/chat`、`/credentials`、`/runtime`

Key **只**给 ai-service：`AIMANAGER_API_KEY`（环境 / Key Vault）。web / gateway / core 不读。

### 2.2 建议目录（适配器级，不是规则引擎）

```
ai-service/
  pom.xml
  src/main/resources/application.yaml
  src/main/java/ca/sait/dealerops/aiservice/
    AiServiceApplication.java
    config/
      InternalGuardFilter.java     # 缺 X-Dealer-Internal → 404
      AiTimeoutConfig.java         # connect/response 总计 ≤15s（09：库无现成超时）
    adapter/adcheck/
      AdCheckController.java       # POST /internal/v1/ad-check
      AdCheckAdapter.java          # startConversation + finally closeConversation
    adapter/assistant/
      AssistantController.java     # POST /internal/v1/assistant
      AssistantAdapter.java        # 短会话；只吃 core 已过滤的 resources
    support/
      AiManagerFactory.java        # 读 AIMANAGER_* ；限流队列默认关
      ModelFailureException.java   # 超时 / 缺 Key / 厂商失败 → 给 core 映射 502
```

监听 **`AI_PORT=8082`**。不配浏览器 CORS。

### 2.3 超时必须自做（09）

库内 OpenAI 路径是 `WebClient...blockOptional()`，**没有现成的 15 秒保证**。适配器必须自己设 **connect + response**，整次模型调用 **≤15s**（与 07 / 14「等最多 15 秒」一致）。

- 超时、连接失败、非 success → 适配器失败，**不要**假装 Pass
- 限流队列 **默认关掉**，避免和课程 15s 叠在一起（09）
- CI 用 stub，**不打付费端点**；Sprint 2 必须对该库发一次真实请求（09）

`application.yaml` 级示意（数值钉 15s，实现可用 WebClient/HttpClient 包一层，不要改 ai-manager 源码）：

```yaml
server:
  port: ${AI_PORT:8082}
dealerops:
  ai:
    timeout-ms: 15000
    require-internal-header: true
```

### 2.4 内部 API（路径只引用 14 §11）

Gateway → ai-service。core 调用，**浏览器 404**。

#### `POST /internal/v1/ad-check`

请求体形状 **原样引用 14 §11**：`listing`（title/body/adKind/medium）、`vehiclePublic`（年/make/model/vin/conditionCode/source，**无**采购/修理/售价）、`dealerPublic`（店公开四字段）。

适配器：

1. `startConversation`：system = 复核说明（不是 15 的硬规则引擎；硬规则已在 core 跑完）
2. user = 上述 JSON
3. 先看 `AIResponse.isSuccess()`，再解析 content
4. `finally` `closeConversation`
5. 把模型结果收成 **供 core 写入 `aiNotes` 的笔记**（14：元素至少 `{ "message": "..." }`）。**不**在本服务落 `compliance_check`

传输 / 超时 / 缺 Key：返回 **5xx 或约定失败体**（实现选一种钉死即可），由 **core** 记 `UNAVAILABLE` 并对外 **502 `AI_UNAVAILABLE`**（14 §8.2）。ai-service **不要自己写业务表、不要自己对浏览器回五态**。

#### `POST /internal/v1/assistant`

请求体形状 **原样引用 14 §11**：`question` + `resources`（core 已过滤；无电话/邮箱/住址）。

适配器同样新建短会话；返回 **短文本**（14：「返回短文本；core 再核 id」）。core 负责：最多 5 张卡、丢掉乱编 id、模型挂则对外仍 **200** 且 `summaryAvailable=false`（14 §10 / 10 号文档）。ai-service 失败时给 core 可识别的失败，**不要**在此写车辆/客户/listing。

不要另造 `/internal/v1/chat`、`/api/ai/**`、库自带 Gateway 路径。

### 2.5 与 core 的边界（避免和 18 抢规则引擎）

| 步骤 | 谁 | 本文是否实现 |
|---|---|---|
| JWT、租户、`listing.version`、本店校验 | **core** | 否 |
| **固定 OMVIC 清单**（15 §6 伪代码：`hard[]` / `soft[]`） | **core，先于任何模型调用** | **否。禁止把规则引擎搬进 ai-service** |
| `hard[]` 非空 → `BLOCKED` + `aiStatus=SKIPPED`，**不 HTTP 调 AI** | **core** | 否 |
| `hard[]` 空 → 经 Gateway `POST /internal/v1/ad-check`（≤15s） | core 出站 + **本服务适配器** | 只做模型调用 |
| 写 `compliance_check` / 回写 `last_check_id` / 对外 200 或 502 | **core** | 否 |
| 助手：检索最多 5 条、过滤隐私、核 id、不写业务表 | **core**（10 / 14） | 否 |
| 模型会话 + 15s 超时 + Key | **ai-service** | 是 |

ai-service **假设**打进来的 ad-check 已经过固定规则。它不重判 `PRICE_MISSING` 等硬缺，不决定页面五态。若误把 FX-01 类硬缺广告直接打到 8082，仍只是「又跑了一次模型」，**不能**代替 core 的 Blocked=200。

### 2.6 模型与环境变量（跟 `env.example`）

PPT：真实 AI，**Azure OpenAI 优先**。不自研 SDK；厂商走库已有能力（09：groq / openai / claude / deepseek；**没有** `provider=mock`）。

| `env.example` 名 | ai-service 用法 |
|---|---|
| `AI_PORT` | 8082 |
| `AIMANAGER_API_KEY` | 唯一模型密钥；空则启动后首次调用必须失败（见下） |
| `AIMANAGER_GATEWAY_PROVIDER` | 默认示例为 `openai`；课上优先指到 **Azure OpenAI 兼容的 openai 路径**（或库已支持的 Azure 托管端点，07） |
| `AIMANAGER_GATEWAY_MODEL` | 部署名 / 模型名；空则按库默认，联调必须显式填 |

不要引入 `OPENAI_API_KEY`、向量连接串、第二套模型客户端。轮换 Key = 只改 KV / `.env`，不改镜像（15 §13）。

### 2.7 失败如何让 core 映射 `AI_UNAVAILABLE` 502

ai-service **不**发明 `AI_UNAVAILABLE` 业务表。它只保证失败可观测：

| 原因 | 适配器 | core（14，本文不实现） |
|---|---|---|
| 超过 15s | 中断，5xx / 超时错误 | 检查行已写 `UNAVAILABLE`，对外 **502** `AI_UNAVAILABLE` |
| `AIMANAGER_API_KEY` 缺失或无效 | 立即失败，不要挂起满 15s | 同上 |
| `isSuccess()==false` / 解析失败 | 失败 | 同上 |
| 助手模型挂 | 失败 | 对外仍 **200** + `summaryAvailable=false`（与检查 502 **不同**） |

禁止：ai-service 返回「假 Passed」；把超时当 200 空 notes。

### 2.8 私有包 / 不可变版本（只计划）

实施时（**不改本文之外的代码、不改 ai-manager 源码**）：

1. 从 commit `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a` 打 **非 SNAPSHOT** 不可变版本
2. 发布到 GitHub Packages `https://maven.pkg.github.com/YUANDONG-YANG/ai-manager`
3. `ai-service` 只引用该不可变版本
4. 打版本前本机 `mvn install` 仅供开发
5. CI stub，不打付费端点
6. 21 运行时可以依赖 **17 字节码** JAR（15 §12）；不要把三仓降到 17 除非本机全退

库 README 测试未维护（09）：**不能**把该库本身当质量证明。夹具标签是 team-authored（17）。

---

## 3. FX-12：联调如何制造「AI 不可用」

夹具权威在 **17**：FX-12 的 title/body **与 FX-10 相同**（干净 CASH / ONLINE，`hard[]` 空），**不要**用缺价等硬缺广告冒充本条（硬缺根本不调 AI）。

联调任选其一（适配器 ≤15s）：

1. **断 Key：** 清空或错填 `AIMANAGER_API_KEY` 后重启 ai-service
2. **超时：** 把超时调到极短，或让厂商端不可达，迫使适配器在 15s 内失败
3. **CI stub：** stub 固定失败（不打付费端点）

期望链（14 + 17，core 落库，ai-service 只失败）：

- 固定规则 **Needs AI** → 经 Gateway 内部 ad-check
- 调用失败 → 对外 **502** `AI_UNAVAILABLE`
- `compliance_check` **已写** `recommendation=UNAVAILABLE`；listing 已指向该行
- GET：`checkStatus=AI_UNAVAILABLE`；UI **不得**当 Pass；Ready/Export → **409** `NOT_PASSED`

课堂顺序（17）：FX-01 → FX-03 → FX-10（真 AI）→ 导出 → FX-11 Stale → 可选 FX-12 断 AI。

---

## 4. 开工拆文件清单（仍无业务代码）

**gateway：** `pom`（Java 21 + Spring Cloud Gateway + 资源服务器）→ `application.yaml`（§1.2）→ JWT 配置（issuer/audience）→ 内部头 404 → CORS 仅 5173。

**ai-service：** `pom`（Java 21 + 依赖不可变/本地 ai-manager JAR）→ 内部头 404 → `AdCheckAdapter` / `AssistantAdapter` + 15s 超时 → 两个 14 号路径的 Controller → 缺 Key/超时向上游失败。

**不要在本仓做：** core 包、规则引擎、SQL、第五容器、Service Bus、暴露 `com.gateway`。
