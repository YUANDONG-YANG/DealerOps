# 后端 API 开发契约

版本 v6.0 · 2026-09-21  
**现行有效。** 废止的 `01`–`06`（含 `04-API-Contract.md`）不是现行 API。旧 DTO 只借鉴信封形状，实体以 v6 / Flyway `V1__init.sql` 为准。

**冲突顺序：** 课程 PPT 硬项 > 规格 PDF 字段 > [IMPLEMENTATION-BRIEF.md](IMPLEMENTATION-BRIEF.md) / `00` > **[15](15-Data-Auth-and-Gateway.md) 管数据/租户/网关行为**，**本文管 HTTP JSON** > [13](13-Frontend-Engineering.md) 前端工程 > [12](12-Frontend-UI-Conventions.md)。  
**入口：** 浏览器与服务间对外只走 Gateway `http://localhost:8080`，前缀 **`/api/v1/**`**。core=`8081`、ai-service=`8082` 不对外。绕过 Gateway 必须失败。  
**内部：** Gateway → ai-service 的 `/internal/v1/**` 对浏览器 **404**，本文只写给 core 适配器用。

路径表摘要见 `dealer-platform/API.md`。编码以本文 JSON 与错误码为准。

---

## 0. 本文新裁定 vs 只复述手册

数据列空值、`membership` / `app_user` 谁是权威、索引与 V2，一律留给 **15 号数据文档**。本文只写 HTTP 行为。

| 类型 | 内容 |
|---|---|
| **只复述手册** | 角色两枚、忽略前端 `dealerId`、跨店 **404 不 403**、Admin 打业务 URL 无业务字段、错误体 `{code,message}`、写带 `version` → `409 VERSION_CONFLICT`、广告五态条件、检查先规则后 AI（≤15s）、Ready/Export 仅 Passed 且非 Stale、助手不写业务表、内部 `vehiclePublic` 无采购成本、助手 `resources` 无电话/邮箱/住址、列表默认每页 10、VIN 本店唯一、出售成对、已售锁采购、一车一客 |
| **本文新裁定** | 分页信封 `{items,page,size,total}`（手册只写每页 10，未写信封）；**解绑** `DELETE /customers/{id}/vehicles/{vehicleId}` → 204；Admin **GET/PATCH** 单店（手册只有列表+创建）；`SOLD_LOCKED` 一律 **409**；Blocked 检查 **200**；`AI_UNAVAILABLE` **502** 且已落库；派生字段 `checkStatus` / `staffCount` / 列表 `linkedVehicle`；400 `VALIDATION` 可带 `fieldErrors`；JSON `id` 为数字（不用废止稿的字符串 id）；金额为 JSON number；Admin↔业务 URL 角色错为 **403** `FORBIDDEN`；解绑/绑定的 HTTP 语义（行是否软删交给 15） |
| **对齐 15** | GET listing 无行：**不落库**、虚拟空草稿；首次 PATCH 用 `''` 满足 `title`/`body` NOT NULL。租户权威 `membership.active=1`；忽略客户端 `dealerId`。跨店 id → **404**。店员无有效 membership 调业务接口 → **403** `FORBIDDEN`（已登录无店，不是 401/404）。已售车：不可新挂（`400 WRONG_DEALER_OR_SOLD`）、不可解挂（`409 SOLD_LOCKED`） |

---

## 1. 统一信封与横切规则

### 1.1 成功

- 单对象：直接返回 DTO（无再包一层 `data`）。
- 分页：`page` 从 **0** 起；`size` 默认 **10**，服务端封顶 **10**（对齐手册「每页 10」）。

```json
{
  "items": [],
  "page": 0,
  "size": 10,
  "total": 0
}
```

手册未规定列表信封；形状与废止 `04` 相同，**语义按 v6 实体**，不是恢复旧接口。

- `POST` 创建：**201**。
- 更新 / 动作：**200**。
- 解绑成员、解绑车辆：**204** 无 body。
- 导出：**200** `Content-Type: text/plain; charset=UTF-8`。

### 1.2 错误

```json
{ "code": "VIN_DUP", "message": "VIN already exists in this dealership." }
```

`400 VALIDATION` 可增加（新裁定）：

```json
{
  "code": "VALIDATION",
  "message": "Request is invalid.",
  "fieldErrors": { "vin": "must not be blank" }
}
```

