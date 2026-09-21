# DealerOps 后端设计

版本：v1.2 · 2026-09-21

本文是 **后端设计文档**（`dealer-gateway` / `dealer-core` / `ai-service`）。  
不替代规格 PDF 的字段与枚举；不替代 PPT 六硬项。  
HTTP 路径、DTO、OpenAPI 细处仍看 **`14`**（及仓库 OpenAPI）。数据列与 Flyway 行为仍可对 **`15`**。规则引擎正则与内部 prompt 看 **`AI-PROTOCOL-AND-RULES.md`**。  
**冲突序：PPT 六硬项 > 规格 PDF 字段 > 本文 + PROTOCOL > `14` / `15`。**  
前端仍看 **`13`**。范围对齐 `SCOPE-BASELINE.md` + `00` v6；`01`–`06` 不作依据。  
已裁定、不再并列：跨店 **404**；`DUP_MEMBER`；内部失败 **504/503/502**；对外检查 **502 `AI_UNAVAILABLE`**；**Blocked 不调 AI**。  
`aiStatus` 只允许 **`SKIPPED` `SUCCESS` `FAILED` `UNAVAILABLE`**。禁止 `INVALID_RESPONSE` / `MOCK`。  
四仓骨架已在；本文只补还缺的业务实现约定。  
浏览器只打 Gateway；core / ai-service 不对浏览器。  
不做工单、线索、买家站、Service Bus、独立 auth 仓、第二库、密码登录。

---

## 1. 课硬项（后端）

| 硬项 | 本文约定 |
|---|---|
| 四仓 | `dealer-web` / `dealer-gateway` / `dealer-core` / `ai-service`（IaC：`dealer-platform`）。**仓已在，缺业务实现。** |
| Gateway | 浏览器只打 `:8080` `/api/v1`。直连 `:8081` / `:8082` 失败。 |
| Entra | JWT 角色仅 `Platform.Admin` / `Dealer.User`。Gateway 与 core 都验。无密码表。 |
| 真实 AI | `ai-service` 内嵌 GitHub `ai-manager`。失败不得 Pass。CI 不打付费模型。 |
| 多租户 + 审计 | 店 A 不见店 B；Admin 零业务数据；DMS/CRM 每次改记谁/做什么/何时。 |
| 广告 + TXT | 固定规则先跑；Passed 且非 Stale 才能 Ready / 导出 TXT。 |

演示：两店隔离；Admin 打车辆 **403**；缺价 / 融资缺 APR → **200 BLOCKED** 且不调 AI；真实模型跑一次；改价后旧检查不可导出。

---

## 2. 端口与路径（短）

| 进程 | 端口 | 听什么 |
|---|---|---|
| gateway | **8080** | `/api/v1/**` → core；`/internal/v1/**` → ai（须内部头）。CORS 仅 `http://localhost:5173`。不写业务。 |
| core | **8081** | 业务与事务。无浏览器 CORS。出站只打 Gateway，禁止直连 8082。 |
| ai-service | **8082** | 无库。不部署 `ai-manager` 的 `com.gateway`。 |
| web | 5173 | 只打 8080 `/api/v1`。 |

对外族（JSON 形状见 14）：`GET /me`；`/admin/dealers` + members；`/vehicles` + `.../sell`；`/customers`；`PUT\|DELETE /customers/{id}/vehicles/{vehicleId}`；`GET\|PATCH /vehicles/{id}/listing`；`POST /listings/{id}/checks\|ready\|exports`；`GET /audit`；`POST /assistant/ask`。  
内部：`POST /internal/v1/ad-check`、`POST /internal/v1/assistant`。浏览器打这两条 → **404**。

信封 `{ items, page, size, total }`（size 默认且封顶 10）。错误 `{ code, message }`。写带 `version`。忽略客户端 `dealerId`。

---

## 3. 九表（V1，不加减）

`dealer-core/src/main/resources/db/migration/V1__init.sql`：  
`dealer` · `app_user` · `membership` · `vehicle` · `customer` · `customer_vehicle` · `listing` · `compliance_check` · `audit_event`。  
禁止 `ddl-auto=update`。禁止加工单/线索/密码表。

| 不变量 | 写死 |
|---|---|
| 租户 | 店员 = `membership.active=1` 恰好一行。`app_user.dealer_id` 只是 `/me` 缓存。 |
| 一人一店 | 任意店已有 active → **409 `DUP_MEMBER`**。曾解绑则重激活。≥2 条 active → 拒业务。 |
| VIN / 挂车 | VIN 店内唯一。一车一客。 |
| 审计 | 不写客户联系全文、密钥、模型堆栈。 |

---

## 4. 编码硬点（短表）

