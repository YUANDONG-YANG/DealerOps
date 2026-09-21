# Dealer Ops 实现手册（给 AI 编码）

版本 1.6 · 2026-09-21  
冲突优先级：**PPT > 规格字段 > [DEVELOPMENT-DESIGN.md](DEVELOPMENT-DESIGN.md) / [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) > 14 / 15 > 任务单**。`16` / `17` 是验收用例与广告夹具，**不改契约**。`01`–`06` 仍废止。不要再读它们当需求。

设计原文：`d:\常用文件\SAIT\26fall\Capstone\Project Topics\Project Topics\DealerOS-Design`  
编码骨架（真实路径）：`d:\常用文件\SAIT\26fall\Capstone\Project Topics\DealerOps`  
（相对本目录：`..\..\DealerOps`）

当前骨架只有 `dealer-core`（Flyway `V1__init.sql`）和 `dealer-platform`（`API.md`、`env.example`、compose 仅 MySQL、Bicep/流水线占位）。**还没有** `dealer-web` / `dealer-gateway` / `ai-service` 工程。

### 编码 AI 阅读序

1. **[SCOPE-BASELINE.md](SCOPE-BASELINE.md)**（人认范围）
2. **后端设计文档** [DEVELOPMENT-DESIGN.md](DEVELOPMENT-DESIGN.md)（范围、阶段、不变量）
3. **对外 HTTP/DTO** 对照 **14** + [`../dealer-platform/openapi.yaml`](../dealer-platform/openapi.yaml)
4. **内部协议/规则细处** [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md)
5. **拆包** 看 **18** / **19**；按仓执行 **[AI-CODING-BACKEND.md](AI-CODING-BACKEND.md)**
6. **前端** 仍是 **[13-Frontend-Engineering.md](13-Frontend-Engineering.md)** + **[AI-CODING-FRONTEND.md](AI-CODING-FRONTEND.md)**
7. 启动 / 云 **[AI-CODING-LOCAL-AND-CLOUD.md](AI-CODING-LOCAL-AND-CLOUD.md)**
8. 测试 **[AI-CODING-TESTS.md](AI-CODING-TESTS.md)** + **16** / **17**

冲突序：**PPT > 规格字段 > DEVELOPMENT-DESIGN / PROTOCOL > 14/15 > 任务单**。

**内部 AI 体（写死）：** PROTOCOL 优先于 BACKEND T22 与 OpenAPI 内部示意。成功 `{success, notes[]}` / `{success, summary}`；失败 `{success:false, code, message}`（**504** `AI_TIMEOUT` / **503** `AI_KEY_MISSING` / **502** `AI_PROVIDER_FAILED`）。core 检查路径对外仍 **502** `AI_UNAVAILABLE`。OpenAPI **对外** path 仍跟 14。不要实现 T22 可能出现的 `{failed,reason}`。

### 文档地图（人读 / 全设计）

1. 开工前给导师：**[SCOPE-BASELINE.md](SCOPE-BASELINE.md)**（一页范围签字）
2. **本手册**（范围、字段、任务序）→ `00`（六页）
3. **[13-Frontend-Engineering.md](13-Frontend-Engineering.md)**：前端拆文件、路由、页面↔API（前端仍对照 13 + `AI-CODING-FRONTEND`）
4. 后端设计文档：**[DEVELOPMENT-DESIGN.md](DEVELOPMENT-DESIGN.md)**（范围、阶段、不变量）。对外 HTTP/DTO 仍对照 **14** + OpenAPI；内部协议/规则细处 **PROTOCOL**；拆包 **18** / **19**。
5. 验收 / NN-19：**[16-Acceptance-and-Test.md](16-Acceptance-and-Test.md)**（32 用例 + 6 课堂脚本；不改契约）
6. 广告检查夹具：**[17-Ad-Check-Fixtures.md](17-Ad-Check-Fixtures.md)**（演示用 FX-01 / FX-03 / FX-10 / FX-11 / FX-12）
7. `12` UI 观感；架构/Sprint/AI 见 `07`–`11`

### 13/14/15 裁定指针（本手册未写死的）

