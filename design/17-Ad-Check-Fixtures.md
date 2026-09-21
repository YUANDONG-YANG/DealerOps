# 17 · 广告合规检查样例 / AI 评估夹具

版本：现行有效（v6）· 2026-09-21  
**现行有效。** 固定规则与原因码以 [15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) 第 6 节伪代码为准。检查 HTTP、五态、Blocked=200、`AI_UNAVAILABLE`=502 以 [14-Backend-API-Contract.md](14-Backend-API-Contract.md) 第 8 节为准。  
本文**只**提供可跑的广告文本夹具与期望态，不是规则实现、不是 OpenAPI、不是 OMVIC 认证。系统输出只能是「规则命中 + 复核建议」，**禁止**在 UI 或报告写 OMVIC approved / certified。

废止的 `05` 不是现行需求。本文只借鉴其「可重复英文样例 + 期望规则」意图，按 v6 的 `CASH` / `FINANCE` / `LEASE` 与 `ONLINE` / `RADIO_TV_BILLBOARD` 重写。融资/租赁检查 **In Scope**（对齐 00 / 15），不要沿用参考稿「融资不可做」。

不做：Service Bus、异步审广告、队列回查、外部广告站、宣称合法认证。检查是店员同步 `POST /api/v1/listings/{id}/checks`（规则先于 AI，AI ≤15s）。

---

## 1. 共用店与车辆前提

除非某条另写，一律用这家店的**公开四字段**（与 14 号示例一致）。固定规则对店名做大小写不敏感包含；联系方式要能对上电话数字 / 邮箱 / 地址原文。

| 字段 | 值 |
|---|---|
| `legalName` | Prairie Auto Ltd. |
| `contactPhone` | 403-555-0100 |
| `contactEmail` | desk@prairie.example |
| `contactAddress` | 100 1 Ave SW, Calgary |

车辆（无采购成本进检查；标价只看广告正文，**不用** `purchaseCost`）：

| 代号 | year / make / model | VIN（示例） | `conditionCode` | `source` |
|---|---|---|---|---|
| V-ASIS | 2020 Toyota Camry | 1HGCM82633A004352 | `AS_IS` | `AUCTION` |
| V-CERT | 2022 Honda Civic | 2HGFC2F59NH000001 | `CERTIFIED` | `TRADE_IN` |
| V-UNFIT | 2016 Ford F-150 | 1FTFW1E50GFA00001 | `UNFIT` | `OTHER` |
| V-IRREP | 2018 Chevrolet Cruze | 1G1BE5SM8J7100001 | `IRREPARABLE` | `AUCTION` |

金额/利率写法按 15：允许 `$`、`CAD`、`C$`；APR 须形如 `6.99% APR` 或 `APR 6.99%` / `APR: 6.99%`。

---

## 2. 怎么跑、怎么记结果

1. 本店 DMS 建对应车辆 → `PATCH` listing（`title`/`body`/`adKind`/`medium`）→ `POST .../checks`（带当前 `version`）。
2. **硬缺**（`hard[]` 非空）：HTTP **200**，`recommendation=BLOCKED`，`aiStatus=SKIPPED`，**不**调 AI。`checkStatus=BLOCKED`。Ready / Export → **409** `NOT_PASSED`。
3. **硬缺为空**：固定规则返回 `NEEDS_AI`，core 经 Gateway `POST /internal/v1/ad-check`。成功且模型未再报硬缺 → **200** `PASSED` / `SUCCESS`。超时或失败 → HTTP **502** `AI_UNAVAILABLE`，检查行**已写** `recommendation=UNAVAILABLE`，listing 已指过去；GET listing 的 `checkStatus=AI_UNAVAILABLE`；**UI 不得当 Pass**；Ready / Export → **409** `NOT_PASSED`。
4. 仅 `PASSED` 且 `check.contentVersion == listing.contentVersion` 才能 Ready，然后导出 **TXT**（店公开四字段 + 车辆公开字段 + 标题正文 + 检查时间；无客户、无成本）。
5. **Stale** 只用于「曾经 PASSED 后版本已升」。Blocked 后改稿再打开页面是 `NEEDS_AI`，不是 Stale。
6. 标签均为 **team-authored**。自建夹具成绩只说明本套样例，不预先承诺准确率，不把 GitHub `ai-manager` 库本身当验收证明。

