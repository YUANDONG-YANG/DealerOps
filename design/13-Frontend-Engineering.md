# 前端工程（可编码拆文件）

- 状态：**现行有效（v6 前端工程）**
- 权威冲突顺序：**课程 PPT > 规格字段 > IMPLEMENTATION-BRIEF / 00 > 15（数据/租户/网关）/ 14（HTTP JSON）/ 本文（前端工程）> 12**
- 本文只管：**路由、守卫、MSAL、页面↔API 对照、组件拆分、空错态、英文文案**；**字段、枚举、DTO 以手册 / 14 为准**，本文不另定列
- 不做：买家/厂家/工单/线索/KPI 首页/密码登录/独立 Audit 页；不改后端契约、SQL、`01`–`06`

编码仓：`dealer-web`（尚未建）。浏览器 HTTP **只打** Gateway。界面英文。字段与枚举抄手册第 3 节，本文不重写。

---

## 1. 栈与目录（点到即可）

栈与手册一致：**Vue 3 + Vite + Element Plus + Vue Router + Pinia + MSAL.js（`@azure/msal-browser`）**。HTTP 用 axios（或 fetch 包装，二选一钉死 axios）。无 Nuxt、无图表库、无通用 CRUD 生成器。

建议（现有仓库还没有 `src`，按此新建即可）：

```
dealer-web/
  .env.example          # 只抄 platform/env.example 前端四项
  src/
    main.ts
    App.vue
    router/index.ts
    auth/msal.ts        # PublicClientApplication + PKCE
    api/http.ts         # 只打 VITE_GATEWAY_URL，Bearer
    api/me.ts
    api/admin.ts
    api/vehicles.ts
    api/customers.ts
    api/listings.ts
    api/audit.ts
    api/assistant.ts
    stores/session.ts   # 账号、role、dealer 展示名
    layouts/AppLayout.vue
    components/
      AppMenu.vue
      DataTable.vue
      FormDrawer.vue
      ConfirmDialog.vue
      PageState.vue
      AdWorkspace.vue   # 左表单右结果
      AssistantCard.vue
    views/
      LoginView.vue
      AdminView.vue
      DmsView.vue
      CrmView.vue
      AdsView.vue
      AssistantView.vue
```

不要再拆「工单/线索/看板/AuditView」。`stores` 只留会话；列表状态放各 View 即可。

---

## 2. 路由表

手册页名：Login / Admin / DMS / CRM / Ad compliance / Assistant。路径用下面六条，无第七条业务路由。

| path | name | 组件 | `meta` | 登录后落地 |
|---|---|---|---|---|
| `/login` | `login` | `LoginView` | `public: true` | — |
| `/admin` | `admin` | `AdminView` | `roles: ['Platform.Admin']` | Admin 默认页 |
| `/dms` | `dms` | `DmsView` | `roles: ['Dealer.User']` | 店员默认页 |
| `/crm` | `crm` | `CrmView` | `roles: ['Dealer.User']` | — |
| `/ads` | `ads` | `AdsView` | `roles: ['Dealer.User']` | 页标题 **Ad compliance** |
| `/assistant` | `assistant` | `AssistantView` | `roles: ['Dealer.User']` | — |

- `/` → 已登录按角色去 `/admin` 或 `/dms`；未登录去 `/login`。
- 未知 path → 同上，不要做 404 营销页。
- **禁止**注册：`/audit`、`/tickets`、`/leads`、`/dashboard`、买家公开页。
- 审计：**藏在 DMS / CRM 详情抽屉底部**，调用手册 `GET /audit?entityType=&entityId=`。无独立 Audit 页、无菜单项。

查询串（详情深链，可选）：`/dms?vehicleId=`、`/crm?customerId=`、`/ads?vehicleId=`（助手卡跳转用）。不把 `dealerId` 放进路由当权威。

---

## 3. 路由守卫

`router/index.ts` 一道 `beforeEach`，顺序固定：

1. **未登录**（MSAL 无账号，且非 `meta.public`）→ `/login`，记下 `redirect`。
2. **已登录且在 `/login`** → `GET /me` 后按角色去 `/admin` 或 `/dms`。
3. **错角色 / 无权限**
   - `Platform.Admin` 访问 `/dms` `/crm` `/ads` `/assistant` → 拦回 `/admin`，不渲染业务表。
   - `Dealer.User` 访问 `/admin` → 拦回 `/dms`。