- 分页信封 `{items,page,size,total}`，`page` 从 0；完整 JSON / 助手 `{summary,summaryAvailable,cards}` 见 **14**。
- 解绑：`DELETE /customers/{id}/vehicles/{vehicleId}` → **204**。已售不可新挂（`400 WRONG_DEALER_OR_SOLD`）、不可解挂（`409 SOLD_LOCKED`）。**15** 管行为，**14** 管 HTTP。
- GET listing 无行：**不落库**、虚拟空草稿；首次 PATCH 用 `''` 满足 NOT NULL（**15**）。
- 租户权威 `membership.active=1`；忽略客户端 `dealerId`；跨店 **404**；店员无有效 membership 调业务接口 **403** `FORBIDDEN`（不是 401/404）。
- `/me` 带 `dealerLegalName`；Admin 列表带 `staffCount`。`SOLD_LOCKED` 一律 **409**。

---

## 1. 一句话产品 + 硬约束

独立车商用的多租户后台：一家店一份 DMS/CRM/广告数据；平台管理员只开店、绑员工。

| 项 | 必须 |
|---|---|
| 语言 | 后端 **Java 21**（可与 ai-manager 对齐用 17，但四个课仓统一一个版本，优先 21）。前端 **Vue 3 + Element Plus + MSAL.js**。界面英文。 |
| 仓库 | **四个独立应用仓**：`dealer-web`、`dealer-gateway`、`dealer-core`、`ai-service`。另加 `dealer-platform` 放 Bicep/compose/流水线说明。禁止 monorepo。 |
| 入口 | 浏览器与服务间 HTTP **只走 Spring Cloud Gateway**。core / ai-service 不对外。绕过 Gateway 必须失败。 |
| 身份 | **Microsoft Entra ID** OAuth/OIDC + PKCE + JWT。角色仅 `Platform.Admin`、`Dealer.User`。不建密码表。管理员「发账号」= 绑定 `entra_oid` → `dealer_id`。 |
| 数据 | **一个 MySQL** 库 `dealer_core`。Flyway 管表。AI 服务无库。 |
| AI | `ai-service` **进程内**嵌 `YUANDONG-YANG/ai-manager`。同步 REST。超时由适配器保证 **15s**。 |
| 调用 | 同步 REST。 |

规格 PDF 写了用户名密码；**PPT 禁止自研认证**，以 Entra 为准。规格没有 Assistant 页；**PPT 要求真实 AI 核心功能**，按 v6/10/12 做只读助手。

---

## 2. 页面与角色矩阵

| 页面 | 角色 | 做什么 | 落地 |
|---|---|---|---|
| Login | 全员 | 仅 `Sign in with Microsoft`，无侧栏、无密码框 | 登录页 |
| Admin | 仅 Platform.Admin | 开店；绑/解绑员工。**零**车辆/客户/广告数据 | 管理员默认页 |
| DMS | 仅 Dealer.User | 本店车辆增改查、成对登记出售 | 店员默认页 |
| CRM | 仅 Dealer.User | 本店客户增改查；挂本店未售未占车 | — |
| Ad compliance | 仅 Dealer.User | 选车写广告、规则+AI、通过后导出 TXT | — |
| Assistant | 仅 Dealer.User | 本店只读问答，最多 5 张资源卡 | — |

一家店多名店员看同一份数据。店 A 看不到店 B。管理员开完店也看不到业务。无 KPI 首页。无权限路由直接拦。

---

## 3. 完整字段与枚举

**不加减字段。** 不要 mileage / 颜色 / 燃油 / 买家公开页。

### 店 `dealer`

`legalName*` `contactPhone*` `contactEmail*` `contactAddress*` `active` `version`

广告「店名和联系方式」用这四个公开字段，不另建资料表。

### 用户与成员

`app_user`：`entraTenantId` `entraOid` `displayName` `role`=`Platform.Admin`\|`Dealer.User` `dealerId`（Admin 为空）`active`  
`membership`：`dealerId` `entraOid` `active` `createdBy`  
店员每个请求：JWT 角色 + 本地 membership。**忽略前端传来的店 ID。**

### 车辆 DMS（规格必填/可选）

必填：`make` `model` `modelYear` `vin` `source` `purchaseCost` `addedOn` `conditionCode`  
可选：`repairCost` `carfaxUrl` `soldOn` `soldPrice`  
派生：`status`=`IN_STOCK`\|`SOLD` `version` `dealerId`

