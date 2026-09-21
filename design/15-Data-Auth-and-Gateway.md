# 15 · 数据模型裁定、鉴权、网关与最小云部署

版本：现行有效（v6）· 2026-09-21  
状态：给 `dealer-core` 实体层与 `dealer-gateway` 配置补缺口；**不是** OpenAPI，**不是** 业务实现。

## 冲突顺序与 SQL 基线

冲突时按此顺序取舍，**不得反过来**：

1. 课程 PPT（独立仓、Gateway、Entra/JWT/RBAC、Container Apps、Bicep、HTTPS、Key Vault、真实 AI）
2. DealerOps 规格 PDF 的字段与枚举（不加减列）
3. `IMPLEMENTATION-BRIEF.md` / `00`
4. **本文管数据、租户、网关行为**；**[14](14-Backend-API-Contract.md) 管 HTTP JSON**；**[13](13-Frontend-Engineering.md) 管前端工程**
5. [12](12-Frontend-UI-Conventions.md) UI 约定

SQL **已落地基线** 是 `dealer-core/src/main/resources/db/migration/V1__init.sql`。  
本文不改 V1。与 V1 矛盾处只给两种出路：**应用层兜住**，或建议日后 `V2__*.sql`（索引优先，能不改列就不改列）。  
禁止恢复工单 / 线索 / 密码表 / Service Bus / 第二库。禁止 `ddl-auto=update`。

编码仍从 `IMPLEMENTATION-BRIEF.md` 开工。完整路径与 JSON 仍归 **14**；前端拆文件归 **13**。本文只给表行为、租户与 Gateway **路由与入口**。

**403 vs 404（与 14 同一说法）：** 跨店 / 本店无此 id → **404**。角色不对、Admin 打业务 URL、店员无 `membership.active=1` → **403** `FORBIDDEN`。无/坏 JWT → **401**。`SOLD_LOCKED` → **409**。

---

## 1. listing 空草稿 vs `title`/`body` NOT NULL

**裁定（写死）：应用层用空字符串占位；GET 把「无行或双空」视为空草稿。不改 V1 可空。**

V1：

```sql
title VARCHAR(200) NOT NULL
body  TEXT NOT NULL
```

手册：`GET /vehicles/{id}/listing`「无则空草稿」。两者不冲突，按下面做。

| 场景 | 行为 |
|---|---|
| 该车尚无 `listing` 行 | GET **不插库**，返回虚拟草稿：`id=null`，`title=""`，`body=""`，`adKind=CASH`，`medium=ONLINE`，`status=DRAFT`，`contentVersion=1`，`lastCheckId=null`，`version=0` |
| 首次 PATCH | INSERT，`title`/`body` 用请求值；缺省或只要空白则写入 `''`（满足 NOT NULL） |
| 已有行且 `title` 与 `body` 去空白后都为空 | GET 当作空草稿（UI 空白表单），`status` 保持 `DRAFT`，禁止 Ready / Export |
| 客户端把 `title`/`body` 设为 `null` | 应用层收成 `''`，不要让 JDBC 撞 NOT NULL |

**为何不选 V2 改可空：** 空草稿是产品语义，不是「未知标题」。V1 已 NOT NULL；改可空要动列、实体、校验，且和「标题正文必填」规格用词打架。空串占位零迁移，Flyway 保持一张 V1 就能写实体。

**不建议 V2（本条）。**

实体约定：`Listing.title` / `Listing.body` Java 侧非空 `String`，默认 `""`。不要用 `Optional` 表示草稿。

---

## 2. `app_user.dealer_id` vs `membership`（租户权威）

**裁定：店员租户权威是 `membership`（`active=1` 的那一行）。`app_user.dealer_id` 只是给 `GET /me` 的缓存，写路径必须与 membership 同步，不能当隔离依据。**

### 2.1 两表分工

| 表 | 权威范围 | 非权威 |
|---|---|---|
| JWT `roles` + `oid`/`tid` | 是不是已登录、是 Admin 还是店员 | 不能告诉你店 ID |
| `membership` | **这家店能不能碰业务数据** | 不替代 Entra 角色 |
| `app_user` | 显示名、角色缓存、`GET /me` 的 `dealerId` | **禁止** `WHERE vehicle.dealer_id = app_user.dealer_id` 而不查 membership |

店员每个请求：

