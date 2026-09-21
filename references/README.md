# DealerOps 参考包（给后续 AI 编码用）

本目录只放调研结论，不放本课业务代码。  
正式范围以设计目录为准：

`D:\常用文件\SAIT\26fall\Capstone\Project Topics\Project Topics\DealerOS-Design`

当前有效：`00-Current-Development-Design.md`、`07`–`12`。`01`–`06` 是历史稿。

**写代码先读实现手册，不要从本目录开工：**  
`D:\常用文件\SAIT\26fall\Capstone\Project Topics\Project Topics\DealerOS-Design\IMPLEMENTATION-BRIEF.md`  
手册留在设计目录，不复制进来。

## 先读谁

| 顺序 | 文件 | 何时读 |
|------|------|--------|
| 1 | [00-reuse-policy.md](00-reuse-policy.md) | 动手前：抄什么、禁什么 |
| 2 | [01-github-repos.md](01-github-repos.md) | 对表、挑交互样例、禁止整仓 fork |
| 3 | [04-uiux-patterns.md](04-uiux-patterns.md) | 写 `dealer-web` 时；以 `12-Frontend-UI-Conventions.md` 为准 |
| 4 | [03-ai-manager.md](03-ai-manager.md) | 写 `ai-service` 时 |
| 5 | [02-omvic.md](02-omvic.md) | 写广告固定规则与文案时；无代码可抄 |

## 编码时怎么用

- 栈固定：**Java + Vue 3 + Element Plus + Entra**。四应用仓：`dealer-web`、`dealer-gateway`、`dealer-core`、`ai-service`（平台仓另存 Bicep/Compose）。不要把任何经销商课设整仓当底座。
- 页面只有：**Login, Admin, DMS, CRM, Ad compliance, Assistant**。不要买家站、KPI 首页。
- GitHub 课设只抄**交互节奏**（表、筛、抽屉、确认）。字段、状态机、隔离、Entra、合规以设计文档为准。
- 本目录若还有克隆源码（如 `carventory/`），只本地打开看交互，不要接入 Compose，不要当脚手架。

## 一句话结论

GitHub 上经销商课设很多，**没有一份能整仓当本课底座**。只抄交互，不抄业务。
