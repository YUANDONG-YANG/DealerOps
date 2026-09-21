# AI-CODING-TESTS · 编码 AI 测试任务单

- 状态：给实现组 / 编码 AI 的**落测清单**（不改契约）
- **只写任务，不写测试代码进本设计仓。** 实现组在各应用仓按路径建空类 / 空 spec 即可。
- 权威：路径 / HTTP / 错误码以 [14-Backend-API-Contract.md](14-Backend-API-Contract.md) 为准；租户与规则以 [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) 为准；路由与英文文案以 [13-Frontend-Engineering.md](13-Frontend-Engineering.md) 为准；用例以 [16-Acceptance-and-Test.md](16-Acceptance-and-Test.md) 为准；广告正文以 [17-Ad-Check-Fixtures.md](17-Ad-Check-Fixtures.md) 为准；core 测试类名以 [18-Backend-Core-Engineering.md](18-Backend-Core-Engineering.md) **§9** 为准。
- 本文**不改** 13–19、16、17 正文、BRIEF、其他 AI-CODING 文件。
- 浏览器与产品 HTTP **只打** Gateway `/api/v1/**`（本地 `8080`，云上 Gateway HTTPS）。不要让测试把 SPA 指到 core `8081` / ai-service `8082`。

---

## 0. Sprint 与环境（硬约束）

| Sprint | 测试允许写成什么 | 验收环境 |
|---|---|---|
| **Sprint 1** | **能编译的空测试**（JUnit / Vite spec 有类名与 `@Test`/`it` 骨架即可）**或**直连失败测试（见 TEST-14 / BE-14）。不要求两店数据、不要求真实广告跑通。 | **允许本地** Docker / localhost Gateway |
| **Sprint 2** | 云上 HTTPS + Entra → Gateway → 业务；广告 **真实 AI**（GitHub 组件，禁止 stub 冒充）。至少能支撑 **CL-4 / CL-5** 与 BE-08 / BE-09。 | **必须云上** |
| **Sprint 3** | BE-01–BE-16、FE-01–FE-10、CL-1–CL-6 同一套云上 Gateway；隔离 / 导出 / 审计 / 助手不得切回本机库。 | **必须云上** |

**本地-only 不能当 Sprint 2 / Sprint 3（Review 2 / Review 3）。** 本机 HTTP、本机 stub AI、「云上只开了空 Container、业务仍打 localhost」一律不算过。

core 仓 CI：JUnit + 编译。**自动化不要打真实付费模型**（AI 测用 stub / WireMock Gateway）。**课堂 / Review 2–3 的 CL-5、FX-10 必须云上真实模型**，与 CI stub 分开。

错误体一律 `{code,message}`，禁止堆栈 / SQL / 模型原文。跨店 **404 `NOT_FOUND`，不 403**。

---

## 1. 覆盖对照（16 ↔ 17 ↔ 18）

| 16 | 18 测试类（或 web 文件） | 17 夹具 | 本单 |
|---|---|---|---|
| BE-01 | `CrossTenantIsolationIT` | — | TEST-01 |
| BE-02 | `NoMembershipForbiddenIT`（兼 `MeServiceTest`） | — | TEST-02 |
| BE-03 | `SoldLockedIT` | — | TEST-03 |
| BE-04 | `VinDuplicateIT` | — | TEST-04 |
| BE-05 | `CustomerVehicleLinkIT` | — | TEST-05 |
| BE-06 | `SoldUnlinkLockedIT` | — | TEST-06 |
| BE-07 | `CheckStaleIT` | **FX-11** | TEST-07 |
| BE-08 | `AiUnavailableIT` | **FX-12** | TEST-08 |
| BE-09 | `BlockedSkipsAiIT`（兼 `OmvicRuleEngineTest`） | **FX-01、FX-03** | TEST-09 |
| BE-10 | `ReadyExportGuardIT` | **FX-10**（合格）；否分支可用 FX-01 / FX-03 / FX-12 | TEST-10 |
| BE-11 | `AuditNoPiiIT` | — | TEST-11 |
| BE-12 | `AssistantAskIT` | —（助手不在 17） | TEST-12 |
| BE-13 | `AdminForbiddenOnBusinessIT` | — | TEST-13 |
| BE-14 | `CoreNotPublicIT` | — | TEST-14 |
| BE-15 | `SellPairRequiredIT` | — | TEST-15 |
| BE-16 | `IgnoreClientDealerIdIT`（兼 `TenantFilterTest`） | — | TEST-16 |
| FE-01 | `dealer-web` 守卫 spec | — | TEST-17 |
| FE-02 | 同上 | — | TEST-18 |
| FE-03 | 同上 | — | TEST-19 |
| FE-04 | 同上 | — | TEST-20 |
| FE-05 | 同上 | — | TEST-21 |
| FE-06 | 同上 | — | TEST-22 |
| FE-07 | Admin 页 spec | — | TEST-23 |
| FE-08 | CRM Unlink spec | — | TEST-24 |
| FE-09 | 六页四态 spec | 广告失败右栏用 **FX-12** 语义 | TEST-25 |
| FE-10 | 助手失败 spec | — | TEST-26 |
| **CL-4** | web e2e + 可复用 TEST-09 | **FX-01、FX-03** | TEST-27 |
| **CL-5** | web e2e（S2+ 云上真 AI） | **FX-10** | TEST-28 |