`ruleFindings` 的 HTTP 形状见 14（`ruleId` / `severity` / `passed` / `message`）。下表 **原因码** 用 15 伪代码标识（如 `PRICE_MISSING`），实现映射到 `ruleId` 时不得改语义。`severity`：硬缺=`BLOCK`，soft=`REVIEW`。

---

## 3. 样例

每条：`id`、`offerType`（= `adKind`）、`channel`（= `medium`）、`title`、`body`、车辆/店前提、固定规则期望、进 AI 时期望、Ready/导出、课堂演示。

### FX-01 · 缺价（CASH / ONLINE）

| | |
|---|---|
| **id** | `FX-01` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry — great daily driver |
| **body** | Sold as-is by Prairie Auto Ltd. Call 403-555-0100, email desk@prairie.example, visit 100 1 Ave SW, Calgary. Clean title story, come see it this weekend. |
| **车辆/店前提** | V-ASIS。正文**无** `$` / `CAD` / `dollars` 价格。有店名。有完整联系。有 `as-is`。无 APR（CASH 不要求）。 |
| **固定规则** | **Blocked** · `PRICE_MISSING` · `aiStatus=SKIPPED` · HTTP 200 |
| **若进 AI** | 不调 AI |
| **Ready/导出** | 否 |
| **课堂演示** | **是**（验收：缺价被挡住） |

### FX-02 · 缺店名（CASH / ONLINE）

| | |
|---|---|
| **id** | `FX-02` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry cash deal |
| **body** | Cash price $18,900 CAD. Sold as-is. Call 403-555-0100, email desk@prairie.example, visit 100 1 Ave SW, Calgary. |
| **车辆/店前提** | V-ASIS。有价格。正文**不含** `Prairie Auto Ltd.`（「the dealership」不算）。有完整联系。有 `as-is`。 |
| **固定规则** | **Blocked** · `DEALER_NAME_MISSING` · 不调 AI · HTTP 200 |
| **若进 AI** | 不调 AI |
| **Ready/导出** | 否 |
| **课堂演示** | 否（自动化回归即可） |

### FX-03 · FINANCE 缺 APR（ONLINE）

| | |
|---|---|
| **id** | `FX-03` |
| **offerType** | `FINANCE` |
| **channel** | `ONLINE` |
| **title** | Finance this 2020 Toyota Camry |
| **body** | Cash price $18,900. 60 month term available. Sold as-is by Prairie Auto Ltd. 403-555-0100 · desk@prairie.example · 100 1 Ave SW, Calgary. |
| **车辆/店前提** | V-ASIS。有价格、店名、联系、`as-is`、期限。正文**无** APR 正则（不要写 `% APR` / `APR 6.99%`）。 |
| **固定规则** | **Blocked** · `FINANCE_APR_MISSING` · 不调 AI · HTTP 200。可同时有 soft `FINANCE_APR_PROXIMITY`（ONLINE），但不改变硬拦。 |
| **若进 AI** | 不调 AI |
| **Ready/导出** | 否 |
| **课堂演示** | **是**（验收：融资缺 APR 被挡住） |

### FX-04 · LEASE 缺 APR（ONLINE）

| | |
|---|---|
| **id** | `FX-04` |
| **offerType** | `LEASE` |
| **channel** | `ONLINE` |
| **title** | Lease a 2020 Toyota Camry |
| **body** | Lease this Camry. $399 per month, 36 months, $2,000 down payment, 20,000 km per year. Sold as-is by Prairie Auto Ltd. 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. Cash price $18,900. |
| **车辆/店前提** | V-ASIS。有 lease 声明、租金、租期、首付、额度、价格、店名、联系、`as-is`。**无** APR。 |
| **固定规则** | **Blocked** · `LEASE_APR_MISSING` · 不调 AI · HTTP 200 |
| **若进 AI** | 不调 AI |
| **Ready/导出** | 否 |
| **课堂演示** | 否 |

### FX-05 · AS_IS 未披露

| | |
|---|---|
| **id** | `FX-05` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry — $18,900 |
| **body** | Cash price $18,900. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. Ready for a test drive. |
| **车辆/店前提** | V-ASIS。有价格与店/联系。正文**无** `as-is` / `as is`。 |
| **固定规则** | **Blocked** · `CONDITION_UNDISCLOSED` · 不调 AI · HTTP 200 |
| **若进 AI** | 不调 AI |
| **Ready/导出** | 否 |
| **课堂演示** | 否 |

