> 已废止的 v1.0 历史稿，不据此编码。请从 [当前文档索引](README.md) 阅读 00 业务设计与 07/08/09 微服务、DevOps、AI 组件设计。原始需求已找到并核实，不包含厂家或买家自助端。

# 接口约定

这是编码前 REST 契约草案，后续生成 OpenAPI 时沿用这里的字段和错误语义，不在本阶段维护一份可能漂移的第二套 YAML。

## 通用规则

前缀 /api/v1。路径 ID、JSON ID 为字符串；金额为两位小数字符串；时间 ISO-8601 UTC；JSON 使用 camelCase。数据库字段映射见数据字典。

成功单对象直接返回 DTO；列表返回 {items,page,size,total}，page 从 0 开始。POST 创建返回 201；动作成功 200；退出 204。错误统一如下：

```json
{"code":"CHECK_STALE","message":"The advertisement changed. Run checks again.","fieldErrors":{},"requestId":"server-generated-id"}
```

400：格式或字段校验错误；401：未登录；403：权限不足/CSRF 失败；404：无此对象；409：状态/版本/唯一约束冲突；429：限流；500：非预期服务错误。不要将 SQL、堆栈和 AI 原始错误暴露给用户。

所有 PATCH 用白名单 DTO，不接受任意实体属性。员工不能通过修改 role、publishedBy、stage=WON 或 vehicle.status=SOLD 绕过动作接口。公开与内部 DTO 分开。

下面 M 表示 Manager，S 表示 Staff 或 Manager，P 表示公开。写接口除公开咨询外均要求 CSRF；登录也使用 CSRF。public enquiries 不依赖会话，采用限流及服务端校验。

## 认证

- GET /auth/csrf · P → {token,headerName}。响应禁止缓存。
- POST /auth/login · P，{email,password} → {id,displayName,role} 和 session cookie；失败通用 401。
- GET /auth/me · S → 当前用户；无 session 为 401。
- POST /auth/logout · S → 204，使 session 失效。
- GET /users/options · S → 活跃用户的 {id,displayName,role} 列表，用于工单与线索分配，不返回邮箱/密码哈希。

## 库存与工单

- GET /vehicles?query=&status=&page=0&size=20 · S → 车辆摘要列表；默认创建时间倒序。
- POST /vehicles · S，{stockNo,vin,make,model,modelYear,mileageKm,color,basePrice,mandatoryFeeTotal,photoKey,internalNote} → 车辆详情，事务内建立空广告。photoKey 只能选择后端允许的预置图；未知 key 拒绝。
- GET /vehicles/{id} · S → 车辆字段、advertisedPrice、version、listingId、listingStatus、contentVersion。
- PATCH /vehicles/{id} · S，{version,允许修改的车辆字段} → 更新详情。VIN/stockNo 允许未售时修正，仍受唯一约束；status 禁止直接编辑。
- POST /vehicles/{id}/mark-available · M，{version,readyNote} → 车辆；活动工单返回 OPEN_WORK_ORDERS。
- POST /vehicles/{id}/return-to-preparation · M，{version,reason} → 车辆并下架；reason 写审计。
- POST /vehicles/{id}/archive · M，{version,reason} → 归档；未结束工单或线索返回 ACTIVE_DEPENDENCIES。
- GET /work-orders?vehicleId=&status=&assignedTo=&page=0 · S → 工单列表。
- POST /vehicles/{id}/work-orders · S，{title,description,assignedTo,dueDate} → OPEN 工单；非 PREPARING 返回 VEHICLE_NOT_PREPARING。
- PATCH /work-orders/{id} · S，{version,title?,description?,assignedTo?,dueDate?,actualCost?} → 工单；终态不可改。
- POST /work-orders/{id}/transition · S，{version,toStatus,completionNote?} → 工单；DONE 要求 completionNote。

每个工单响应含 vehicleId、vehicleStockNo、version 和数据字典字段。终态车辆不能新增工单或修改业务数据。

## 广告与检查

- GET /vehicles/{id}/listing · S → {id,vehicleId,title,description,scopeConfirmed,status,contentVersion,version,preview,latestCheck,publication}。
- PATCH /listings/{id} · S，{version,title,description,scopeConfirmed} → 更新广告；保存会使相关审核失效，必要时下架。
- POST /listings/{id}/checks · S，{contentVersion} → 201 检查结果；等待上限 15 秒 AI 请求加本地处理，客户端设 20 秒超时。版本已不一致则 409；运行中发生修改则结果 stale=true。
- GET /listings/{id}/checks?page=0 · S → 检查历史列表，不含其他广告记录。
- POST /listings/{id}/publish · M，{version,contentVersion,checkId,acknowledgedFindingIds,acknowledgeAiUnavailable,reviewNote} → 当前广告状态。没有提示且 AI SUCCESS 时允许 reviewNote 为空；有提示或降级时必须填写。
- POST /listings/{id}/unpublish · M，{version,reason} → DRAFT；只接受当前 PUBLISHED。