**必点夹具：** FX-01 / FX-03 / FX-10 / FX-11 / FX-12 均已挂到上表。FX-11 **不是**独立广告正文，必须先 FX-10 `PASSED` 再改价。

店 / 车前提（17 §1，广告相关任务共用）：店 `Prairie Auto Ltd.`，车 **V-ASIS**（2020 Toyota Camry，`AS_IS`），除非任务另写。

---

## 2. 后端任务（dealer-core · 经 Gateway）

包名对齐 18：`com.dealerops.core`。IT 放 `src/test/java/com/dealerops/core/it/`；单元放对应子包。接口均 ` /api/v1/** `。店员租户只来自 JWT `oid` → active membership，**忽略**客户端 `dealerId`。

### TEST-01

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/CrossTenantIsolationIT.java`
- 对应 16：`BE-01`
- 对应 17：无
- 必须断言：Staff A 持店 B 的 `vehicleId` / `customerId` / `listingId` 做 GET / PATCH / `POST .../checks` → HTTP **404**，`error.code=NOT_FOUND`；body **无** `vin`、采购成本、客户电话/邮箱/住址。
- 禁止：用 **403 `FORBIDDEN`** 表示跨店；200 空对象里仍带他店字段。

### TEST-02

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/NoMembershipForbiddenIT.java`；单元 `src/test/java/com/dealerops/core/security/MeServiceTest.java`
- 对应 16：`BE-02`
- 对应 17：无
- 必须断言：`Dealer.User` JWT、0 条 `membership.active=1` 时，业务 API（`/vehicles` `/customers` `/listings` `/audit` `/assistant`）→ HTTP **403**，`error.code=FORBIDDEN`。`GET /me` → **200**，`role=Dealer.User`，`dealerId=null`。
- 禁止：401（不像未登录）；仍放出店 A 列表；跨店场景误用本条（跨店是 TEST-01）。

### TEST-03

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/SoldLockedIT.java`
- 对应 16：`BE-03`
- 对应 17：无
- 必须断言：在库车 `POST .../sell` 成对成功后，`PATCH` 采购字段（make/model/year/vin/source/cost/addedOn/repair/carfax）→ HTTP **409**，`error.code=SOLD_LOCKED`；库内采购值不变。
- 禁止：用 PATCH 改 `status` / `soldOn`；已售再 sell 覆盖原成交。

### TEST-04

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/VinDuplicateIT.java`
- 对应 16：`BE-04`
- 对应 17：无
- 必须断言：同店 `POST /vehicles` 再用同一 VIN → HTTP **400**，`error.code=VIN_DUP`。
- 禁止：跨店同 VIN 被误伤；200 双行。