1. JWT 映射出 `Dealer.User`（见第 8 节）
2. 用 `(entra_tenant_id, entra_oid)` 找到 `app_user`
3. 查 **恰好一条** `membership.entra_oid = :oid AND active = 1`
4. 本请求 `tenantDealerId = membership.dealer_id`
5. 忽略 body / query / header 里的任何 `dealerId`
6. 若 `app_user.dealer_id` 与 membership 不一致：以 membership 为准，回写 `app_user.dealer_id`（自愈，不 500）

管理员：

- 无 membership 要求；`app_user.dealer_id` **必须为 NULL**
- 禁止 join 车辆 / 客户 / 广告；业务 URL → **403** `FORBIDDEN`（与 14 同一说法）；体中无业务字段。不要用 404 冒充「没这个店员」来挡 Admin。

### 2.2 一人多店？

**同一时刻只允许一个 `active=1` 的 membership。**  
V1 `uk_membership (dealer_id, entra_oid)` **不能**阻止同一 oid 挂两家店，必须应用层：

- `POST .../members`：该 `entraOid` 已有其他店的 active 行 → `409 DUP_MEMBER`（或先解绑再绑）
- 不在 Sprint 做「切店器」

历史行：解绑后 `active=0` 可保留，便于审计；同一 `(dealer_id, entra_oid)` 再绑则复活该行，不要插第二行（撞唯一键）。

### 2.3 解绑后角色怎么清

`DELETE /admin/dealers/{id}/members/{entraOid}`：

1. 目标行改为 `membership.active=0`（不删 Entra 账号，不删 `app_user` 行）
2. `app_user.dealer_id = NULL`
3. **`app_user.role` 仍为 `Dealer.User`**（角色在 Entra App Role，本地清不掉 JWT）
4. `GET /me`：`role=Dealer.User`，`dealerId=null`
5. 此后业务 API：无 active membership → **403** `FORBIDDEN`（已登录但无店）。**不是** 401，**不是** 404（404 只留给「本店无此 id / 跨店 id」）
6. 不在解绑时改 Entra 角色指派（本课无 Graph 写权限假设）；若 JWT 仍是 `Dealer.User` 但未绑店，就是「能进登录后空壳」

管理员操作可写 `audit_event`：`entityType=MEMBERSHIP`，`dealerId` 可空或为被解绑的店。

### 2.4 JWT 角色 × 本地 membership

| JWT 映射角色 | active membership | 结果 |
|---|---|---|
| 无 / 无法映射 | — | Gateway 401；进不了 core 业务 |
| `Platform.Admin` | 有或无都忽略 | 仅 `/api/v1/admin/**` 与 `/me`；`dealerId` 强制空 |
| `Platform.Admin` 与 `Dealer.User` 同时出现 | — | **Admin 赢**（防店员令牌误抬权时的反向：以令牌里的 Admin 为准） |
| `Dealer.User` | 恰好 1 条 active | 业务放行；租户 = 该行 `dealer_id` |
| `Dealer.User` | 0 条 | **403** `FORBIDDEN`，无店（与 14 同一说法） |
| `Dealer.User` | ≥2 条 active | 500 级配置错误（绑人接口本不该写出）；拒绝业务 |

`app_user.role`：登录或绑人时按 JWT 回写，**授权比较以当次 JWT 为准**。库里过期角色不能抬权。

**不建议 V2。** 若以后要库内保证一人一店，可用「仅 active 行」的生成列唯一索引；Sprint 1 不阻塞，应用层足够。

---

## 3. `vehicle.status`、已售锁、出售成对

**裁定：应用层枚举只允许 `IN_STOCK` / `SOLD`。V1 无 CHECK，不靠数据库挡脏值。**

### 3.1 状态机

| 动作 | 结果 |
|---|---|
| POST 新车 | 强制 `IN_STOCK`；`sold_on`/`sold_price` 必须都为 NULL |
| PATCH 在库 | 不得把 `status` 改成 `SOLD`（出售只走 `POST .../sell`） |
| POST sell | `{soldOn, soldPrice, version}` **缺一则 400 `SOLD_PAIR_REQUIRED`**；成功后 `status=SOLD`，两字段一起写入 |
| 已售再 sell | **409** `SOLD_LOCKED`，不覆盖原出售 |

非法字符串（`ACTIVE`、`DRAFT` 等）→ 400，不要静默入库。