### FX-06 · UNFIT 未披露

| | |
|---|---|
| **id** | `FX-06` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2016 Ford F-150 work truck $9,500 |
| **body** | Cash price $9,500. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. Strong frame, sold as a project. |
| **车辆/店前提** | V-UNFIT。有价格与店/联系。正文**无** `unfit` / `not roadworthy` / `not fit`。「project」不算披露。 |
| **固定规则** | **Blocked** · `CONDITION_UNDISCLOSED` · 不调 AI · HTTP 200 |
| **若进 AI** | 不调 AI |
| **Ready/导出** | 否 |
| **课堂演示** | 否 |

### FX-07 · IRREPARABLE 未披露

| | |
|---|---|
| **id** | `FX-07` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2018 Chevrolet Cruze $3,200 parts special |
| **body** | Cash price $3,200. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. Great for parts or a rebuild. |
| **车辆/店前提** | V-IRREP。有价格与店/联系。正文**无** `irreparable` / `salvage` / `write-off` / `write off`。 |
| **固定规则** | **Blocked** · `CONDITION_UNDISCLOSED` · 不调 AI · HTTP 200 |
| **若进 AI** | 不调 AI |
| **Ready/导出** | 否 |
| **课堂演示** | 否 |

### FX-08 · 广告声称 CERTIFIED、实车 AS_IS

| | |
|---|---|
| **id** | `FX-08` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | Certified 2020 Toyota Camry $18,900 |
| **body** | Factory certified / CPO Camry. Cash price $18,900. Sold as-is by Prairie Auto Ltd. 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **车辆/店前提** | V-ASIS（`conditionCode=AS_IS`）。正文同时有 `certified`/`cpo` 与 `as-is`。规则：声称 certified 且实车不是 CERTIFIED → 硬拦。 |
| **固定规则** | **Blocked** · `CONDITION_MISMATCH`（广告优于实车）· 不调 AI · HTTP 200 |
| **若进 AI** | 不调 AI |
| **Ready/导出** | 否 |
| **课堂演示** | 否 |

### FX-09 · LEASE 年额度低于 20000 km 且无超额公里费

| | |
|---|---|
| **id** | `FX-09` |
| **offerType** | `LEASE` |
| **channel** | `ONLINE` |
| **title** | Lease 2020 Toyota Camry 15,000 km |
| **body** | Lease this 2020 Toyota Camry. $399 per month, 36 months, $2,000 down payment, 6.99% APR, 15000 km per year. Sold as-is by Prairie Auto Ltd. 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. Cash price $18,900. |
| **车辆/店前提** | V-ASIS。有 APR、lease、租期、租金、首付、价格、店/联系、`as-is`。额度 **15000 km/year**，正文**无** `excess` / `overage` / additional km。 |
| **固定规则** | **Blocked** · `LEASE_EXCESS_KM_MISSING` · 不调 AI · HTTP 200 |
| **若进 AI** | 不调 AI |
| **Ready/导出** | 否 |
| **课堂演示** | 否 |

### FX-10 · 干净 CASH（可 Pass 后导出 TXT）

| | |
|---|---|
| **id** | `FX-10` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry — cash $18,900 |
| **body** | 2020 Toyota Camry, VIN 1HGCM82633A004352. Cash price $18,900 CAD. Sold as-is. HST and licensing extra. Sold by Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. In-stock now. |
| **车辆/店前提** | V-ASIS。有价格、店名、电话+邮箱+地址、年份、`as-is`。无融资/租赁措辞。无「certified」。 |
| **固定规则** | **Needs AI**（`hard[]` 空；`soft[]` 通常空，年份已在文中）· 将调 AI |
| **若进 AI** | 期望 **Pass**（`PASSED` / `SUCCESS` / HTTP 200）。`aiNotes` 可空或仅非硬缺备注。**不是** OMVIC 认证。 |
| **Ready/导出** | **是**（Passed 且非 Stale 后 Ready，再导出 TXT） |
| **课堂演示** | **是**（验收：真实广告文本走一次真实 AI；通过后导出） |

### FX-11 · 改价后旧检查变 Stale（前置步骤，无独立正文）

