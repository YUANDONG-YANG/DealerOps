# Dealer Ops 编码工作区

编码前骨架。另一份 AI 开工请先读设计目录里的实现手册：

`d:\常用文件\SAIT\26fall\Capstone\Project Topics\Project Topics\DealerOS-Design\IMPLEMENTATION-BRIEF.md`

设计原文在 `Project Topics/DealerOS-Design/`。这里按五个独立目录准备，以后各自建 GitHub 仓库，不要合成一个 monorepo。

```text
DealerOps/
  dealer-web/         Vue 3
  dealer-gateway/     Spring Cloud Gateway
  dealer-core/        业务 API + Flyway
  ai-service/         接 ai-manager
  dealer-platform/    本地 compose、Bicep、流水线样板、环境变量
  PREP-CHECKLIST.md   你必须补齐的事项
```

本机已确认：Node 20、Maven 3.6、Git、gh 已登录 YUANDONG-YANG。  
**还没有：** JDK 17/21（当前是 JDK 11）、Docker、Azure/Entra/模型 Key。详见 `PREP-CHECKLIST.md`。

还没写业务代码。JDK 装好后，各 Java 目录可 `mvn -q -DskipTests package` 做空构建。

## 参考项目与改造记录

GitHub 参考副本位于 `references/`，只用于调研和挑选代码思路，不直接作为运行模块。真实需求、可复用范围、许可证注意事项和后续 AI 开发顺序见 [`REUSE-PLAN.md`](REUSE-PLAN.md)。
