# 18 · 后端 dealer-core 工程设计

- 状态：**现行有效（v6 core 工程）**
- **HTTP 以 [14-Backend-API-Contract.md](14-Backend-API-Contract.md) 为准**（路径、DTO、错误码、信封）。本文不另起契约、不重写 14 的 JSON。
- **数据 / 租户 / 空草稿 / membership / SOLD / OMVIC 固定规则以 [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) 为准**。本文不改裁定、不改 `V1__init.sql`。
- 本文只管：**`dealer-core` 仓怎么拆 Java 文件、应用服务职责、租户拦截、异常映射、出站调 AI、审计与测试类对照**。组员按目录建类即可写。
- 权威冲突顺序：课程 PPT 硬项 > 规格 PDF 字段 > [IMPLEMENTATION-BRIEF.md](IMPLEMENTATION-BRIEF.md) / [00](00-Current-Development-Design.md) > **15 / 14 / [13](13-Frontend-Engineering.md)** > 本文（core 工程）> [12](12-Frontend-UI-Conventions.md)。`16` / `17` 是验收与夹具，**不改契约**。
- 仓职责对齐 [08-DevOps-and-Implementation.md](08-DevOps-and-Implementation.md)：core = Spring Boot + Flyway + 一库 + 租户隔离 + 业务 API + 经 Gateway 调 AI。Gateway 不写业务；ai-service 无库。
- 不做：工单 / 线索 / 密码表 / Service Bus / 第二库 / 对浏览器开放 8081。不改 SQL。不写 Java 业务代码正文（本文只点类名与职责）。

编码仓：`dealer-core`（现仅有 `src/main/resources/db/migration/V1__init.sql`）。**core 不对浏览器开放**，只听内网端口 **8081**（15 §10）。

---

## 1. 栈与包名（点到即可）

| 项 | 钉死 |
|---|---|
| 语言 | **Java 21**（四 Java 课仓统一；15 §12。禁止 core 21、ai-service 17 混用） |
| 框架 | **Spring Boot 3**（Web、Validation、Security Resource Server、Data JPA） |
| 迁移 | **Flyway only**。已有 `V1__init.sql`。禁止 `ddl-auto=update`。索引等非开工阻塞走日后 `V2__*.sql`（15），本文不落地 |
| 库 | **一个 MySQL**，库名 `dealer_core`。连接串 / 账号见 platform `env.example`（`MYSQL_*`）。core **独占**数据面 |
| 端口 | `CORE_PORT=8081`。不配浏览器 CORS；不配对 `5173` 的 ACAO（15 §10 / §13） |
| 身份 | 验 Entra JWT（与 Gateway **同一** `ENTRA_ISSUER` / `ENTRA_AUDIENCE`）。不建密码表、不签发令牌 |
| 调用 | 同步 REST。无队列、无 outbox |

建议根包：`com.dealerops.core`。子包按下表，**不要**再拆 `ticket` / `lead` / `auth` 独立认证服务 / `bus`。

```
com.dealerops.core
  config
  security
  dealer
  vehicle
  customer
  listing
  compliance
  audit
  assistant
  common.exception
  common.tenant
```

契约字段写在本仓 DTO 里（08：不另开 contracts 仓）。DTO **形状抄 14，本文只写类名**。

---

## 2. 目录树（按此建文件）

现有仓库还没有 `src/main/java`，按此新建即可。测试目录见第 10 节。

