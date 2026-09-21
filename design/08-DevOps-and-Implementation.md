# 仓库、流水线、分工（最简）

版本 v6.0 · 2026-09-21

## 仓库

```text
dealer-web        Vue + Dockerfile + 自己的 pipeline
dealer-gateway    Spring Cloud Gateway + Dockerfile + pipeline
dealer-core       Spring Boot + Flyway + Dockerfile + pipeline
ai-service        Spring Boot + Dockerfile + pipeline
dealer-platform   Bicep + 各 pipeline YAML 说明 + 证据
```

改谁只构建谁。不要 monorepo。契约字段写在 core/ai-service 各自 DTO 里，不另开 contracts 仓库。

## 流水线（每应用一套）

PR：Java 编译 + 关键 JUnit，或 Vue build。  
main：打镜像（tag=commit SHA）→ 推 ACR → 如需要跑 Flyway Job → 发布该应用。  
demo 发布要另一人点批准。禁止手工点门户发布应用。

## 三人

- A：Vue 页面（Admin/DMS/CRM/广告）、登录、web 流水线。
- B：ai-service、接入 GitHub AI 库、OMVIC 清单、Bicep 初稿、ai 流水线。流水线要能读该私有包。
- C：core、租户隔离、Gateway、Entra、core 流水线。

## Sprint（对准课程三次 Review）

1. **Sprint 1**：四个空仓库能独立构建；架构图；Entra 两个角色配上。
2. **Sprint 2**：Azure 上登录 → Gateway → 录一辆车 → **真实 AI** 扫一段广告。安全：无明文密钥。
3. **Sprint 3**：两家店隔离、CRM 关联、清单三类广告、导出、审计。冻结功能。

课后每人写 1–2 段进度。Review 三人各讲一块。细节模板见 11。