### 3.2 已售锁哪些字段

已售（`status=SOLD`）**禁止 PATCH** 这些采购/身份字段（手册原文 + `dealer_id`）：

`make` `model` `modelYear` `vin` `source` `purchaseCost` `addedOn` `repairCost` `carfaxUrl` `dealerId`

允许：无（本课没有「已售改标价」列）。已售车的 listing 仍可 GET/PATCH 以便演示作废检查，但 **不能**靠改车把采购成本改掉。  
违反 → **409** `SOLD_LOCKED`（与 14 同一说法；不要 400）。

`version` 仍走乐观锁，冲突 `409 VERSION_CONFLICT`。

### 3.3 出售日期与价格成对

不变量（写路径每次检查）：

- `IN_STOCK` ⇔ `sold_on IS NULL AND sold_price IS NULL`
- `SOLD` ⇔ 两者都非 NULL
- 只填一个 → `SOLD_PAIR_REQUIRED`
- 价格必须 `> 0`（规格是成交价，0/负数 400）

**不建议 V2 CHECK**（可选、非开工阻塞）。实体用枚举 + 校验即可。

---

## 4. `customer_vehicle`

**裁定：一车全局只挂一个客户（`uk_cv_vehicle`）。只挂「本店 + IN_STOCK + 尚未占用」。成交后关联保留；已售不可新挂、不可解挂。**

| 规则 | 错误 |
|---|---|
| `vehicle.dealer_id == customer.dealer_id == tenantDealerId` | **跨店 id → 404**（不 403）。同请求内「看得见的车/客但店不一致」→ 400 `WRONG_DEALER_OR_SOLD` |
| `vehicle.status == IN_STOCK` 才能 PUT 挂车 | 已售不可新挂 → **400** `WRONG_DEALER_OR_SOLD`（14 PUT） |
| `uk_cv_vehicle`：该 `vehicle_id` 已有行 | 409 `VEHICLE_ALREADY_LINKED` |
| 一客户多车 | 允许 |
| 成交（sell） | **不删** `customer_vehicle`；CRM 仍显示该车 |
| 已售后 UNLINK（DELETE） | 拒绝 **409** `SOLD_LOCKED`（避免成交记录被抹掉；14 DELETE 必须回此码） |
| 在库 UNLINK | 允许；删行或按你们实体选择硬删（V1 无 soft-delete 列）；审计 `UNLINK` |
| 已售车再挂到别人 | 拒绝（唯一键 + 状态双重挡） |

挂车审计：`entityType=CUSTOMER_VEHICLE`，`action=LINK`/`UNLINK`，`fieldSummary` **不要**写电话/邮箱/住址全文。

**不建议 V2。** 唯一键已在 V1。

---

## 5. `listing.last_check_id` 无 FK

**裁定：不建 FK（避免 `listing` ↔ `compliance_check` 环）。应用层保证「只指向本 listing 自己插入的检查」。**

写入顺序（手册已有）：

1. INSERT `compliance_check`（带本 `listing_id`、当时 `content_version`）
2. 把生成的 `id` 写回 `listing.last_check_id`
3. 同一事务；失败则整单回滚，禁止出现「有检查行、listing 仍指旧 id」的半成功（AI 已调用但写库失败：以库为准，下次再检）

读：

- `last_check_id` 为空 → 无当前检查
- id 有值但行不存在（脏数据）→ 当成无检查，不要 500
- 行存在但 `check.listing_id != listing.id` 或 `check.dealer_id != listing.dealer_id` → 忽略，视为无检查
- Stale：`check.content_version != listing.content_version`（即使 recommendation 曾是 PASSED）

客户端 **不得** PATCH `lastCheckId`。升 `contentVersion` 时 **不要清空** `last_check_id`（UI 用版本比较显示 Stale）。

### 建议 V2 索引（非开工阻塞）

手册已点名的优先做：

```text
V2__indexes.sql（建议，不在本文落地）
- KEY idx_vehicle_dealer_status (dealer_id, status)
- KEY idx_customer_dealer (dealer_id)
```

本文额外建议（仍属 V2，可与上一张合并）：

```text
- KEY idx_membership_oid_active (entra_oid, active)
- KEY idx_listing_dealer (dealer_id)
- KEY idx_check_listing_ver (listing_id, content_version)
- KEY idx_audit_dealer (dealer_id)
```