| 枚举 | 值 |
|---|---|
| `source` | `TRADE_IN` `AUCTION` `PRIVATE_PURCHASE` `OTHER` |
| `conditionCode` | `CERTIFIED` `AS_IS` `UNFIT` `IRREPARABLE` |

规则：店内 VIN 唯一。已售后 **采购字段不可改**（make/model/year/vin/source/purchaseCost/addedOn/repairCost/carfax）。`soldOn` 与 `soldPrice` **必须一起填**。出售把 `status` 置 `SOLD`。

### 客户 CRM

必填：`name` `email` `phone` `homeAddress`  
购车：`customer_vehicle(customerId, vehicleId)`，车辆 **全局唯一挂一个客户**。只挂 **本店 + IN_STOCK + 未挂** 的车。一客户可多车。

### 广告 listing（一车一条）

`title*` `body*` `adKind`=`CASH`\|`FINANCE`\|`LEASE` `medium`=`ONLINE`\|`RADIO_TV_BILLBOARD`  
`status`=`DRAFT`\|`READY` `contentVersion` `lastCheckId` `version`

OMVIC **检查项在广告正文 + 已知车辆/店字段里找**，不另加 APR/租期等列。缺了就 Blocked 或让 AI 标缺失。

**始终查：** 店名和联系方式；既往用途（如适用：警车/出租/日租等，看正文有无该披露）；新旧/年份（用 `modelYear` + 正文）；延保（如正文声称有）；价格；车况（`conditionCode`）。  
**FINANCE 另查：** APR、期限、现金价。`RADIO_TV_BILLBOARD` **免**「和利率并列展示」。  
**LEASE 另查：** 租赁声明、租期、租金、APR、首付；年额度低于 20000 km 要超额公里费（看正文是否声明额度/费用）。

改车辆 **价格相关对外信息或车况**、或改广告标题/正文/类型/媒介 → `contentVersion++`，旧检查作废（Stale）。没有「对外标价」列：车况变或 listing 变即作废。采购成本变更不单独当广告失效条件（已售采购已锁）。

### 检查 `compliance_check`

`contentVersion` `ruleFindings`（JSON 数组）`aiStatus` `aiNotes`（JSON）`recommendation`

| 字段 | 值 |
|---|---|
| `aiStatus` | `SKIPPED` `SUCCESS` `FAILED` `UNAVAILABLE` |
| `recommendation` | `BLOCKED` `NEEDS_AI` `PASSED` `UNAVAILABLE` |

### 审计 `audit_event`（DMS/CRM 每次改）

`actorOid` `entityType`=`VEHICLE`\|`CUSTOMER`\|`CUSTOMER_VEHICLE` `entityId` `action`=`CREATE`\|`UPDATE`\|`SELL`\|`LINK`\|`UNLINK` `fieldSummary`（JSON，**不要**写客户电话/邮箱/住址全文）`createdAt`  
管理员操作可记 `DEALER`/`MEMBERSHIP`，`dealerId` 可空。

---

## 4. 表清单（对齐 Flyway）

以骨架为准，**不要另写一套表**：

`d:\常用文件\SAIT\26fall\Capstone\Project Topics\DealerOps\dealer-core\src\main\resources\db\migration\V1__init.sql`

| 表 | 用途 |
|---|---|
| `dealer` | 店 |
| `app_user` | Entra 用户缓存 + 角色 |
| `membership` | 店员绑定 |
| `vehicle` | DMS |
| `customer` | CRM |
| `customer_vehicle` | 一车一客 `uk_cv_vehicle` |
| `listing` | 一车一广告 `uk_listing_vehicle` |
| `compliance_check` | 检查快照 |
| `audit_event` | 审计 |

缺口（编码时用实体/校验补，能不改 SQL 就不改；非改不可再用 `V2__*.sql`）：

- `vehicle.status` 只允许 `IN_STOCK`/`SOLD`。
- `listing` 缺 `last_check_id` 外键（SQL 已有列无 FK）——应用层维护即可。
- 无「既往用途 / 延保 / APR」列，正确。
- 索引：`vehicle(dealer_id,status)`、`customer(dealer_id)` 可 V2 加，非开工阻塞。

只 Flyway，禁止 `ddl-auto=update`。

---

## 5. API 清单

浏览器只打 Gateway `http://localhost:8080`，前缀 `/api/v1`。core=`8081`，ai-service=`8082`，禁止浏览器直连。