4. `GET /me` 失败 401 → 清会话，回 `/login`。
5. 角色不在 `Platform.Admin` | `Dealer.User`（或 `active=false`，若手册响应有）→ 留在无业务壳，顶栏 `Sign out`，正文走「无权限」态。不要猜第三种角色。

菜单与守卫同一套规则：Admin **只渲染** Admin；店员 **只渲染** DMS / CRM / Ad compliance / Assistant。无权限不靠藏按钮，路由先拦。

---

## 4. MSAL 与 HTTP（半页）

变量名必须与 `dealer-platform/env.example` 一致，**不要 client secret**：

| 变量 | 用途 |
|---|---|
| `VITE_ENTRA_TENANT_ID` | authority：`https://login.microsoftonline.com/${VITE_ENTRA_TENANT_ID}` |
| `VITE_ENTRA_CLIENT_ID` | SPA client id |
| `VITE_ENTRA_API_SCOPE` | 默认 `api://dealer-api/access_as_user`；`loginRequest.scopes` / `acquireTokenSilent` 只用这一项 |
| `VITE_GATEWAY_URL` | 唯一 API 根，本地 `http://localhost:8080` |

- **PKCE**：`@azure/msal-browser` 对 SPA 默认 PKCE，不要改成 confidential client。
- **Redirect URI**：开发 `http://localhost:5173`（Vite；须与 Entra SPA 注册一致）。登录用 `loginRedirect`（不要 popup 当主路径）。`redirectUri` / `postLogoutRedirectUri` 都指向同源 `/login`。生产 URI 跟部署主机走，仍是 SPA 回调，不进 Gateway。
- **登录按钮**：只 `Sign in with Microsoft`。无密码框。
- **会话**：redirect 回来后 `handleRedirectPromise` → `GET ${VITE_GATEWAY_URL}/api/v1/me`（14：`role`、`dealerId`、`dealerLegalName`；Admin 后两项为 `null`）。顶栏店名：店员用 `dealerLegalName`（空则占位 `Dealership`）；Admin 固定 `Platform Admin`。
- **只打 Gateway**：`api/http.ts` 的 `baseURL = import.meta.env.VITE_GATEWAY_URL`，路径前缀 `/api/v1`。禁止 axios 指向 8081/8082，禁止打 `/internal/v1/**`。
- **Bearer 拦截器**：每个请求 `acquireTokenSilent({ scopes: [VITE_ENTRA_API_SCOPE], account })`，失败再 `acquireTokenRedirect`；头 `Authorization: Bearer <accessToken>`。不要把 `dealerId` 放进 query/body 当租户开关（手册：忽略前端传来的店 ID）。
- **统一错误体**：`{ code, message }`。401 → 重新登录；403/404/409/400/502 → 页内 error 或 `ElMessage`，**不当空表**。乐观锁写带 `version`，`409 VERSION_CONFLICT` 提示刷新后再写。

---

## 5. 页面 ↔ API 对照（手册第 5 节）

路径均相对 Gateway：`/api/v1/...`。成功后「刷新」= 再拉本页主列表或当前详情，不要整站 reload。

### 5.1 全局

| 时机 | 手册路径 | 成功 | 失败提示 |
|---|---|---|---|
| 进任何受护页 / 登录落地 | `GET /me` | 写入 Pinia：`role`、`dealerId` | `401` Sign in required；其他 Could not load profile |

### 5.2 Login `/login`

| 控件 | 手册路径 | 成功 | 失败 |
|---|---|---|---|
| `Sign in with Microsoft` | 无业务 API；MSAL redirect + 随后 `GET /me` | Admin→`/admin`，店员→`/dms` | Sign-in failed. Try again. |

无「Forgot password」。

### 5.3 Admin `/admin`（仅 Platform.Admin）

**信息架构裁定：一个路由、页内两个 Tab**（对齐 12 的两套列，不拆第二页）。

- Tab **Dealerships**：列 Name, Contact, Staff count, Actions。筛：店名。主按钮 `New dealership`。
- Tab **Members**：列 Entra ID / email, Dealership, Status, Actions。筛：员工邮箱。数据用现有接口拼：`GET /admin/dealers` 后对每家 `GET /admin/dealers/{id}/members`，前端摊平（**不要发明** `GET /admin/members`）。
- 行内 `Staff`：抽屉，只显示该店成员；绑/解绑都在抽屉里。Members Tab 的 Unbind 打同一条 DELETE。

