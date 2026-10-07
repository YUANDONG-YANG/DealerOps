# 需求文档与当前代码核实 — 2026-09-28

## 提交前修复更新

本次按“检查后提交推送代码”继续完成最小修复：V-01 已在车辆抽屉展示售出日期/价格；V-02 客户历史合并原有 CUSTOMER_VEHICLE 事件，已删除关系可按本店审计证明查询；V-03 从客户完整 linkedVehicles 建立占用集合，只列未关联车辆并显示 VIN；V-04 支持演示用关键词/问句及库存、已售状态过滤，保留最多五条资源，不提供库存总数。另补 CRM 车辆详情跳转、助手只读提示与规则严重性标签。

两项网关旧 CORS 断言已按现有配置更新。CI 去除误用的 -DskipTests，并显式设置测试 JWT_MODE=dev；测试门店补齐已有必填地址。未新增测试框架或测试用例。

推送限制：GitHub 当前 OAuth 凭据没有 workflow 权限，因此 dealer-core.yml 的 CI 命令修正保留在本地，不包含在推送中；远端仍需后续去掉 -DskipTests 并明确测试 JWT_MODE。业务代码与既有测试修正正常提交。

提交前本地验证：core 25/25、gateway 15/15、AI stub 19/19 单测通过，前端类型检查与生产构建通过，CRM 多车占用复查通过，git diff --check 通过。未完成的真实环境验收见最新 ANALYSIS-LOG 条目。以下是修复前核实快照，用于保留问题来源和范围判断，不是当前未修复清单。其他展示/文档差异与真实环境验收仍需按原范围处理。

## 结论与边界

主体方案符合学生毕设的精简方向，不需要新增服务、数据库、消息队列或复杂框架。但当前不能标记为“需求全部实现并验收通过”：有四项业务收尾、两项网关测试失败，以及需求分析中若干未同步的描述。

本次以当前工作区（包含未提交修改）为准，基于 HEAD a3a01ec6f88a6815bfa68b97f653200da6791ad0。已读取 requirements 下原始 PDF 全文、DOCX 简报、analysis/01–07、范围基线，并核对相应服务、Vue 页面、数据库约束和现有测试。旧 review 只作线索，不直接复制为当前待办。本报告核实实现，不修改业务代码、不扩展范围。源码行号对应本次读取时的工作区。

源码支持的结论与实际运行证据分开记录；没有执行真实登录、数据库集成、浏览器端到端或付费模型调用，也没有核验在线 Azure、远程仓库、Scrum 或签字记录。此处核对的是课程内既定广告规则，不是对现行 OMVIC 法规的法律审核。

## 一、应优先收尾的四项业务差异

### V-01：售出后不能在 DMS 页面查看售出日期和价格

- 需求：PDF §3 的 Date car was sold / Price car was sold for；DMS-08、UI-22 要求详情显示全部字段。
- 证据：dealer-core/.../vehicle/VehicleService.java:257 返回 soldOn、soldPrice；dealer-web/src/views/DmsView.vue:139 的 vehicleForm 不保留这两个字段，:353 起的详情模板也不显示；:348 售出后不再显示 Sell 入口。
- 场景：录入销售日期和价格，售出后重新打开车辆，只能看到采购字段与审计，无法复核销售信息。
- 最小处理：在现有车辆抽屉增加两个只读销售字段。无需新增页面、报表或销售模块。
- 证据等级：源码确认；未执行浏览器复现。

### V-02：关联/解绑记录未进入客户详情的可见历史，解绑历史接口还会返回 404