```
dealer-core/
  pom.xml                          # Java 21、Boot 3、Flyway、mysql、spring-boot-starter-oauth2-resource-server
  Dockerfile                       # 听 8081；不要把 8081 映射成对公 Ingress
  src/main/resources/
    application.yml                # server.port=8081；flyway；datasource；jwk；无 CORS
    db/migration/V1__init.sql      # 已落地；本文不改
  src/main/java/com/dealerops/core/
    DealerCoreApplication.java
    config/
      SecurityConfig.java          # Resource Server；/api/v1/** 需 JWT；不暴露 actuator 业务
      WebConfig.java               # 不配浏览器 CORS（或空）
      JacksonConfig.java           # camelCase；日期 YYYY-MM-DD / ISO-8601 UTC（14 §1.3）
      AiClientConfig.java          # WebClient：Gateway 基址 + 内部头
    security/
      JwtRoleMapper.java           # claims.roles → Platform.Admin | Dealer.User | NONE（15 §8）
      MeController.java            # GET /api/v1/me（14 §2）
      MeService.java               # 回 role / dealerId / dealerLegalName；Admin 后两项 null
      CurrentUser.java             # oid、tid、role、tenantDealerId（可空）
    dealer/
      AdminDealerController.java   # 14 §3 店 CRUD
      AdminMemberController.java   # 14 §3 成员
      DealerAdminService.java
      MembershipService.java
      DealerEntity.java
      DealerRepository.java
      AppUserEntity.java
      AppUserRepository.java
      MembershipEntity.java
      MembershipRepository.java
      dto/                         # 仅 14 已定字段：DealerResponse、CreateDealerRequest、…
    vehicle/
      VehicleController.java       # 14 §4
      VehicleService.java
      VehicleEntity.java
      VehicleRepository.java
      dto/
    customer/
      CustomerController.java      # 14 §5
      CustomerVehicleController.java  # 14 §6 PUT + DELETE
      CustomerService.java         # 含挂车 / 解绑
      CustomerEntity.java
      CustomerRepository.java
      CustomerVehicleEntity.java
      CustomerVehicleRepository.java
      dto/
    listing/
      ListingController.java       # GET/PATCH /vehicles/{id}/listing；ready / export（14 §7–8）
      ListingService.java          # 空草稿不落库；PATCH 用 ''
      ListingEntity.java
      ListingRepository.java
      dto/
    compliance/
      ComplianceCheckController.java  # POST /listings/{id}/checks（14 §8.2）
      ComplianceCheckService.java
      OmvicRuleEngine.java         # 15 §6 伪代码；先于 AI
      ComplianceCheckEntity.java
      ComplianceCheckRepository.java
      CheckStatusMapper.java       # 派生 checkStatus 五态（14 §8）
    audit/
      AuditController.java         # GET /audit（14 §9）
      AuditService.java
      AuditEventEntity.java
      AuditEventRepository.java
    assistant/
      AssistantController.java     # POST /assistant/ask（14 §10）
      AssistantService.java        # 检索本店 ≤5；不写业务表
      AssistantResourceQuery.java  # 组 resources；剥电话/邮箱/住址
    common/
      exception/
        ApiException.java          # 带 14 的 code
        ApiExceptionHandler.java   # → {code,message}；VALIDATION 可带 fieldErrors
        ErrorCode.java             # 枚举：VIN_DUP、SOLD_LOCKED、…（只列 14 §12）
      tenant/
        TenantContext.java         # ThreadLocal：tenantDealerId
        TenantFilter.java          # JWT + membership → dealerId
        TenantGuard.java           # 跨店 404；无 membership 403
    integration/
      AiGatewayClient.java         # 经 Gateway POST /internal/v1/** + X-Dealer-Internal
      InternalHeaders.java         # 头名常量；用户 JWT 不转发
```

不要再拆：`ticket/`、`lead/`、`password/`、`bus/`、`public/`。`stores` 式会话不在 core：每请求从 JWT + membership 解析。

Controller 只做：校验入参、调一个应用服务、返回 14 的 DTO / 状态码。**忽略** body / query / header 里的 `dealerId`。

---

## 3. V1 表 → Entity + Repository

以 `V1__init.sql` 为准，**一表一类实体 + 一个 Repository**。列名对 V1，不多列。枚举取值见 15「实体层落地备忘」，应用层约束，不靠 DB CHECK。