| | |
|---|---|
| **id** | `FX-11` |
| **offerType** | （沿用 FX-10 的 `CASH`） |
| **channel** | （沿用 FX-10 的 `ONLINE`） |
| **title** / **body** | **不是**一条新广告。在 **FX-10 已 PASSED** 的同一 listing 上改价。 |
| **车辆/店前提** | 仍为 V-ASIS。 |
| **前置步骤** | 1）按 FX-10 检查并得到 `PASSED`（可先 Ready，非必须）。2）`PATCH` listing：把正文价格改为 `$17,900`（或任意不同标价），`contentVersion++`，`status` 回 `DRAFT`。**不要**清空 `lastCheckId`。3）GET listing：`lastCheck.recommendation` 仍曾是 PASSED，但版本已不等 → **`checkStatus=STALE`**。4）不重新检查就 Ready / Export → **409** `CHECK_STALE`。改车辆 `conditionCode` 同样升 listing 版本，效果相同；**单独改采购成本不作废**。 |
| **固定规则** | 本步**不再跑**检查。期望页面五态 **Stale**。重新 `POST .../checks` 后按新正文重判（不再是 Stale）。 |
| **若进 AI** | 作废步骤不调 AI。重查时按新正文走 §2。 |
| **Ready/导出** | **否**（在重查并通过之前） |
| **课堂演示** | **是**（验收：改价后不能用旧检查导出） |

### FX-12 · AI 不可用（规则已过）

| | |
|---|---|
| **id** | `FX-12` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | （与 FX-10 相同） |
| **body** | （与 FX-10 相同） |
| **车辆/店前提** | 与 FX-10 相同。运行时让 AI 超时/断 Key/stub 失败（适配器 ≤15s），**不要**用硬缺广告冒充本条。 |
| **固定规则** | **Needs AI**（与 FX-10 相同，`hard[]` 空）· 将调 AI |
| **若进 AI** | 调用失败。HTTP **502** `AI_UNAVAILABLE`。`compliance_check` **已落库**：`recommendation=UNAVAILABLE`，`aiStatus=UNAVAILABLE`（或 `FAILED` 再归一到不可用）。listing.`lastCheckId` 已指向该行。GET：`checkStatus=AI_UNAVAILABLE`。**UI 不当 Pass**。 |
| **Ready/导出** | 否（409 `NOT_PASSED`） |
| **课堂演示** | **是**（对照真实 AI 成功路径；失败不得显示通过） |

### FX-13 · 干净 CASH · RADIO_TV_BILLBOARD

| | |
|---|---|
| **id** | `FX-13` |
| **offerType** | `CASH` |
| **channel** | `RADIO_TV_BILLBOARD` |
| **title** | 2020 Camry eighteen nine at Prairie Auto |
| **body** | On air: 2020 Toyota Camry, cash price $18,900. Sold as-is at Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **车辆/店前提** | V-ASIS。媒介为广播/户外；CASH 无 APR 并列规则。有价格、店名、三种联系、`as-is`、年份。 |
| **固定规则** | **Needs AI** · 调 AI。无 `FINANCE_APR_PROXIMITY`。 |
| **若进 AI** | 期望 **Pass** |
| **Ready/导出** | 是（Pass 且非 Stale 后） |
| **课堂演示** | 否（保证 RADIO 通道至少 1 条；课堂优先 FX-10） |

### FX-14 · FINANCE 带 APR · RADIO_TV_BILLBOARD（免并列）

| | |
|---|---|
| **id** | `FX-14` |
| **offerType** | `FINANCE` |
| **channel** | `RADIO_TV_BILLBOARD` |
| **title** | Finance the 2020 Camry — 6.99 percent APR |
| **body** | 2020 Toyota Camry. Cash price $18,900. Finance at 6.99% APR, 60 months. Sold as-is by Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **车辆/店前提** | V-ASIS。有 APR 正则、期限、现金价、店/联系、`as-is`。`medium=RADIO_TV_BILLBOARD` → **不加** `FINANCE_APR_PROXIMITY`。 |
| **固定规则** | **Needs AI**（`soft[]` 可空或仅无关项）· 调 AI |
| **若进 AI** | 期望 **Pass**（广播免「利率与 APR 并列展示」） |
| **Ready/导出** | 是（Pass 后） |
| **课堂演示** | 否 |