- 需求：PDF §6、CRM-11、AUD-02/06，修改记录应保留为该记录的变更历史。
- 证据：CustomerService.java:140、:169 把 LINK/UNLINK 写成 CUSTOMER_VEHICLE，entityId 为关系行 id；CrmView.vue:143 只查询 CUSTOMER 历史。AuditService.java:88 按实体类型/id 精确查询；:99 要求关系行仍存在，但 CustomerService.java:168 已在解绑时删除该行。
- 场景：客户关联或解绑车辆后，详情 Audit 不出现该操作；按已删除关系 id 查询也取不到历史。数据库有审计行，不等于用户能查看历史。
- 最小处理：让 LINK/UNLINK 同时成为客户自身的审计历史，或在现有客户历史查询中合并关系事件并保留租户校验。不需要独立 Audit 页面或新的审计系统。
- 证据等级：写入、删除、查询、页面调用链均已核实；未跑数据库集成。

### V-03：多车客户会导致已占用车辆被误列为可关联

- 需求：CRM-06、UI-33，选择器应排除已关联车辆。
- 证据：CustomerService.java:178 只把最近一辆车放入客户列表的 linkedVehicle；CrmView.vue:177–188 只用这一辆车建立其他客户的占用表；:200–205 构造候选，:406 依据占用表禁用。
- 场景：客户 A 依次关联 V1、V2；打开客户 B 的选择器，V2 被识别为已占用，V1 却仍可选。提交后后端 CustomerService.java:132 仍会返回 VEHICLE_ALREADY_LINKED，因此不会造成一车多客户落库。
- 最小处理：选择器获取完整的已关联车辆集合；可以利用现有客户详情 linkedVehicles，不必引入新基础设施。VIN 搜索也应显示 VIN，目前标签只有年份/品牌/型号。
- 证据等级：源码确认，并提取当前 loadLinkedOwners 函数进行最小执行：输入列表仅返回最近车辆 102 时，vehicle101Taken=false、vehicle102Taken=true。输入形状来自当前 CustomerService；这是函数级复现，不是浏览器端到端测试。

### V-04：助手把整句问题当成数据库关键字，示例问句无法找到现有车辆

- 需求：AI-03；design/10-Web-AI-Assistant.md:9 示例“Which Toyota vehicles are in stock here”。
- 证据：AssistantResourceQuery.java:43 把完整 text 当 q；:47、:62 原样传入 search。VehicleRepository.java:22–25 在 VIN/make/model 上匹配整个 q，CustomerRepository.java:18–21 也匹配整个 q；结果最多五条。没有库存/客户总数查询。
- 场景：库里有 Toyota，输入 Toyota 可以匹配，输入完整问句通常无匹配，AI 收到空资源列表。现有 AssistantAskIT.java:44–46 只断言卡片数不超过 5，空列表也能通过。
- 最小处理：支持演示所需的少量固定问法或简单关键词/状态提取即可，不需要向量库、RAG 框架或多轮引擎。总数问答目前未实现，不能把五条卡片数量当库存总量。
- 证据等级：检索链路源码确认；未调用真实模型。

## 二、需求分析需要同步的描述，不应照单扩充功能

1. **字段格式约束写得比当前范围更严。** 02/03 写有 VIN 17 位、年份范围、邮箱/电话格式、日期先后、金额边界等；Create/PatchVehicleRequest 主要是必填和长度，客户 DTO 主要是必填和长度。实际长度也不同：make/model 80、VIN 32、客户姓名/email 160、电话 40。08 的当前裁定明确 A6 延期。建议把 02/03 的这些推导校验标为延期，并列明现状；不要为消除文档差异恢复整套严格校验。必填字段本身已实现，售出正价也已校验。

2. **Admin 编辑门店是文档冲突。** 06 UI-11 写 create/edit；后端 GET/PATCH 已有，但 design/13:152 明确课堂 UI 不提供 Edit，admin.ts:42 与 AdminView 也只提供创建。按当前精简界面同步文字即可，不能把它误报为 PDF 核心功能缺失。

3. **详情、列表和跳转只部分达到 06 的描述。** DMS 缺关联客户、广告状态，列表缺 date added；CRM 列表展示最近关联车辆而不是购买数量，详情只展示车辆描述，没有 VIN、跳转入口，库存状态也未单独展示。对应 DMS-08、CRM-04/10、UI-20/22/30/32。V-01 的销售字段优先；其余应按演示需求补小展示或明确现有验收边界，不能写成全部满足。