| 表 | Entity | Repository | 写路径要点（行为归 15） |
|---|---|---|---|
| `dealer` | `DealerEntity` | `DealerRepository` | 乐观锁 `version`。四联系非空。无 DELETE 店 |
| `app_user` | `AppUserEntity` | `AppUserRepository` | `uk_user_oid (entra_tenant_id, entra_oid)`。`dealer_id` **不是**租户权威 |
| `membership` | `MembershipEntity` | `MembershipRepository` | 租户权威：`entra_oid` + `active=1` **恰好一行**。一人同时两条 active → 500 级配置错（15 §2.4） |
| `vehicle` | `VehicleEntity` | `VehicleRepository` | `uk_vehicle_vin (dealer_id, vin)`。`status` 仅 `IN_STOCK`/`SOLD`。出售成对 |
| `customer` | `CustomerEntity` | `CustomerRepository` | 本店隔离。乐观锁 `version` |
| `customer_vehicle` | `CustomerVehicleEntity` | `CustomerVehicleRepository` | `uk_cv_vehicle` 一车一客。无 `version` 列：挂/解绑不带乐观锁（14） |
| `listing` | `ListingEntity` | `ListingRepository` | `uk_listing_vehicle`。`title`/`body` Java 非空默认 `""`（15 §1） |
| `compliance_check` | `ComplianceCheckEntity` | `ComplianceCheckRepository` | `rule_findings` / `ai_notes` 用 JSON 列；元素形状见 14 §8.1 |
| `audit_event` | `AuditEventEntity` | `AuditEventRepository` | `dealer_id` 可空（Admin 开店/绑人） |

### 3.1 `listing.last_check_id` 无 FK（15 §5）

SQL 已有列、**没有**指向 `compliance_check` 的外键（避免环）。**不要**在实体上加 `@ManyToOne` 硬 FK，也不要建议 V2 补 FK。

应用层：

1. 同一事务：先 `INSERT compliance_check`，再把生成 `id` 写回 `listing.last_check_id`。
2. 只允许指向**本 listing 自己插入**的检查。读时若行缺失、或 `check.listing_id` / `check.dealer_id` 对不上 → **当无检查**，不 500。
3. 升 `contentVersion` **不要清空** `last_check_id`（UI 用版本比较画 Stale）。
4. 客户端 **不得** PATCH `lastCheckId`。

### 3.2 `app_user.dealer_id` 非租户权威（15 §2）

| 用途 | 用谁 |
|---|---|
| 本请求隔离 `vehicle` / `customer` / `listing` / `audit` / 助手检索 | **`membership.active=1` 的 `dealer_id`** → `TenantContext.tenantDealerId` |
| `GET /me` 的 `dealerId` / `dealerLegalName` | 可读 `app_user.dealer_id`（缓存）；与 membership 不一致则 **以 membership 为准并回写**（自愈，不 500） |
| Admin | `app_user.dealer_id` **必须 NULL**；禁止用它 join 业务表 |

**禁止** `WHERE vehicle.dealer_id = app_user.dealer_id` 而不查 membership。

---

## 4. 应用服务清单（一个服务一段）

每个服务对应一组 14 的端点。实现时只引路径，JSON 回 14 抄。

### 4.1 `DealerAdminService`

- **谁：** 仅 `Platform.Admin`。店员打 `/api/v1/admin/**` → `403 FORBIDDEN`。
- **端点（14 §3）：** `GET/POST /admin/dealers`，`GET/PATCH /admin/dealers/{id}`。
- **职责：** 开店（四联系非空 → 201）；列表带派生 `staffCount`（该店 **active membership** 计数）；单店只读回填；PATCH 四联系 + `active`，必须带 `version`。无删店。
- **忽略** body.`id` / 任何 `dealerId`。店不存在 → 404。
- **审计（可选）：** `entityType=DEALER`，`dealerId` 可空或为该店。

### 4.2 `MembershipService`

- **端点（14 §3.5–3.7）：** `GET/POST /admin/dealers/{id}/members`，`DELETE .../members/{entraOid}`。
- **职责：** 绑人写 `membership` + `app_user`（显示名、`role=Dealer.User`、`dealer_id` 与 membership 同步）。已是该店 **active** → `409 DUP_MEMBER`。该 oid 在**另一店**已有 active → 同样 `409 DUP_MEMBER`（15：同一时刻只一条 active）。已解绑同行再绑 → **重激活**，不插第二行（撞 `uk_membership`）。
- **解绑：** `membership.active=0`；`app_user.dealer_id=NULL`；**不改** `app_user.role`；不删 Entra、不删 `app_user`。之后业务接口 403（见第 5 节）。
- **审计：** `entityType=MEMBERSHIP`。

### 4.3 `VehicleService`