统一错误体：`{"code":"VIN_DUP","message":"..."}`。跨店 id → **404**（不 403，防探测）。Admin 打业务 URL → **403** `FORBIDDEN`，响应无业务字段。店员无有效 membership → **403**。乐观锁：写带 `version`，冲突 `409 VERSION_CONFLICT`。JSON 形状见 **14**。

| 方法 | 路径 | 谁 | 关键校验 | 错误码 |
|---|---|---|---|---|
| GET | `/me` | 已登录 | 回 `role`、`dealerId`（Admin 空） | 401 |
| GET | `/admin/dealers` | Admin | — | 403 |
| POST | `/admin/dealers` | Admin | 四联系字段非空 | 400 VALIDATION |
| GET | `/admin/dealers/{id}/members` | Admin | — | 404 |
| POST | `/admin/dealers/{id}/members` | Admin | `{entraOid,displayName}`；写 `membership`+`app_user` | 400 409 DUP_MEMBER |
| DELETE | `/admin/dealers/{id}/members/{entraOid}` | Admin | 解绑，不删 Entra 账号 | 404 |
| GET | `/vehicles` | 店员 | 本店；查询 `q`(VIN/Make/Model) `status` `condition`；每页 10 | 403 |
| POST | `/vehicles` | 店员 | 必填；VIN 本店唯一 | 400 VIN_DUP |
| GET/PATCH | `/vehicles/{id}` | 店员 | 已售禁改采购字段 | 404；`409 SOLD_LOCKED` |
| POST | `/vehicles/{id}/sell` | 店员 | `{soldOn,soldPrice,version}` 成对 | 400 SOLD_PAIR_REQUIRED |
| GET | `/customers` | 店员 | `q` + `linked` 是否已挂车 | 403 |
| POST | `/customers` | 店员 | 四字段 | 400 |
| GET/PATCH | `/customers/{id}` | 店员 | 本店 | 404 |
| PUT | `/customers/{id}/vehicles/{vehicleId}` | 店员 | 同店、未售、未挂；已售不可新挂 | 409 VEHICLE_ALREADY_LINKED 400 WRONG_DEALER_OR_SOLD |
| DELETE | `/customers/{id}/vehicles/{vehicleId}` | 店员 | 解绑 → 204；已售不可解挂 | 404；`409 SOLD_LOCKED` |
| GET/PATCH | `/vehicles/{id}/listing` | 店员 | GET 无行=虚拟空草稿不落库；首次 PATCH 用 `''` | 404 |
| POST | `/listings/{id}/checks` | 店员 | 本店+version；先规则后 AI；最多等 15s | 404 409 502 AI_UNAVAILABLE |
| POST | `/listings/{id}/ready` | 店员 | 仅当前检查 Passed 且非 Stale | 409 CHECK_STALE / NOT_PASSED |
| POST | `/listings/{id}/exports` | 店员 | 同上；`text/plain` TXT | 409 CHECK_STALE / NOT_PASSED |
| GET | `/audit?entityType=&entityId=` | 店员 | 只本店；Admin 不给业务实体 | 404 |
| POST | `/assistant/ask` | 店员 | `{text}`；不写业务表 | 403 |

**仅内部（Gateway → ai-service，浏览器 404）：**

| 方法 | 路径 | 调用方 | 体 |
|---|---|---|---|
| POST | `/internal/v1/ad-check` | core 经 Gateway | `{listing,vehiclePublic,dealerPublic}` |
| POST | `/internal/v1/assistant` | core 经 Gateway | `{question,resources[]}` |

`vehiclePublic`：year/make/model/vin/condition/source，**无**采购成本。`dealerPublic`：店名+三联系。助手 `resources` 已由 core 滤过，无电话/邮箱/住址。内部成功/失败 JSON **以 PROTOCOL 为准**（见上文「内部 AI 体」），不要抄 T22 / OpenAPI 的 `{failed,reason}`。

---

## 6. 广告检查状态机 + ai-manager

页面总状态 **只允许** 这五个（英文 UI）：

| UI | 服务端条件 |
|---|---|
| **Blocked** | 固定清单有硬缺（如无价格、FINANCE 无 APR）→ `recommendation=BLOCKED`，`aiStatus=SKIPPED`，**不调模型** |
| **Needs AI review** | 规则无硬阻断，尚无成功 AI，或刚提交检查中 |
| **Passed** | 最近检查 `PASSED` 且 `check.contentVersion == listing.contentVersion` |
| **Stale** | 曾通过，但版本已升（改广告或车况等） |
| **AI unavailable** | 规则过了但 AI 超时/失败 → `UNAVAILABLE`，**禁止当 Pass** |