**不要**在 V2 加 `last_check_id` FK。  
**不要**为 APR / 延保 / 既往用途加列。

---

## 6. OMVIC 固定清单判定（伪代码）

固定规则在 **core** 跑，**先于** 任何模型调用。  
输入：listing 的 `title+body`（统称 `text`）、`adKind`、`medium`、车辆公开字段、店四个公开字段。  
**不**用采购成本当「标价」。无 APR 列：只在正文里找。

下面是判定，**不是**关键词黑名单产品文档。匹配用大小写不敏感；金额/利率用正则，允许 `$`、`CAD`、`C$`。

```
function runFixedOmvic(listing, vehicle, dealer) -> { hardBlocks[], softGaps[], recommendation, aiStatus }

  text     = listing.title + "\n" + listing.body
  textNorm = lower(text)
  hard[]   = []          // 硬缺 → BLOCKED，不调 AI
  soft[]   = []          // 规则过了但仍建议 AI 盯的模糊项

  // --- 空草稿 ---
  if blank(listing.title) AND blank(listing.body):
      hard += PRICE_MISSING, DEALER_NAME_MISSING, CONDITION_UNDISCLOSED
      return blocked(hard)

  // --- 价格（始终）---
  hasPrice = match(text, /(?:cad|c\$|\$)\s*\d[\d,]*(?:\.\d{2})?|\d[\d,]*(?:\.\d{2})?\s*(?:cad|dollars?)/i)
  if !hasPrice:
      hard += PRICE_MISSING

  // --- 店名与联系（始终）---
  if !containsNormalized(text, dealer.legalName):
      hard += DEALER_NAME_MISSING
  hasPhone = containsNormalized(text, digits(dealer.contactPhone)) OR match(text, /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/)
  hasEmail = containsNormalized(text, dealer.contactEmail) OR match(text, /\S+@\S+\.\S+/)
  hasAddr  = containsNormalized(text, dealer.contactAddress)
  if !(hasPhone AND hasEmail AND hasAddr):
      if !(hasPhone OR hasEmail OR hasAddr):
          hard += DEALER_CONTACT_MISSING
      else:
          soft += DEALER_CONTACT_INCOMPLETE   // 只露一项：不硬拦，给 AI

  // --- 年份 / 新旧（始终）---
  year = vehicle.modelYear
  if !contains(text, str(year)):
      soft += YEAR_NOT_IN_COPY               // 有结构化 year，正文没写 → 不硬拦
  // 「新/旧」措辞矛盾（正文称 brand new 但 year <= 当前年-2）→ soft，交给 AI

  // --- 车况 conditionCode（始终；对照车辆，不对照想象中的库存标）---
  code = vehicle.conditionCode   // CERTIFIED | AS_IS | UNFIT | IRREPARABLE
  claimedCertified = match(textNorm, /certified|cpo|certifi/)
  claimedAsIs      = match(textNorm, /as[\s-]?is|as is/)
  claimedUnfit     = match(textNorm, /unfit|not roadworthy|not fit/)
  claimedIrrep     = match(textNorm, /irreparable|salvage|write[\s-]?off/)

  if claimedCertified AND code != CERTIFIED:
      hard += CONDITION_MISMATCH             // 广告优于实车
  if code in {UNFIT, IRREPARABLE}:
      disclosed = (code==UNFIT AND claimedUnfit) OR (code==IRREPARABLE AND claimedIrrep)
      if !disclosed:
          hard += CONDITION_UNDISCLOSED      // 不适驾 / 不可修必须写明
  if code == AS_IS AND !claimedAsIs:
      hard += CONDITION_UNDISCLOSED          // 规格要披露车况；AS_IS 用固定词
  if code == CERTIFIED AND !claimedCertified:
      soft += CERTIFIED_NOT_IN_COPY          // 可用 paraphrase，给 AI

  // --- 既往用途（始终「如适用」）---
  // 无车列。仅当正文自己提到警车/出租/日租/lease return 等，却看不到披露句式 → soft
  if mentionsPriorUseCue(textNorm) AND !mentionsPriorUseDisclosure(textNorm):
      soft += PRIOR_USE_UNCLEAR

  // --- 延保（始终「如正文声称有」）---
  if match(textNorm, /extended warranty|warranty included|free warranty/):
      soft += WARRANTY_CLAIM_NEEDS_REVIEW    // 不硬拦；AI 看是否完整

  // --- FINANCE 加项 ---
  if listing.adKind == FINANCE:
      hasApr = match(text, /\d+(\.\d+)?\s*%\s*(apr|annual percentage rate)|apr\s*[:=]?\s*\d+(\.\d+)?\s*%/i)
      if !hasApr:
          hard += FINANCE_APR_MISSING
      hasTerm = match(textNorm, /\d+\s*(month|months|mo)\b|term\s*[:=]?\s*\d+/)
      if !hasTerm:
          soft += FINANCE_TERM_MISSING
      // 现金价 = 上面的 hasPrice；已缺则已在 hard
      if listing.medium != RADIO_TV_BILLBOARD:
          // 「利率与 APR 并列」无法可靠正则 → 不进 hard，进 soft 让 AI 看版式
          soft += FINANCE_APR_PROXIMITY
      // RADIO_TV_BILLBOARD：免并列展示，不加 FINANCE_APR_PROXIMITY

  // --- LEASE 加项 ---
  if listing.adKind == LEASE:
      hasApr = match(text, /\d+(\.\d+)?\s*%\s*(apr|annual percentage rate)|apr\s*[:=]?\s*\d+(\.\d+)?\s*%/i)
      if !hasApr:
          hard += LEASE_APR_MISSING
      if !match(textNorm, /lease|leasing|lessee/):
          hard += LEASE_STATEMENT_MISSING
      hasTerm = match(textNorm, /\d+\s*(month|months|mo)\b/)
      hasRent = hasPrice OR match(textNorm, /\$?\d+.*(per month|\/mo|monthly)/)
      hasDown = match(textNorm, /down payment|due at signing|\$\d+.down/)
      if !hasTerm: soft += LEASE_TERM_MISSING
      if !hasRent: soft += LEASE_RENT_MISSING
      if !hasDown: soft += LEASE_DOWN_MISSING
      if match(textNorm, /(\d{1,5})\s*(km|kilometr).*\/\s*(year|yr|annual)/):
          allowance = capturedKm
          if allowance < 20000 AND !match(textNorm, /excess|overage|additional.*(km|kilometr)/):
              hard += LEASE_EXCESS_KM_MISSING
      else:
          soft += LEASE_ALLOWANCE_UNSTATED

  // --- 汇总（固定规则先于 AI）---
  if hard is not empty:
      return {
        ruleFindings: hard + soft,
        recommendation: BLOCKED,
        aiStatus: SKIPPED
        // 调用方：不 HTTP 调 ai-service
      }

  return {
    ruleFindings: soft,
    recommendation: NEEDS_AI,          // 尚无成功 AI
    aiStatus: (will call AI)
  }
```