| 控件 | 手册路径 | 成功刷新 | 失败错误码 → 英文 |
|---|---|---|---|
| 进入页 / Search / Reset | `GET /admin/dealers` | 店表 | `403` You cannot open Admin；其他 Could not load dealerships |
| `New dealership` 提交 | `POST /admin/dealers` 四联系字段 | 店表；切到 Dealerships | `400 VALIDATION` Check required contact fields |
| 打开 Staff 抽屉 | `GET /admin/dealers/{id}/members` | 抽屉表 | `404` Dealership not found |
| `Bind staff` 提交 | `POST /admin/dealers/{id}/members` `{entraOid,displayName}` | 该店成员 + 店表 Staff count | `400` Check Entra ID；`409 DUP_MEMBER` Staff already bound |
| `Unbind`（确认后） | `DELETE /admin/dealers/{id}/members/{entraOid}` | 同上 | `404` Member not found |
| Members Tab 加载 | 上表两次 GET 组合 | 成员表 | 同店表/成员 GET |

`staffCount`：14 列表已带回（该店 active membership 计数）。没有值时显示 `—`。字段以手册/14 为准。  
14 另有 `GET/PATCH /admin/dealers/{id}`；**本课 UI 仍不提供 Edit**（手册无更新店）。无独立「发邮件建 Entra 账号」按钮。

### 5.4 DMS `/dms`（仅 Dealer.User）

筛一行：`q`（VIN/Make/Model）、`status`、`condition`；每页 10。Query：`q` `status` `condition` `page` `size`。**分页信封 `{items,page,size,total}`，`page` 从 0**（14）。字段以手册/14 为准。

| 控件 | 手册路径 | 成功刷新 | 失败 |
|---|---|---|---|
| 进入 / Search / Reset / 翻页 | `GET /vehicles` | 车辆表 | `403` 走无权限态；其他 Could not load vehicles |
| `Add vehicle` 提交 | `POST /vehicles` 手册必填 | 车辆表 | `400 VIN_DUP` VIN already in this dealership；`400` Check required fields |
| 行 `Edit` / 保存 | `GET/PATCH /vehicles/{id}` 带 `version` | 该行 + 打开的抽屉 | `404` Vehicle not found；`SOLD_LOCKED` Purchase fields are locked；`409 VERSION_CONFLICT` Refresh and retry |
| 行 `Sell` 小窗提交 | `POST /vehicles/{id}/sell` `{soldOn,soldPrice,version}` | 车辆表（行变淡） | `400 SOLD_PAIR_REQUIRED` Sold date and price are required together；`404` |
| 详情底部 Audit | `GET /audit?entityType=VEHICLE&entityId=` | 只刷新审计列表 | `404` 不展示业务字段 |

无车辆 DELETE。已售：采购字段只读，隐藏 Sell。跨店 id 当 404。

### 5.5 CRM `/crm`（仅 Dealer.User）

筛：`q`（Name/Email/Phone）、`linked`。分页同 DMS：`page`/`size`，信封 `{items,page,size,total}`（14）。字段以手册/14 为准。

| 控件 | 手册路径 | 成功刷新 | 失败 |
|---|---|---|---|
| 进入 / Search / Reset | `GET /customers` | 客户表 | `403` 无权限态；其他 Could not load customers |
| `Add customer` | `POST /customers` 四字段 | 客户表 | `400` Check required fields |
| `Edit` 保存 | `GET/PATCH /customers/{id}` | 该行 + 抽屉 | `404` Customer not found；`409 VERSION_CONFLICT` |
| `Link vehicle`（可搜索 Select，仅本店未售未挂） | `PUT /customers/{id}/vehicles/{vehicleId}` | 客户表 Linked vehicle + 抽屉 | `409 VEHICLE_ALREADY_LINKED` Vehicle already linked；`400 WRONG_DEALER_OR_SOLD` Vehicle not available |
| `Unlink`（确认后） | `DELETE /customers/{id}/vehicles/{vehicleId}` → **204** 无 body | 客户表 Linked vehicle + 抽屉 | `404` Link not found；`409 SOLD_LOCKED` Sold vehicles cannot be unlinked |
| 挂车下拉数据 | `GET /vehicles?status=IN_STOCK`；再排除已挂。14 客户列表有 `linkedVehicle` | 下拉 | 已占禁用。字段以手册/14 为准 |
| 详情 Audit | `GET /audit?entityType=CUSTOMER&entityId=` | 审计列表 | `404` |
| 解绑后审计（可选） | `GET /audit?entityType=CUSTOMER_VEHICLE&entityId=` | 审计列表 | `404` |

