# 16 · 验收与测试设计

- 状态：**现行有效（v6 验收）**
- **冲突顺序（不得反过来）：** 课程 PPT 硬项 > 规格 PDF 字段与枚举 > [IMPLEMENTATION-BRIEF.md](IMPLEMENTATION-BRIEF.md) / [00-Current-Development-Design.md](00-Current-Development-Design.md) > [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) / [14-Backend-API-Contract.md](14-Backend-API-Contract.md) / [13-Frontend-Engineering.md](13-Frontend-Engineering.md) > **本文**
- 本文是 **用例与现场脚本**，**不改契约**：路径、HTTP、错误码、五态、租户、字段以 14 / 15 / 规格为准；路由与英文文案以 13 为准。发现矛盾时按上列顺序取舍，不要在本文发明新 DTO / 新路由 / 新错误码。
- 不做：工单、线索、C 端买家站、密码登录、独立 Audit 页、KPI、CSV 导入。助手只复用 GitHub 组件，只读。
- **本地-only 不能当 Sprint 2 / Sprint 3（Review 2 / Review 3）验收。** Sprint 1 允许本机讲架构与四仓构建；S2/S3 必须走 **云上演示**（Azure 上 Entra → Gateway → 业务 → 真实 AI）。见第 5 节。

编号约定：课堂脚本 `CL-*`、后端 `BE-*`（可当 [11](11-Requirements-Governance-and-Agile.md) **NN-19** 关键测试表）、前端 `FE-*`。合计 **32** 条用例 + 6 条课堂脚本（脚本本身不另计入 32）。

---

## 1. 演示账号与六页路径（对齐 00 / 13）

课上只用 Entra，无密码框。路由只有这六条（13）：

| path | 谁进 | 默认落地 |
|---|---|---|
| `/login` | 未登录 | — |
| `/admin` | `Platform.Admin` | Admin |
| `/dms` | `Dealer.User` | 店员 |
| `/crm` | `Dealer.User` | — |
| `/ads` | `Dealer.User`（页标题 **Ad compliance**） | — |
| `/assistant` | `Dealer.User` | — |

禁止出现 `/tickets` `/leads` `/dashboard` `/audit` 买家页。审计只在 DMS/CRM 详情抽屉底部。

| 账号（课上准备） | Entra 角色 | 绑店 | 用来演示 |
|---|---|---|---|
| Admin | `Platform.Admin` | 无 membership；`/me` 的 `dealerId` 为 `null` | 开店、绑人、打业务被拒 |
| Staff A | `Dealer.User` | 仅店 A active | DMS/CRM/广告/助手、隔离「能看见」 |
| Staff B | `Dealer.User` | 仅店 B active | 隔离「看不见」 |

浏览器 HTTP **只打** Gateway（本地 `http://localhost:8080`，云上为 Gateway HTTPS）。不要让评委看到 SPA 直连 core `8081` / ai-service `8082`。

---

## 2. 课上 6 条演示脚本（对齐 00 验收）

每条写清：谁登录、点哪页、期望看见 / 看不见。数据先由 Admin 开好两家店再演 2–6。S2 至少把 **CL-4、CL-5** 跑在云上；S3 把 **CL-1～CL-6** 全部在云上再走一遍。

### CL-1 · 管理员开两家店、各绑一人（00 条 1 · NN-12）

1. 用 **Admin** 点 `/login` → `Sign in with Microsoft` → 落地 **`/admin`**。
2. **看见：** 顶栏 `Platform Admin`；菜单 **只有 Admin**；页内两个 Tab：**Dealerships**、**Members**。
3. **看不见：** 菜单里的 DMS / CRM / Ad compliance / Assistant；任何车辆 VIN、客户姓名表、广告正文。
4. Dealerships：`New dealership` 建店 A、店 B（四联系字段非空）。
5. 各店 Staff 抽屉：`Bind staff` 分别绑 Staff A、Staff B 的 `entraOid` + 显示名。Members Tab 能摊平看到两人、各属一家店。
6. **失败形态（可顺手）：** 同一人再绑同一店 active → 页内 `Staff already bound`（`409 DUP_MEMBER`），不是静默双行。

### CL-2 · 店 A 录车、录客、挂车；店 B 看不见（00 条 2 · NN-13/14）