core 在 `hard` 为空之后才经 Gateway `POST /internal/v1/ad-check`（≤15s）。  
AI 成功且未再报硬缺 → `PASSED` + `SUCCESS`。  
超时/失败 → `UNAVAILABLE` + `UNAVAILABLE`，**禁止当 Pass**。  
页面五态仍只按手册：Blocked / Needs AI review / Passed / Stale / AI unavailable。

---

## 7. Gateway 路由表

浏览器与服务间 HTTP **只走** `dealer-gateway`。core / ai-service **无对公入口**。

| 匹配 | 上游 | 谁可以打 | 失败形态 |
|---|---|---|---|
| `/api/v1/**` | `CORE_URL`（本地 `http://host.docker.internal:8081`） | 浏览器与 MSAL 拿到的用户 JWT | 无/坏 JWT → 401 |
| `/internal/v1/**` | `AI_URL`（本地 `http://host.docker.internal:8082`） | **仅 core**（见下） | 浏览器 → **404**（不要 401 以免承认路径） |
| 其他 | — | — | 404 |

内部两条（与手册一致，此处只定入口，不写 OpenAPI 体）：

- `POST /internal/v1/ad-check`
- `POST /internal/v1/assistant`

### 浏览器打 internal 必须失败

同时做三道，缺一答辩会被问穿：

1. **Gateway 谓词：** `/internal/v1/**` 要求头 `X-Dealer-Internal: <INTERNAL_TOKEN>`（值来自环境 / Key Vault，**不是**用户 JWT）。浏览器没有这颗头 → Gateway **404**。
2. **core 出站：** 调 AI 时自加该头；用户 JWT **不要**转给 ai-service（ai-service 无用户、无库）。
3. **ai-service：** 只绑集群内；缺内部头 → 404。即使有人直连 8082 也失败。