- **端点（14 §4）：** `GET/POST /vehicles`，`GET/PATCH /vehicles/{id}`，`POST /vehicles/{id}/sell`。
- **职责：** 列表本店，`q`=VIN/make/model，`status`，`condition`（即 `conditionCode`），分页信封 `{items,page,size,total}`，`page` 从 0，`size` 封顶 10。POST 强制 `IN_STOCK`，忽略客户端 `dealerId`/`status`/`sold*`。本店 VIN 唯一 → `400 VIN_DUP`。
- **已售锁（15 §3）：** PATCH 采购/身份字段 → `409 SOLD_LOCKED`。禁止 PATCH `status`/`soldOn`/`soldPrice`。改 `conditionCode` 且已有 listing → `contentVersion++`（采购成本单独变更不作废广告）。
- **出售：** `soldOn`+`soldPrice`+`version` 成对；价 `> 0`；已售再售 → `409 SOLD_LOCKED`；缺一 → `400 SOLD_PAIR_REQUIRED`。不删 `customer_vehicle`。
- **审计：** `VEHICLE` / `CREATE` | `UPDATE` | `SELL`。跨店 id → 404。

### 4.4 `CustomerService`（含挂车 + 解绑）

- **端点（14 §5–6）：** `GET/POST /customers`，`GET/PATCH /customers/{id}`，`PUT /customers/{id}/vehicles/{vehicleId}`，`DELETE` 同路径 → **204**。
- **职责：** 四字段必填。列表 `q` + `linked`；列表派生 `linkedVehicle`（多车取最近 `linkedAt`）；详情 `linkedVehicles[]`。忽略 `dealerId`。
- **PUT 挂车：** 客户与车 **同店** 且等于 `tenantDealerId`；车 `IN_STOCK`；尚未占用。已售不可新挂 → `400 WRONG_DEALER_OR_SOLD`。已挂（含已挂本客户）→ `409 VEHICLE_ALREADY_LINKED`。跨店 id → **404**（不走 WRONG_DEALER）。一客多车允许。
- **DELETE 解绑：** 在库 → 硬删关联行（V1 无软删列），车回到未挂，不改 `vehicle.status`。已售 → **409 `SOLD_LOCKED`**（成交记录不抹）。无关联 / 跨店 → 404。
- **审计：** `CUSTOMER` CREATE/UPDATE；`CUSTOMER_VEHICLE` LINK/UNLINK。`entityId` 挂车用 `customer_vehicle.id`；`fieldSummary` 仅 `{customerId,vehicleId}`，**无**电话/邮箱/住址全文。

### 4.5 `ListingService`

- **端点（14 §7、§8.3–8.4）：** `GET/PATCH /vehicles/{id}/listing`，`POST /listings/{id}/ready`，`POST /listings/{id}/exports`。
- **空草稿不落库（15 §1）：** 该车无 `listing` 行时 GET **不 INSERT**，返回虚拟草稿（`id=null`，`title`/`body`=`""`，`adKind=CASH`，`medium=ONLINE`，`status=DRAFT`，`contentVersion=1`，`lastCheckId=null`，`version=0`）。形状见 14 §7.1，本文不重贴。
- **首次 PATCH：** INSERT。请求缺省或空白的 `title`/`body` 写入 **`''`**，不要 JDBC `null`。可省略 `version` 或传 `0`。之后必须带当前 `version`。
- PATCH 升 `contentVersion`，`status` 回 `DRAFT`。曾 Passed 则派生 `checkStatus=STALE`；Blocked 后再改稿显示 `NEEDS_AI`，**不要**标 Stale（14 §8）。
- **Ready / Export：** 仅当前检查 **Passed 且** `check.contentVersion == listing.contentVersion`。否则 `409 CHECK_STALE` 或 `NOT_PASSED`。Export：`200` `text/plain`；内容 = 店公开四字段 + 车辆公开字段（无成本）+ 标题正文 + 检查时间；**不写客户**。

### 4.6 `ComplianceCheckService`

- **端点（14 §8.2）：** `POST /listings/{id}/checks`，body `{version}`（listing 乐观锁）。
- **顺序写死：** 本店 + version → **`OmvicRuleEngine`（15 §6）** → 有硬缺则 **不调 AI** → 落库 `recommendation=BLOCKED`，`aiStatus=SKIPPED` → HTTP **200**（Blocked 不是 4xx）。
- 无硬阻断：经 `AiGatewayClient` 调 `POST /internal/v1/ad-check`（≤15s）。成功且无新硬缺 → `PASSED`/`SUCCESS`。超时/失败 → 仍 **落库** `UNAVAILABLE`，回写 `last_check_id`，HTTP **502** `AI_UNAVAILABLE`。禁止当 Pass。
- 同一事务写检查 + `listing.last_check_id`（§3.1）。派生 `checkStatus` 用 `CheckStatusMapper`（14 五态）。

