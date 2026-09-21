# Dealer Ops 已批准范围（一页纸）

版本 1.0 · 2026-09-21 · 供 Instructor / Client **签字或邮件确认**  
冲突顺序（只读）：**PPT 硬项 > 规格 PDF 字段 > v6 设计 > UI 12**。`01`–`06` 与早期提案 **不作评分依据**。

## 批准范围公式

**规格 PDF 字段**（DMS / CRM / Ad 不加减）  
**+ PPT 六硬项**（四仓四流水线；Gateway；Azure+Docker+Bicep+CI/CD；Entra+JWT+RBAC+HTTPS+Key Vault；真实 AI；Scrum 看板与三次全员 Review）  
**+ v6 六页**（Login / Admin / DMS / CRM / Ad compliance / Assistant）  
**− v6 不做清单**（见 Out of Scope）。  
改范围须本页再签或邮件确认。

## In Scope（本课交付）

| 项 | 一句话 |
|---|---|
| 多租户 | 一家店一份数据；店 A 看不见店 B；Admin 开店/绑人后**零**业务数据 |
| DMS | 规格车辆字段；店内 VIN 唯一；出售成对；已售锁采购 |
| CRM | Name / Email / Phone / Home address；挂本店未售未占车；一车一客 |
| 广告检查 + 导出 TXT | OMVIC 固定清单 + GitHub AI 组件；仅 Passed 且非 Stale → Ready + TXT |
| 审计 | DMS/CRM 每次改：谁、做什么、何时 |
| Assistant | 本店只读问答；同一 AI 组件；不写库 |
| 四仓 | `dealer-web` / `dealer-gateway` / `dealer-core` / `ai-service`（另 `dealer-platform` 放 IaC） |
| Entra | OAuth/OIDC + PKCE + JWT；角色仅 `Platform.Admin` / `Dealer.User`；绑 `entra_oid`→店 |
| Gateway | 浏览器只打 Gateway；直连 core / ai-service 必须失败 |
| 真实 AI | `ai-service` 进程内嵌 GitHub 组件；失败不得显示 Pass |

课堂演示：两店两员隔离；Admin 打车辆接口被拒；缺价/融资缺 APR → Blocked；真实广告走一次真实模型；改价后旧检查不可导出。

## Out of Scope（不写回范围）

工单 Work Orders · 线索 Leads / 跟进 · 买家站 / 公开库存 / 访客咨询 · 厂家端 · KPI 统计看板 · CSV 导入 · Service Bus / outbox / DLQ / 第二库 / 向量库 · 第三方自动刊登 · 支付 · Image Studio · 自研模型 SDK · 自建用户名密码 · C# / contracts 独立仓 · mileage / 颜色 / 燃油等规格外字段。

## 相对提案 / `01`–`06` 的削减

下列曾出现在早期提案或作废稿 `design/01`–`06`。**\*superseded, not for grading.** 不编码、不演示、不评分。

| 提案 / `01`–`06` 有 | v6 不做 / 改做 |
|---|---|
| Visitor 买家站、公开广告页、咨询表 | 无买家站 |
| Staff / Manager；密码哈希登录 | Entra；Admin / Dealer.User |
| 整备工单、可售门槛、归档 | 无工单；库存仅 IN_STOCK / SOLD |
| 线索漏斗、跟进、成交事务、销售页 | CRM 四字段 + 挂车；DMS 成对出售 |
| Dashboard / KPI | 无 KPI 首页 |
| 站内 Publish / Unpublish 到访客页 | **Ready + 导出 TXT**（非外站、非本站买家页） |
| stock #、里程、颜色、标价/费用、预置图 | 仅规格 PDF 字段 |
| 单店、无行级隔离 | **多租户**（规格要求三模块同一店） |
| 单仓 / 密码会话 | 四仓 + Gateway + Entra |
| 异步领域事件 / 队列（提案易扩） | 同步 REST + 单库；不用 Service Bus |

提案已列延后且本版仍不做：Image Studio、OCR、VIN 解码、第三方广告同步、支付/合同、短信邮件、向量库与训模型。

## 规格勘误（以 PPT / v6 为准）

1. **认证 = Entra**（不是规格里的用户名密码）。  
2. **规格第 7 节加 Assistant**（规格无此页；PPT 要求真实 AI 核心功能 → 店内只读助手）。  
3. **publish = Ready + TXT 导出**（不是外站发布，也不是买家站上架）。

## 签字 / 邮件确认

确认：上表即本课评分与演示范围；工单、线索、买家站、Service Bus **不**在范围内。组员姓名仍缺，先按角色。

| 角色 | 姓名（仍缺，留空） | 仓库侧重 |
|---|---|---|
| A | ________________ | `dealer-web`（6 页） |
| B | ________________ | `ai-service` + platform 初稿 |
| C | ________________ | `dealer-gateway` + `dealer-core` |

| | 姓名 / 签名 | 日期 |
|---|---|---|
| Instructor | ________________ | __________ |
| Client | ________________ | __________ |

**邮件确认也可。** 请回复本文件路径 `design/SCOPE-BASELINE.md` 并写：*I confirm the approved scope on this page.* 把邮件日期填上表即可，无需纸质。