### 5.6 Ad compliance `/ads`（仅 Dealer.User）

左：选车 + 广告表单；右：检查结果。清单随 `adKind` / `medium` 即时变（文案规则见手册第 3/6 节，前端只切换展示项，不自创字段）。总状态只允许：Blocked / Needs AI review / Passed / Stale / AI unavailable。

| 控件 | 手册路径 | 成功刷新 | 失败 |
|---|---|---|---|
| 左表车辆行 / 选车 | `GET /vehicles`（建议 `status` 不限，已售仍可看广告但按产品只读） | 左表 | 同 DMS |
| 选中车后加载广告 | `GET /vehicles/{id}/listing`（无则空草稿） | 左表单 + 右状态 | `404` Vehicle not found |
| `Save draft` | `PATCH /vehicles/{id}/listing` 带 `version` | 表单 version；右态变 Stale（若曾 Passed） | `404`；`409 VERSION_CONFLICT` |
| `Run check` | `POST /listings/{id}/checks` | 右结果；等最多约 15s，按钮 loading | `404`；`409` 版本冲突；`502 AI_UNAVAILABLE` 右态 **AI unavailable**，**禁止显示 Pass** |
| `Mark ready` | `POST /listings/{id}/ready` | 右态 | `409 CHECK_STALE` Check is stale. Run check again；`409 NOT_PASSED` Check has not passed |
| `Export TXT` | `POST /listings/{id}/exports` → `text/plain` 下载 | 不改表 | 同上 409；仅 **Passed 且非 Stale** 可点 |

无「发布到外部站」。Admin 不会进入本页。

### 5.7 Assistant `/assistant`（仅 Dealer.User）

| 控件 | 手册路径 | 成功 | 失败 |
|---|---|---|---|
| `Ask` | `POST /assistant/ask` `{text}` | 短说明 + ≤5 张卡；卡跳转 `/dms` `/crm` `/ads` | `403` 无权限态；`400 VALIDATION` 空提问；网络/5xx Could not ask assistant |

响应体按 **14**（字段以手册/14 为准，不要用旧 `resources` 猜测）：

```json
{
  "summary": "…",
  "summaryAvailable": true,
  "cards": [
    { "kind": "VEHICLE", "id": 10, "label": "2020 Toyota Camry", "status": "IN_STOCK" }
  ]
}
```

`kind`：`VEHICLE` | `CUSTOMER` | `LISTING`。`LISTING` 卡可带 `vehicleId`、`checkStatus`。前端自己映射到 `/dms` `/crm` `/ads`（14 不规定 Vue 路由）。  
模型挂但仍 **200**：`summary` 为 `null`，`summaryAvailable=false`，`cards` 仍渲染；说明区固定英文 **`Smart summary unavailable`**（以 12 为准，不用 10 的「智能说明暂不可用」）。  
不在此页改车辆/客户/检查。卡上不出现 phone / email / homeAddress。

### 5.8 不要发明的页

| 想法 | 裁定 |
|---|---|
| 独立 Audit / 工单 / 线索 | 不做。审计只在 DMS/CRM 详情 |
| 管理员看车辆 | 不做。打业务 URL 由后端 403/404，前端守卫已拦 |
| 浏览器调 `/internal/v1/ad-check` 或 `/internal/v1/assistant` | 禁止 |

---

## 6. 组件清单（勿过度设计）

| 组件 | 职责 | 不要做 |
|---|---|---|
| `AppLayout` | 左菜单 + 顶栏（店名或 `Platform Admin`、角色、`Sign out`）+ `router-view` | KPI 条、多店切换器 |
| `AppMenu` | Admin：一项 Admin。店员：DMS、CRM、Ad compliance、Assistant | 按权限动态塞工单 |
| `DataTable` | Element Table + 分页 10 + 操作列最多 3 个文字链 + 状态 Tag；已售行变淡 | 价格滑条、行内万用编辑器 |
| `FormDrawer` / Dialog | 新增编辑；枚举 `el-select` | 向导式多步 |
| `ConfirmDialog` | Sell、Unbind staff、Unlink（12：出售/解绑二次确认） | — |
| `PageState` | 统一 loading / empty / error / forbidden 插槽 | 把失败画成空表 |
| `AdWorkspace` | 左表单、右结果；清单随类型/媒介变 | 第五种总状态 |
| `AssistantCard` | 标题 + 进普通页的链接；无联系方式 | 卡内改数据 |