检查响应示例（规则编号定义见第 5 份文档）：

```json
{
  "id":"41","listingId":"12","contentVersion":3,"stale":false,
  "ruleVersion":"demo-1","ruleStatus":"BLOCKED",
  "findings":[{"id":"R04","ruleId":"R04","severity":"BLOCK","field":"renderedPrice","message":"Advertised price does not match the calculated total."}],
  "aiStatus":"UNAVAILABLE","aiFindings":[],"durationMs":15000
}
```

没有 BLOCK 时 ruleStatus=NO_BLOCKERS，这不是全面合规认证。AI finding id 由服务器为该 check 生成。发布必须确认该次 check 所有 REVIEW finding id；AI 不可用必须显式确认。MOCK 检查不允许在真实演示/生产配置发布；本地 demo profile 可发布但公开页显示 Demo review 标记。

## CRM

- GET /customers?query=&page=0 · S → {id,name,email,phone,version} 分页列表，用于已有客户选择。
- PATCH /customers/{id} · S，{version,name,email,phone} → 客户，至少一种联系方式。
- GET /leads?vehicleId=&stage=&ownerId=&overdue=&page=0 · S → 线索摘要列表。
- POST /leads · S，{vehicleId,customerId?,newCustomer?,message} → 线索。customerId 与 newCustomer 二选一；newCustomer 为 {name,email,phone}。车辆必须 AVAILABLE；新客户与线索原子创建；source=MANUAL、stage=NEW 由后端设置。
- GET /leads/{id} · S → 线索、客户、车辆摘要、version、activities。
- POST /leads/{id}/assign · M，{version,ownerId} → 线索，ownerId 可为 null；只分配活跃账号。
- POST /leads/{id}/transition · S，{version,toStage,reason?} → 线索，LOST 或阶段回退必须 reason，拒绝直接设置 WON。
- POST /leads/{id}/activities · S，{version,channel,note,nextFollowUpAt} → 201 activity，附 leadVersion；原子更新跟进日期及 lead.version。nextFollowUpAt 可为 null 表示清除，过去日期允许用于记录逾期任务。

普通 PATCH 不提供 lead.vehicleId/customerId 修改，避免跟进历史突然转移到另一辆车或客户。要更换意向车辆时创建新线索，原线索按实际情况关闭。

## 销售与统计

- POST /sales · M，{leadId,vehicleVersion,leadVersion,finalPrice,note} → 201 {id,vehicleId,leadId,finalPrice,soldAt}。服务端从 lead 推导 vehicle/customer，不接受前端任意拼接。
- GET /sales?month=2026-11&page=0 · S → 销售摘要；month 按经销商本地月份转为 UTC 边界查询。
- GET /sales/{id} · S → 成交快照和关联摘要。
- GET /dashboard · S → {availableVehicleCount,openWorkOrderCount,openLeadCount,currentMonthSalesCount,currentMonthSalesAmount,followUps,workOrders}。

重复成交返回 409 VEHICLE_NOT_AVAILABLE 或 SALE_ALREADY_EXISTS，客户端提示刷新 Sales 确认；不自动重试创造新交易。销售插入和所有关联状态更新由一个数据库事务完成。

## C 端公开 API

- GET /public/listings?make=&minPrice=&maxPrice=&page=0&size=20 · P → 安全 DTO；只返回可见广告，默认发布时间倒序。
- GET /public/listings/{id} · P → {id,title,description,make,model,modelYear,mileageKm,color,photoUrl,advertisedPrice,priceDisclosure,dealerName,dealerContact,reviewLabel}。
- POST /public/listings/{id}/enquiries · P，{submissionKey,name,email,phone,message,website} → 201 {message:"Your enquiry has been received."}，重复 key 返回同样通用确认。website 是正常用户应为空的隐藏反垃圾字段。

公开 DTO 不含 VIN、内部成本、readyNote、客户、员工、审计记录和 AI 原始建议。公开页面读取审核快照且必须核验 listing=PUBLISHED、vehicle=AVAILABLE、发布版本有效。不可见详情一律 404，咨询状态改变用 409 LISTING_UNAVAILABLE。

public 列表/详情设置 Cache-Control: no-store，避免演示时出售后旧缓存继续展示。C 端页面返回浏览器前台时重新拉取，提交咨询时始终服务器复核。

## 编码时的接口完成要求

每条接口必须有角色、入参校验、返回 DTO 和状态错误；前端不得依赖数据库实体序列化。接口调整先更新本文件，再同时通知负责页面和后端的人。实际 OpenAPI 由控制器和 DTO 在编码阶段生成并比对。


