# DealerOps Jira 四状态审核与发布 — 2026-09-28

已按用户授权，通过浏览器 MCP 在现有 Jira KAN 项目保存状态变更。当前会话未提供专用 Jira connector 工具；实际操作与确认均来自 Jira 页面。共读取 89 条事项详情，完成并逐项回读核实 64 次状态转换，保存 3 条验收描述纠正。没有新建项目、删除事项、发布软件版本或执行云端部署。

## 发布结果

看板（78 张卡片，不含 10 个 Epic 与 1 个子任务）：To Do **8**、In Progress **41**、Review **28**、Finished **1**。这四个计数已在最终看板页面直接核实。

全项目（89 条）：To Do **11**、In Progress **49**、Review **28**、Finished **1**；根据审核前完整清单和逐项成功转换记录汇总。审核前为 68 / 5 / 15 / 1。

看板：https://sait-group2-private.atlassian.net/jira/software/projects/KAN/boards/2

## 四列口径

- To Do：尚无充分实施证据，或仍待签字、外部决定、实际走查。不是要求为学生演示增加复杂功能。
- In Progress：已有代码/文档/测试，但仍有明确的运行、描述、部署或验收缺口。Epic 随已有子项推进，但不由单个子项代表完成。
- Review：静态审查已找到主要实现，可进入人工验收；不代表构建、自动测试、真实登录或课堂演示已通过。
- Finished：仅保留 KAN-15 的单 MySQL、九张表架构交付；不代表整个项目完成。

## 主要证据与未完成事项

1. KAN-67 已进入 Review。CustomerService 允许同店未关联的 IN_STOCK/SOLD 车辆首次关联，重复关联 409，跨店 404，SOLD 解绑 409。当前 A3 决定明确允许售后首次关联。KAN-23、KAN-50、KAN-67 的 Jira 描述已保存纠正，撤销旧的 sold-link 400 要求；历史评论保留，新的描述明确覆盖旧结论。KAN-23 仍待测试执行证据。
2. KAN-51/52/53/64/69/74/75/76 等接口已逐项阅读 Controller/Service，进入 Review。对应证据为 MeService、DealerAdminService、MembershipService、CustomerService、ListingService、AuditService、AssistantService。KAN-77/78/79 的内部调用与安全实现进入 Review；不等于 KAN-86 的真实模型接入完成。
3. 前端已有路由、PageState、管理/DMS/CRM/广告/助手实现。KAN-28/33/60 进入 Review。MSAL 与登录任务 KAN-32/41 保留 In Progress；代码中的占位默认值不能单独证明实际 Entra 注册缺失，亦不能证明登录已通过。
4. dealer-web/package.json 缺少测试脚本及 vitest、@vue/test-utils 等运行依赖，web CI 仅构建。AdminView.spec.ts 有实际挂载测试，不能误称为空测试；但干净环境不可复现运行，因此 KAN-65 调回 In Progress，其余已有前端测试源文件也进入 In Progress。
5. core CI 的普通 mvn test 与 IT 分离，而集成测试步骤使用 mvn verify -DskipTests，不能作为 IT 实际通过的证据。所有测试卡暂留 In Progress，包含此前 Review 的 KAN-16/21/22/37。需要恢复执行入口并保存报告，本次未运行测试、未声称通过。
6. CoreNotPublicIT 与 CL-4/CL-5 存在源码/配置扫描，不能代替实际网络隔离和浏览器演示。KAN-43/72/73 保留 In Progress。
7. deploy/README.md 记录已部署 Azure VM、Caddy TLS 和 Compose 服务，AI 仍为 stub；main.bicep 未部署，publish-ghcr 只推镜像、不更新 VM。KAN-19/81/87 为 In Progress。KAN-86 的真实 AI、KAN-88 的 Entra 实际验收、KAN-89 的仓库组织决定保留 To Do。不得用 VM 部署替代尚未确认豁免的课程 Container Apps 要求。
8. KAN-11 README、KAN-82 文档一致性、KAN-84 发布卫生、KAN-85 隔离测试与文档收尾进入 In Progress。当前工作树审查不代表全部内容已提交或部署。
9. KAN-83 的复杂 NFR 与当前学生演示范围有偏差，保留 To Do 待范围收敛，不扩建限流、性能 SLO、保留策略等功能。KAN-91 待教师决定。KAN-5 签字、KAN-20/61 实际走查、KAN-92 图示验收未获得完成证据，保留 To Do；KAN-7 已有图附件不等于本次验证图中所有内容。

## 后续验收应对齐的文字

- KAN-31 应保留 15 秒上限的语义，避免把旧 .orTimeout 写法作为唯一实现要求；现有实现为有界执行器与超时取消。
- KAN-35 的内部 token 默认值应限于 dev/local，生产需显式配置。
- KAN-38 与 KAN-74 应统一导出门槛：当前 ListingService 检查有效 PASSED 与版本一致，不能据旧措辞臆造额外 READY 状态门槛。
- KAN-73 成功结果措辞需对齐当前 PASSED 合同；真实模型演示仍待执行。