### 4.7 `AuditService`

- **端点（14 §9）：** `GET /audit?entityType=&entityId=`（必填），分页可选。
- **写：** 被 DMS/CRM（及可选 Admin）服务调用。记 **谁**（`actorOid`）**做什么**（`entityType`+`action`+`entityId`）**何时**（`createdAt`）。
- **读：** 店员只本店；实体不在本店 → 404。Admin 查业务实体 → **403**，无 `fieldSummary` 业务内容。店员不开放 `DEALER`/`MEMBERSHIP` 查询。
- **摘要：** 见第 8 节。

### 4.8 `AssistantService`

- **端点（14 §10）：** `POST /assistant/ask`，`{text}`。空 text → `400 VALIDATION`。Admin → 403。
- **职责：** 只读检索本店车辆/客户/listing，组最多 5 条 `resources`（无电话/邮箱/住址）。经 Gateway `POST /internal/v1/assistant`。模型返回的 id **必须**落在本次检索集，否则丢弃。
- **不写** `vehicle` / `customer` / `listing` / `compliance_check`。对话上下文最多 3 句已过滤文本，**不落业务表**。
- 模型挂：HTTP **200**，`summary=null`，`summaryAvailable=false`，`cards` 仍为检索列表。不要用 502 冒充广告检查失败。

### 4.9 附属（不是第 5–8 条业务服务，但必须有）

| 类 | 职责 |
|---|---|
| `MeService` | 14 §2。已登录即可。无 membership 的店员仍 200，`dealerId=null` |
| `OmvicRuleEngine` | 纯函数；输入 listing+车辆公开+店公开；输出 hard/soft（15 §6）。**不用**采购成本当标价 |
| `AiGatewayClient` | 见第 7 节 |
| `TenantFilter` / `TenantGuard` | 见第 5 节 |

---

## 5. 租户拦截

每条 `/api/v1/**`（`/me` 除外的业务）在 Controller 之前解析租户。顺序固定（15 §2 + §8）：

1. Gateway 已验 JWT；**core 再验一遍**（issuer/audience）。无/坏 JWT → `401 UNAUTHORIZED`。
2. `JwtRoleMapper`：`roles` 含 `Platform.Admin` → Admin（**Admin 赢**，即使同时有 `Dealer.User`）；仅 `Dealer.User` → 店员；否则 `/me` 以外 403。
3. 用 JWT `tid`+`oid` 找或惰性插入 `app_user`（显示名可回写）。**授权比较以当次 JWT 为准**，库里过期 `role` 不能抬权。
4. 店员：查 **恰好一条** `membership.entra_oid=:oid AND active=1`。`TenantContext.tenantDealerId = membership.dealer_id`。0 条 → **403 `FORBIDDEN`**（已登录无店，**不是** 401/404）。≥2 条 → 500 级配置错误，拒绝业务。
5. **忽略** 请求体 / query / header 的 `dealerId`（含自造 `X-Dealer-Id`）。写入一律用 `tenantDealerId`。
6. Admin：不设业务 `tenantDealerId`；只放行 `/api/v1/admin/**` 与 `/me`。打 `/vehicles` `/customers` `/listings/**` `/audit`（业务实体）`/assistant` → **403 `FORBIDDEN`**，响应 **无** vin/成本/客户等业务字段。
7. 按路径 id 加载资源后：`resource.dealerId != tenantDealerId` → **404 `NOT_FOUND`**（防探测，不 403）。本店无此 id 同样 404。

`GET /me`：不要求 membership；店员无店时 `dealerId`/`dealerLegalName` 为 `null`。

---

## 6. 异常 → 14 错误码

`ApiExceptionHandler` 统一输出 `{code,message}`；`400 VALIDATION` 可加 `fieldErrors`。禁止 SQL、堆栈、模型原文出站。

