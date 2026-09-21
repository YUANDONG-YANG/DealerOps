# DealerOps 复用与改造记录

更新时间：2026-09-21

本文件用于给后续 AI 编码和组员交接使用。真实需求以外部设计目录为准：

`D:\常用文件\SAIT\26fall\Capstone\Project Topics\Project Topics\DealerOS-Design`

当前有效文档是 `00-Current-Development-Design.md`、`07-Azure-Microservices-Architecture.md`、`08-DevOps-and-Implementation.md`、`09-AI-Agent-Integration.md`、`10-Web-AI-Assistant.md`、`11-Requirements-Governance-and-Agile.md`、`12-Frontend-UI-Conventions.md`。`01`–`06` 是历史稿，不按其范围编码。

## 当前需求基线

- 四个独立应用仓库：`dealer-web`、`dealer-gateway`、`dealer-core`、`ai-service`；`dealer-platform` 保存 Bicep、Compose 和流水线模板。
- `dealer-web`：Vue 3、Element Plus、MSAL.js；一个应用同时承载员工后台和公开车辆页面。
- `dealer-gateway`：Spring Cloud Gateway；浏览器只能访问 Gateway，core 和 ai-service 不对外开放。
- `dealer-core`：Java 21、Spring Boot、JPA、Bean Validation、Flyway、MySQL 8.4；保存全部业务数据。
- `ai-service`：Java 21、Spring Boot；无数据库；进程内复用 `YUANDONG-YANG/ai-manager`，只暴露内部 REST。
- 角色只有 `Platform.Admin` 和 `Dealer.User`。不自建密码；Entra JWT + 本地 membership 决定店铺范围。
- 核心业务：经销商、成员、车辆、客户、客户车辆关联、广告、广告合规检查、审计、店内助手。
- 不做：工单、线索漏斗、买家站、厂家端、支付、合同、第三方广告同步、第二数据库、消息队列、向量数据库、自研模型 SDK。

## 已下载的参考副本

### 1. `references/carventory`

来源：`https://github.com/mohammadumar-dev/carventory`

许可证：仓库包含 MIT License。可以作为代码复用来源，但保留原版权声明，并在真正复制代码时记录来源文件。

最值得参考的路径：

- `apps/backend/src/main/java/com/carventory/entity/`：实体建模思路。
- `apps/backend/src/main/java/com/carventory/dto/`：DTO 和公开/内部响应分离思路。
- `apps/backend/src/main/java/com/carventory/controller/`：车辆、客户、公司、日志 API 组织方式。
- `apps/backend/src/main/java/com/carventory/service/`：业务服务分层。
- `apps/backend/src/main/java/com/carventory/repository/`：Spring Data 查询。
- `apps/backend/src/main/resources/db/migration/`：Flyway 迁移组织方式。
- `apps/frontend/`：员工后台页面的信息组织和库存交互，仅参考交互，不直接迁移 React 代码。

不能直接拿来用的部分：

- PostgreSQL 方言、PostgreSQL 驱动和数据库结构要改为 MySQL 8.4。
- 自建邮箱/密码/JWT 的 `AuthController`、`JwtAuthenticationFilter`、`SecurityConfig` 不得直接采用；改成 Entra JWT 校验和本地 membership。
- React/Ant Design 前端不迁移；当前项目要求 Vue 3 + Element Plus。
- `booking`、`invoice`、`seller`、`buyer`、密码找回、邮件验证、Cloudinary、Marketplace 等超出当前范围的模块不迁移。
- README 声称 production-ready，但仓库当前历史只有少量提交；复制前必须逐项编译和测试，不能把 README 当验收证据。
- `application.properties` 同时使用 Flyway 和 `hibernate.ddl-auto=update`，目标项目应只让 Flyway 管理结构。

结论：Carventory 是 `dealer-core` 的业务代码参考，预计可复用实体/DTO/Service 的组织思路；不作为整仓模板。

### 2. `references/car-dealer-crm`

来源：`https://github.com/TooMuchRuss1a/car-dealer-crm`

技术：Laravel 10、Vue 3、Inertia、PrimeVue、MySQL、Docker。

可参考：

- `laravel/resources/js/Pages/CRM/`：车辆、客户、订单页面的表单和列表交互。
- `laravel/app/Models/`：车辆、客户、照片、供应/订单等领域字段参考。
- `laravel/database/migrations/`：MySQL 车辆和客户数据结构参考。
- `docker-compose.yml`：MySQL + PHP + Node 的本地编排写法。

不迁移：Laravel 后端、Jetstream/Sanctum 登录、订单和供应链业务、全套 Inertia 页面。

