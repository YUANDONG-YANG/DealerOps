# API 清单（经 Gateway，前缀 /api/v1）

浏览器只打 `http://localhost:8080`。core=8081，ai-service=8082，不给浏览器直连。

**完整请求/响应/错误码：** [design/14-Backend-API-Contract.md](../design/14-Backend-API-Contract.md)（现行 v6）。不要用废止的 `design/04-API-Contract.md`。

统一：分页 `{items,page,size,total}`（默认 size=10）；错误 `{code,message}`；写带 `version`；跨店 id → **404**（不 403）；忽略客户端 `dealerId`。店员无有效 `membership.active=1` → **403**。`SOLD_LOCKED` = **409**。

## 公共

| 方法 | 路径 | 谁 |
|---|---|---|
| GET | `/api/v1/me` | 已登录 |

## Admin（Platform.Admin）

| 方法 | 路径 |
|---|---|
| GET | `/api/v1/admin/dealers` |
| POST | `/api/v1/admin/dealers` |
| GET | `/api/v1/admin/dealers/{id}` |
| PATCH | `/api/v1/admin/dealers/{id}` |
| GET | `/api/v1/admin/dealers/{id}/members` |
| POST | `/api/v1/admin/dealers/{id}/members` |
| DELETE | `/api/v1/admin/dealers/{id}/members/{entraOid}` |

无 `DELETE /admin/dealers/{id}`。管理员打下面业务 URL → 403/404，且无业务字段。

## Dealer.User（租户只来自 JWT + membership）

| 方法 | 路径 | 备注 |
|---|---|---|
| GET POST | `/api/v1/vehicles` | query：`q` `status` `condition` |
| GET PATCH | `/api/v1/vehicles/{id}` | 已售禁改采购 |
| POST | `/api/v1/vehicles/{id}/sell` | `{soldOn,soldPrice,version}` |
| GET POST | `/api/v1/customers` | query：`q` `linked` |
| GET PATCH | `/api/v1/customers/{id}` | |
| PUT | `/api/v1/customers/{id}/vehicles/{vehicleId}` | 挂车 |
| DELETE | `/api/v1/customers/{id}/vehicles/{vehicleId}` | **解绑 → 204**；已售 **409 SOLD_LOCKED**；审计 UNLINK |
| GET PATCH | `/api/v1/vehicles/{id}/listing` | GET 无行=虚拟空草稿不落库；首次 PATCH 用 `''` |
| POST | `/api/v1/listings/{id}/checks` | Blocked=200；AI 挂=502 |
| POST | `/api/v1/listings/{id}/ready` | 409 `CHECK_STALE` / `NOT_PASSED` |
| POST | `/api/v1/listings/{id}/exports` | `text/plain` |
| GET | `/api/v1/audit?entityType=&entityId=` | 只本店 |
| POST | `/api/v1/assistant/ask` | `{text}`；不写业务表 |

## 仅内部（Gateway → ai-service，浏览器 404）

| 方法 | 路径 |
|---|---|
| POST | `/internal/v1/ad-check` |
| POST | `/internal/v1/assistant` |

Body 形状见 14 §11。

完整 schema 见 `openapi.yaml`。
细节冲突仍以 14 为准。
