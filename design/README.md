# Dealer Ops 课程设计（最简实现）

版本 v6.0 · 2026-09-21

只做课程要交的东西：业务按 [DealerOps-Specification.pdf](DealerOps-Specification.pdf)，技术按 [Non-Negotiable-Project-Requirements.pptx](Non-Negotiable-Project-Requirements.pptx)。不扩范围。

- 后端 Java 21 + Spring Boot，前端 Vue 3。
- 四个独立仓库：web、gateway、core、ai-service。另用一个 platform 仓库放 Bicep/流水线说明。
- 一个 MySQL 库。AI 服务无状态，同步 REST 调用，不用消息队列、不用第二套库。
- AI 不自研：复用你 GitHub 上的助手库（默认 [YUANDONG-YANG/ai-manager](https://github.com/YUANDONG-YANG/ai-manager)），嵌在 ai-service 里。

**编码从 [IMPLEMENTATION-BRIEF.md](IMPLEMENTATION-BRIEF.md) 开始。** 后端设计文档是 [DEVELOPMENT-DESIGN.md](DEVELOPMENT-DESIGN.md)（范围、阶段、不变量）。对外 HTTP/DTO 仍对照 14 + OpenAPI；内部协议/规则细处看 [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md)。拆包看 18 / 19；按仓执行 `AI-CODING-BACKEND`。前端仍对照 13。验收 16、广告夹具 17；范围签字 `SCOPE-BASELINE`。`01`–`06` 仍废止，不要当需求。

## 编码 AI 入口

人认范围仍先看 `SCOPE-BASELINE` 与 BRIEF。

- **后端设计：** [DEVELOPMENT-DESIGN.md](DEVELOPMENT-DESIGN.md)（范围、阶段、不变量）。
- **对外 HTTP/DTO：** [14-Backend-API-Contract.md](14-Backend-API-Contract.md) + [../dealer-platform/openapi.yaml](../dealer-platform/openapi.yaml)。
- **内部协议/规则：** [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md)。
- **拆包：** 18 / 19。任务单 [AI-CODING-BACKEND.md](AI-CODING-BACKEND.md)。
- **前端：** 仍是 [13-Frontend-Engineering.md](13-Frontend-Engineering.md) + [AI-CODING-FRONTEND.md](AI-CODING-FRONTEND.md)。
- **冲突序：** PPT > 规格字段 > DEVELOPMENT-DESIGN / PROTOCOL > 14 / 15 > 任务单。

- [AI-CODING-FRONTEND.md](AI-CODING-FRONTEND.md) — `dealer-web` 任务单 FE-T01–11（壳、守卫、MSAL、六页接线）。
- [AI-CODING-BACKEND.md](AI-CODING-BACKEND.md) — 后端任务单 BE-T01–23（core / Gateway / ai-service）。
- [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) — 内部 JSON、规则细处。
- [AI-CODING-LOCAL-AND-CLOUD.md](AI-CODING-LOCAL-AND-CLOUD.md) — 本机四服务怎么起、端口与云上最小资源名。
- [AI-CODING-TESTS.md](AI-CODING-TESTS.md) — 28 条落测任务（空测骨架；不改契约）。
- [../dealer-platform/openapi.yaml](../dealer-platform/openapi.yaml) — 对外 path/DTO 对照 14；内部示意若冲突，以 PROTOCOL 为准。

## 有效文档

0. [实现手册（编码入口）](IMPLEMENTATION-BRIEF.md)
1. [业务规格 PDF](DealerOps-Specification.pdf)
2. [课程硬要求 PPT](Non-Negotiable-Project-Requirements.pptx)
3. [已批准范围（导师/客户签字）](SCOPE-BASELINE.md) **现行有效** — 一页 In/Out 与六硬项，开工前给导师确认；改范围须再签。
4. [业务与页面](00-Current-Development-Design.md)
5. [架构](07-Azure-Microservices-Architecture.md)
6. [仓库与 Sprint](08-DevOps-and-Implementation.md)
7. [广告 AI（接 GitHub 组件）](09-AI-Agent-Integration.md)
8. [店内助手（同一组件）](10-Web-AI-Assistant.md)
9. [追踪与 Scrum](11-Requirements-Governance-and-Agile.md)
10. [前端 UI 约定](12-Frontend-UI-Conventions.md)
11. [前端工程（拆文件）](13-Frontend-Engineering.md) **现行有效** — 路由、拆文件、页面↔API；前端仍对照本文 + `AI-CODING-FRONTEND`。
12. [后端开发设计](DEVELOPMENT-DESIGN.md) **后端设计文档** — 范围、阶段、不变量。
13. [后端 API 契约（DTO/错误码）](14-Backend-API-Contract.md) **现行有效** — 对外 HTTP、DTO、分页信封、错误码；对照 OpenAPI。
14. [数据 / 鉴权 / 网关裁定](15-Data-Auth-and-Gateway.md) **现行有效** — 表、租户/membership、Gateway、JWT、规则伪代码。
15. [验收与测试](16-Acceptance-and-Test.md) **现行有效** — 32 用例 + 6 课堂脚本，对照 NN-19；不改契约。
16. [广告检查夹具](17-Ad-Check-Fixtures.md) **现行有效** — 22 条广告样例与期望态；课堂优先 FX-01 / FX-03 / FX-10 / FX-11 / FX-12。
17. [后端 core 工程](18-Backend-Core-Engineering.md) **现行有效** — `dealer-core` 拆包参考。
18. [Gateway 与 AI 工程](19-Gateway-and-AI-Engineering.md) **现行有效** — Gateway / ai-service 拆包参考。

`01`–`06` 仍废止，不编码。路径摘要见 `../dealer-platform/API.md`（指向 14，不是废止的 `04`）。

## 必须留下的课硬项

独立微服务 + 独立仓库/流水线、Spring Cloud Gateway、Azure Container Apps + Bicep + CI/CD、Entra OAuth/JWT/RBAC、HTTPS 与 Key Vault、真实 Azure OpenAI 扫广告、看板和三次全员 Review。

## 明确不做

买家端、厂家端、工单、线索漏斗、Service Bus、outbox、第二数据库、第三方自动刊登、支付、Image Studio、自研一套模型 SDK。