`/api/v1/**` **禁止**转发到 ai-service。  
core **禁止**配置浏览器可及的公网 Ingress。

Gateway 职责到此为止：路由、验用户 JWT、挡 internal、剥敏感头。不写业务、不连 MySQL、不调模型 SDK。

---

## 8. JWT claim → 角色，以及「为何没有独立 auth 微服务」

### 8.1 映射（写死）

Entra 应用注册上建 **两个 App Role**，`value` 必须是：

- `Platform.Admin`
- `Dealer.User`

Access token（audience = `ENTRA_AUDIENCE`，默认 `api://dealer-api`）：

| Claim | 用法 |
|---|---|
| `iss` | 必须等于 `ENTRA_ISSUER`（`https://login.microsoftonline.com/<tid>/v2.0`） |
| `aud` | `api://dealer-api` 或该 API 的 GUID（与 `ENTRA_AUDIENCE` 配置一致） |
| `oid` | `app_user.entra_oid` / `membership.entra_oid` |
| `tid` | `app_user.entra_tenant_id` |
| `name` / `preferred_username` | 回写 `display_name`（有则更新） |
| `roles`（数组） | **RBAC 唯一来源** |
| `scp` / `scope` | 只证明有 `access_as_user`，**不是** Admin/店员 |
| `groups` | **忽略**（本课不靠安全组当角色） |

```
function mapRole(claims):
  roles = claims.roles or []
  if "Platform.Admin" in roles: return Platform.Admin
  if "Dealer.User" in roles:    return Dealer.User
  return NONE          // Gateway 401 或 core /me 以外全 403
```

SPA：MSAL + PKCE，`VITE_ENTRA_CLIENT_ID` 为公共客户端，**无 client secret**。  
Gateway 与 core **都要**验签（同一 issuer/audience）。Gateway 验过仍要把 JWT 转给 core；core 再验一遍，防止有人将来误把 core 口子打开。

### 8.2 答辩：PPT 写了 Auth 独立域，为何不建第五个 Java 仓

PPT 把 **Auth** 画成与 UI / Data / AI 并列的域，要的是 **OAuth/OIDC + JWT + RBAC**，并且 **禁止自研认证**。本课的 Auth 单元 **就是 Microsoft Entra ID**（07 表已这样写），不是再写一个 `dealer-auth`。

若自建 auth 微服务：必然出现密码表或二次发牌，直接撞 PPT；还要第五仓、第五条流水线、第五个 Container App，超出「四应用仓 + platform」和手册「不建密码表」。管理员「发账号」= 绑 `entra_oid` → `dealer_id`，身份在 Entra，授权缓存与租户在 core 的 `app_user`/`membership`。Gateway 只验令牌、不签发令牌。

课堂说法（半页收束）：**Auth 独立 = 身份由 Entra 独立托管；应用侧没有认证服务，只有验票与绑店。** 与「四个业务/入口进程 + 一个 IdP」一致，不是漏做微服务。

---

## 9. 为何不用 Service Bus（对照提案）

早期提案/作废的 `01`–`06` 容易把 DMS、CRM、广告想成异步领域事件：车售出 → 队列 → 作废广告、通知 CRM。课程 **v6 已否**。

对照现行约束：

- **一张 MySQL `dealer_core`。** 车辆、客户、广告、检查同库同事务。卖车锁字段、升 `contentVersion`、写 `audit_event` 一次 commit 即可，不需要 outbox。
- **AI 无状态、同步 REST、15s。** 店员点「检查」就在等结果；再套 Service Bus + 回查是多一个失败模式，课堂上来不及讲 DLQ。
- **PPT 硬项是独立微服务 + Gateway + 容器，不是消息总线。** 总线不能替代「绕过 Gateway 必须失败」的演示。
- **不做工单/线索漏斗。** 没有长工作流要解耦。
- **三人 Sprint、demo 一套环境。** Service Bus 是钱、是身份、是第二套可观测性，且手册「明确禁止实现」。

答辩一句：提案里的异步是范围膨胀；本课用同步 REST + 单库事务满足一致性，**有意不用** Service Bus / outbox / DLQ / 第二库。

---

