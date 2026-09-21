# GitHub 仓库对照

**结论：只抄交互，不 fork。** 下表给编码时打开链接用。

## 库存 / CRM（优先对照）

| 仓库 | 能抄什么 | 不能抄什么 | 链接 |
|------|----------|------------|------|
| hyundai_dms | Admin 店表、车辆表的列密度与操作节奏（Dealers / Cars） | Firebase/React 整仓、买家或品牌课设业务、自建账号 | [Navpreet0981/hyundai_dms](https://github.com/Navpreet0981/hyundai_dms) · [Dealers.jsx](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Dealers.jsx) · [Cars.jsx](https://github.com/Navpreet0981/hyundai_dms/blob/master/dms_app/src/pages/admin/Cars.jsx) |
| carventory | 员工后台库存列表/筛选密度；Java 分层**只作阅读**（实体/DTO/Service 怎么拆），不迁库 | marketplace 买家站；自建密码 JWT；PostgreSQL+Flyway 混 `ddl-auto`；booking/invoice；React 迁 Vue | [mohammadumar-dev/carventory](https://github.com/mohammadumar-dev/carventory) |
| dealership-management-system | 经销商后台「店 + 车 + 客户」菜单切分的直觉 | 整仓业务、与本课不符的栈与字段 | [alamariful1727/dealership-management-system](https://github.com/alamariful1727/dealership-management-system) |
| dealership-sales | 销售列表里车/客户并排看的节奏 | 销售漏斗、提成、报表当首页 | [emanuelmachado1983/dealership-sales](https://github.com/emanuelmachado1983/dealership-sales) |
| Car-Mart-Frontend | `EntityPage` 一类「筛 + 表 + 弹窗 CRUD」骨架 | 通用 CRUD 生成器当产品；自建登录 | [saadshd/Car-Mart-Frontend](https://github.com/saadshd/Car-Mart-Frontend) · [EntityPage.tsx](https://github.com/saadshd/Car-Mart-Frontend/blob/main/src/components/crud/EntityPage.tsx) |
| MEVN-MyCar | 列表/表单节奏；有[演示视频](https://vimeo.com/500102464)可扫一眼 | MEVN 整仓、Mongo 模型、与课设无关模块 | [SebastianPintos/MEVN-MyCar](https://github.com/SebastianPintos/MEVN-MyCar) |
| ism-motors-dealership-dashboard | 后台表格页信息密度（若仍为浅色表格式） | **暗色玻璃拟态 / KPI 墙**；当脚手架 | [RafaellsAlmeida/ism-motors-dealership-dashboard](https://github.com/RafaellsAlmeida/ism-motors-dealership-dashboard) |

本地若已克隆 `carventory/`：只打开员工后台看交互，**不要**看/迁 `apps/marketplace`。

## 其他检索过、不采用（一句话）

| 类型 / 代表 | 为何不采用 |
|-------------|------------|
| 各类 **MERN** 经销商全栈课设 | 栈不符；常绑买家站、线索、本地 JWT。交互已有上表覆盖。 |
| **C++** 控制台/桌面经销商作业 | 无 Web 交互可抄，领域模型也不能当本课 schema。 |
| **Odoo** Automotive / Fleet / CRM 模块 | ERP 全家桶，无法当四微服务课底座；许可与定制成本也不适合课设。 |
| Laravel **car-dealer-crm** 一类（本机或曾克隆） | Vue 列表可瞄一眼；后端 Laravel/Sanctum/订单供应链不迁；许可证未逐文件核完则不粘贴源码。 |
| `vue-element-plus-admin` 等后台模板 | [Demo](https://element-plus-admin.cn/) 可看布局；**不要整仓当脚手架**（菜单/权限/暗色主题会膨胀范围）。 |
| Element Plus 文档 | 组件用法可以抄：[Result / Table / Empty](https://element-plus.org/en-US/component/result) |

## 编码时打开顺序（只看交互）

1. hyundai_dms `Dealers.jsx`、`Cars.jsx`
2. Car-Mart `EntityPage.tsx`
3. carventory **员工后台**（不看 marketplace）
4. Element Plus 官方 Table / Drawer / Result / Empty
5. 需要动效参考时再看 MEVN-MyCar 视频

然后用 Element Plus **重写**六页，不要移植 JSX/React/Laravel。
