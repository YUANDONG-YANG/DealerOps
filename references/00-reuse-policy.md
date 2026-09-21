# 复用政策：抄交互，不 fork

## 结论

网上能搜到大量经销商 / DMS / CRM 课设。对照本课（Java + Vue 3 + Element Plus + Entra，四仓库，六页面）后：**没有一份能整仓当底座**。  
允许对照页面节奏；禁止把别人的领域模型、登录、买家站或脚手架直接拉进本课仓库。

## 本课边界（编码不得扩大）

| 项 | 本课 |
|----|------|
| 仓库 | `dealer-web` / `dealer-gateway` / `dealer-core` / `ai-service`（外加平台仓） |
| 前端 | Vue 3 + Element Plus + MSAL.js；英文界面 |
| 身份 | Entra JWT + 本地 membership；**不自建密码登录** |
| 角色 | `Platform.Admin`、`Dealer.User` |
| 页面 | Login, Admin, DMS, CRM, Ad compliance, Assistant |
| AI | 进程内复用私有 `ai-manager` JAR，见 [03-ai-manager.md](03-ai-manager.md) |
| 合规 | 自写固定规则 + AI 复核；OMVIC **没有现成检查器可抄**，见 [02-omvic.md](02-omvic.md) |

## 可以抄

- 列表：筛选一行、表格、状态 Tag、操作列文字链、分页约 10 条。
- 表单：抽屉 / Dialog、枚举 Select、出售二次确认。
- 空 / 加载 / 错误三种状态；失败不当空表。
- Admin 店表、库存表的**信息密度**（列少、操作少）。
- Element Plus 官方组件用法（Table、Drawer、Result、Empty）。`vue-element-plus-admin` 只看 Demo，不当脚手架。

## 明确禁止抄

- **买家站 / marketplace / 公开商城**
- **KPI / 图表墙 / 仪表盘首页**
- **线索、漏斗、试驾、工单、服务单**
- **自建用户名密码、本地 JWT、邮箱验证、找回密码**
- **暗色玻璃拟态**、炫酷暗色仪表盘皮肤
- 整仓 fork、通用 CRUD 生成器、Odoo 模块、C++ 控制台、与本课栈无关的 MERN 整包
- 把参考项目的 `com.gateway` / 买家 API / 密码过滤器拷进本课

## 对后续 AI 的硬约束

1. 先读本文件和 `DealerOS-Design` 有效文档，再改代码。
2. 参考仓有额外功能 → 记在 [01-github-repos.md](01-github-repos.md)，**不自动实现**。
3. 字段只按 `00-Current-Development-Design.md`，不因参考仓多字段就加 mileage/颜色/多价格。
4. 不推荐、不执行「以某某 GitHub 仓为 template clone」。