### FX-15 · FINANCE 带 APR · ONLINE（并列交给 AI）

| | |
|---|---|
| **id** | `FX-15` |
| **offerType** | `FINANCE` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry 6.99% APR finance |
| **body** | 2020 Toyota Camry. Cash price $18,900. 6.99% APR, 60 month term. Sold as-is by Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **车辆/店前提** | V-ASIS。有 APR、期限、现金价、店/联系、`as-is`。ONLINE → soft `FINANCE_APR_PROXIMITY`（版式无法可靠正则）。 |
| **固定规则** | **Needs AI** · `FINANCE_APR_PROXIMITY`（REVIEW）· 调 AI · **不是** Blocked |
| **若进 AI** | 本条利率与 APR 写在同一句，期望 **Pass**。若模型只给版式备注、未报硬缺，仍为 Pass。 |
| **Ready/导出** | 是（Pass 后） |
| **课堂演示** | 否 |

### FX-16 · LEASE 完整（ONLINE）

| | |
|---|---|
| **id** | `FX-16` |
| **offerType** | `LEASE` |
| **channel** | `ONLINE` |
| **title** | Lease 2020 Toyota Camry 6.99% APR |
| **body** | Lease this 2020 Toyota Camry. Cash price $18,900. $399 per month, 36 months, $2,000 down payment, 6.99% APR, 20,000 km per year. Sold as-is by Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **车辆/店前提** | V-ASIS。有 lease 声明、APR、租期、租金、首付、≥20000 km/年、价格、店/联系、`as-is`。额度达标，**不加** `LEASE_EXCESS_KM_MISSING`。 |
| **固定规则** | **Needs AI** · 调 AI |
| **若进 AI** | 期望 **Pass** |
| **Ready/导出** | 是（Pass 后） |
| **课堂演示** | 否 |

### FX-17 · CERTIFIED 已披露（CASH / ONLINE）

| | |
|---|---|
| **id** | `FX-17` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2022 Honda Civic certified $22,400 |
| **body** | 2022 Honda Civic, dealer certified. Cash price $22,400. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **车辆/店前提** | V-CERT。正文有 `certified`，与 `conditionCode=CERTIFIED` 一致。有价格与完整店/联系。 |
| **固定规则** | **Needs AI** · 无 `CONDITION_MISMATCH` / 无 `CERTIFIED_NOT_IN_COPY` · 调 AI |
| **若进 AI** | 期望 **Pass** |
| **Ready/导出** | 是（Pass 后） |
| **课堂演示** | 否 |

### FX-18 · CERTIFIED 未写关键词（paraphrase → AI）

| | |
|---|---|
| **id** | `FX-18` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2022 Honda Civic cash $22,400 |
| **body** | 2022 Honda Civic. Inspected and backed by our in-house quality program. Cash price $22,400. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **车辆/店前提** | V-CERT。正文**无** `certified` / `cpo` / `certifi`。有价格与店/联系。 |
| **固定规则** | **Needs AI** · soft `CERTIFIED_NOT_IN_COPY` · **不**硬拦 · 调 AI |
| **若进 AI** | 可用 paraphrase。本条期望 **Pass**，`aiNotes` 可提醒「车况为 CERTIFIED，文案未用 certified」。不要因 soft 自动 Blocked。 |
| **Ready/导出** | 是（若 AI Pass）；若课堂模型坚持缺词，记 FN/团队标签，仍不得当规则硬拦 |
| **课堂演示** | 否 |

### FX-19 · UNFIT 已披露

| | |
|---|---|
| **id** | `FX-19` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2016 Ford F-150 unfit $9,500 |
| **body** | 2016 Ford F-150. This vehicle is unfit / not roadworthy. Cash price $9,500. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **车辆/店前提** | V-UNFIT。正文有 `unfit` 或 `not roadworthy`。有价格与店/联系。 |
| **固定规则** | **Needs AI** · 已披露则无 `CONDITION_UNDISCLOSED` · 调 AI |
| **若进 AI** | 期望 **Pass**（披露齐全；模型可备注不适驾风险，但无新硬缺则 Pass） |
| **Ready/导出** | 是（Pass 后） |
| **课堂演示** | 否 |

### FX-20 · IRREPARABLE 已披露

