# AI 编码规格 · dealer-web（前端）

1. 读者：另一个编码 AI。遵守本文即可新建 `dealer-web` 并按 [14](14-Backend-API-Contract.md) 接线；字段/枚举/DTO 以手册第 3 节与 14 为准，本文不另定列。
2. 栈钉死：Vue 3 + Vite + Element Plus + Vue Router + Pinia + `@azure/msal-browser` + axios。无 Nuxt、无图表库、无通用 CRUD 生成器。
3. 浏览器 HTTP **只打** `import.meta.env.VITE_GATEWAY_URL`（本地 `http://localhost:8080`），路径前缀 `/api/v1`。禁止 axios 指向 8081/8082，禁止请求 `/internal/v1/**`。
4. 路由仅六页：`/login` `/admin` `/dms` `/crm` `/ads` `/assistant`。无第七条业务路由；禁止 `/audit` `/tickets` `/leads` `/dashboard` / 买家页。
5. Admin：**一个路由** `/admin` + 页内双 Tab（Dealerships | Members）。禁止 `/admin/members`。本课 UI **不做** Edit 店（14 虽有 `GET/PATCH /admin/dealers/{id}`）。
6. 助手模型挂但仍 HTTP 200：说明区固定英文 **`Smart summary unavailable`**（以 [12](12-Frontend-UI-Conventions.md) 为准，不用 [10](10-Web-AI-Assistant.md) 的「智能说明暂不可用」）。整页失败：`Could not ask assistant`。
7. 未列功能不做：工单、线索、C 端/买家站、独立 Audit 页、KPI 首页、密码登录、切店器、外部广告发布。
8. 界面全英文。错误体 `{code,message}`。失败不当空表。乐观锁写带 `version`，`409 VERSION_CONFLICT` → `Refresh and retry`。忽略客户端 `dealerId`。
9. **实现顺序锁定：** FE-T01 壳 → FE-T02 守卫 → FE-T03 MSAL/HTTP → FE-T04 布局四态 → FE-T05 Login → FE-T06 Admin → FE-T07 DMS → FE-T08 CRM → FE-T09 Ads → FE-T10 Assistant → FE-T11 对照 16。
10. 验收只引用 [16](16-Acceptance-and-Test.md) 的 `FE-01`～`FE-10`、`CL-1`～`CL-6`（及课堂会碰到的 `BE-*` 前端表现）。不要发明 path / 错误码 / 第五种以外的广告总状态。

权威冲突：课程 PPT > 规格字段 > BRIEF / 00 > 15 / **14（HTTP）** > 13 > 12 > 本文。本文是拆文件任务，不是业务实现。

---

## 实现顺序（必须按此提交）