许可证注意：仓库的 `composer.json` 标注 MIT，但仓库根目录没有单独审查过的许可证文件；目前只作为参考副本，不把源码复制进正式仓库，除非后续确认许可证覆盖范围和版权要求。

## 需求到复用材料的映射

- Dealer / membership / app_user：优先使用当前 `dealer-core` 的 `V1__init.sql`，参考 Carventory 的 Company/User 分层；必须改为 Entra OID，不存密码。
- Vehicle：当前 SQL 已有大部分需求字段；参考 Carventory 的 Car DTO、过滤和服务方法。注意当前 v6 设计的字段与旧 SQL 不完全一致，编码前先锁定字段，不擅自加入 mileage、颜色或额外价格字段。
- Customer：使用当前 SQL 的四个必填字段；参考 Carventory Buyer/Customer DTO，但不复制身份证件和敏感资料字段。
- Customer-vehicle：保留“一辆车只能关联一个客户”的唯一约束，并在 Service 层验证客户、车辆属于同一 dealer。
- Listing：当前 SQL 可作为起点；按 `content_version` 和检查快照实现过期检查，参考 Carventory 的公开 DTO，不泄露成本、客户和内部备注。
- Compliance：Carventory 没有本项目所需的 OMVIC 固定规则 + ai-manager 流程；必须自行实现规则引擎、AI 状态、旧版本失效、TXT 导出和 15 秒超时。
- Audit：当前 SQL 已有 `audit_event`；参考 Carventory 的 API 日志结构，但审计必须记录 actor、动作、实体、时间和必要字段摘要，不能记录客户联系方式或模型 Key。
- Frontend：只参考 car-dealer-crm 和 Carventory 的列表/表单交互；正式实现使用 Vue 3 + Element Plus，页面按 `12-Frontend-UI-Conventions.md`，不做 KPI 首页和大而全后台。
- AI：不从这两个候选项目复制 AI；按 `09-AI-Agent-Integration.md` 复用已存在的私有 `ai-manager` JAR，并在 `ai-service` 做薄适配器。

## 建议的 AI 开发顺序

每一步完成后再进入下一步，避免一次生成大批不可运行代码：

1. 读取本文件和有效设计文档，确认只实现当前范围。
2. 分别为 `dealer-core`、`dealer-gateway`、`ai-service`、`dealer-web` 建立可独立构建的最小工程。
3. 先锁定 MySQL Flyway schema、枚举、版本字段、外键和索引；不要直接照搬 PostgreSQL SQL。
4. 实现 Entra JWT 验证、角色判断和 dealer scope；先用测试 JWT/stub 做集成测试。
5. 实现车辆、客户、客户车辆关联、审计 API；所有查询从服务器身份推导 dealer_id，不能信任前端店 ID。
6. 实现广告草稿、固定合规规则、检查快照和 stale 保护。
7. 实现 `ai-service` 的 ai-manager 适配器：15 秒超时、失败状态、无假 Pass、CI stub、真实调用单独验证。
8. 实现通过检查后导出 TXT；再实现店内 Assistant 的资源过滤和只读返回。
9. 用 Vue 3 + Element Plus 实现 Login、Admin、DMS、CRM、Ad compliance、Assistant 和公开车辆页。
10. 最后补 Gateway 路由、Docker、Bicep、Key Vault、流水线和验收证据。

## 每次让 AI 编码时必须附带的约束

- 先读本文件和相关有效设计文档，再改代码。
- 不添加当前范围之外的模块；如果参考项目有额外功能，只记录为候选，不自动实现。
- 不复制 React、Laravel、密码登录或 PostgreSQL 方案到正式模块。
- 每个业务查询和写入都必须验证当前用户的 dealer scope；跨店资源返回 404，管理员访问业务 URL 返回 403/404 且不泄露字段。
- 每个状态变化必须有服务端规则、事务边界、版本冲突处理和测试。
- 修改车辆关键字段或广告正文后必须使旧检查失效；AI 失败不能返回 Pass。
- 不把密钥、客户联系方式、住址或真实账号写进代码、日志、种子数据或提交记录。
- 先改代码，再运行与变更对应的最小测试；不要声称未运行的测试已通过。

## 当前状态

- [x] 已下载 Carventory 参考副本。
- [x] 已下载 Vue/MySQL CRM 参考副本。
- [x] 已完成真实设计文档与候选项目的范围对照。
- [ ] 尚未复制任何参考源码到正式模块。
- [ ] 尚未创建四个应用的可构建工程。
- [ ] 尚未验证 JDK 21、Docker、Entra、Azure 或模型 Key。
- [ ] 尚未运行真实 AI 请求和端到端验收。