| | |
|---|---|
| **id** | `FX-20` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2018 Cruze irreparable salvage $3,200 |
| **body** | 2018 Chevrolet Cruze. Irreparable salvage / write-off. Cash price $3,200. Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. For parts only. |
| **车辆/店前提** | V-IRREP。正文有 `irreparable` 或 `salvage` 或 `write-off`。有价格与店/联系。 |
| **固定规则** | **Needs AI** · 已披露 · 调 AI |
| **若进 AI** | 期望 **Pass** |
| **Ready/导出** | 是（Pass 后） |
| **课堂演示** | 否 |

### FX-21 · 联系方式只露一项（soft，不硬拦）

| | |
|---|---|
| **id** | `FX-21` |
| **offerType** | `CASH` |
| **channel** | `ONLINE` |
| **title** | 2020 Toyota Camry $18,900 as-is |
| **body** | 2020 Toyota Camry. Cash price $18,900. Sold as-is by Prairie Auto Ltd. Call 403-555-0100. |
| **车辆/店前提** | V-ASIS。有店名、价格、`as-is`、年份。仅电话；**无**邮箱与地址。 |
| **固定规则** | **Needs AI** · soft `DEALER_CONTACT_INCOMPLETE` · **不是** `DEALER_CONTACT_MISSING`（完全没有联系才硬拦）· 调 AI |
| **若进 AI** | 期望仍 **Block**（模型应指出缺邮箱/地址）。`recommendation` 不得仅因规则过了就当 Pass；评估记：AI 应产出可定位备注。若某次模型误 Pass，记 FP，UI 仍不得手改成认证文案。 |
| **Ready/导出** | 否（本夹具期望非 Pass） |
| **课堂演示** | 否 |

### FX-22 · LEASE 无租赁声明

| | |
|---|---|
| **id** | `FX-22` |
| **offerType** | `LEASE` |
| **channel** | `ONLINE` |
| **title** | 2020 Camry 6.99% APR $399/mo |
| **body** | 2020 Toyota Camry. $399 per month, 36 months, $2,000 down payment, 6.99% APR, 20,000 km per year. Cash price $18,900. Sold as-is by Prairie Auto Ltd., 403-555-0100, desk@prairie.example, 100 1 Ave SW, Calgary. |
| **车辆/店前提** | V-ASIS。`adKind=LEASE`，正文**无** `lease` / `leasing` / `lessee`。有 APR 与其余租赁数字。 |
| **固定规则** | **Blocked** · `LEASE_STATEMENT_MISSING` · 不调 AI · HTTP 200 |
| **若进 AI** | 不调 AI |
| **Ready/导出** | 否 |
| **课堂演示** | 否 |

---

## 4. 覆盖核对

| 要求 | 夹具 |
|---|---|
| 缺价 → Blocked，不调 AI | FX-01 |
| 缺店名 → Blocked，不调 AI | FX-02 |
| FINANCE 缺 APR → Blocked，不调 AI | FX-03 |
| LEASE 缺 APR → Blocked，不调 AI | FX-04 |
| CERTIFIED / AS_IS / UNFIT / IRREPARABLE 未披露或错称 | FX-05、FX-06、FX-07、FX-08、FX-18 |
| 同上已披露 | FX-10（AS_IS）、FX-17（CERTIFIED）、FX-19、FX-20 |
| 改价后旧检查 Stale | FX-11（步骤，非独立正文） |
| 干净 CASH → Pass → 导出 TXT | FX-10 |
| AI 不可用：502 + 落库，UI 不当 Pass | FX-12 |
| `RADIO_TV_BILLBOARD` | FX-13、FX-14 |
| `ONLINE` | 其余多数 |
| `CASH` / `FINANCE` / `LEASE` | 三类均有 |

课堂建议顺序：FX-01 → FX-03 → FX-10（真 AI）→ 导出 TXT → FX-11 改价无法导出 →（可选）FX-12 断 AI。

---

## 5. 明确不做

- 不把本文件当「OMVIC 批准」清单。
- 不发明 Service Bus / 异步审广告 / 第二库。
- 不要求实现组为 APR、延保、既往用途加列；APR 只在正文找。
- 空草稿（title/body 皆空）按 15：硬拦 `PRICE_MISSING` + `DEALER_NAME_MISSING` + `CONDITION_UNDISCLOSED`，不单列广告正文。
- 助手问答不是本夹具范围。