1. **Staff A** 登录 → 落地 **`/dms`**。顶栏店名为店 A 的 `dealerLegalName`。
2. **看见：** 菜单 DMS / CRM / Ad compliance / Assistant。`Add vehicle` 按规格必填写一辆（本店 VIN 唯一）。
3. 打开 **`/crm`**：`Add customer` 四字段；`Link vehicle` 只选本店未售未挂的那辆；成功后列表 `linkedVehicle` 有年/make/model。
4. **看不见：** Admin 菜单；店 B 的车或客；挂车下拉里的他店 VIN。
5. **Sign out**，**Staff B** 登录 → `/dms`、`/crm`。
6. **看见：** 空表或仅店 B 自己的数据（`No vehicles match.` / `No customers match.` 若未建）。
7. **看不见：** 店 A 刚录的 VIN、客户、关联。深链 `/dms?vehicleId=<店A的id>` 也不得露出店 A 字段（后端 404，前端 `Vehicle not found` / 空详情，不当成店 B 的车）。

### CL-3 · 管理员打车辆接口被拒绝（00 条 3）

1. **Admin** 已登录。地址栏改到 **`/dms`**（以及 `/crm` `/ads` `/assistant`）。
2. **看见：** 守卫立刻拦回 **`/admin`**，不渲染车辆表。
3. **看不见：** VIN、采购成本、客户电话。
4. 另备一终端（仍用 Admin 的 JWT）：`GET {Gateway}/api/v1/vehicles` → **403 或 404**，body **不得**出现 `vin` / 成本等业务字段（14）。不要用「前端藏按钮」当唯一证据。

### CL-4 · 缺价或融资缺 APR 被挡住（00 条 4 · NN-15）

1. **Staff A** 打开 **`/ads`**，选 CL-2 的车。无 listing 行时是空草稿（`Select a vehicle to start.` / 空白表单），**不**当 Failed 空表。
2. 写一段 **CASH** 广告：有店名但 **正文无标价** → `Save draft` → `Run check`。
3. **看见：** 右栏总状态 **Blocked**；`ruleFindings` 含价格类硬缺；`Run check` 可结束（HTTP **200**，不是 4xx）。
4. **看不见：** **Passed**；右侧不得出现「已通过」。网络面板 **不得** 出现对 `/internal/v1/ad-check` 的浏览器请求（Blocked **不调 AI**，见 BE-09）。
5. 改 `adKind=FINANCE`，补上价格但仍 **无 APR** → 再检 → 仍 **Blocked**（`FINANCE_APR_MISSING`），同样不调 AI。

### CL-5 · 真实广告文本走一次真实 AI（00 条 5 · NN-15/18）

1. 仍在 **`/ads`**（**必须云上 + 真实 GitHub 组件**，禁止 stub 冒充 S2/S3）。
2. 写一段尽量过固定清单的正文（店名、联系、价格、车况用语、年份；FINANCE 则含 APR），`Run check`，等待 ≤15s。
3. **看见：** 总状态进入 **Needs AI review** 或 **Passed**（取决于模型）；`aiStatus` 非 `SKIPPED`；`aiNotes` 或说明能 **指出缺失/风险项**（规格：真实调用，能指出缺失项）。
4. **看不见：** 把超时/失败画成 Passed。若模型挂：右栏 **AI unavailable**，检查行已落库（再 GET listing 仍是 `AI_UNAVAILABLE`），**禁止** `Mark ready` / `Export TXT` 当通过。

### CL-6 · 改价后不能用旧检查导出（00 条 6）

规格 / 00：改车辆价格、车况或广告正文后旧检查作废。课堂以 **改广告正文中的标价** 最稳（升 `contentVersion`，14 明确作废）。

1. 在 **Passed** 且当前版本一致时，`Mark ready` 应变 Ready；此时 `Export TXT` 可下载纯文本（店公开四字段 + 车辆公开字段，**无采购成本、无客户**）。
2. `Save draft`：**改正文价格数字**（或改 `conditionCode` 后再回广告页）→ 右栏变为 **Stale**（仅「曾经 Passed 后失效」才叫 Stale）。
3. 再点 `Mark ready` / `Export TXT`：**看见** `Check is stale. Run check again`（`409 CHECK_STALE`）或 `Check has not passed`（`409 NOT_PASSED`）。
4. **看不见：** 用旧检查文件/旧 `lastCheckId` 导出成功。必须再 `Run check` 且仍为 **Passed 且非 Stale** 才能导出。

