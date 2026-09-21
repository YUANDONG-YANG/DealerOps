# 前端 UI 约定（抄交互，不抄业务）

版本 v6.1 · 2026-09-21

不要 fork 任何经销商整仓。那些项目多半带买家站、看板、线索、工单。本课只用 Vue 3 + **Element Plus**，英文界面，6 个页面。字段只按 [00](00-Current-Development-Design.md)。

## 1. 全局

- Login：居中单卡，无侧栏。一颗 `Sign in with Microsoft`（Entra），不要用户名密码。
- 其余页：左侧菜单 + 顶栏（店名或 `Platform Admin`、角色、`Sign out`）。
- Admin 只见 Admin；店员只见 DMS / CRM / Ad compliance / Assistant。无权限路由直接拦。
- 登录后落地：管理员 → Admin；店员 → DMS。不要 KPI 首页。
- 主按钮在右上；出售/解绑二次确认。
- 每页必须有加载、空、错三种状态。失败不当空表；AI 失败不能显示 Pass。

## 2. 表格列（够演示即可）

- Admin 店：Name, Contact, Staff count, Actions
- Admin 成员：Entra ID / email, Dealership, Status, Actions
- DMS：Year Make Model, VIN, Source, Condition, Cost, Status, Actions
- CRM：Name, Email, Phone, Linked vehicle, Actions
- Ad：Vehicle, Type, Medium, Check status, Actions

状态用 Tag。操作列最多 3 个文字链。每页 10 条。已售行变淡，采购字段只读。

## 3. 筛选

一行：搜索 + 1–3 个下拉 + Search + Reset。不要价格滑条、燃油、地图。

- DMS：VIN/Make/Model；Status；Condition
- CRM：Name/Email/Phone；是否已挂车
- Admin：店名 / 员工邮箱

## 4. 表单

新增编辑用抽屉或 Dialog。枚举用 Select。出售单独小窗：Sold date + Sold price 成对必填。CRM 挂车用可搜索 Select，只列本店未挂未售车；已占车辆禁用。

## 5. Ad compliance（最出彩的一页）

左表单、右结果。清单按广告类型即时变化。总状态只允许：Blocked / Needs AI review / Passed / Stale / AI unavailable。仅 Passed 且非 Stale 才能 Export TXT。

## 6. Assistant

一问一答 + 最多 5 张本店资源卡，点进去普通页面。卡上不出现电话/邮箱/住址。模型挂了仍显示检索列表，并写 `Smart summary unavailable`。

## 7. 建议打开看（只看交互）

1. [hyundai_dms Dealers](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Dealers.jsx)
2. [hyundai_dms Cars](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Cars.jsx)
3. [Car-Mart EntityPage](https://github.com/saadshd/Car-Mart-Frontend/blob/main/src/components/crud/EntityPage.tsx)
4. [carventory](https://github.com/mohammadumar-dev/carventory) 只看员工后台，不看 marketplace
5. [vue-element-plus-admin Demo](https://element-plus-admin.cn/)（不要整仓当脚手架）
6. [Element Plus Result / Table / Empty](https://element-plus.org/en-US/component/result)
7. [MEVN-MyCar 视频](https://vimeo.com/500102464)

不要抄：买家站、图表墙、线索/试驾/工单、暗色玻璃拟态、通用 CRUD 生成器。