禁止把 SQL、堆栈、模型原文回给浏览器。

| HTTP | 何时 |
|---|---|
| 400 | 校验失败、`VIN_DUP`、`WRONG_DEALER_OR_SOLD`、`SOLD_PAIR_REQUIRED` |
| 401 | 无/坏 JWT |
| 403 | 角色不够（Admin↔店员打错前缀）；**店员无有效 `membership.active=1` 调业务接口**（已登录无店）。**不是**跨店 |
| 404 | 本店无此 id、**跨店 id**（防探测，不 403） |
| 409 | `VERSION_CONFLICT`、`DUP_MEMBER`、`VEHICLE_ALREADY_LINKED`、`SOLD_LOCKED`、`CHECK_STALE`、`NOT_PASSED` |
| 502 | `AI_UNAVAILABLE`（规则已过、模型超时/失败；检查行已写） |

### 1.3 身份、租户、乐观锁

- 角色仅 `Platform.Admin`、`Dealer.User`。店员租户权威是 **`membership.active=1` 恰好一行**（15）；`app_user.dealer_id` 只是 `/me` 缓存。
- **忽略** body / query / header 里客户端传来的 `dealerId`。店员租户只来自 JWT `oid` → membership。Admin 的 `dealerId` 恒视为空。
- 跨店资源 id：**404**，不 403（防探测）。
- `Dealer.User` 已登录但 **0 条** active membership：业务接口（`/vehicles` `/customers` `/listings` `/audit` `/assistant`）→ **403** `FORBIDDEN`，不是 401、也不是 404。`GET /me` 仍 200（`dealerId=null`）。
- 带 `version` 的写：`dealer`、`vehicle`、`customer`、`listing`（含 checks/ready/export）。请求 `version` 必须等于当前行。冲突 **409** `VERSION_CONFLICT`。
- `customer_vehicle` 无 `version` 列：挂/解绑不带乐观锁。
- 枚举、必填字段与手册第 3 节一致；不加减规格字段。日期 `YYYY-MM-DD`，时间戳 ISO-8601 UTC。JSON camelCase。

---

## 2. `GET /api/v1/me`

| | |
|---|---|
| 谁 | 已登录 |
| 请求 | 无 body |
| 错误 | `401` 未登录 |

```json
{
  "entraOid": "11111111-1111-1111-1111-111111111111",
  "displayName": "Alex Dealer",
  "role": "Dealer.User",
  "dealerId": 1,
  "dealerLegalName": "Prairie Auto Ltd."
}
```

Admin：`dealerId`、`dealerLegalName` 为 `null`。`dealerLegalName` 为展示用派生字段，不是第二套店资料。

---

## 3. Admin：店 CRUD 与 membership

谁：仅 `Platform.Admin`。店员打这些 URL → **403** `FORBIDDEN`。

### 3.1 `GET /api/v1/admin/dealers`

Query：`q`（匹配 `legalName`）、`page`、`size`。