---

## 3. 后端用例表（NN-19）

接口均经 Gateway `/api/v1/**`。店员租户只来自 JWT `oid` → **active membership**（15），**忽略** 客户端 `dealerId`。跨店资源 **404 不 403**。错误体 `{code,message}`，禁止堆栈/SQL/模型原文。

| ID | 名称 | 步骤（谁 / 打哪） | 期望 | 不对 |
|---|---|---|---|---|
| **BE-01** | 跨店 404 | Staff A 持店 B 的 `vehicleId` / `customerId` / `listingId` 做 GET/PATCH/检查 | **404** `NOT_FOUND`；无 VIN/成本/客户字段 | **403**（防探测）；200 空对象里仍带他店数据 |
| **BE-02** | 无 membership | `Dealer.User` JWT，0 条 `membership.active=1`（解绑后） | 业务 API **403**（已登录无店）；`GET /me`：`role=Dealer.User`，`dealerId=null` | 401（不像未登录）；仍放出店 A 列表 |
| **BE-03** | SOLD 锁定 | 在库车 `POST .../sell` 成对成功后，`PATCH` 采购字段（make/model/year/vin/source/cost/addedOn/repair/carfax） | **409** `SOLD_LOCKED`；库内采购值不变 | 用 PATCH 改 `status`/`soldOn`；已售再 sell 覆盖原成交 |
| **BE-04** | VIN 重复 | 同店 `POST /vehicles` 再用同一 VIN | **400** `VIN_DUP` | 跨店同 VIN 被误伤；200 双行 |
| **BE-05** | 挂车规则 | `PUT /customers/{id}/vehicles/{vehicleId}`：① 同店 + `IN_STOCK` + 未占用 → 200；② 已挂 → **409** `VEHICLE_ALREADY_LINKED`；③ 已售或非本店 → **400** `WRONG_DEALER_OR_SOLD` 或跨店 **404** | 一车一客（V1 唯一键）；一客多车允许 | 客户端传 `dealerId` 挂到他店；已售仍新挂 |
| **BE-06** | 已售不可解绑 | 已挂且已 `SOLD` 后 `DELETE /customers/{id}/vehicles/{vehicleId}` | **409** `SOLD_LOCKED`；关联仍在（15：成交记录不抹） | 204 后成交关联消失。在库解绑仍应 **204** + 审计 `UNLINK` |
| **BE-07** | `CHECK_STALE` | listing 曾 Passed，PATCH 正文/类型/媒介（或手册规定的车况变更）后 `POST .../ready` 或 `.../exports` | **409** `CHECK_STALE`（lastCheck 版本 ≠ listing） | 仍 200 导出；把 Blocked 后再改稿误标成 Stale（应为 Needs AI） |
| **BE-08** | `AI_UNAVAILABLE` 不当 Pass | 固定规则已过，AI 超时/失败 | HTTP **502** `AI_UNAVAILABLE`；`compliance_check` **已写** `recommendation=UNAVAILABLE`；`checkStatus=AI_UNAVAILABLE` | 200 + Passed；不写库却让 UI 当通过；浏览器当 Pass |
| **BE-09** | Blocked 不调 AI | 缺价 / FINANCE 缺 APR / 空草稿等硬缺后 `POST .../checks` | **200**；`recommendation=BLOCKED`，`aiStatus=SKIPPED`；core **不** 调 Gateway `POST /internal/v1/ad-check` | 用 4xx 表示缺价；Blocked 仍打模型 |
| **BE-10** | Ready/导出仅 Passed 非 Stale | 分别在 Blocked / Needs AI / AI unavailable / 无检查 / Stale 调 ready 与 export | 非「当前 Passed 且版本一致」→ **409** `NOT_PASSED` 或 `CHECK_STALE`；仅合格 → ready 200、export **200** `text/plain` | Stale 仍 READY；导出含采购成本或客户 |
| **BE-11** | 审计不含 PII 全文 | 改客户电话/邮箱/住址后 `GET /audit?entityType=CUSTOMER&entityId=`；挂/解绑 `CUSTOMER_VEHICLE` | 有谁/做什么/何时；`fieldSummary` **无** 电话、邮箱、住址 **全文**；跨店实体 404 | Admin 查 `VEHICLE`/`CUSTOMER` 带出业务摘要 |
| **BE-12** | 助手最多 5 卡且只读 | Staff A `POST /assistant/ask`；Admin 打同一 URL | 店员：**200**，`cards.length≤5`，卡无电话/邮箱/住址，id 必须落在本店检索集；**不写** vehicle/customer/listing/检查表。Admin：**403**。模型挂：200 + `summaryAvailable=false`，卡仍可有 | 6+ 张卡；助手改库存；把 AI 失败当业务 502 Pass |