上述文字问题留作 In Progress 的收尾项；本次仅实际修改了 KAN-23/50/67 的描述。

## 全部事项发布清单

下面是本次审核前状态到保存后状态。未变更事项明确列出；每个变更均经 Jira 状态控件回读。

- KAN-3: To Do（保留）
- KAN-5: To Do（保留）
- KAN-6: To Do（保留）
- KAN-7: To Do → In Progress
- KAN-8: To Do → In Progress
- KAN-9: To Do → In Progress
- KAN-10: To Do → In Progress
- KAN-11: Review → In Progress
- KAN-12: To Do → In Progress
- KAN-13: To Do → Review
- KAN-14: To Do → Review
- KAN-15: Finished（保留）
- KAN-16: Review → In Progress
- KAN-17: To Do → Review
- KAN-18: To Do → In Progress
- KAN-19: In Progress（保留）
- KAN-20: To Do（保留）
- KAN-21: Review → In Progress
- KAN-22: Review → In Progress
- KAN-23: In Progress（保留）
- KAN-24: To Do → In Progress
- KAN-25: To Do → In Progress
- KAN-26: To Do → In Progress
- KAN-27: To Do → In Progress
- KAN-28: To Do → Review
- KAN-29: Review（保留）
- KAN-30: Review（保留）
- KAN-31: To Do → In Progress
- KAN-32: In Progress（保留）
- KAN-33: To Do → Review
- KAN-34: To Do → In Progress
- KAN-35: To Do → In Progress
- KAN-36: To Do → In Progress
- KAN-37: Review → In Progress
- KAN-38: To Do → In Progress
- KAN-39: To Do → In Progress
- KAN-40: To Do → In Progress
- KAN-41: To Do → In Progress
- KAN-42: To Do → In Progress
- KAN-43: To Do → In Progress
- KAN-44: Review（保留）
- KAN-45: To Do → In Progress
- KAN-46: To Do → In Progress
- KAN-47: To Do → Review
- KAN-48: Review（保留）
- KAN-49: Review（保留）
- KAN-50: Review（保留）
- KAN-51: To Do → Review
- KAN-52: To Do → Review
- KAN-53: To Do → Review
- KAN-54: Review（保留）
- KAN-55: To Do → In Progress
- KAN-56: Review（保留）
- KAN-57: To Do → In Progress
- KAN-58: To Do → In Progress
- KAN-59: To Do → In Progress
- KAN-60: To Do → Review
- KAN-61: To Do（保留）
- KAN-62: To Do → In Progress
- KAN-63: To Do → In Progress
- KAN-64: To Do → Review
- KAN-65: Review → In Progress
- KAN-66: To Do → In Progress
- KAN-67: In Progress → Review
- KAN-68: To Do → In Progress
- KAN-69: To Do → Review
- KAN-70: To Do → In Progress
- KAN-71: Review（保留）
- KAN-72: In Progress（保留）
- KAN-73: To Do → In Progress
- KAN-74: To Do → Review
- KAN-75: To Do → Review
- KAN-76: To Do → Review
- KAN-77: To Do → Review
- KAN-78: To Do → Review
- KAN-79: To Do → Review
- KAN-80: To Do → In Progress
- KAN-81: To Do → In Progress
- KAN-82: To Do → In Progress
- KAN-83: To Do（保留）
- KAN-84: To Do → In Progress
- KAN-85: To Do → In Progress
- KAN-86: To Do（保留）
- KAN-87: To Do → In Progress
- KAN-88: To Do（保留）
- KAN-89: To Do（保留）
- KAN-90: To Do → In Progress
- KAN-91: To Do（保留）
- KAN-92: To Do（保留）

---

## 历史记录（以下不是当前状态）

# DealerOps Jira progress — 2026-09-28

Source of truth for the KAN board on this date. Code was checked at git HEAD `1694510` on `main`. Jira statuses below were read before any transition in this pass: To Do 75, In Progress 4, Review 9, Finished 1.

This is a historical board snapshot, not a live Jira status source. 2026-09-28 correction: linking an unlinked same-dealer SOLD vehicle is intended (closed A3); only unlink after sale is blocked. KAN-23/KAN-67 must not be held back on that obsolete defect. No live Jira transition was made by this correction; acceptance and board status must be verified separately.

## Column rules

| Column | Rule |
| --- | --- |
| To Do | Not started, or reference-only. Blank signatures and unread controllers stay here. |
| In Progress | Code has started and the done condition is still open, including a known defect. |
| Review | Implementation matches the design and is waiting for acceptance. A test card may be Review only when the feature it checks is also Review or Finished. A test must not be Review while that feature is In Progress. A test is never Finished by itself. |
| Finished | A product or architecture deliverable is in the repo and is not blocked by an open defect on that same deliverable. Design markdown alone is not Finished. An Azure/Bicep draft is not Finished. |

## To Do

Explicit keep. The rest of the To Do column stays To Do. Stories whose controllers were not read in this pass are not placed: `MeController`, `CustomerController`, `ListingController`, `AuditController`, `AssistantController`.