```json
{
  "items": [
    {
      "id": 1,
      "legalName": "Prairie Auto Ltd.",
      "contactPhone": "403-555-0100",
      "contactEmail": "desk@prairie.example",
      "contactAddress": "100 1 Ave SW, Calgary",
      "active": true,
      "staffCount": 2,
      "version": 0
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

`staffCount`：该店 **active membership** 计数（派生，列定义见 15）。

### 3.2 `POST /api/v1/admin/dealers` → 201

```json
{
  "legalName": "Prairie Auto Ltd.",
  "contactPhone": "403-555-0100",
  "contactEmail": "desk@prairie.example",
  "contactAddress": "100 1 Ave SW, Calgary"
}
```

四联系字段非空。响应同 3.3。错误：`400 VALIDATION`、`403`。

### 3.3 `GET /api/v1/admin/dealers/{id}`

手册无单店 GET。**新裁定：** 补此只读，供 Admin 编辑回填。404 若无此店。响应：

```json
{
  "id": 1,
  "legalName": "Prairie Auto Ltd.",
  "contactPhone": "403-555-0100",
  "contactEmail": "desk@prairie.example",
  "contactAddress": "100 1 Ave SW, Calgary",
  "active": true,
  "staffCount": 2,
  "version": 0
}
```

### 3.4 `PATCH /api/v1/admin/dealers/{id}`

手册无更新。**新裁定：** 允许改四联系字段与 `active`，必须带 `version`。不做 `DELETE /admin/dealers/{id}`（规格未要求删店）。

```json
{
  "version": 0,
  "legalName": "Prairie Auto Ltd.",
  "contactPhone": "403-555-0101",
  "contactEmail": "desk@prairie.example",
  "contactAddress": "100 1 Ave SW, Calgary",
  "active": true
}
```

响应同 3.3。错误：`400`、`404`、`409 VERSION_CONFLICT`。忽略 body.`id`。

### 3.5 `GET /api/v1/admin/dealers/{id}/members`

店不存在 → 404。信封分页（`page`/`size`/`q` 匹配 `displayName` 或 `entraOid`）。

```json
{
  "items": [
    {
      "entraOid": "22222222-2222-2222-2222-222222222222",
      "displayName": "Alex Dealer",
      "role": "Dealer.User",
      "active": true
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

表无员工邮箱列：API **不编造 email**。UI「员工邮箱」筛在现有列上用 `q` 即可。

### 3.6 `POST /api/v1/admin/dealers/{id}/members` → 201

```json
{ "entraOid": "22222222-2222-2222-2222-222222222222", "displayName": "Alex Dealer" }
```

写 `membership` + `app_user`（列权威见 15）。响应同成员项。  
`400 VALIDATION`；店 404；已是该店 **active** 成员 → **409** `DUP_MEMBER`。  
再绑定已解绑对象：按 **重激活** 处理，不 409（是否更新同行交给 15）。不删 Entra 账号。

### 3.7 `DELETE /api/v1/admin/dealers/{id}/members/{entraOid}` → 204

解绑，不删 Entra。无此绑定 → 404。

---

## 4. 车辆 DMS（Dealer.User）

Admin 打本节任一 URL → **403** `FORBIDDEN`（与 CRM/广告/助手相同；体中不得出现 vin/成本等业务字段）。店员只见本店。无有效 membership 的店员 → **403**（见 §1.3）。

列表 Query：`q`（VIN / make / model）、`status`=`IN_STOCK`\|`SOLD`、`condition`（即 `conditionCode`）、`page`、`size`。默认 `createdAt` 倒序。

### 4.1 `GET /api/v1/vehicles`

```json
{
  "items": [
    {
      "id": 10,
      "vin": "1HGCM82633A004352",
      "make": "Toyota",
      "model": "Camry",
      "modelYear": 2020,
      "source": "AUCTION",
      "purchaseCost": 14200.00,
      "addedOn": "2026-09-01",
      "conditionCode": "AS_IS",
      "repairCost": 800.00,
      "carfaxUrl": null,
      "soldOn": null,
      "soldPrice": null,
      "status": "IN_STOCK",
      "version": 0
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

错误：`401`、`403`（非店员）。

### 4.2 `POST /api/v1/vehicles` → 201

```json
{
  "make": "Toyota",
  "model": "Camry",
  "modelYear": 2020,
  "vin": "1HGCM82633A004352",
  "source": "AUCTION",
  "purchaseCost": 14200.00,
  "addedOn": "2026-09-01",
  "conditionCode": "AS_IS",
  "repairCost": 800.00,
  "carfaxUrl": null
}
```

必填：make/model/modelYear/vin/source/purchaseCost/addedOn/conditionCode。  
**忽略** `dealerId`、`status`、`soldOn`、`soldPrice`。服务端 `status=IN_STOCK`。  
错误：`400 VALIDATION`、`400 VIN_DUP`。响应=详情。审计 `VEHICLE`/`CREATE`。

### 4.3 `GET /api/v1/vehicles/{id}`

响应同列表项。跨店/无此车 → **404**。

### 4.4 `PATCH /api/v1/vehicles/{id}`

```json
{
  "version": 0,
  "make": "Toyota",
  "model": "Camry",
  "modelYear": 2020,
  "vin": "1HGCM82633A004352",
  "source": "AUCTION",
  "purchaseCost": 14200.00,
  "addedOn": "2026-09-01",
  "conditionCode": "CERTIFIED",
  "repairCost": 800.00,
  "carfaxUrl": "https://example.invalid/carfax/1"
}
```

白名单仅上列。禁止用 PATCH 改 `status` / `soldOn` / `soldPrice`（走 `/sell`）。忽略 `dealerId`。  
已售改采购字段（make/model/year/vin/source/purchaseCost/addedOn/repairCost/carfax）→ **409** `SOLD_LOCKED`。  
未售改 VIN 仍受本店唯一 → `400 VIN_DUP`。  
改 `conditionCode`（手册：车况变即作废旧检查）→ 对应 listing `contentVersion++`（若已有 listing）。采购成本单独变更不使广告作废。  
审计 `VEHICLE`/`UPDATE`。错误另有 `404`、`409 VERSION_CONFLICT`。

### 4.5 `POST /api/v1/vehicles/{id}/sell`

```json
{ "soldOn": "2026-09-20", "soldPrice": 18900.00, "version": 1 }
```

两者必须同时有。服务端 `status=SOLD`。响应=详情。  
`400 SOLD_PAIR_REQUIRED`；已售再售 → `409 SOLD_LOCKED`；`409 VERSION_CONFLICT`；`404`。审计 `VEHICLE`/`SELL`。

---

## 5. 客户 CRM（Dealer.User）

Admin 打本节任一 URL → **403** `FORBIDDEN`。店员无有效 membership → **403**。跨店 **404**。

### 5.1 `GET /api/v1/customers`

Query：`q`（name/email/phone）、`linked`=`true`\|`false`（是否至少挂一辆）、`page`、`size`。

```json
{
  "items": [
    {
      "id": 4,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "phone": "403-555-0199",
      "homeAddress": "12 Oak St",
      "linkedVehicle": { "id": 10, "modelYear": 2020, "make": "Toyota", "model": "Camry" },
      "version": 0
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

`linkedVehicle`：多车时取最近 `linkedAt` 一辆，供 CRM 表一列；详情见 5.3 完整数组。未挂为 `null`。

### 5.2 `POST /api/v1/customers` → 201

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "403-555-0199",
  "homeAddress": "12 Oak St"
}
```

忽略 `dealerId`。`400 VALIDATION`。审计 `CUSTOMER`/`CREATE`。响应=详情（`linkedVehicles: []`）。

### 5.3 `GET /api/v1/customers/{id}`

```json
{
  "id": 4,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "403-555-0199",
  "homeAddress": "12 Oak St",
  "linkedVehicles": [
    {
      "id": 10,
      "vin": "1HGCM82633A004352",
      "modelYear": 2020,
      "make": "Toyota",
      "model": "Camry",
      "status": "IN_STOCK"
    }
  ],
  "version": 0
}
```

跨店 **404**。

### 5.4 `PATCH /api/v1/customers/{id}`

```json
{
  "version": 0,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "403-555-0199",
  "homeAddress": "12 Oak St"
}
```

忽略 `dealerId`。`409 VERSION_CONFLICT`。审计 `CUSTOMER`/`UPDATE`。`fieldSummary` **不得**含电话/邮箱/住址全文。

---

## 6. 挂车与解绑（设计缺口：必须有 UNLINK）

手册审计有 `LINK` / `UNLINK`，UI（12）出售/**解绑二次确认**，但 API 表只有 `PUT` 挂车。  
**裁定：补 DELETE，不用「改 PUT 当解绑」或假装无需求。** 二次确认只在前端；API 一次即删关联。

### 6.1 `PUT /api/v1/customers/{id}/vehicles/{vehicleId}` → 200

无 body（或忽略 body）。约束：客户与车 **同店**、车 `IN_STOCK`、车 **尚未**挂任何客户。**已售不可新挂**（15）。

```json
{
  "id": 77,
  "customerId": 4,
  "vehicleId": 10,
  "linkedAt": "2026-09-21T21:00:00Z"
}
```

| 码 | HTTP | 何时 |
|---|---|---|
| `VEHICLE_ALREADY_LINKED` | 409 | 该车已挂（含已挂本客户） |
| `WRONG_DEALER_OR_SOLD` | 400 | **已售不可新挂**，或车/客非本店（跨店 id 一律 **404**，不走本码） |
| — | 404 | 客户或车 id 对本店不存在（跨店同样 404） |

审计 `CUSTOMER_VEHICLE` / `LINK`。`entityId` = `customer_vehicle.id`；`fieldSummary` 仅 `{customerId,vehicleId}`。

### 6.2 `DELETE /api/v1/customers/{id}/vehicles/{vehicleId}` → 204

摘掉该客户与该车的关联。车回到「未挂」，可供再挂。不改车辆 `status`。  
**已售不可解挂**（15）：车 `status=SOLD` → **409** `SOLD_LOCKED`（成交记录不得抹掉）。  
无此关联或跨店 → **404**（不 403）。审计 `CUSTOMER_VEHICLE` / `UNLINK`。

---

## 7. 广告 listing

一车一条。路径用 **车辆 id** 取/存草稿（手册），检查/Ready/Export 用 **listing id**。

### 7.1 `GET /api/v1/vehicles/{id}/listing`

无行：**不插入、不落库**，返回虚拟空草稿（对齐 15）：

```json
{
  "id": null,
  "vehicleId": 10,
  "title": "",
  "body": "",
  "adKind": "CASH",
  "medium": "ONLINE",
  "status": "DRAFT",
  "contentVersion": 1,
  "lastCheckId": null,
  "lastCheck": null,
  "checkStatus": "NEEDS_AI",
  "version": 0
}
```

有行则 `id` 有值，`lastCheck` 为最近检查摘要或 `null`。车跨店 **404**。

### 7.2 `PATCH /api/v1/vehicles/{id}/listing`

无行则 **INSERT**。升 `contentVersion`，`status` 回到 `DRAFT`，旧检查作废（表现为 `checkStatus=STALE` 或 `NEEDS_AI`，见 §8）。  
V1 `title`/`body` NOT NULL：请求缺省或空白时写入 **`''`**（15），不要传 SQL `null`。

首次创建可省略 `version` 或传 `0`。之后必须带当前 `version`。

```json
{
  "version": 0,
  "title": "2020 Toyota Camry",
  "body": "Cash price $18900. Sold as-is by Prairie Auto Ltd. 403-555-0100 ...",
  "adKind": "CASH",
  "medium": "ONLINE"
}
```

`adKind`：`CASH`\|`FINANCE`\|`LEASE`。`medium`：`ONLINE`\|`RADIO_TV_BILLBOARD`。  
响应同 7.1（已持久化）。`404` / `409 VERSION_CONFLICT` / `400 VALIDATION`。

---

## 8. 检查结果、五态、Ready / Export

页面总状态 **只允许** 五个英文（手册 §6）。API 在 listing 与检查响应上给派生枚举 `checkStatus`：

`BLOCKED` | `NEEDS_AI` | `PASSED` | `STALE` | `AI_UNAVAILABLE`

| UI | `checkStatus` | 服务端条件 |
|---|---|---|
| Blocked | `BLOCKED` | 当前 `lastCheck` 与 `listing.contentVersion` 一致，且 `recommendation=BLOCKED`（`aiStatus=SKIPPED`，未调模型） |
| Needs AI review | `NEEDS_AI` | 无成功且未 stale 的终态：无检查、或 `recommendation=NEEDS_AI`、或旧 Blocked/Unavailable 后版本已升 |
| Passed | `PASSED` | `recommendation=PASSED` 且 `check.contentVersion == listing.contentVersion` |
| Stale | `STALE` | **曾经** `PASSED`，但 listing 版本已升（改标题/正文/类型/媒介，或改车况等手册规定项） |
| AI unavailable | `AI_UNAVAILABLE` | 当前版本检查 `recommendation=UNAVAILABLE`（规则过了但 AI 失败/超时），**不得**当 Pass |

`STALE` **只**用于「曾通过后失效」。Blocked 后改稿再查，显示 `NEEDS_AI`，不是 Stale。

### 8.1 检查结果 JSON（`lastCheck` 与 POST 响应）

`ruleFindings`：JSON 数组（列已在 SQL）。元素形状（新裁定，手册只说数组）：

```json
{
  "ruleId": "PRICE",
  "severity": "BLOCK",
  "passed": false,
  "message": "Advertised price not found in the ad body."
}
```

`severity`：`BLOCK`（硬缺 → 整单 Blocked）或 `REVIEW`（交给 AI）。  
`aiNotes`：模型结构化备注，元素至少 `{ "message": "..." }`，可为 `[]` / `null`。  
`aiStatus`：`SKIPPED`\|`SUCCESS`\|`FAILED`\|`UNAVAILABLE`。  
`recommendation`：`BLOCKED`\|`NEEDS_AI`\|`PASSED`\|`UNAVAILABLE`。

完整检查对象：

```json
{
  "id": 99,
  "listingId": 8,
  "contentVersion": 3,
  "ruleFindings": [
    {
      "ruleId": "PRICE",
      "severity": "BLOCK",
      "passed": false,
      "message": "Advertised price not found in the ad body."
    }
  ],
  "aiStatus": "SKIPPED",
  "aiNotes": null,
  "recommendation": "BLOCKED",
  "checkStatus": "BLOCKED",
  "createdAt": "2026-09-21T21:05:00Z"
}
```

### 8.2 `POST /api/v1/listings/{id}/checks`

```json
{ "version": 2 }
```

`version` = listing 乐观锁。流程复述手册：本店校验 → 固定清单 → 无硬阻断则经 Gateway `POST /internal/v1/ad-check`（适配器超时 ≤15s）→ 写入 `compliance_check`，回写 `listing.last_check_id`。

| 结果 | HTTP | body |
|---|---|---|
| Blocked / Needs AI / Passed | **200** | 完整检查对象（含 `checkStatus`） |
| 规则过了，AI 超时或失败 | **502** `AI_UNAVAILABLE` | 标准错误体。检查行 **已写** `UNAVAILABLE`，listing 已指过去。客户端再 GET listing |
| listing 版本不对 | **409** `VERSION_CONFLICT` | 错误体 |
| 跨店 / 无 listing | **404** | 错误体 |

**Blocked 不是 HTTP 错误。** 不要用 4xx 表示「缺价格 / FINANCE 缺 APR」。

### 8.3 `POST /api/v1/listings/{id}/ready`

```json
{ "version": 3 }
```

仅当前检查 Passed **且** 非 Stale。成功 200，listing `status=READY`，响应同 GET listing。

| 码 | HTTP |
|---|---|
| `CHECK_STALE` | 409（曾通过但版本已升，或 lastCheck 版本≠ listing） |
| `NOT_PASSED` | 409（Blocked / Needs AI / AI unavailable / 无检查） |
| `VERSION_CONFLICT` | 409 |
| — | 404 |

### 8.4 `POST /api/v1/listings/{id}/exports`

Body 同 ready：`{ "version": 3 }`。同样的 409/404。  
成功：**200** 纯文本。内容 = 店公开四字段 + 车辆公开字段（年/make/model/vin/condition/source，**无成本**）+ 标题正文 + 检查时间。不写客户。

---

## 9. 审计

### `GET /api/v1/audit`

Query：`entityType`、`entityId` 必填；`page`、`size` 可选。

店员：只本店。实体不在本店 → **404**。  
Admin：**不**给业务实体（`VEHICLE`/`CUSTOMER`/`CUSTOMER_VEHICLE`/`LISTING`）→ **403** `FORBIDDEN`，无 `fieldSummary` 业务内容。

`entityType`：`VEHICLE`\|`CUSTOMER`\|`CUSTOMER_VEHICLE`（店员查询）。Admin 写库可用 `DEALER`/`MEMBERSHIP`，**本查询接口不对店员开放这两类**（避免把绑人当业务浏览）；Admin 若查自己的开店审计，可仅 `DEALER`/`MEMBERSHIP` 且 `dealerId` 可空——实施时若未做 Admin 审计页，对该角色统一 403 即可。

```json
{
  "items": [
    {
      "id": 501,
      "entityType": "CUSTOMER_VEHICLE",
      "entityId": 77,
      "action": "UNLINK",
      "fieldSummary": { "customerId": 4, "vehicleId": 10 },
      "actorOid": "22222222-2222-2222-2222-222222222222",
      "createdAt": "2026-09-21T21:10:00Z"
    }
  ],
  "page": 0,
  "size": 10,
  "total": 1
}
```

`action`：`CREATE`\|`UPDATE`\|`SELL`\|`LINK`\|`UNLINK`。`fieldSummary` 无客户电话/邮箱/住址全文。

---

## 10. 助手 `POST /api/v1/assistant/ask`

仅 `Dealer.User`。Admin → 403。**不写**车辆/客户/listing/检查表。

请求（手册 `{text}`）：

```json
{ "text": "Which in-stock Toyotas do we have?" }
```

`text` 空 → `400 VALIDATION`。

响应：短说明 + **最多 5** 张本店资源卡。卡上无电话、邮箱、住址。模型返回的 id 必须落在 core 刚检索的集合里，否则丢弃。

```json
{
  "summary": "Two in-stock Toyotas match. Open a card for DMS.",
  "summaryAvailable": true,
  "cards": [
    {
      "kind": "VEHICLE",
      "id": 10,
      "label": "2020 Toyota Camry",
      "status": "IN_STOCK"
    },
    {
      "kind": "CUSTOMER",
      "id": 4,
      "label": "Jane Doe"
    },
    {
      "kind": "LISTING",
      "id": 8,
      "vehicleId": 10,
      "label": "2020 Toyota Camry listing",
      "checkStatus": "STALE"
    }
  ]
}
```

`kind`：`VEHICLE`\|`CUSTOMER`\|`LISTING`。不在此规定 Vue 路由。  
模型挂：`summary` 为 `null`，`summaryAvailable=false`，`cards` 仍是检索列表（最多 5）。HTTP **200**（检索成功）。仅当店员身份失败才 403。  
core 经 Gateway 调内部助手；最近对话上下文最多 3 句已过滤文本（手册 10），**不落业务表**。

---

## 11. 仅内部（浏览器 404）

Gateway 转 ai-service。core 调用，不给浏览器。

### `POST /internal/v1/ad-check`

```json
{
  "listing": {
    "title": "2020 Toyota Camry",
    "body": "...",
    "adKind": "FINANCE",
    "medium": "ONLINE"
  },
  "vehiclePublic": {
    "modelYear": 2020,
    "make": "Toyota",
    "model": "Camry",
    "vin": "1HGCM82633A004352",
    "conditionCode": "AS_IS",
    "source": "AUCTION"
  },
  "dealerPublic": {
    "legalName": "Prairie Auto Ltd.",
    "contactPhone": "403-555-0100",
    "contactEmail": "desk@prairie.example",
    "contactAddress": "100 1 Ave SW, Calgary"
  }
}
```

`vehiclePublic` **无**采购/修理/售价。ai-service 将模型结果收成供 core 写入的 notes；传输失败由 core 记 `UNAVAILABLE`。

### `POST /internal/v1/assistant`

```json
{
  "question": "Which in-stock Toyotas do we have?",
  "resources": [
    { "kind": "VEHICLE", "id": 10, "label": "2020 Toyota Camry", "status": "IN_STOCK" }
  ]
}
```

`resources` 已经 core 过滤。返回短文本；core 再核 id。

---

## 12. 错误码一览

| code | HTTP | 含义 |
|---|---|---|
| `VALIDATION` | 400 | 缺字段、枚举非法、格式错 |
| `VIN_DUP` | 400 | 本店 VIN 重复 |
| `SOLD_PAIR_REQUIRED` | 400 | 出售缺日期或价格 |
| `WRONG_DEALER_OR_SOLD` | 400 | 挂车：车非本店或已售 |
| `UNAUTHORIZED` | 401 | 未登录 |
| `FORBIDDEN` | 403 | 角色不允许该 URL；或店员无有效 membership |
| `NOT_FOUND` | 404 | 无资源或跨店 |
| `VERSION_CONFLICT` | 409 | `version` 不匹配 |
| `DUP_MEMBER` | 409 | 该店已有此 active 成员 |
| `VEHICLE_ALREADY_LINKED` | 409 | 车已挂客户 |
| `SOLD_LOCKED` | 409 | 已售改采购、重复出售、或 **已售车解绑** |
| `CHECK_STALE` | 409 | Ready/Export 时检查已过期 |
| `NOT_PASSED` | 409 | Ready/Export 时非 Passed |
| `AI_UNAVAILABLE` | 502 | 广告检查 AI 失败/超时 |

---

## 13. 不做（防把废止稿搬回来）

密码登录、CSRF cookie 会话、工单、线索、销售单、KPI dashboard、买家 `/public/**`、Service Bus、任意 `dealerId` 切换店、Admin 读写车辆/客户/广告。