### NN-19 补强（课堂 / PPT 常追问）

| ID | 名称 | 期望 |
|---|---|---|
| **BE-13** | Admin 打业务 URL | `/vehicles` `/customers` `/listings/**` `/assistant/ask` → **403** 或 **404**，body 无业务字段 |
| **BE-14** | 绕过 Gateway | 浏览器或无内部头打 core `8081`、ai `8082`、`/internal/v1/**` → 失败（无 CORS / **404**，15）。经 Gateway + 用户 JWT 的 `/api/v1/**` 才是产品入口 |
| **BE-15** | 出售成对 | `soldOn`/`soldPrice` 缺一 → **400** `SOLD_PAIR_REQUIRED`；价格 `≤0` → 400。忽略 PATCH 改出售字段 |
| **BE-16** | 忽略客户端 `dealerId` | Staff A 在 body/query/header 冒充店 B 的 `dealerId` 创建车辆 | 仍写入 **店 A**；不能靠参数切店 |

---

## 4. 前端用例（对齐 13 路由与文案）

界面英文。失败 **不当空表**。乐观锁 `409 VERSION_CONFLICT` → `Refresh and retry`。

| ID | 名称 | 步骤 | 期望看见 | 期望看不见 |
|---|---|---|---|---|
| **FE-01** | 守卫 `/login` | 未登录打开 `/dms` | 到 `/login`，仅 `Sign in with Microsoft` | 密码框、业务表 |
| **FE-02** | 守卫 `/admin` | Staff A 打开 `/admin` | 拦回 `/dms` | Dealerships 表、绑人按钮 |
| **FE-03** | 守卫 `/dms` | Admin 打开 `/dms` | 拦回 `/admin` | 车辆表 |
| **FE-04** | 守卫 `/crm` | Admin 打开 `/crm` | 拦回 `/admin` | 客户四字段表 |
| **FE-05** | 守卫 `/ads` | Admin 打开 `/ads` | 拦回 `/admin` | 广告表单 / 五态 |
| **FE-06** | 守卫 `/assistant` | Admin 打开 `/assistant` | 拦回 `/admin` | Ask、资源卡 |
| **FE-07** | Admin 双 Tab | Admin 在 `/admin` | 同一路由两个 Tab：Dealerships（Name, Contact, Staff count, Actions；筛店名；`New dealership`）；Members（Entra ID/email, Dealership, Status, Actions；筛员工邮箱；数据 = 店列表 + 各店 members，**无** 自造 `/admin/members`）。Staff / Unbind 走同一套 API | 第二条 Admin 子路由；Edit 店（本课 UI 不做）；车辆 Tab |
| **FE-08** | Unlink 二次确认 | Staff A 在 `/crm` 详情点 `Unlink` | 先出 `ConfirmDialog`，取消不发请求；确认后才 `DELETE .../vehicles/{vehicleId}`。已售：`Sold vehicles cannot be unlinked`。在库：列表 Linked vehicle 清空 | 单击即删；用 PUT 空值假装解绑；文案停在「尚未提供」却已有 14 DELETE |
| **FE-09** | 空 / 错 / 加载态 | 六页各走一遍 loading、空列表、接口失败、无权限 | 文案按 13 §10：如 `Loading vehicles…` / `No vehicles match.` / `Could not load vehicles.` / `You do not have access to DMS.`；广告 AI 失败用右栏 **AI unavailable** | 把 403/502 画成空表；把 AI 失败画成 Passed |
| **FE-10** | 助手失败英文 | `/assistant`：模型挂但 HTTP 200（`summaryAvailable=false`，仍有卡）；整页 5xx/网络失败 | 说明区固定 **`Smart summary unavailable`**；整页失败 **`Could not ask assistant`**；卡 ≤5、只读、跳转 `/dms` `/crm` `/ads` | 「智能说明暂不可用」；卡上 phone/email/homeAddress；在本页改数据 |