出售小窗（可放 `DmsView` 内）：Sold date + Sold price，成对必填。CRM 挂车 Select 只列本店未挂未售。

---

## 7. Admin 信息架构（裁定）

**裁定：单页 `/admin` + 两个 Tab（Dealerships | Members），成员编辑用抽屉。**

理由：12 给了两套列和「店名 / 员工邮箱」两种筛，但手册只有「按店取成员」，没有第三张 Admin 子路由。Tab 对齐两套列；Staff 抽屉复用同一套成员 API。不要 `/admin/members` 路由。

---

## 8. 助手失败文案

以 **12** 为准，英文：

- 模型不可用但仍有资源卡：`Smart summary unavailable`
- 整页请求失败：`Could not ask assistant`（不是 Pass，也不是中文）

不要使用 10 的「智能说明暂不可用」。

---

## 9. 解绑客户车辆

- UI：CRM 详情对已挂车辆提供 `Unlink`，**必须二次确认**（12）。
- API（对齐 14）：`DELETE /api/v1/customers/{id}/vehicles/{vehicleId}` → **204** 无 body。审计 `CUSTOMER_VEHICLE` / `UNLINK`。
- **已售车不可解挂**（15）：按钮对 `status=SOLD` 隐藏或禁用；若仍请求 → `409 SOLD_LOCKED`，文案 `Sold vehicles cannot be unlinked`。
- 无此关联或跨店 → `404`。不要用 PUT 空值假装解绑。

---

## 10. 每页四态（各一行）

| 页 | loading | empty | error | 无权限 |
|---|---|---|---|---|
| Login | Signing you in… | （无列表；只显示登录卡） | Sign-in failed. Try again. | 已登录错角色不会停在本页，守卫立刻分流 |
| Admin | Loading dealerships… | No dealerships yet. | Could not load dealerships. | You do not have access to Admin. |
| DMS | Loading vehicles… | No vehicles match. | Could not load vehicles. | You do not have access to DMS. |
| CRM | Loading customers… | No customers match. | Could not load customers. | You do not have access to CRM. |
| Ad compliance | Loading listing… | Select a vehicle to start. / No vehicles to advertise. | Could not load listing. | You do not have access to Ad compliance. |
| Assistant | Asking… / Loading | Ask a question about this dealership. | Could not ask assistant. | You do not have access to Assistant. |

失败不当空表。广告 AI 失败用右栏 **AI unavailable**，不是表格 empty，更不是 Passed。

---

## 11. 英文文案（控件，够编码）

| 位置 | 文案 |
|---|---|
| 登录按钮 | Sign in with Microsoft |
| 顶栏退出 | Sign out |
| 顶栏 Admin | Platform Admin |
| 菜单 | Admin · DMS · CRM · Ad compliance · Assistant |
| Admin 主按钮 | New dealership |
| Admin 成员 | Bind staff · Unbind |
| DMS | Add vehicle · Edit · Sell |
| 出售窗 | Sold date · Sold price · Confirm sale |
| CRM | Add customer · Link vehicle · Unlink |
| Ad | Save draft · Run check · Mark ready · Export TXT |
| 检查态 | Blocked · Needs AI review · Passed · Stale · AI unavailable |
| 助手 | Ask · Smart summary unavailable |
| 表操作 | 最多三个文字链；不要图标海 |

枚举下拉值与手册一致：`TRADE_IN` `AUCTION` `PRIVATE_PURCHASE` `OTHER`；`CERTIFIED` `AS_IS` `UNFIT` `IRREPARABLE`；`IN_STOCK` `SOLD`；`CASH` `FINANCE` `LEASE`；`ONLINE` `RADIO_TV_BILLBOARD`。展示可用空格可读标签（如 `Trade in`），提交仍用枚举原值。

---

## 12. 前端编码缺口（不在本文发明）

13/14/15 已对齐：**Unlink DELETE 204**、分页信封、`staffCount` / `dealerLegalName`、助手 `{summary,summaryAvailable,cards}`、客户列表 `linkedVehicle`。字段仍以手册/14 为准。

仍不在前端发明：

1. 生产环境 MSAL redirect URI（Entra 注册，非前端臆造）
2. `dealer-web` 仓库本身尚未创建

本文是拆文件依据，不是业务实现。