| 点 | 写死 |
|---|---|
| 跨店 | 先按本店加载。本店无此 id（含他店真实 id）→ **404**，不 403。Admin 打业务 URL → **403**。无/坏 JWT → **401**。店员无店 → 业务 **403**，`GET /me` 仍 200 且 `dealerId=null`。 |
| 空草稿 | `GET /vehicles/{id}/listing` 无行：**不插库**。虚拟草稿 `id=null`，`title`/`body`=`""`，`adKind=CASH`，`medium=ONLINE`，`DRAFT`，`contentVersion=1`，`lastCheckId=null`，`version=0`。PATCH 把 `null` 收成 `''`。 |
| SOLD | 只走 `POST /vehicles/{id}/sell`：`soldOn` + `soldPrice` + `version`。缺一、日期非法、或 `soldPrice <= 0` → **400 `SOLD_PAIR_REQUIRED`**（不用 `VALIDATION`）。`IN_STOCK` ⇔ 两字段 NULL；`SOLD` ⇔ 都有且价 > 0。已售锁采购。PATCH 不改 `status`/`soldOn`/`soldPrice`。再售 → **409 `SOLD_LOCKED`**。 |
| 挂车 PUT | 无店 403 → 跨店/无 id **404** → 本店非 `IN_STOCK` **400 `WRONG_DEALER_OR_SOLD`** → 已挂 **409 `VEHICLE_ALREADY_LINKED`**。`WRONG_DEALER_OR_SOLD` **只**用于本店已售/非在库，禁用于跨店。 |
| 解绑 DELETE | 同路径 → **204**。无关联或跨店 → **404**。本店车 `SOLD` → **409 `SOLD_LOCKED`**。不改车辆 `status`。 |
| 内部头 | `X-Dealer-Internal` = `INTERNAL_TOKEN`，本地默认 **`dealer-internal`**（gateway / core 出站 / ai 同一默认）。缺头或错值 → **404**。不转发用户 JWT。CORS `allowedHeaders` 不列该头。 |
| Blocked 不调 AI | `hard[]` 非空或空草稿 → 落库 `recommendation=BLOCKED`，`aiStatus=SKIPPED`，HTTP **200**，`AiGatewayClient` **零调用**。空草稿立即 hard：`PRICE_MISSING`、`DEALER_NAME_MISSING`、`CONDITION_UNDISCLOSED`。缺价 / `FINANCE` 无 APR 同理 hard。 |

其余 HTTP 码见 14。已吸收：`DUP_MEMBER` 含他店 active。

---

## 5. 检查、AI 态、TXT

`POST /listings/{id}/checks` `{ "version" }`：本店 + 乐观锁 → 组公开输入（车辆无采购/修理/售价）→ core 固定规则 → 再决定是否调 AI。system prompt **不**再塞 OMVIC 硬清单。

| `aiStatus` | 何时 |
|---|---|
| `SKIPPED` | 硬缺，未调模型 |
| `SUCCESS` | 内部 200 且 `success=true` |
| `FAILED` / `UNAVAILABLE` | 规则过了但模型/传输失败。对外都当不可用，**不得 Pass**。禁止再引入 `MOCK` / `INVALID_RESPONSE` |

`recommendation`：`BLOCKED` \| `NEEDS_AI` \| `PASSED` \| `UNAVAILABLE`。  
页面 `checkStatus`（14）：`BLOCKED` \| `NEEDS_AI` \| `PASSED` \| `STALE` \| `AI_UNAVAILABLE`。

| 步骤 | 库 + HTTP |
|---|---|
| hard 非空 | `BLOCKED` + `SKIPPED`，**200**，不调 AI |
| AI 成功 | `PASSED` + `SUCCESS`，**200** |
| AI 失败 | 仍落库 `UNAVAILABLE`（或 `FAILED`），回写 `last_check_id`，对外 **502 `AI_UNAVAILABLE`** |

内部失败（PROTOCOL，不对浏览器）：超时 **504 `AI_TIMEOUT`**；缺 Key **503 `AI_KEY_MISSING`**（立即返回，不挂 15s）；其余 **502 `AI_PROVIDER_FAILED`**。体 `{ success:false, code, message }`。成功 ad-check `{ success:true, notes:[{message}] }`；assistant `{ success:true, summary }`。

超时两端：**connect 2s + response 13s = 15s**。core 出站经 Gateway，头 `X-Dealer-Internal`。

改 listing 或车辆价格/车况 → `contentVersion++`，`DRAFT`，**不**清空 `lastCheckId` → 曾 Passed 则派生 **STALE**。Ready / Export 仅 Passed 且非 Stale，否则 **409**。导出 `text/plain; charset=UTF-8`。

助手：AI 失败对外仍 **200**（`summary=null`，`summaryAvailable=false`，`cards` 保留本次检索）。不写库。资源无电话/邮箱/住址。

---

## 6. 还缺什么

三 Java 仓与 V1 已在，**还缺** JWT/membership 业务、DMS/CRM/挂车、检查+AI 适配、审计写路径。不要一次生成整套。不要把工单/总线/第二库加回来。
)