FE-01～FE-06 与菜单一致：Admin **只渲染** Admin；店员 **只渲染** 四业务页。无权限靠路由先拦，不靠藏按钮。

---

## 5. 三次 Review：现场必须演示哪几条（对齐 08 + 云上演示）

对齐 [08](08-DevOps-and-Implementation.md) Sprint 完成定义与 [11](11-Requirements-Governance-and-Agile.md) NN 表。每人必须讲自己的运行证据，不许一人包讲。

| Review / Sprint | 完成定义（08） | 现场必须演示 | 对应 ID | 环境 |
|---|---|---|---|---|
| **Review 1 · Sprint 1** | 四仓能独立构建；架构图；Entra 两角色配上 | 四仓库四流水线能单发 ai-service；请求只走 Gateway、直连失败；讲清 07 图；Entra 上已有 `Platform.Admin` / `Dealer.User`。**可以本机。** 不要求两店数据与真实广告跑通 | NN-01、NN-02、NN-03；证据向 BE-14 | **允许本地** |
| **Review 2 · Sprint 2** | **Azure 上** 登录 → Gateway → 录一辆车 → **真实 AI** 扫一段广告；无明文密钥 | 云上 HTTPS 打开 web；Entra 登录；经 Gateway 在 `/dms` 录一辆；`/ads` 跑 **CL-4**（Blocked 不调 AI）+ **CL-5**（真实模型）；Bicep/Container Apps/Docker；流水线发布（人工批准，禁门户手点镜像）；KV 无密钥进仓；core/ai **internal** | NN-04–07、NN-08–11、NN-15/18（S2+）；CL-4、CL-5；BE-08、BE-09 | **必须云上** |
| **Review 3 · Sprint 3** | 两家店隔离、CRM 关联、清单三类广告、导出、审计；冻结功能 | **CL-1～CL-6 全套云上**；CASH / FINANCE / LEASE 各至少一次清单（FINANCE 缺 APR 仍 Blocked；LEASE 按 15 伪代码有声明/APR）；`/crm` 挂车 + Unlink 确认；导出 TXT；DMS/CRM 抽屉审计（无 PII 全文）；`/assistant` 本店问答、最多 5 卡只读。客户走通签字（NN-20） | NN-12、NN-13、NN-14、NN-16、NN-17、NN-19/20；CL-1～6；BE-01～BE-16；FE-01～FE-10 | **必须云上** |

### 本地-only 不能当 Sprint 2 / 3 验收

- Sprint 1：本机 Docker / localhost Gateway **可以** 过 Review 1（15：不必为 Review 1 强行申请订阅）。
- Sprint 2 / 3：**只在本机 HTTP、本机 stub AI、或「云上只开了空 Container、业务仍打 localhost」一律不算过。**
- Review 2 不以「本机 HTTP」冒充云安全项（15）。无明文密钥、HTTPS、Key Vault 引用必须在 **Azure demo 资源组** 上指给评委看。
- Review 3 的隔离 / 导出 / 审计 / 助手必须打 **同一套云上 Gateway**，不能切回本机库「因为云上没数据」。

---

## 6. 明确不做（防回归）

- 不恢复工单、线索、买家 `/public/**`、密码表、CSRF 会话、Service Bus、第二库、切店器。
- 本文不新增测试代码文件；实现组把 `BE-*` 落成 JUnit / 前端手测清单即可，以 14 的 code 为准。
- 废止的 `01`–`06`（含旧 `06-Delivery-and-Test-Plan.md`）不是现行验收。

---

## 7. 条数对照（给实现组）

| 组 | 条数 | 主要服务哪次 Review |
|---|---|---|
| 课堂脚本 CL-1～CL-6 | 6 | S2 先 CL-4/5；S3 全套 |
| 后端 BE-01～BE-12 | 12 | NN-19 核心；S3 现场抽测，S2 抽 BE-08/09 |
| 后端补强 BE-13～BE-16 | 4 | S1 偏 BE-14；S3 偏 BE-13/16 |
| 前端 FE-01～FE-10 | 10 | S3 守卫与六页；S2 至少 `/login`+`/dms`+`/ads` 四态 |

**用例合计 32 条**（16 后端 + 10 前端；课堂 6 条是演示脚本，验收时与上表对照，不重复计作第 33–38 条）。