4. **广告页面有检查结果，但展示要求未全部落地。** UI-41 要求展示车辆 condition 和门店公共联系信息，当前 AdsView/AdWorkspace 没有对应信息区；后端检查确实读取这些数据。UI-43 要求区分规则结果，AdWorkspace.vue:98 只展示 message，未展示 ruleId/severity，因此用户不能直接区分 BLOCK 与 REVIEW。最小改动可只补已有数据展示和严重性标签，不添加检查问卷或审批流程。

5. **助手能力和提示文字需要准确。** 05 AI-03 提到库存/客户数量，但当前检索没有聚合；UI-51 的“只读、不修改数据”提示也未出现在 AssistantView。真实只读链路存在，不能据此声称数量问答也已完成。

6. **审计/AI 输出形式没有完全按分析文档实现。** AUD-04 写 before/after，但当前只保存变化字段名与布尔标记；这满足基本 who/what/when，并避免联系信息入审计，不建议为毕设新增完整差异快照。AI-05 写 code/severity/explanation，但适配器当前返回 message notes；结构化规则 ruleId/severity 来自固定规则引擎。应区分规则结果与 AI 提示。

7. **原始 PDF §8 的生产讨论不应自动升级为必做。** 独立域名、备份策略、可配置规则、专用免责声明不是原始字段清单的同等级业务功能。当前源码实际上已有一行免责声明（AdWorkspace.vue:87），所以“没有免责声明”的旧 review 已过时；仍不需要新建免责声明页面。

这些差异都没有在本轮被悄悄改写为“通过”。本报告只给出核实结果和最小处理方向。

## 三、已在当前源码确认的主要需求

- **Roles / multi-tenancy (AUTH-01–14 core flows)**: TenantFilter looks up the active membership by JWT identity and does not use a client-supplied dealerId; the binding is re-checked on every request; Admin is rejected on business paths, and Dealer.User cannot call admin paths; JwtRoleMapper treats a dual-role user as Admin first, which does not grant dealer business permissions. TenantGuard, dealerId-scoped queries, and the Hibernate filter together provide isolation. Real sign-in under the earlier external sign-in plan and cross-dealer integration still need live acceptance.
- **DMS（DMS-01/02/03/05/06/07/09–15）**：字段存在；必填 DTO、每店 VIN 唯一索引、搜索分页、sale pair/正价、重复售出拒绝、采购字段锁、version 检查、审计、condition 使广告版本失效均有实现。严格格式校验不计入已完成，详情展示见 V-01。
- **CRM（CRM-01/02/03/05/07/08/09/11/12）**：四项必填；创建编辑搜索；同店库存/已售车都可关联；一车一客户唯一索引；已售不可解绑；跨店 id 不存在；联系字段不作为审计值。关联选择器和可见历史见 V-02/03。
- **广告（AD-01–13 的核心后端流程）**：一车一稿唯一约束；CASH 含 APR/PAYMENT 进入融资规则；LEASE 独立分支；20,000 km 边界；硬规则跳过 AI；成功保留软提示与 AI notes；失败保存 UNAVAILABLE 并返回 AI_UNAVAILABLE；检查保存开始时评估的内容版本；Ready/TXT 校验当前 pass 与版本。文本导出读取公共车辆/门店数据，不主动附加客户资料或采购成本。前端清单为展示用途，按 kind/medium 切换。
- **Basic audit properties (AUD-01/02/03/05/07)**: create/edit/sale/link operations write events with actorUsername/action/createdAt, and business service transactions include the audit write; there is no external audit edit/delete API. Visible history is not fully complete; see V-02.
- **六页面与架构（UI 页面列表、ARC-01/02/05/06）**：六个 Vue 路由存在，角色守卫存在；一个 core 业务数据库，九表；公开 API 为 /api/v1，错误体含 code/message，可带 fieldErrors。
- **Implemented parts of JWT/AI/privacy (SEC-01/02/05/07, AI-01/02/04)**: login and token acquisition through the earlier sign-in SDK, and issuer/audience/expiry validation paths for the earlier external sign-in plan, exist; the AI adapters call the GitHub component API; ad requests build only public vehicle/dealership DTOs, and assistant resource cards contain no customer contact fields or purchase cost. Live evidence for the model key, real responses, deployment isolation, and HTTPS/Key Vault is not automatically proven by the presence of source code.
- **延期/排除项**：不恢复 leads、work orders、Image Studio、外部发布、复杂规则配置、额外车辆字段、配额/限流或完整生产级审计。修改其他车辆/门店字段触发更多失效仍是延期 A5。