## 10. 证明「直连 core 失败」

### 10.1 本地端口（与 `env.example` 对齐）

| 进程 | 端口 | 浏览器 |
|---|---|---|
| dealer-web（Vite） | 5173 | 只出静态 + 跳 Entra |
| dealer-gateway | **8080**（`GATEWAY_PORT`） | **唯一 API 源**，`VITE_GATEWAY_URL=http://localhost:8080` |
| dealer-core | **8081**（`CORE_PORT`） | 必须失败 |
| ai-service | **8082**（`AI_PORT`） | 必须失败 |
| MySQL | 3306 | 不给浏览器 |

现有 `dealer-platform/docker-compose.yml` **只有 MySQL**。四服务进 compose 之后：Gateway 映射 8080；core/ai **不要**映射到 `0.0.0.0` 给全班扫（若本机演示需要 curl，只绑 `127.0.0.1:8081`，仍算「浏览器跨源失败」）。

### 10.2 配置原则（Sprint 1 能演示）

1. core / ai **不配**对 `http://localhost:5173` 的 CORS。浏览器从页面 `fetch('http://localhost:8081/api/v1/vehicles')` → 浏览器拦（无 ACAO）。
2. 同一请求走 `http://localhost:8080/api/v1/vehicles` + Bearer → 200 或业务错。
3. Azure：core / ai-service Ingress 设为 **internal**（仅 Container Apps 环境内）；对外 FQDN 只有 web + gateway。
4. 课堂备一手：`curl` 8081 若仍通，展示「无 CORS / 无公网 DNS / 需内网」，并强调 **产品入口不是 8081**。不要靠「关防火墙但忘了关」当唯一证据。

---

## 11. Azure 最小资源清单与现有 Bicep 缺口

07 要求的最小集合（一套 demo 资源组）：

| 资源 | 数量 | 现状（`dealer-platform/infra/main.bicep`） |
|---|---|---|
| Azure Container Registry | 1（Basic，admin 关） | **已有占位** |
| Container Apps Environment | 1 | **未写** |
| Container Apps | **4**：web、gateway、core、ai-service | **未写** |
| MySQL Flexible Server | 1 库 `dealer_core`，走私网 | **未写** |
| Key Vault | 1 | **未写** |
| Application Insights | 1 | **未写** |
| 用户分配或系统分配身份 | 拉 ACR、读 KV | **未写** |

**不要假装 Bicep 已经齐。** 实现组按 Sprint 补同一 `main.bicep`，本文只列应补项。不要在 Bicep 里写 subscriptionId 或密钥明文。

### 谁持哪把 Key / 秘密

| 秘密（KV 名建议） | 谁读 | 谁不读 |
|---|---|---|
| `AIMANAGER-API-KEY` | **仅 ai-service** | web / gateway / core |
| `MYSQL-PASSWORD`（或连接串） | **仅 core** | 其余 |
| `INTERNAL-TOKEN`（Gateway↔AI） | gateway + **core**（出站）+ ai-service | web |
| Entra `client secret` | **不创建**（SPA + PKCE） | — |
| `VITE_ENTRA_CLIENT_ID` / tenant | web 构建参数，**不是**秘密，可进流水线变量 | 不要把 API Key 塞进前端 |

平台磁盘加密用默认即可。MySQL 不对公网开放（若课程订阅做不到 VNet，至少防火墙只放 Container Apps 出口，并在 Review 说明限制）。

### Sprint 应补（Bicep / 流水线）

**Sprint 1（过 NN 架构口试，可以仍本机）：**

- 保持 ACR 占位即可
- 讲清四镜像、Gateway、Entra 两角色、直连 core 失败
- 不必为了 Review 1 强行申请订阅

**Sprint 2（云上真路径，必须补）：**

- Key Vault + 访问策略 / RBAC
- MySQL Flexible Server + 库 + 仅 core 身份连接
- Container Apps Environment
- 四个 Container App：环境变量用 KV 引用；core/ai **internal ingress**；gateway/web **external + HTTPS**
- Application Insights（可先只接 gateway + core）
- 各仓流水线：编译 → 镜像 tag=SHA → 推 ACR → 部署 **该** 应用
- demo 发布人工批准；禁止门户手点改镜像冒充流水线

**Sprint 3：** 不再加总线/第二库；只把隔离、CRM、三类广告、导出、审计跑满。