仅 **Passed 且非 Stale** 才能 Ready / Export TXT。TXT 内容=店公开信息 + 车辆公开字段 + 标题正文 + 检查时间，不写成本/客户。

```
店员 POST /listings/{id}/checks
  → core 校验本店 + version
  → 跑固定清单
  → 无硬阻断则 core 经 Gateway POST /internal/v1/ad-check（≤15s）
  → 写入 compliance_check，回写 listing.last_check_id
  → 失败：UNAVAILABLE，按钮不能 Pass
```

### 接 ai-manager（已核实）

- 仓：https://github.com/YUANDONG-YANG/ai-manager（private）  
- 钉死 commit：`c07e1f2afe5dd692c20f3567ad3a42a90d31a87a`  
- Maven：`com.aimanager:aimanager:1.0.0-SNAPSHOT` → **实施时从该 commit 打不可变版本再引用**  
- 包：GitHub Packages `https://maven.pkg.github.com/YUANDONG-YANG/ai-manager`  
- API：`com.manager.AiManager`：`request(String)`、`startConversation(id, systemMessage)`、`closeConversation`  
- 厂商：groq / openai / claude / deepseek。**无 mock provider。**

适配器只做：

1. 广告：`startConversation`，system=OMVIC 清单，user=广告 JSON；`finally` `closeConversation`。先 `AIResponse.isSuccess()` 再解析 content。  
2. 助手：新建短会话，只收已过滤本店资源。

**禁止：** 扫描/暴露 `com.gateway`（`/api/ai/request` `/chat` `/credentials` `/runtime`）；启动 `AIApplication`；给组件单独容器；CI 打付费端点（CI 用 stub）。  
Key：仅 ai-service 的 `AIMANAGER_API_KEY`（环境变量 / Key Vault）。库内 OpenAI 路径无 15s 保证 → **适配器自设 connect/response 超时**。关掉库限流队列。

---

## 7. 前端 UI 规范摘要

- 栈：Vue 3 + **Element Plus**。英文。6 页。不要 fork 经销商整仓。  
- Login：居中单卡，一颗 Microsoft 按钮。  
- 其余：左菜单 + 顶栏（店名或 `Platform Admin`、角色、`Sign out`）。Admin 只见 Admin；店员只见 DMS/CRM/Ad/Assistant。  
- 主按钮右上；出售/解绑二次确认。  
- **每页必须** loading / empty / error。失败不当空表。AI 失败不能显示 Pass。  
- 表每页 10 条。状态用 Tag。操作列最多 3 个文字链。已售行变淡，采购只读。  
- 筛一行：搜索 + 1–3 下拉 + Search + Reset。不要价格滑条/地图。  
  - DMS：VIN/Make/Model；Status；Condition  
  - CRM：Name/Email/Phone；是否已挂车  
  - Admin：店名 / 员工邮箱  
- 表单：抽屉或 Dialog；枚举 Select。出售小窗：Sold date + Sold price。CRM 挂车：可搜索 Select，只列本店未挂未售；已占禁用。  

**表列**

| 页 | 列 |
|---|---|
| Admin 店 | Name, Contact, Staff count, Actions |
| Admin 成员 | Entra ID / email, Dealership, Status, Actions |
| DMS | Year Make Model, VIN, Source, Condition, Cost, Status, Actions |
| CRM | Name, Email, Phone, Linked vehicle, Actions |
| Ad | Vehicle, Type, Medium, Check status, Actions |

**Ad 页：** 左表单、右结果；清单随 CASH/FINANCE/LEASE 与媒介即时变。  
**Assistant：** 一问一答 + 最多 5 张本店资源卡（点进普通页）。卡上无电话/邮箱/住址。模型挂了仍显示检索列表 + `Smart summary unavailable`。

---

## 8. 五仓库、职责、Sprint 完成定义