| 序 | 任务 | 完成才能开始下一件 |
|---|---|---|
| 1 | FE-T01 脚手架 | `npm run dev` 起 Vite :5173 |
| 2 | FE-T02 路由表+守卫 | 未登录进业务 path 必到 `/login` |
| 3 | FE-T03 MSAL+axios | 每个请求只打 8080 且带 Bearer |
| 4 | FE-T04 壳+四态组件 | `AppLayout`/`PageState` 可挂空页 |
| 5 | FE-T05 Login | `Sign in with Microsoft` + `GET /me` 分流 |
| 6 | FE-T06 Admin | 双 Tab 全接线；无业务菜单 |
| 7 | FE-T07 DMS | 列表/增改/出售/审计抽屉 |
| 8 | FE-T08 CRM | 列表/增改/挂车/**Unlink 二次确认** |
| 9 | FE-T09 Ads | 五态；Ready/导出仅 Passed 非 Stale |
| 10 | FE-T10 Assistant | 输入框、≤5 卡、失败文案 |
| 11 | FE-T11 对照 16 | FE-01～FE-10 + CL 脚本手测打勾 |

---

## 可复制路由表（FE-T02 原样写入 `src/router/index.ts`）

| path | name | 组件文件 | `meta` | 登录后落地 |
|---|---|---|---|---|
| `/login` | `login` | `src/views/LoginView.vue` | `{ public: true }` | — |
| `/admin` | `admin` | `src/views/AdminView.vue` | `{ roles: ['Platform.Admin'] }` | Admin 默认页 |
| `/dms` | `dms` | `src/views/DmsView.vue` | `{ roles: ['Dealer.User'] }` | 店员默认页 |
| `/crm` | `crm` | `src/views/CrmView.vue` | `{ roles: ['Dealer.User'] }` | — |
| `/ads` | `ads` | `src/views/AdsView.vue` | `{ roles: ['Dealer.User'] }` | 页标题 **Ad compliance** |
| `/assistant` | `assistant` | `src/views/AssistantView.vue` | `{ roles: ['Dealer.User'] }` | — |

- `/` 与未知 path：已登录按 `role` → `/admin` 或 `/dms`；未登录 → `/login`。不要 404 营销页。
- 可选深链：`/dms?vehicleId=`、`/crm?customerId=`、`/ads?vehicleId=`（助手卡跳转）。**禁止**把 `dealerId` 放进路由当权威。
- 菜单与守卫同一套：Admin **只渲染** Admin；店员 **只渲染** DMS / CRM / Ad compliance / Assistant。

`beforeEach` 顺序（13 §3，禁止改序）：

1. 未登录（MSAL 无账号）且非 `meta.public` → `/login`，记下 `redirect`。
2. 已登录且在 `/login` → `GET /api/v1/me` 后按角色去 `/admin` 或 `/dms`。
3. `Platform.Admin` 访问 `/dms` `/crm` `/ads` `/assistant` → 拦回 `/admin`，不渲染业务表。`Dealer.User` 访问 `/admin` → 拦回 `/dms`。
4. `GET /me` 失败 401 → 清会话，回 `/login`。
5. `role` 不在 `Platform.Admin` | `Dealer.User`，或 `/me` 显示无店且手册有 `active=false` → 留无业务壳，顶栏 `Sign out`，正文走 forbidden 态。不要猜第三种角色。

---

## FE-T01 · Vite 脚手架与目录树

- **仓：** `dealer-web`（工作区尚无此仓：在仓库根旁新建，或按组约定的 monorepo 子目录；**不要**写进 `design/`）。
- **文件：**
  - `dealer-web/package.json`
  - `dealer-web/vite.config.ts`（dev server **5173**）
  - `dealer-web/.env.example`（只抄 `dealer-platform/env.example` 前端四项，见下）
  - `dealer-web/src/main.ts`
  - `dealer-web/src/App.vue`
  - 空壳占位（本任务可先空组件）：`src/router/index.ts`、`src/auth/msal.ts`、`src/api/http.ts`、`src/api/me.ts`、`src/api/admin.ts`、`src/api/vehicles.ts`、`src/api/customers.ts`、`src/api/listings.ts`、`src/api/audit.ts`、`src/api/assistant.ts`、`src/stores/session.ts`、`src/layouts/AppLayout.vue`、`src/components/AppMenu.vue`、`src/components/DataTable.vue`、`src/components/FormDrawer.vue`、`src/components/ConfirmDialog.vue`、`src/components/PageState.vue`、`src/components/AdWorkspace.vue`、`src/components/AssistantCard.vue`、`src/views/LoginView.vue`、`src/views/AdminView.vue`、`src/views/DmsView.vue`、`src/views/CrmView.vue`、`src/views/AdsView.vue`、`src/views/AssistantView.vue`
- **必须包含：**
  - 依赖：`vue` `vue-router` `pinia` `element-plus` `axios` `@azure/msal-browser`；`vite` `@vitejs/plugin-vue`。
  - 目录必须存在：`src/views` `src/api` `src/stores` `src/auth` `src/layouts`（另有 `src/router` `src/components`）。
  - `.env.example` 四键，值与 `dealer-platform/env.example` 一致：

    | 键 | 本地默认 |
    |---|---|
    | `VITE_ENTRA_TENANT_ID` | 空（复制后填） |
    | `VITE_ENTRA_CLIENT_ID` | 空 |
    | `VITE_ENTRA_API_SCOPE` | `api://dealer-api/access_as_user` |
    | `VITE_GATEWAY_URL` | `http://localhost:8080` |

  - `stores` **只**留 `session.ts`（账号、`role`、店展示名）。列表状态放各 View。
- **禁止：** Nuxt；再拆 `AuditView` / tickets / leads / dashboard；`.env` 提交真实 tenant/client；在 `design/` 写 Vue 源码。
- **验收：** `npm install && npm run dev` 监听 `http://localhost:5173`。目录树与上表文件一一对应。无第七业务 View。

---

## FE-T02 · 路由表与守卫

- **仓：** `dealer-web`
- **文件：** `src/router/index.ts`（唯一 `beforeEach`）；`src/stores/session.ts`（读 `role`）；六个 `src/views/*.vue` 必须已被路由引用。
- **必须包含：** 上文「可复制路由表」六条 + `/` 与未知 path 分流。守卫五步原样实现。菜单组件稍后 T04 必须读同一 `meta.roles`，不得另写一套权限。
- **禁止：** 注册 `/audit` `/tickets` `/leads` `/dashboard` `/admin/members`；用藏按钮代替守卫；404 营销页。
- **验收：** 对照 16 **FE-01～FE-06**：未登录打开 `/dms` → `/login`；Staff 打开 `/admin` → `/dms`；Admin 打开 `/dms` `/crm` `/ads` `/assistant` → `/admin` 且不渲染业务表。

---

## FE-T03 · MSAL + axios（只打 8080）

- **仓：** `dealer-web`
- **文件：** `src/auth/msal.ts`；`src/api/http.ts`；`src/main.ts`（启动时 `handleRedirectPromise`）；`src/stores/session.ts`。
- **必须包含：**
  - `PublicClientApplication`。authority = `https://login.microsoftonline.com/${VITE_ENTRA_TENANT_ID}`。`clientId` = `VITE_ENTRA_CLIENT_ID`。
  - **PKCE：** 保持 SPA / `@azure/msal-browser` 默认 PKCE。禁止 confidential client、禁止 client secret。
  - **Redirect URI（开发）：** 源 `http://localhost:5173`。`redirectUri` 与 `postLogoutRedirectUri` 都指向同源 **`/login`**（完整 URL：`http://localhost:5173/login`）。登录主路径：`loginRedirect`（不要 popup）。`loginRequest.scopes` / `acquireTokenSilent` **只用** `VITE_ENTRA_API_SCOPE`（默认 `api://dealer-api/access_as_user`）。
  - `api/http.ts`：`baseURL = import.meta.env.VITE_GATEWAY_URL`。请求 path 写 `/api/v1/...`。
  - 请求拦截器：`acquireTokenSilent({ scopes: [VITE_ENTRA_API_SCOPE], account })`，失败再 `acquireTokenRedirect`；头 `Authorization: Bearer <accessToken>`。
  - 响应：401 → 清会话回 `/login`。403/404/409/400/502 → 抛给页内 `PageState` 或 `ElMessage`，**不当空表**。
  - 禁止把 `dealerId` 放进 query/body/header 当租户开关。
- **禁止：** 密码框；axios 指向 `8081`/`8082`；浏览器打 `/internal/v1/ad-check` 或 `/internal/v1/assistant`；第二套 API 根。
- **验收：** 网络面板每个 XHR 的 host 是 Gateway（本地 **8080**）。无 token 的请求不得发出（登录页除外）。Entra 回调落在 `http://localhost:5173`。对照 16 **FE-01**（仅 Microsoft 按钮）。

---

## FE-T04 · 布局、共享组件、四态文案

- **仓：** `dealer-web`
- **文件：** `src/layouts/AppLayout.vue`；`src/components/AppMenu.vue`；`src/components/DataTable.vue`；`src/components/FormDrawer.vue`；`src/components/ConfirmDialog.vue`；`src/components/PageState.vue`；`src/App.vue`。
- **必须包含：**
  - `AppLayout`：左菜单 + 顶栏（店员店名 = `/me.dealerLegalName`，空则 `Dealership`；Admin 固定 `Platform Admin`；角色；`Sign out`）+ `router-view`。
  - `AppMenu`：Admin 仅一项 `Admin`。店员四项：`DMS` · `CRM` · `Ad compliance` · `Assistant`。
  - `DataTable`：Element Table + 每页 **10** + 操作列最多 **3** 个文字链 + 状态 Tag；`status=SOLD` 行变淡。分页：query `page` 从 **0**，信封 `{items,page,size,total}`（14）。
  - `FormDrawer`：新增/编辑；枚举 `el-select`，提交枚举原值，展示可读空格标签。
  - `ConfirmDialog`：供 Sell、Unbind staff、**Unlink** 二次确认。
  - `PageState`：四槽 **loading / empty / error / forbidden**。六页文案必须用下表（13 §10），禁止自写近义句。
- **禁止：** KPI 条、多店切换、图标海、价格滑条、行内万用编辑器、向导多步。
- **验收：** 16 **FE-09** 文案可逐页套上。菜单与 FE-01～FE-06 一致。

### 六页四态（复制进 `PageState` 调用处）

| 页 | loading | empty | error | 403 / 无权限 |
|---|---|---|---|---|
| Login | `Signing you in…` | （无列表；只登录卡） | `Sign-in failed. Try again.` | 已登录错角色不停本页，守卫分流 |
| Admin | `Loading dealerships…` | `No dealerships yet.` | `Could not load dealerships.` | `You do not have access to Admin.` |
| DMS | `Loading vehicles…` | `No vehicles match.` | `Could not load vehicles.` | `You do not have access to DMS.` |
| CRM | `Loading customers…` | `No customers match.` | `Could not load customers.` | `You do not have access to CRM.` |
| Ads | `Loading listing…` | `Select a vehicle to start.` / `No vehicles to advertise.` | `Could not load listing.` | `You do not have access to Ad compliance.` |
| Assistant | `Asking…` | `Ask a question about this dealership.` | `Could not ask assistant.` | `You do not have access to Assistant.` |

店员已登录但无有效 membership：业务 API **403** `FORBIDDEN`（14 §1.3）；`GET /me` 仍 200 且 `dealerId=null`。页内走 error/forbidden，不当空表。

---

## FE-T05 · Login 接线表

- **仓：** `dealer-web`
- **文件：** `src/views/LoginView.vue`（居中单卡，无侧栏）；`src/api/me.ts`；`src/stores/session.ts`；`src/auth/msal.ts`。
- **必须包含：** 仅一颗按钮 `Sign in with Microsoft`。无 Forgot password。无用户名密码。
- **禁止：** 密码登录、第三按钮。
- **验收：** 16 **FE-01**、**CL-1** 步骤 1、**CL-2** 步骤 1。

### 接线表 · Login `/login`

| 控件 / 时机 | method + path | 成功 | 失败 HTTP / code → 英文 |
|---|---|---|---|
| `Sign in with Microsoft` | 无业务 API；`loginRedirect` | redirect 回 `/login` | MSAL 失败 → `Sign-in failed. Try again.` |
| redirect 完成后 | `GET /api/v1/me` | Pinia 写 `role` `dealerId` `dealerLegalName` `displayName` `entraOid`。`Platform.Admin`→`/admin`；`Dealer.User`→`/dms`（或守卫记下的 `redirect`，但仍受角色表约束） | `401` → `Sign in required` 并回登录；其他 → `Could not load profile` |
| 进任何受护页 | `GET /api/v1/me`（若会话无 role） | 同上 | 同上 |

`/me` 响应形状（14 §2）：`{ entraOid, displayName, role, dealerId, dealerLegalName }`。Admin 后两项为 `null`。

---

## FE-T06 · Admin（单页双 Tab）

- **仓：** `dealer-web`
- **文件：** `src/views/AdminView.vue`；`src/api/admin.ts`；复用 `DataTable` `FormDrawer` `ConfirmDialog` `PageState`。
- **必须包含：**
  - 路由只有 `/admin`。页内 `el-tabs`：`Dealerships` | `Members`。
  - **Dealerships 列（12）：** Name, Contact, Staff count, Actions。筛：店名一行。主按钮右上 `New dealership`。
    - Name ← `legalName`。Contact ← `contactPhone` / `contactEmail` 拼一行即可。Staff count ← `staffCount`（无值显示 `—`）。
  - **Members 列（12）：** Entra ID / email, Dealership, Status, Actions。筛：员工邮箱（API **无 email 列**：`q` 打在 `displayName`/`entraOid` 上，14 §3.5）。
  - Members 数据：**禁止**发明 `GET /admin/members`。算法：`GET /api/v1/admin/dealers` 后对 `items[]` 每家 `GET /api/v1/admin/dealers/{id}/members`，前端摊平，带上店 `legalName`。
  - 行内 `Staff`：抽屉只显示该店成员；`Bind staff` / `Unbind` 都在抽屉。Members Tab 的 `Unbind` 打同一条 DELETE。
  - `New dealership` 抽屉四字段：`legalName` `contactPhone` `contactEmail` `contactAddress`（全非空）。
  - `Bind staff` 体：`{ entraOid, displayName }`。
- **禁止：** 第二条 Admin 子路由；Edit 店按钮（不调用 `PATCH /admin/dealers/{id}`）；车辆 Tab；发邮件建 Entra 账号；菜单出现 DMS/CRM/Ads/Assistant。
- **验收：** 16 **FE-07**、**CL-1**、**CL-3**（地址栏改 `/dms` 被拦回）。

### 接线表 · Admin `/admin`

| 控件 | method + path | 成功刷新 | 失败 HTTP / code → 英文 |
|---|---|---|---|
| 进入 / Search / Reset（店 Tab） | `GET /api/v1/admin/dealers?q=&page=&size=` | 店表 | `403` `FORBIDDEN` → `You cannot open Admin` / `You do not have access to Admin.`；其他 → `Could not load dealerships.` |
| `New dealership` 提交 | `POST /api/v1/admin/dealers` → **201** | 店表；切到 Dealerships | `400` `VALIDATION` → `Check required contact fields` |
| 打开 Staff 抽屉 | `GET /api/v1/admin/dealers/{id}/members?page=&size=&q=` | 抽屉表 | `404` `NOT_FOUND` → `Dealership not found` |
| `Bind staff` 提交 | `POST /api/v1/admin/dealers/{id}/members` → **201** | 该店成员 + 店表 `staffCount` | `400` `VALIDATION` → `Check Entra ID`；`409` `DUP_MEMBER` → `Staff already bound` |
| `Unbind`（`ConfirmDialog` 后） | `DELETE /api/v1/admin/dealers/{id}/members/{entraOid}` → **204** 无 body | 同上 | `404` → `Member not found` |
| Members Tab 加载 | 上表两次 GET 组合摊平 | 成员表 | 同店表 / 成员 GET |

店员打以上 URL：后端 **403** `FORBIDDEN`；前端守卫应已拦，不渲染表。

---

## FE-T07 · DMS

- **仓：** `dealer-web`
- **文件：** `src/views/DmsView.vue`；`src/api/vehicles.ts`；`src/api/audit.ts`；出售小窗可内嵌本 View。
- **必须包含：**
  - 列（12）：Year Make Model, VIN, Source, Condition, Cost, Status, Actions。
    - Year Make Model ← `modelYear` `make` `model`。Source ← `source`。Condition ← `conditionCode`。Cost ← `purchaseCost`。Status Tag ← `status`。
  - 筛一行：`q`（VIN/Make/Model）、`status`、`condition`（即 `conditionCode`）、Search、Reset。每页 10。Query：`q` `status` `condition` `page` `size`。`page` 从 0。信封 `{items,page,size,total}`。
  - 主按钮 `Add vehicle`。行操作最多三链：`Edit` `Sell`（已售隐藏 Sell）。
  - 新增必填（00 / 14）：`make` `model` `modelYear` `vin` `source` `purchaseCost` `addedOn` `conditionCode`。可选：`repairCost` `carfaxUrl`。忽略 `dealerId` `status` `soldOn` `soldPrice`。
  - 枚举提交原值：`TRADE_IN` `AUCTION` `PRIVATE_PURCHASE` `OTHER`；`CERTIFIED` `AS_IS` `UNFIT` `IRREPARABLE`；`IN_STOCK` `SOLD`。展示：`Trade in` 等空格标签。
  - `Edit`：先 `GET /vehicles/{id}` 回填；`PATCH` 必须带 `version`。已售：采购字段只读。
  - `Sell`：`ConfirmDialog` 小窗，`Sold date` + `Sold price` 成对必填，按钮 `Confirm sale`。
  - 详情抽屉底部 Audit：`GET /api/v1/audit?entityType=VEHICLE&entityId=`。无独立 Audit 页、无菜单项。
  - 已售行变淡。无车辆 DELETE。跨店 id：后端 404，前端 `Vehicle not found`，不当成本店车（CL-2 深链）。
  - 深链 `/dms?vehicleId=`：打开对应抽屉；404 不露出他店字段。
- **禁止：** Admin 进入本页（守卫）；PATCH 改 `status`/`soldOn`/`soldPrice`；把 `dealerId` 写入 body。
- **验收：** 16 **CL-2** 录车；**CL-3** Admin 看不见表；SOLD 后再 Edit 采购 → 页内 `Purchase fields are locked`（`409` `SOLD_LOCKED`）。

### 接线表 · DMS `/dms`

| 控件 | method + path | 成功刷新 | 失败 HTTP / code → 英文 |
|---|---|---|---|
| 进入 / Search / Reset / 翻页 | `GET /api/v1/vehicles?q=&status=&condition=&page=&size=` | 车辆表 | `403` `FORBIDDEN` → 无权限态 `You do not have access to DMS.`；其他 → `Could not load vehicles.` |
| `Add vehicle` 提交 | `POST /api/v1/vehicles` → **201** | 车辆表 | `400` `VIN_DUP` → `VIN already in this dealership`；`400` `VALIDATION` → `Check required fields` |
| 行 `Edit` 打开 | `GET /api/v1/vehicles/{id}` | 抽屉 | `404` `NOT_FOUND` → `Vehicle not found` |
| `Edit` 保存 | `PATCH /api/v1/vehicles/{id}` 带 `version` → **200** | 该行 + 抽屉 | `404` → `Vehicle not found`；`409` `SOLD_LOCKED` → `Purchase fields are locked`；`409` `VERSION_CONFLICT` → `Refresh and retry`；`400` `VIN_DUP` → 同上 |
| `Sell` 确认提交 | `POST /api/v1/vehicles/{id}/sell` `{soldOn,soldPrice,version}` → **200** | 车辆表（行变淡，藏 Sell） | `400` `SOLD_PAIR_REQUIRED` → `Sold date and price are required together`；`409` `SOLD_LOCKED` → 已售锁定；`409` `VERSION_CONFLICT`；`404` |
| 详情底部 Audit | `GET /api/v1/audit?entityType=VEHICLE&entityId={id}` | 只刷新审计列表 | `404` → 不展示业务字段；不把失败画成空车表 |

---

## FE-T08 · CRM + Unlink

- **仓：** `dealer-web`
- **文件：** `src/views/CrmView.vue`；`src/api/customers.ts`；`src/api/vehicles.ts`（挂车下拉）；`src/api/audit.ts`；`src/components/ConfirmDialog.vue`。
- **必须包含：**
  - 列（12）：Name, Email, Phone, Linked vehicle, Actions。
    - Linked vehicle ← 列表 `linkedVehicle`：`{id,modelYear,make,model}`，格式 `2020 Toyota Camry`；`null` 显示 `—`。
  - 筛一行：`q`（Name/Email/Phone）、`linked`=`true`|`false`、Search、Reset。分页同 DMS。
  - 主按钮 `Add customer`。四字段：`name` `email` `phone` `homeAddress`。
  - 行：`Edit`、详情内 `Link vehicle` / `Unlink`（操作列仍 ≤3 文字链）。
  - `Link vehicle`：可搜索 Select；数据 `GET /api/v1/vehicles?status=IN_STOCK`，再排除已挂（他客占用禁用）。只列本店未售未挂。
  - **Unlink（硬规则）：**
    1. 必须 `ConfirmDialog`。取消 → **零请求**。
    2. 确认后才 `DELETE /api/v1/customers/{id}/vehicles/{vehicleId}` → **204** 无 body。
    3. 刷新客户表 `linkedVehicle` + 抽屉 `linkedVehicles`。
    4. 车 `status=SOLD`：按钮隐藏或禁用；若仍请求 → `409` `SOLD_LOCKED` → `Sold vehicles cannot be unlinked`。
    5. 禁止用 PUT 空值假装解绑。
  - 详情 Audit：`GET /api/v1/audit?entityType=CUSTOMER&entityId=`。解绑后可选 `entityType=CUSTOMER_VEHICLE`。`fieldSummary` 不得展示电话/邮箱/住址全文。
  - 深链 `/crm?customerId=`。
- **禁止：** 独立 Audit 页；跨店 VIN 出现在下拉；单击即删。
- **验收：** 16 **FE-08**、**CL-2** 挂车、Review 3 Unlink。在库解绑 204 后 Linked vehicle 清空。已售不可解挂。

### 接线表 · CRM `/crm`

| 控件 | method + path | 成功刷新 | 失败 HTTP / code → 英文 |
|---|---|---|---|
| 进入 / Search / Reset / 翻页 | `GET /api/v1/customers?q=&linked=&page=&size=` | 客户表 | `403` → `You do not have access to CRM.`；其他 → `Could not load customers.` |
| `Add customer` | `POST /api/v1/customers` → **201** | 客户表 | `400` `VALIDATION` → `Check required fields` |
| `Edit` 打开 | `GET /api/v1/customers/{id}` | 抽屉（用 `linkedVehicles[]`） | `404` → `Customer not found` |
| `Edit` 保存 | `PATCH /api/v1/customers/{id}` 带 `version` → **200** | 该行 + 抽屉 | `404`；`409` `VERSION_CONFLICT` → `Refresh and retry` |
| `Link vehicle` | `PUT /api/v1/customers/{id}/vehicles/{vehicleId}` → **200** | 列表 Linked vehicle + 抽屉 | `409` `VEHICLE_ALREADY_LINKED` → `Vehicle already linked`；`400` `WRONG_DEALER_OR_SOLD` → `Vehicle not available`；`404` |
| 挂车下拉 | `GET /api/v1/vehicles?status=IN_STOCK&page=&size=` | 下拉 | 已占禁用 |
| **`Unlink`（确认后）** | **`DELETE /api/v1/customers/{id}/vehicles/{vehicleId}` → 204** | 列表 Linked vehicle + 抽屉 | `404` → `Link not found`；**`409` `SOLD_LOCKED` → `Sold vehicles cannot be unlinked`** |
| 详情 Audit | `GET /api/v1/audit?entityType=CUSTOMER&entityId=` | 审计列表 | `404` |
| 解绑后审计（可选） | `GET /api/v1/audit?entityType=CUSTOMER_VEHICLE&entityId=` | 审计列表 | `404` |

---

## FE-T09 · Ad compliance（五态 + Ready/导出门闩）

- **仓：** `dealer-web`
- **文件：** `src/views/AdsView.vue`；`src/components/AdWorkspace.vue`；`src/api/listings.ts`；`src/api/vehicles.ts`。
- **必须包含：**
  - 页标题 **Ad compliance**。`AdWorkspace`：左选车+表单，右检查结果。
  - 左表列（12，若用车列表）：Vehicle, Type, Medium, Check status, Actions。Vehicle ← 年/make/model；Type ← `adKind`；Medium ← `medium`；Check status ← listing.`checkStatus` 映射下表。
  - 表单字段仅：`title` `body` `adKind`=`CASH`\|`FINANCE`\|`LEASE` `medium`=`ONLINE`\|`RADIO_TV_BILLBOARD`。清单展示项随 `adKind`/`medium` 切换（00 §广告：始终查店名联系/既往用途/新旧年份/延保/价格/车况；FINANCE 另 APR/期限/现金价；LEASE 另声明/租期/租金/APR/首付/低公里超额；RADIO_TV_BILLBOARD 免「和利率并列」）。**前端只切换展示项，不自创字段、不在浏览器算通过。**
  - 右栏总状态 **只允许五态**（展示 ← API `checkStatus`）：

    | UI（12） | API `checkStatus`（14） |
    |---|---|
    | Blocked | `BLOCKED` |
    | Needs AI review | `NEEDS_AI` |
    | Passed | `PASSED` |
    | Stale | `STALE` |
    | AI unavailable | `AI_UNAVAILABLE` |

  - `GET /vehicles/{id}/listing` 无行：虚拟空草稿 `id=null`，表单空，empty 用 `Select a vehicle to start.`，**不当** Failed 空表。`id=null` 时禁用 `Run check` / `Mark ready` / `Export TXT`，必须先 `Save draft` 拿到 listing `id`。
  - 按钮：`Save draft` `Run check` `Mark ready` `Export TXT`。
  - **`Mark ready` / `Export TXT` 仅当 `checkStatus===PASSED`（非 Stale）可点。** Blocked / Needs AI review / Stale / AI unavailable / 无检查 → 禁用。
  - `Run check`：body `{ version }`（listing 乐观锁）；按钮 loading；等最多约 15s。
  - **Blocked = HTTP 200**，右栏 Blocked，**禁止**显示 Passed。网络面板 **不得** 出现浏览器请求 `/internal/v1/ad-check`。
  - **`502` `AI_UNAVAILABLE`：** 再 `GET` listing，右栏 **AI unavailable**，禁止 Pass；禁用 Ready/导出。不要把 502 画成表格 empty。
  - `Export TXT`：响应 `Content-Type: text/plain`，触发下载。导出无采购成本、无客户。
  - 已售车仍可选看广告，按产品只读（可看结果，不鼓励再改成交）。
  - 深链 `/ads?vehicleId=`。
- **禁止：** 发布到外部站；第五种以外总状态；Admin 进本页；浏览器调 internal；AI 失败当 Pass；Stale 仍导出。
- **验收：** 16 **CL-4**（缺价/FINANCE 缺 APR → Blocked、200、不调 AI）；**CL-5**（真 AI 或 AI unavailable）；**CL-6**（改价后 Stale，Ready/导出 `409`）；**FE-09** 广告分支。

### 接线表 · Ads `/ads`

| 控件 | method + path | 成功刷新 | 失败 HTTP / code → 英文 |
|---|---|---|---|
| 左表 / 选车 | `GET /api/v1/vehicles?page=&size=`（`status` 不限） | 左表 | 同 DMS 列表 |
| 选中车后 | `GET /api/v1/vehicles/{id}/listing` | 左表单 + 右 `checkStatus` + `lastCheck` | `404` → `Vehicle not found` |
| `Save draft` | `PATCH /api/v1/vehicles/{id}/listing` 带 `version`（首次可 0）；空标题正文传 `''` | 表单 `version`/`id`；若曾 Passed → 右态 **Stale** | `404`；`409` `VERSION_CONFLICT` → `Refresh and retry`；`400` `VALIDATION` |
| `Run check` | `POST /api/v1/listings/{id}/checks` `{version}` | 右结果 = 检查对象（含 `ruleFindings` `checkStatus`） | `404`；`409` `VERSION_CONFLICT`；**`502` `AI_UNAVAILABLE` → 右态 AI unavailable，禁止 Pass**。Blocked **200** 不是失败 |
| `Mark ready` | `POST /api/v1/listings/{id}/ready` `{version}` | 右态 / listing.`status=READY` | `409` `CHECK_STALE` → `Check is stale. Run check again`；`409` `NOT_PASSED` → `Check has not passed`；`409` `VERSION_CONFLICT`；`404` |
| `Export TXT` | `POST /api/v1/listings/{id}/exports` `{version}` → **200** `text/plain` 下载 | 不改表 | 同上 409/404。仅 Passed 且非 Stale 可点 |

`lastCheck.ruleFindings[]`：`{ruleId,severity,passed,message}`。右侧列出 `message`，不要写成 OMVIC approved / certified（17）。

---

## FE-T10 · Assistant

- **仓：** `dealer-web`
- **文件：** `src/views/AssistantView.vue`；`src/components/AssistantCard.vue`；`src/api/assistant.ts`。
- **必须包含：**
  - 交互（10，薄）：一个输入框 + `Ask`。一次问答。不在本页改车辆/客户/检查。
  - 请求体仅 `{ text }`。`POST /api/v1/assistant/ask`。
  - 响应字段 **按 14**，禁止旧 `resources`：

    ```json
    {
      "summary": "…",
      "summaryAvailable": true,
      "cards": [
        { "kind": "VEHICLE", "id": 10, "label": "2020 Toyota Camry", "status": "IN_STOCK" }
      ]
    }
    ```

  - `kind`：`VEHICLE` | `CUSTOMER` | `LISTING`。`LISTING` 可有 `vehicleId` `checkStatus`。
  - 前端映射（14 不规定 Vue 路由）：`VEHICLE` → `/dms?vehicleId={id}`；`CUSTOMER` → `/crm?customerId={id}`；`LISTING` → `/ads?vehicleId={vehicleId}`（无 `vehicleId` 则 `/ads`）。
  - 最多渲染 **5** 张 `AssistantCard`（即使后端多给也截断）。卡：标题 `label` + 进普通页链接。卡上 **禁止** phone / email / homeAddress。
  - `summaryAvailable===false` 或 `summary===null`（仍 HTTP 200）：说明区固定 **`Smart summary unavailable`**，**仍渲染 cards**。
  - 整页网络/5xx：`Could not ask assistant`。`400` `VALIDATION`（空提问）：页内提示，不发空卡。
- **禁止：** 中文「智能说明暂不可用」；卡内改数据；Admin 进本页；浏览器打 `/internal/v1/assistant`。
- **验收：** 16 **FE-10**、**FE-06**、**BE-12** 的前端表现（≤5 卡、只读、Admin 403）。

### 接线表 · Assistant `/assistant`

| 控件 | method + path | 成功 | 失败 HTTP / code → 英文 |
|---|---|---|---|
| `Ask` | `POST /api/v1/assistant/ask` `{text}` → **200** | 说明区：`summaryAvailable` 真则显示 `summary`；假则 **`Smart summary unavailable`**。`cards` ≤5 | `403` `FORBIDDEN` → `You do not have access to Assistant.`；`400` `VALIDATION` → 空提问校验；网络/5xx → `Could not ask assistant` |

---

## FE-T11 · 对照 16 的验收清单（不写新功能）

- **仓：** `dealer-web`（手测即可；16 不要求本文新增测试文件）。
- **文件：** 无新文件。在六页上打勾。
- **必须包含：** 按下列 ID 走一遍。引用编号即可，不要改 16。
- **禁止：** 为「好测」发明 mock 业务页、stub 冒充 CL-5 云上真实 AI（S2/S3 以 16 为准）。
- **验收：**

| 16 ID | 对应任务 | 前端必须看见 / 看不见 |
|---|---|---|
| **FE-01** | T02 T05 | 未登录 `/dms` → `/login`，仅 `Sign in with Microsoft`；无密码框、无业务表 |
| **FE-02** | T02 T06 | Staff 开 `/admin` → `/dms`；无 Dealerships/绑人 |
| **FE-03** | T02 T07 | Admin 开 `/dms` → `/admin`；无车辆表 |
| **FE-04** | T02 T08 | Admin 开 `/crm` → `/admin` |
| **FE-05** | T02 T09 | Admin 开 `/ads` → `/admin` |
| **FE-06** | T02 T10 | Admin 开 `/assistant` → `/admin` |
| **FE-07** | T06 | 单路由双 Tab + 列/筛/按钮与 12 一致；无自造 `/admin/members`；无 Edit 店 |
| **FE-08** | T08 | Unlink 先确认；`DELETE .../vehicles/{vehicleId}`；已售文案 `Sold vehicles cannot be unlinked` |
| **FE-09** | T04 全页 | 六页 loading/empty/error/403 文案 = 本文 T04 表；广告 502 → 右栏 AI unavailable，不是空表/Passed |
| **FE-10** | T10 | `Smart summary unavailable`；整页失败 `Could not ask assistant`；卡 ≤5 只读跳转 |
| **CL-1** | T05 T06 | Admin 开两店、各绑一人；`409 DUP_MEMBER` → `Staff already bound` |
| **CL-2** | T07 T08 | Staff A 录车录客挂车；Staff B 看不见；深链他店 id → 404 文案 |
| **CL-3** | T02 | 地址栏改业务 path 立刻回 `/admin` |
| **CL-4** | T09 | 缺价/FINANCE 缺 APR → Blocked；HTTP 200；无 `/internal` |
| **CL-5** | T09 | 真检查或 AI unavailable；禁止失败当 Pass |
| **CL-6** | T09 | 改正文价格 → Stale；Ready/导出 `409 CHECK_STALE` / `NOT_PASSED` |

课堂会碰到、前端只需正确显示的后端码：`VIN_DUP` `SOLD_LOCKED` `SOLD_PAIR_REQUIRED` `VEHICLE_ALREADY_LINKED` `WRONG_DEALER_OR_SOLD` `VERSION_CONFLICT` `CHECK_STALE` `NOT_PASSED` `AI_UNAVAILABLE` `DUP_MEMBER` `FORBIDDEN` `NOT_FOUND` `VALIDATION`。

---

## 枚举与控件英文（全仓共用，禁止另写）

| 位置 | 文案 |
|---|---|
| 登录 | `Sign in with Microsoft` |
| 顶栏 | `Sign out` · Admin 顶栏 `Platform Admin` |
| 菜单 | `Admin` · `DMS` · `CRM` · `Ad compliance` · `Assistant` |
| Admin | `New dealership` · `Bind staff` · `Unbind` |
| DMS | `Add vehicle` · `Edit` · `Sell` · `Sold date` · `Sold price` · `Confirm sale` |
| CRM | `Add customer` · `Link vehicle` · `Unlink` |
| Ad | `Save draft` · `Run check` · `Mark ready` · `Export TXT` |
| 五态 | `Blocked` · `Needs AI review` · `Passed` · `Stale` · `AI unavailable` |
| 助手 | `Ask` · `Smart summary unavailable` |

---

## 全局禁止（每任务默认叠加）

- 不要改 `design/12`–`19`、`IMPLEMENTATION-BRIEF.md`、`design/README.md`。
- 不要把 Vue 源码写进 `design/`。
- 不要工单、线索、C 端/买家站、独立 Audit 页、KPI、密码登录、切店、浏览器打 internal。
- 不要第五套广告总状态；不要用 10 的中文助手失败句。
- 不要 `GET /api/v1/admin/members`。
- 不要在请求里用客户端 `dealerId` 切店。