## 四、本轮执行的验证

- dealer-web：npm run build 成功，包含 vue-tsc --noEmit 和 Vite 构建。大 bundle 只是警告，不作为本轮毕设缺陷。该构建不运行 __tests__；tsconfig 明确排除该目录。
- dealer-core：mvn -o -Dmaven.repo.local=C:/Users/Administrator/.m2/repository test，25 项通过，0 失败、0 错误。
- dealer-gateway：同样离线命令，15 项中 2 失败、0 错误。失败为 CorsHeadersTest.corsOriginIsEnvNotLocalhostOnly（:19）与 GatewayNotPublicTest.yamlRoutesInternalHeaderAndOmitsInternalFromCors（:23）。它们仍检查已删除的 YAML CORS 配置；当前策略已集中在 CorsConfig.java:26–33。需调整这两项现有测试，不能为让测试通过重新加回重复配置。属于真实 CI 障碍，不证明实际 CORS 功能坏了。
- ai-service：mvn -o -e -Dmaven.repo.local=C:/Users/Administrator/.m2/repository -Pstub,!aimanager -Daimanager.stub=true test，19 项通过，0 失败、0 错误。第一次编译在本地 snakeyaml JAR 路径报错，诊断重试完成编译和测试；未据首次环境错误认定代码缺陷。stub 不调用真实模型，不能用该结果证明真实 AI 已验收。
- CRM 多车占用函数：按 V-03 执行最小复现，确认较早关联车辆被漏掉。
- 未运行 Testcontainers 集成测试：当前工具环境找不到 docker 命令。core 的 test 阶段本来就排除 *IT/it 分组。不得将 25 项单测通过写成完整业务验收通过。
- 前端现有 spec 使用 vitest，但 package.json 没有 test script 或 vitest 依赖；CL-4/CL-5 文件仅扫描源码，不是真浏览器/真 AI 验收。本轮没有为了核实而引入新测试框架。

## 五、交付证据仍需独立确认

1. .github/workflows/dealer-core.yml:39 的集成步骤使用 mvn verify -DskipTests，会跳过测试；不能用此步骤名称声称数据库集成已执行。应使用现有 Failsafe 正常运行方式并确认报告，不需要扩充测试框架。
2. dealer-platform/infra/main.bicep:2 明确是未从本仓库部署的模板。私有 core/AI ingress、HTTPS、Key Vault 引用和 MySQL 备份设置均有定义，但实际 Azure 状态本轮未核实。
3. Compose 默认 AI 构建使用 stub；ChainableRequest.send 始终返回 stubFailure。真实 AI 验收必须使用真实组件构建及有效配置。只填 key 不能让 stub 变成真实模型。
4. Four module directories and four workflows do not mean four remote repositories have been delivered; real external sign-in configuration, remote repos/pipelines, Scrum materials, Review, and customer/instructor confirmation all need actual evidence. This pass does not mark them complete on their behalf.

## 建议的最小收尾顺序

先补售出信息展示、关联审计可见性、选择器占用遗漏、助手演示问法；同步以上文档过度承诺并修正两项现有网关测试。随后沿用现有 AT-01/03/12/13/17/19 最小课堂脚本，再复查 V-01–04 场景及 AT-25/26。无需借此重构项目，也不应把本报告变成企业级功能清单。