### TEST-05

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/CustomerVehicleLinkIT.java`
- 对应 16：`BE-05`
- 对应 17：无
- 必须断言：`PUT /customers/{id}/vehicles/{vehicleId}`：① 同店 + `IN_STOCK` + 未占用 → **200**；② 已挂 → **409** `VEHICLE_ALREADY_LINKED`；③ 已售 → **400** `WRONG_DEALER_OR_SOLD`；他店 id → **404** `NOT_FOUND`。一车一客；一客多车允许。
- 禁止：客户端传 `dealerId` 挂到他店；已售仍新挂成功；跨店走 `WRONG_DEALER_OR_SOLD` 而不是 404。

### TEST-06

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/SoldUnlinkLockedIT.java`
- 对应 16：`BE-06`
- 对应 17：无
- 必须断言：已挂且已 `SOLD` 后 `DELETE /customers/{id}/vehicles/{vehicleId}` → HTTP **409**，`error.code=SOLD_LOCKED`；关联仍在。在库解绑 → **204** + 审计 `UNLINK`。
- 禁止：204 后成交关联消失；用 PUT 空值假装解绑。

### TEST-07

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/CheckStaleIT.java`
- 对应 16：`BE-07`
- 对应 17：**FX-11**（前置必须先跑 **FX-10** 至 `PASSED`）
- 必须断言：按 17 FX-11：`PATCH` 正文价格（如 `$17,900`）升 `contentVersion`，**不要**清空 `lastCheckId`；再 `POST .../ready` 或 `.../exports` → HTTP **409**，`error.code=CHECK_STALE`。GET listing：`checkStatus=STALE`。
- 禁止：仍 200 导出；把 Blocked 后再改稿标成 Stale（应为 Needs AI）；单独改采购成本当作战作废；把 FX-11 写成一条新广告正文。

### TEST-08

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/AiUnavailableIT.java`
- 对应 16：`BE-08`
- 对应 17：**FX-12**（title/body **与 FX-10 相同**；运行时断 AI / 超时 / stub 失败）
- 必须断言：固定规则已过（`hard[]` 空）后调 AI 失败 → HTTP **502**，`error.code=AI_UNAVAILABLE`；`compliance_check` **已写** `recommendation=UNAVAILABLE`；listing `checkStatus=AI_UNAVAILABLE`；Ready / Export → **409** `NOT_PASSED`。
- 禁止：**用硬缺广告冒充 FX-12**（缺价 / 缺 APR 是 FX-01 / FX-03，走 TEST-09）；200 + Passed；不写库却当通过。

### TEST-09

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/BlockedSkipsAiIT.java`；单元 `src/test/java/com/dealerops/core/compliance/OmvicRuleEngineTest.java`
- 对应 16：`BE-09`（课堂 **CL-4**）
- 对应 17：**FX-01**（`PRICE_MISSING`）、**FX-03**（`FINANCE_APR_MISSING`）
- 必须断言：`POST .../checks` → HTTP **200**（不是 4xx）；`recommendation=BLOCKED`，`aiStatus=SKIPPED`；`ruleFindings` 含价格类硬缺或 `FINANCE_APR_MISSING`；core **不**调用 Gateway `POST /internal/v1/ad-check`。Ready / Export → **409** `NOT_PASSED`。
- 禁止：用 4xx 表示缺价；Blocked 仍打模型；把 FX-01 正文拿去冒充 FX-10 / FX-12。

### TEST-10

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/ReadyExportGuardIT.java`
- 对应 16：`BE-10`
- 对应 17：合格路径 **FX-10**；否路径 FX-01 / FX-03 / FX-12（及无检查）
- 必须断言：Blocked / Needs AI / AI unavailable / 无检查 → ready 与 export **409** `NOT_PASSED`；Stale（FX-11）→ **409** `CHECK_STALE`。仅当前 Passed 且版本一致 → ready **200**；export **200** `Content-Type: text/plain`（店公开四字段 + 车辆公开字段 + 标题正文；**无**采购成本、**无**客户）。
- 禁止：Stale 仍 READY；导出含成本或客户；未 Ready 就当可导出。