| Key | Summary | Evidence or gap |
| --- | --- | --- |
| KAN-5 | Get client to sign project agreement form | `design/SCOPE-BASELINE.md` signature and email-confirmation rows are still blank. |

## In Progress

| Key | Summary | Evidence or gap |
| --- | --- | --- |
| KAN-19 | Architecture: minimum Azure set | `dealer-platform/infra/main.bicep` is a draft (`targetScope = 'resourceGroup'`, comment: not deployed from this repo). Azure draft is not Finished. |
| KAN-23 | TEST-05 CustomerVehicleLinkIT | Historical In Progress status; the alleged sold-link defect is withdrawn. BE-05/06 and AT-25 define the correct stock/sold link and sold-unlink behavior. Acceptance execution remains to be recorded. |
| KAN-32 | FE-T03 MSAL and axios to port 8080 only | `dealer-web/src/auth/msal.ts` is wired, but the client id falls back to `dealer-web-placeholder`. Done condition still open. |
| KAN-67 | BE-T14 Link, unlink, and sold lock | Historical In Progress status; current intended behavior allows an unlinked same-dealer SOLD vehicle to link, while unlink throws SOLD_LOCKED. This is not a defect. Do not change code to reject sold links; record acceptance before changing the live board. |
| KAN-72 | TEST-27 CL-4 ads blocked e2e | `dealer-web/e2e/cl4-ads-blocked.spec.ts` only reads source files. That is not a live classroom run. Source-scan-only tests are not Finished. |

## Review

Features caught up so the tests already in Review are no longer ahead of them.

| Key | Summary | Evidence or gap |
| --- | --- | --- |
| KAN-11 | Project material: Dealer Ops README | `README.md` exists. It still calls `dealer-core` in progress and Bicep a placeholder. Review, not Finished. |
| KAN-16 | TEST-01 CrossTenantIsolationIT | Feature KAN-48 is Review. Evidence for the feature: `dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantFilter.java`. |
| KAN-21 | TEST-03 SoldLockedIT | Feature KAN-54 is Review. Must not stay ahead of that feature. |
| KAN-22 | TEST-04 VinDuplicateIT | Feature KAN-54 is Review. Must not stay ahead of that feature. |
| KAN-29 | BE-T03 Gateway route YAML | `dealer-gateway/src/main/resources/application.yaml` routes `/api/v1/**` to core and `/internal/v1/**` to AI. |
| KAN-30 | FE-T02 Route table and guards | `dealer-web/src/router/index.ts` (public login, role meta, `beforeEach`). |
| KAN-37 | TEST-09 BlockedSkipsAiIT | Feature KAN-71 is Review. |
| KAN-44 | FE-T06 Admin dealership and staff tabs | `dealer-web/src/views/AdminView.vue` (Dealerships and staff tabs). Test KAN-65. |
| KAN-48 | BE-T08 Tenant filter and JWT security chain | `dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantFilter.java`. Test KAN-16. |
| KAN-49 | FE-T07 DMS list, edit, sell, audit drawer | `dealer-web/src/views/DmsView.vue` (already Review; left in this column). |
| KAN-50 | FE-T08 CRM list, edit, link, and unlink confirm | `dealer-web/src/views/CrmView.vue` (already Review; left in this column). |
| KAN-54 | BE-T12 Vehicle DMS controller | `dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleService.java` throws `VIN_DUP` and `SOLD_LOCKED`. Tests KAN-21 and KAN-22 sit with this feature in Review. |
| KAN-56 | FE-T09 Ad compliance five states and Ready/export latch | `dealer-web/src/views/AdsView.vue` (already Review; left in this column). |
| KAN-65 | TEST-23 AdminView | Feature KAN-44 is Review. |
| KAN-71 | BE-T16 Compliance check and OMVIC; Blocked skips AI | `dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckController.java` `POST /{id}/checks`. Blocked path skips AI in `ComplianceCheckService` (`AiStatus.SKIPPED`, `Recommendation.BLOCKED`). Test KAN-37. |

## Finished

| Key | Summary | Evidence or gap |
| --- | --- | --- |
| KAN-15 | Architecture: one MySQL and nine tables | `dealer-core/src/main/resources/db/migration/V1__init.sql` creates nine tables: `dealer`, `app_user`, `membership`, `vehicle`, `customer`, `customer_vehicle`, `listing`, `compliance_check`, `audit_event`. No open defect on this deliverable. No other key is Finished in this pass. |

## Do not claim

- Azure draft: `dealer-platform/infra/main.bicep` (KAN-19) is not deployed and is not Finished.
- Empty or source-scan-only tests: KAN-72 reads Vue and TypeScript source; it is not a finished product check. No test card is Finished by itself.
- Withdrawn design: `design/archive/01-Scope-and-Acceptance.md` through `design/archive/06-Delivery-and-Test-Plan.md` are not grading criteria (`design/SCOPE-BASELINE.md`).