| 目录 | 技术 | 谁 | 职责 |
|---|---|---|---|
| `dealer-web` | Vue3 + MSAL + Dockerfile + 自己的 pipeline | **A** | 6 页、登录、web 流水线 |
| `dealer-gateway` | Spring Cloud Gateway + Dockerfile + pipeline | **C**（A 评审） | 只路由/验 JWT 转发；挡 `/internal` 对浏览器 |
| `dealer-core` | Boot + Flyway + 一库 + Dockerfile + pipeline | **C** | 租户隔离、业务 API、调 AI |
| `ai-service` | Boot 无库 + 内嵌 JAR + Dockerfile + pipeline | **B** | 适配器、OMVIC 清单文案、真实模型、ai 流水线能拉私有包 |
| `dealer-platform` | Bicep、compose、各 pipeline YAML 说明 | **B** 初稿 / 全员证 | 不跑业务代码 |

组员 A/B/C **姓名仍缺**，先按角色写卡。

**Sprint 1（Review 1）**  
四空仓能独立构建；讲清 07 架构图；Entra 两角色配上；直连 core 失败、只走 Gateway。对应 NN-01–03。

**Sprint 2（Review 2）**  
Azure 上：登录 → Gateway → 录一辆车 → **真实 AI** 扫一段广告。无明文密钥；HTTPS；Key Vault。NN-04–11、NN-15。本地-only 演示课上不算。

**Sprint 3（Review 3）**  
两家店隔离；CRM 挂车；三类广告清单；导出；审计；Assistant。功能冻结。NN-12–14、16–20。看板 + 课后 1–2 段 + 三人各自讲证据（NN-21–24，全程）。

demo 发布需另一人批准。禁止门户手工发应用。改谁只构建谁。

---

## 9. 环境变量

抄自 `DealerOps\dealer-platform\env.example`，编码时按仓拆开，**不要提交真实值**。

| 变量 | 给谁 | 说明 |
|---|---|---|
| `VITE_ENTRA_TENANT_ID` | web | |
| `VITE_ENTRA_CLIENT_ID` | web | SPA，不要 client secret |
| `VITE_ENTRA_API_SCOPE` | web | 默认 `api://dealer-api/access_as_user` |
| `VITE_GATEWAY_URL` | web | `http://localhost:8080` |
| `GATEWAY_PORT` | gateway | `8080` |
| `CORE_URL` | gateway | 本地 compose 用 `http://host.docker.internal:8081` |
| `AI_URL` | gateway | `http://host.docker.internal:8082` |
| `CORE_PORT` | core | `8081` |
| `MYSQL_URL` | core | `jdbc:mysql://localhost:3306/dealer_core?...` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | core | 本地示例 `dealer` / `dealer_dev_only` |
| `AI_PORT` | ai | `8082` |
| `AIMANAGER_API_KEY` | **仅 ai-service** | 真实 Key，进 Key Vault |
| `AIMANAGER_GATEWAY_PROVIDER` | ai | `openai` 等库已支持厂商 |
| `AIMANAGER_GATEWAY_MODEL` | ai | |
| `ENTRA_ISSUER` | gateway+core | `https://login.microsoftonline.com/<tenant>/v2.0` |
| `ENTRA_AUDIENCE` | gateway+core | `api://dealer-api` |

聊天里不要发订阅密码、secret、模型 Key 正文。

---

## 10. 明确禁止实现

- 买家站 / 公开库存站 / 厂家端  
- 工单、线索漏斗、试驾、统计 KPI 看板、CSV 导入  
- Service Bus、outbox、DLQ、消息队列、第二数据库、向量库  
- 第三方自动刊登、支付、Image Studio、Cloudinary  
- 自研模型 SDK / 对话引擎；部署 ai-manager 的 `com.gateway` 或第五容器  
- 自建用户名密码、把密码当「更简单」方案  
- C#、contracts 独立仓、把 01–06 范围救活  
- 把参考仓 `references/carventory`、`car-dealer-crm` 整仓当运行模块（可看交互，不抄买家/工单/PostgreSQL/密码登录）  
- CI 打真实付费模型；把 SNAPSHOT 当正式发布号不钉 commit  
- 前端传 `dealerId` 当权威；Admin join 车辆/客户  

---

## 11. 编码顺序（小任务）

每步可独立 PR。未完成不要跳到「大而全前端」。