| 抛出时机（core 内） | code | HTTP |
|---|---|---|
| Bean Validation / 枚举非法 / 空 text | `VALIDATION` | 400 |
| 本店 VIN 撞 `uk_vehicle_vin` 或预查重复 | `VIN_DUP` | 400 |
| sell 缺 `soldOn` 或 `soldPrice`；价 ≤0 用 VALIDATION 或本码（16：≤0 → 400） | `SOLD_PAIR_REQUIRED` | 400 |
| PUT 挂车：已售，或「看得见但店不一致」 | `WRONG_DEALER_OR_SOLD` | 400 |
| 无/坏 JWT | `UNAUTHORIZED` | 401 |
| 角色打错前缀；店员 0 条 active membership | `FORBIDDEN` | 403 |
| 本店无 id / **跨店 id** / 无关联 | `NOT_FOUND` | 404 |
| `version` ≠ 当前行 | `VERSION_CONFLICT` | 409 |
| 该店已有 active 成员；或该 oid 另店仍 active | `DUP_MEMBER` | 409 |
| 车已挂（含挂给本客户） | `VEHICLE_ALREADY_LINKED` | 409 |
| 已售改采购、重复出售、**已售解绑** | `SOLD_LOCKED` | 409 |
| Ready/Export：曾通过但版本已升 / lastCheck 版本≠ listing | `CHECK_STALE` | 409 |
| Ready/Export：Blocked / Needs AI / UNAVAILABLE / 无检查 | `NOT_PASSED` | 409 |
| 规则已过、AI 超时或失败（行已写） | `AI_UNAVAILABLE` | 502 |

不要发明第 13 个业务码。唯一键冲突要翻译成上表，不要把 `DataIntegrityViolation` 原文回给客户端。

---

## 7. core 经 Gateway 调 ai-service

core **不直连** `8082` 当产品路径；出站打 **Gateway** 的内部路由（15 §7）。浏览器永远打不到这两条（Gateway 无内部头 → **404**）。

| 调用方 | 方法 | 路径 | 何时 |
|---|---|---|---|
| `ComplianceCheckService` | POST | `/internal/v1/ad-check` | 固定规则 **hard 为空** 之后 |
| `AssistantService` | POST | `/internal/v1/assistant` | 已组好本店 `resources` |

`AiGatewayClient`：

1. Base URL = Gateway（本地 `http://localhost:8080` 或 compose 内 Gateway 服务名），**不是**浏览器源。
2. 请求头 **`X-Dealer-Internal: <INTERNAL_TOKEN>`**（环境 / Key Vault）。用户 JWT **不要**转给 ai-service。
3. Body 字段名与 14 §11 一致：`listing` + `vehiclePublic`（年/make/model/vin/condition/source，**无**采购/修理/售价）+ `dealerPublic`（店名+三联系）。助手：`question` + 已过滤 `resources`。
4. 适配器超时 **≤15s**（手册；connect/response 自设）。
5. **Blocked：`OmvicRuleEngine` 已返回 hard → 方法直接返回，Client 零调用。**（16 BE-09）
6. AI 失败/超时：检查路径 **502 + 落库 UNAVAILABLE**（14 §8.2）；助手路径 **200** + `summaryAvailable=false`（14 §10）。写库失败则以库为准，下次再检（15 §5）。

core **不**持有 `AIMANAGER_API_KEY`。不嵌 ai-manager JAR。

---

## 8. 审计：谁 / 做什么 / 何时

每次 DMS/CRM 写（及 Admin 开店/绑人可选）插一行 `audit_event`：

| 列 | 含义 |
|---|---|
| `actor_oid` | **谁**：JWT `oid` |
| `entity_type` + `action` + `entity_id` | **做什么** |
| `created_at` | **何时** |
| `dealer_id` | 店员=本店；Admin 可空 |
| `field_summary` | JSON 摘要，**不写**客户 `phone` / `email` / `homeAddress` **全文** |

允许的 `entity_type` / `action` 与 14 §9 一致：`VEHICLE|CUSTOMER|CUSTOMER_VEHICLE` × `CREATE|UPDATE|SELL|LINK|UNLINK`；Admin 另可 `DEALER`/`MEMBERSHIP`。