### TEST-11

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/AuditNoPiiIT.java`
- 对应 16：`BE-11`
- 对应 17：无
- 必须断言：改客户电话/邮箱/住址后 `GET /audit?entityType=CUSTOMER&entityId=` → **200**，有谁/做什么/何时；`fieldSummary` **无**电话、邮箱、住址**全文**。挂/解绑 `CUSTOMER_VEHICLE` 同样。跨店实体 → **404** `NOT_FOUND`。
- 禁止：Admin 查 `VEHICLE` / `CUSTOMER` 带出业务摘要；把号码写进审计 JSON。

### TEST-12

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/AssistantAskIT.java`
- 对应 16：`BE-12`
- 对应 17：无（17 不做助手）
- 必须断言：Staff A `POST /assistant/ask` → **200**，`cards.length≤5`；卡无电话/邮箱/住址；id 落在本店检索集；**不写** vehicle / customer / listing / 检查表。Admin 打同一 URL → **403** `FORBIDDEN`。模型挂：仍 **200** + `summaryAvailable=false`，卡仍可有（不是业务 502）。
- 禁止：6+ 张卡；助手改库存；把 AI 失败当业务 502 Pass。

### TEST-13

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/AdminForbiddenOnBusinessIT.java`
- 对应 16：`BE-13`（课堂 CL-3 的 API 侧）
- 对应 17：无
- 必须断言：Admin JWT 打 `/vehicles` `/customers` `/listings/**` `/assistant/ask` → **403** `FORBIDDEN` 或 **404** `NOT_FOUND`；body **无** `vin` / 成本 / 客户字段。
- 禁止：只靠前端藏按钮当唯一证据；403 体里仍回列表项。

### TEST-14

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/CoreNotPublicIT.java`（配置断言即可）；可选对照 `dealer-gateway` 对 `/internal/v1/**` 的浏览器 **404**
- 对应 16：`BE-14`（Sprint 1 证据）
- 对应 17：无
- 必须断言：无内部头打 core `8081`、ai `8082`、`/internal/v1/**` → 失败（无 CORS / **404**）。产品入口只是经 Gateway + 用户 JWT 的 `/api/v1/**`。core **不配** `localhost:5173` CORS。
- 禁止：把 `curl 127.0.0.1:8081` 本机仍通当成对公 API 已开放；Sprint 1 用本条冒充已过 S2 云安全。

### TEST-15

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/SellPairRequiredIT.java`
- 对应 16：`BE-15`
- 对应 17：无
- 必须断言：`soldOn` / `soldPrice` 缺一 → HTTP **400**，`error.code=SOLD_PAIR_REQUIRED`；价格 `≤0` → **400**（`VALIDATION` 或同一出售校验）。忽略 PATCH 改出售字段。
- 禁止：成对成功后仍允许 PATCH 改 `soldOn` / `soldPrice`；缺一却 200。

### TEST-16

- 仓 / 文件路径：`dealer-core` / `src/test/java/com/dealerops/core/it/IgnoreClientDealerIdIT.java`；单元 `src/test/java/com/dealerops/core/common/tenant/TenantFilterTest.java`
- 对应 16：`BE-16`
- 对应 17：无
- 必须断言：Staff A 在 body / query / header 冒充店 B 的 `dealerId` 创建车辆 → 仍写入 **店 A**；GET 本店能见、店 B 不可见。
- 禁止：靠参数切店；跨店 id 读资源用 403。

**18 §9 其余单元（不另占 16 编号，随映射测）：** `ApiExceptionHandlerTest` → `src/test/java/com/dealerops/core/common/exception/ApiExceptionHandlerTest.java`（14 映射表）；`OmvicRuleEngineTest` 空草稿硬拦见 17：`PRICE_MISSING` + `DEALER_NAME_MISSING` + `CONDITION_UNDISCLOSED`，不单列广告正文。

---

## 3. 前端任务（dealer-web · 文案对齐 13）

界面英文。失败 **不当空表**。`409 VERSION_CONFLICT` → `Refresh and retry`。守卫在 `src/router/index.ts` 的 `beforeEach`。

### TEST-17

- 仓 / 文件路径：`dealer-web` / `src/router/__tests__/fe01-login-guard.spec.ts`
- 对应 16：`FE-01`
- 对应 17：无
- 必须断言：未登录打开 `/dms` → 到 `/login`；仅按钮文案 **`Sign in with Microsoft`**。
- 禁止：密码框、业务表、直连 8081。

### TEST-18

- 仓 / 文件路径：`dealer-web` / `src/router/__tests__/fe02-admin-guard.spec.ts`
- 对应 16：`FE-02`
- 对应 17：无
- 必须断言：Staff A 打开 `/admin` → 拦回 `/dms`。
- 禁止：看见 Dealerships 表、绑人按钮。

### TEST-19

- 仓 / 文件路径：`dealer-web` / `src/router/__tests__/fe03-dms-guard.spec.ts`
- 对应 16：`FE-03`
- 对应 17：无
- 必须断言：Admin 打开 `/dms` → 拦回 `/admin`。
- 禁止：渲染车辆表（VIN / 成本）。

### TEST-20

- 仓 / 文件路径：`dealer-web` / `src/router/__tests__/fe04-crm-guard.spec.ts`
- 对应 16：`FE-04`
- 对应 17：无
- 必须断言：Admin 打开 `/crm` → 拦回 `/admin`。
- 禁止：客户四字段表。

### TEST-21

- 仓 / 文件路径：`dealer-web` / `src/router/__tests__/fe05-ads-guard.spec.ts`
- 对应 16：`FE-05`
- 对应 17：无（本条只测守卫，不跑夹具）
- 必须断言：Admin 打开 `/ads` → 拦回 `/admin`。
- 禁止：广告表单 / 五态。

### TEST-22

- 仓 / 文件路径：`dealer-web` / `src/router/__tests__/fe06-assistant-guard.spec.ts`
- 对应 16：`FE-06`
- 对应 17：无
- 必须断言：Admin 打开 `/assistant` → 拦回 `/admin`。
- 禁止：Ask、资源卡。

### TEST-23

- 仓 / 文件路径：`dealer-web` / `src/views/__tests__/AdminView.spec.ts`
- 对应 16：`FE-07`
- 对应 17：无
- 必须断言：Admin 在 **同一** `/admin`：Tab **Dealerships**（Name, Contact, Staff count, Actions；筛店名；`New dealership`）与 **Members**（Entra ID/email, Dealership, Status, Actions；筛员工邮箱）。数据 = 店列表 + 各店 members。Staff / Unbind 走 14 已有 Admin API。
- 禁止：第二条 Admin 子路由 `/admin/members`；本课 UI 做 Edit 店；车辆 Tab。

### TEST-24

- 仓 / 文件路径：`dealer-web` / `src/views/__tests__/CrmUnlink.spec.ts`（组件可测 `src/components/ConfirmDialog.vue`）
- 对应 16：`FE-08`
- 对应 17：无
- 必须断言：Staff A 在 `/crm` 点 `Unlink` → 先 `ConfirmDialog`；取消 **不发**请求；确认后才 `DELETE /api/v1/customers/{id}/vehicles/{vehicleId}`。已售：文案 **`Sold vehicles cannot be unlinked`**（对应 **409** `SOLD_LOCKED`）。在库成功后列表 Linked vehicle 清空。
- 禁止：单击即删；用 PUT 空值假装解绑；文案停在「尚未提供」。

### TEST-25

- 仓 / 文件路径：`dealer-web` / `src/components/__tests__/PageState.spec.ts` 与各 `views/__tests__/*View.spec.ts`
- 对应 16：`FE-09`
- 对应 17：广告 AI 失败右栏对齐 **FX-12**（不当 Pass）
- 必须断言：六页 loading / empty / error / 无权限文案按 13 §10，例如 DMS：`Loading vehicles…` / `No vehicles match.` / `Could not load vehicles.` / `You do not have access to DMS.`。广告：`502` `AI_UNAVAILABLE` → 右栏 **AI unavailable**。
- 禁止：把 403/502 画成空表；把 AI 失败画成 Passed。

### TEST-26

- 仓 / 文件路径：`dealer-web` / `src/views/__tests__/AssistantView.spec.ts`
- 对应 16：`FE-10`
- 对应 17：无
- 必须断言：模型挂但 HTTP 200（`summaryAvailable=false`，仍有卡）→ 说明区 **`Smart summary unavailable`**。整页 5xx / 网络失败 → **`Could not ask assistant`**。卡 ≤5、只读、跳转 `/dms` `/crm` `/ads`。
- 禁止：「智能说明暂不可用」；卡上 phone / email / homeAddress；在本页改数据。

---

## 4. 课堂脚本（S2 起云上；与夹具绑定）

### TEST-27

- 仓 / 文件路径：`dealer-web` / `e2e/cl4-ads-blocked.spec.ts`（可复用 TEST-09 的 API 断言）
- 对应 16：**CL-4**（00 条 4 · NN-15）
- 对应 17：**FX-01**、**FX-03**
- 必须断言：Staff A 在 `/ads` 选 CL-2 / V-ASIS 车。无 listing 行时空草稿文案 `Select a vehicle to start.`，**不当** Failed。粘贴 FX-01 → `Save draft` → `Run check`：右栏总状态 **Blocked**；HTTP **200**；网络面板 **不得**出现浏览器对 `/internal/v1/ad-check` 的请求。再改 `adKind=FINANCE` 用 FX-03（有价无 APR）→ 仍 **Blocked**（`FINANCE_APR_MISSING`），仍不调 AI。
- 禁止：看见 **Passed**；用 4xx 表示缺价；用 FX-10 正文冒充本条；**本地-only 冒充 Review 2**。

### TEST-28

- 仓 / 文件路径：`dealer-web` / `e2e/cl5-ads-real-ai.spec.ts`
- 对应 16：**CL-5**（00 条 5 · NN-15/18）
- 对应 17：**FX-10**
- 必须断言：**必须云上 + 真实 GitHub 组件**。粘贴 FX-10 全文，`Run check`，等待 ≤15s。总状态 **Needs AI review** 或 **Passed**；`aiStatus` 非 `SKIPPED`；`aiNotes` 或说明能指出缺失/风险项（无硬缺时期望 Pass）。超时/失败：右栏 **AI unavailable**，GET listing 仍 `AI_UNAVAILABLE`，**禁止** `Mark ready` / `Export TXT` 当通过。
- 禁止：stub / 本机模型冒充 S2/S3；把超时画成 Passed；用 FX-01 硬缺冒充「已走 AI」；把 FX-10 与 **FX-12** 混用（FX-12 必须规则已过再断模型）。

---

## 5. 夹具速查（课堂建议序）

| FX | 用在 | HTTP / code / UI |
|---|---|---|
| FX-01 | TEST-09、TEST-27、TEST-10 否分支 | 200 + `BLOCKED` / `SKIPPED`；UI **Blocked** |
| FX-03 | TEST-09、TEST-27 | 同上；`FINANCE_APR_MISSING` |
| FX-10 | TEST-10 合格、TEST-28、TEST-07 前置 | 真 AI：**200** `PASSED`；然后 Ready / `text/plain` |
| FX-11 | TEST-07 | 不跑检查；Ready/Export **409** `CHECK_STALE`；UI **Stale** |
| FX-12 | TEST-08、TEST-25 广告失败 | **502** `AI_UNAVAILABLE`；UI **AI unavailable**；**禁止硬缺冒充** |

课堂建议序（17 §4）：FX-01 → FX-03 → FX-10（真 AI）→ 导出 TXT → FX-11 无法导出 →（可选对照）FX-12。

---

## 6. 条数与齐全性

| 组 | 本单任务 | 16 / 17 |
|---|---|---|
| BE-01–BE-16 | TEST-01–TEST-16（16 条） | 16 后端全覆盖；类名 = 18 §9 |
| FE-01–FE-10 | TEST-17–TEST-26（10 条） | 16 前端全覆盖 |
| CL-4 / CL-5 | TEST-27 / TEST-28 | S2 现场必须；S3 再含 CL-1–3、CL-6（演示，不另占 TEST 编号） |
| FX-01 / 03 / 10 / 11 / 12 | 见 §1 与 §5 | 五条必点夹具均已映射 |

**测试任务数：28**（16 BE + 10 FE + 2 课堂）。与 16 的 BE-01–BE-16、FE-01–FE-10、CL-4/5 **齐全**；与 17 的 FX-01/03/10/11/12 **齐全**。课堂 CL-1/2/3/6 仍按 16 现场脚本走，不重复计作第 29–32 条。

不做：本文件不落地 JUnit / spec 源码；不恢复工单 / 线索 / 买家站；不发明新错误码。
