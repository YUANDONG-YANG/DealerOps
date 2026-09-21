# 前端可抄交互（精炼自 12）

权威原文：`DealerOS-Design/12-Frontend-UI-Conventions.md`（v6.1）。**不要发明新页面。**  
本课只有：**Login, Admin, DMS, CRM, Ad compliance, Assistant**。

栈：Vue 3 + **Element Plus**，英文界面。字段只按 `00-Current-Development-Design.md`。

## 全局

- **Login**：居中单卡，无侧栏。一颗 `Sign in with Microsoft`（Entra）。不要用户名密码。
- **其余页**：左侧菜单 + 顶栏（店名或 `Platform Admin`、角色、`Sign out`）。
- Admin 只见 Admin；店员只见 DMS / CRM / Ad compliance / Assistant。无权限路由直接拦。
- 登录落地：管理员 → Admin；店员 → DMS。**不要 KPI 首页。**
- 主按钮在右上；出售 / 解绑二次确认。
- 每页必须有加载、空、错。失败不当空表；AI 失败不能显示 Pass。

## 分页面

### Login

居中卡片 + Microsoft 按钮。无侧栏、无注册、无忘记密码。

### Admin

- 店表列：Name, Contact, Staff count, Actions
- 成员列：Entra ID / email, Dealership, Status, Actions
- 筛选：店名 / 员工邮箱（一行：搜索 + 下拉 + Search + Reset）

可对密度：hyundai_dms Dealers。

### DMS

- 列：Year Make Model, VIN, Source, Condition, Cost, Status, Actions
- 筛选：VIN/Make/Model；Status；Condition
- 已售行变淡；采购字段只读
- 出售单独小窗：Sold date + Sold price **成对必填**
- 新增编辑：抽屉或 Dialog；枚举用 Select

可对密度：hyundai_dms Cars、carventory 员工后台（不看 marketplace）。

### CRM

- 列：Name, Email, Phone, Linked vehicle, Actions
- 筛选：Name/Email/Phone；是否已挂车
- 挂车：可搜索 Select，只列本店未挂未售车；已占车辆禁用

不要线索 / 工单 / 试驾漏斗。

### Ad compliance（最出彩）

- 左表单、右结果。清单随广告类型即时变。
- 总状态只允许：Blocked / Needs AI review / Passed / Stale / AI unavailable
- 仅 Passed 且非 Stale 才能 Export TXT

无 GitHub 刊登检查器可抄；规则见 [02-omvic.md](02-omvic.md)。

### Assistant

- 一问一答 + 最多 5 张本店资源卡，点进普通页面（DMS/CRM/Ad）
- 卡上不出现电话 / 邮箱 / 住址
- 模型挂了仍显示检索列表，并写 `Smart summary unavailable`

## 表格 / 筛选 / 表单（各页共用）

- 状态用 Tag；操作列最多 3 个文字链；每页 10 条
- 筛选一行：搜索 + 1–3 个下拉 + Search + Reset。不要价格滑条、燃油、地图
- 枚举 Select；不要通用 CRUD 生成器

## 建议打开（只看交互）

1. [hyundai_dms Dealers](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Dealers.jsx)
2. [hyundai_dms Cars](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Cars.jsx)
3. [Car-Mart EntityPage](https://github.com/saadshd/Car-Mart-Frontend/blob/main/src/components/crud/EntityPage.tsx)
4. [carventory](https://github.com/mohammadumar-dev/carventory) 只看员工后台
5. [vue-element-plus-admin Demo](https://element-plus-admin.cn/)（不当脚手架）
6. [Element Plus Result / Table / Empty](https://element-plus.org/en-US/component/result)
7. [MEVN-MyCar 视频](https://vimeo.com/500102464)

## 禁止抄进 UI

买家站、KPI/图表墙、线索/试驾/工单、自建密码登录、暗色玻璃拟态、通用 CRUD 生成器。