摘要只记 id、枚举、是否改过联系方式（如 `{"contactFieldsChanged":true}`），或挂车 `{customerId,vehicleId}`。改客户电话仍记 `UPDATE`，但 **不要**把新号码写进 JSON。

---

## 9. 建议测试类 ↔ 16 的 BE-xx

只列类名，**不写测试代码**。实现组把 [16](16-Acceptance-and-Test.md) §3 落成 JUnit 即可。路径/码仍以 14 为准。

| 测试类 | 对照 |
|---|---|
| `CrossTenantIsolationIT` | **BE-01** 跨店 404 |
| `NoMembershipForbiddenIT` | **BE-02** 无 membership → 业务 403；`GET /me` 仍 200 |
| `SoldLockedIT` | **BE-03** 已售锁采购 |
| `VinDuplicateIT` | **BE-04** 本店 VIN 重复 |
| `CustomerVehicleLinkIT` | **BE-05** 挂车三分支 |
| `SoldUnlinkLockedIT` | **BE-06** 已售不可解绑；在库 204 |
| `CheckStaleIT` | **BE-07** Ready/Export `CHECK_STALE` |
| `AiUnavailableIT` | **BE-08** 502 + 已落库 UNAVAILABLE |
| `BlockedSkipsAiIT` | **BE-09** 200 BLOCKED / SKIPPED；不调 `/internal/v1/ad-check` |
| `ReadyExportGuardIT` | **BE-10** 非 Passed 非当前版本 → 409；合格 export `text/plain` |
| `AuditNoPiiIT` | **BE-11** 摘要无电话/邮箱/住址全文 |
| `AssistantAskIT` | **BE-12** ≤5 卡、只读、Admin 403、模型挂仍 200 |
| `AdminForbiddenOnBusinessIT` | **BE-13** Admin 打业务 URL 无业务字段 |
| `CoreNotPublicIT` | **BE-14** 无浏览器 CORS；产品入口不是 8081（配置断言即可） |
| `SellPairRequiredIT` | **BE-15** 出售成对 |
| `IgnoreClientDealerIdIT` | **BE-16** body/query/header 冒充他店仍写入本店 |
| `OmvicRuleEngineTest` | 15 §6 单元：空草稿 / 缺价 / FINANCE 缺 APR → hard；无 hard 才允许调 AI |
| `TenantFilterTest` | JWT + membership；忽略客户端 `dealerId` |
| `ApiExceptionHandlerTest` | 第 6 节映射表 |
| `MeServiceTest` | Admin / 有店店员 / 解绑店员 的 `/me` 字段 |

CI：本仓 JUnit + 编译。**不要**打真实付费模型（AI 测用 stub / WireMock Gateway）。

---

## 10. core 不对浏览器开放

对齐 15 §10 / 08：浏览器与服务间 HTTP **只走** Gateway `8080`（云上为 Gateway HTTPS）。

| 项 | 要求 |
|---|---|
| 监听 | 只绑 **8081**（`CORE_PORT`）。compose / Azure：**internal**；不要对公网 Ingress |
| CORS | **不配** `http://localhost:5173`。直连 `fetch(8081)` 必须被浏览器拦 |
| 路由 | 只实现 `/api/v1/**` 业务。不实现给浏览器的 `/internal/v1/**` |
| 出站 | 调 AI 只加内部头，见第 7 节 |
| 演示 | 经 Gateway + 用户 JWT 的 `/api/v1/**` 才是产品入口。`curl 127.0.0.1:8081` 若本机仍通，只能证明「无 CORS / 无公网」，**不能**当对公 API |

---

## 11. 编码顺序（对照手册任务，仍不写代码）

组员按目录拆文件后的建议序（BRIEF §11 任务 3–9、11–13）：

1. 实体 / 枚举 / Flyway 起 V1  
2. Security + `TenantFilter` + `GET /me`  
3. `DealerAdmin` + `Membership`  
4. `Vehicle` + 审计  
5. `Customer`（PUT + DELETE）+ 审计  
6. `Listing` 空草稿 + `OmvicRuleEngine`（不调 AI）  
7. `ComplianceCheck` + `AiGatewayClient`  
8. Ready / Export  
9. `Assistant`  

禁止把废止 `01`–`06` 的工单/线索/密码表搬进本仓。
