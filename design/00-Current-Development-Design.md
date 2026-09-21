# Dealer Ops 业务（最简）

版本 v6.0 · 2026-09-21

范围只来自 [DealerOps-Specification.pdf](DealerOps-Specification.pdf)。技术见 07/08/09/11。

规格要三个模块写同一家店的数据：DMS、CRM、Ad Compliance。本版用一个 `dealer_core` 库满足，不做成三个互不相通的系统。登录按课程要求用 Entra，不自建密码表；管理员「发账号」= 把 Entra 用户绑到某家店。

## 页面与角色

| 页面 | 谁用 | 做什么 |
|---|---|---|
| Login | 全员 | Entra 登录 |
| Admin | Platform.Admin | 开店、绑定/解绑员工。看不到任何车辆/客户/广告 |
| DMS | Dealer.User | 本店车辆增改查、登记出售 |
| CRM | Dealer.User | 本店客户增改查、关联本店车辆 |
| Ad compliance | Dealer.User | 选车写广告、跑 OMVIC 清单 + GitHub AI 组件、通过后导出文本 |
| Assistant | Dealer.User | 本店问答；调用同一 GitHub 组件，不能改数据 |

一家店多名员工看同一份数据。店 A 看不到店 B。管理员开完店也看不到业务数据。

## 字段（按规格，不加减）

DMS 必填：Make、Model、Year、VIN、Car source（TRADE_IN / AUCTION / PRIVATE_PURCHASE / OTHER）、Purchase cost、Date added、Condition（CERTIFIED / AS_IS / UNFIT / IRREPARABLE）。  
可选：Repair cost、Carfax URL、Sold date、Sold price。  
店内 VIN 唯一。已售后采购信息不可改。出售日期和价格必须一起填。

CRM 必填：Name、Email、Phone、Home address。购车从本店 DMS 选车；一车只能挂一个客户。

广告：标题、正文、类型 CASH / FINANCE / LEASE、媒介 ONLINE 或 RADIO_TV_BILLBOARD。  
始终查：店名和联系方式、既往用途（如适用）、新旧/年份、延保（如有）、价格、车况。  
FINANCE 另查 APR、期限、现金价。RADIO_TV_BILLBOARD 免「和利率并列展示」。  
LEASE 另查租赁声明、租期、租金、APR、首付；年额度低于 20000 km 要超额公里费。

改车辆价格/车况或广告正文后，旧检查作废。AI 失败不能显示通过。通过后才能导出 TXT。不对接外部广告站。

DMS/CRM 每次改动记：谁、做什么、何时。

## 验收（课堂能演示即可）

1. 管理员开两家店、各绑一人。
2. 店 A 录车、录客户、把车挂到客户上；店 B 看不见。
3. 管理员打车辆接口被拒绝。
4. 缺价或融资广告缺 APR 被挡住。
5. 真实广告文本走一次真实 AI，能指出缺失项。
6. 改价后不能用旧检查导出。

不做：工单、线索、统计看板、CSV 导入、买家站。助手只复用 GitHub 组件，不另写模型层。