| # | 仓库 | 任务 | 完成标准 |
|---|---|---|---|
| 1 | 本机 | 升 JDK 17/21，设 `JAVA_HOME` | `java -version` 为 17 或 21 |
| 2 | web/gateway/core/ai 四仓 | 空工程 + Dockerfile + 能 `mvn/npm` 构建 | 四仓各自 CI 绿（编译即可） |
| 3 | core | 接上现有 `V1__init.sql`，实体与枚举 | Flyway 能在空库起表；无额外业务列 |
| 4 | gateway | 路由 `/api/v1/**`→core，`/internal/v1/**`→ai；拒浏览器打 internal；拒直连演示 | 8080 通，8081 对浏览器失败 |
| 5 | gateway+core | Entra JWT + 两角色；`GET /me` | 无 token 401；假 dealerId 无效 |
| 6 | core | Admin 开店/绑人 | 两店两员可插库验证 |
| 7 | core | 车辆 CRUD + 出售 + 审计 | VIN 唯一；已售锁采购；出售成对；有 `audit_event` |
| 8 | core | 客户 + 挂车 + 审计 | 跨店 404；一车一客 409 |
| 9 | core | listing PATCH + **固定规则引擎**（不调 AI） | 缺价 / FINANCE 缺 APR → Blocked |
| 10 | ai-service | 进程内 AiManager 适配器 + 15s 超时 + stub 测试 | 不暴露 `com.gateway`；CI 不打真模型 |
| 11 | core+ai | `POST .../checks` 经 Gateway；失败 UNAVAILABLE | 改车况后旧检查 Stale |
| 12 | core | ready + export TXT | 非 Passed 或 Stale 拒绝 |
| 13 | core+ai | `POST /assistant/ask`：最多 5 条、核对本店 ID、不写库 | 乱编路径丢弃；模型挂只回列表 |
| 14 | web | 6 页按第 7 节；登录分流 | Admin 看不见 DMS；空/错/载齐全 |
| 15 | platform | compose 起 MySQL+四服务；Bicep/流水线等 Azure 权限后再填 | 本机能走通录车；云上是 Sprint 2 项 |

---

## 12. 开工前阻塞（本机真实缺口）

**不要假装已具备。** 来源：`DealerOps\PREP-CHECKLIST.md`。

| 项 | 现状 | 卡住谁 |
|---|---|---|
| JDK 17/21 | **缺**，本机 JDK 11，Boot 3 编不过 | 全部 Java 仓 |
| Docker Desktop | **缺** | 本地 MySQL 容器、打镜像 |
| 组员 A/B/C 姓名 | **缺** | 分工卡、Review 署名 |
| Azure 订阅 | **缺** | Sprint 2 云演示（Container Apps、MySQL、ACR、Key Vault） |
| Entra 权限 | **缺** | 登录、两角色、绑用户 |
| 模型 Key | **缺** | Sprint 2 真实 AI（`AIMANAGER_API_KEY`） |
| ai-manager 固定版 | **未发布** | 从 `c07e1f2` 打不可改版本，或本机 `mvn install` |

已有：规格 PDF、PPT、本手册、`SCOPE-BASELINE`、后端设计 **DEVELOPMENT-DESIGN**、**13/14/15**、拆包 18/19、验收 16、广告夹具 17、Node 20、Maven 3.6、Git、`gh` 已登录 `YUANDONG-YANG`、Flyway V1、API/env 草稿。

Sprint 1 前最好还有：两个店员 Entra 号 + 一个管理员；回调 `http://localhost:5173`；选定 Azure DevOps 或 GitHub Actions；预算上限（MySQL + Container Apps 持续计费）。

**现在就能写、不依赖云的：** 任务 2–9、10 的 stub、14 的静态页。任务 1 不做则 Java 编不过。任务 5 可用测试 JWT，但 Sprint 2 必须换成真 Entra。

---

## 验收速查（课上能点）

1. Admin 开两家店、各绑一人。  
2. 店 A 录车、录客户、挂车；店 B 看不见。  
3. Admin 打车辆接口被拒且无字段。  
4. 缺价或融资缺 APR → Blocked。  
5. 真实广告文本走一次真实 AI，能指出缺失。  
6. 改价/车况/正文后不能用旧检查导出。

课程六硬项对照：独立仓+流水线；Gateway；Azure+容器+Bicep+CI/CD；Entra+JWT+RBAC+HTTPS+Key Vault；真实模型扫广告；Scrum 看板与三次全员 Review。