---

## 12. Java 版本（四课仓统一）

**裁定：四个课仓（web 除外的 Java 三仓 + 若有共享测试）统一用 JDK 21。优先 21，不混 17/21 各仓各一套。**

| 仓 | 版本 |
|---|---|
| dealer-gateway / dealer-core / ai-service | **Java 21**（与手册默认、07「Java 21」一致） |
| dealer-web | Node 20 工具链，无 JDK |
| ai-manager（GitHub 私有库） | 上游是 **Java 17** + Boot 3.2.5；**本课不改该库源码** |

21 运行时可以依赖 **17 字节码** 的 `aimanager` JAR，因此 **不必**把三仓降到 17，也 **不必** 改 ai-manager 去升 21。

手册允许「与 ai-manager 对齐用 17」仅作为本机只有 17 时的退路：**若退，三 Java 仓一起退到 17，禁止 core 21、ai-service 17。**

**不可变版本（只计划，不改代码）：** 钉死 commit `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a`，实施时打 **非 SNAPSHOT** 的不可变版本再给 `ai-service` 引用（GitHub Packages）。在打版本之前本机 `mvn install` 仅供开发。CI 用 stub，不打付费端点。

---

## 13. CORS、HTTPS、Key Vault 引用（无密钥进仓）

### CORS

- **只**在 Gateway（以及对 5173 开发时的 web dev server）允许浏览器源。
- 本地允许 `http://localhost:5173`；Azure 只允许 web 的 HTTPS 源。
- core / ai-service：**不配**浏览器 CORS（或配空）。这是第 10 节「直连失败」的一部分。
- 预检：允许 `Authorization`、`Content-Type`；**不要**把 `X-Dealer-Internal` 暴露给浏览器（`Access-Control-Allow-Headers` 不列它）。

### HTTPS

- Azure 上 gateway / web 必须 HTTPS（Container Apps 默认证书即可）。
- 本机 HTTP 仅限 localhost，Review 2 不以「本机 HTTP」冒充云安全项。
- Cookie 不是本课方案；令牌在内存 / MSAL，走 `Authorization: Bearer`。

### Key Vault 引用原则

- 仓内只有 `env.example` 空值与 Bicep 参数名。`.env`、真实连接串、`AIMANAGER_API_KEY` **不进 Git**。
- Container Apps 用 `secretRef` → KV，不在 Bicep 写 secret 的 `value:` 明文。
- 聊天、看板、截图打码。轮换 Key = 只改 KV，不改镜像。
- Flyway 用 core 数据面账号，不要把订阅 Owner Key 塞进应用。

---

## 实体层落地备忘（仍不写业务代码）

写 JPA/枚举时按 V1 列名，不多列：

`dealer` · `app_user` · `membership` · `vehicle` · `customer` · `customer_vehicle` · `listing` · `compliance_check` · `audit_event`

枚举（应用层）：

- `AppRole`：`Platform.Admin` / `Dealer.User`
- `VehicleStatus`：`IN_STOCK` / `SOLD`
- `VehicleSource`：`TRADE_IN` / `AUCTION` / `PRIVATE_PURCHASE` / `OTHER`
- `ConditionCode`：`CERTIFIED` / `AS_IS` / `UNFIT` / `IRREPARABLE`
- `AdKind`：`CASH` / `FINANCE` / `LEASE`
- `AdMedium`：`ONLINE` / `RADIO_TV_BILLBOARD`
- `ListingStatus`：`DRAFT` / `READY`
- `AiStatus`：`SKIPPED` / `SUCCESS` / `FAILED` / `UNAVAILABLE`
- `Recommendation`：`BLOCKED` / `NEEDS_AI` / `PASSED` / `UNAVAILABLE`

---

## V2 总表

| 项 | V2？ |
|---|---|
| listing 空草稿 | **否**（空串 + 虚拟 GET） |
| 租户权威 / 一人一店 | **否**（应用层） |
| vehicle.status 取值 | **否**（枚举）；CHECK 可选以后再说 |
| customer_vehicle 成交保留 | **否** |
| last_check_id FK | **否** |
| 索引 `vehicle(dealer_id,status)`、`customer(dealer_id)` 等 | **建议有，非开工阻塞** |
| APR/延保/标价列 | **否（禁止）** |
| 密码表 / 第二库 | **否（禁止）** |
