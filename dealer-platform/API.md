# API inventory (via Gateway, prefix /api/v1)

The browser only calls `http://localhost:8080`. core=8081 and ai-service=8082 are not browser-direct.

**Full request/response/error codes:** [design/14-Backend-API-Contract.md](../design/14-Backend-API-Contract.md) (current v6). Do not use the retired `design/04-API-Contract.md`.

Shared rules: pagination `{items,page,size,total}` (default size=10); errors `{code,message}`; writes carry `version`; cross-dealership id → **404** (not 403); ignore client `dealerId`. Staff without valid `membership.active=1` → **403**. `SOLD_LOCKED` = **409**.

## Public

| Method | Path | Who |
|---|---|---|
| GET | `/api/v1/me` | Authenticated |

## Admin (Platform.Admin)

| Method | Path |
|---|---|
| GET | `/api/v1/admin/dealers` |
| POST | `/api/v1/admin/dealers` |
| GET | `/api/v1/admin/dealers/{id}` |
| PATCH | `/api/v1/admin/dealers/{id}` |
| GET | `/api/v1/admin/dealers/{id}/members` |
| POST | `/api/v1/admin/dealers/{id}/members` |
| DELETE | `/api/v1/admin/dealers/{id}/members/{entraOid}` |

There is no `DELETE /admin/dealers/{id}`. Admin hitting the business URLs below gets 403/404 and no business fields.

## Dealer.User (tenant only from JWT + membership)

| Method | Path | Notes |
|---|---|---|
| GET POST | `/api/v1/vehicles` | query: `q` `status` `condition` |
| GET PATCH | `/api/v1/vehicles/{id}` | sold vehicles cannot change purchase fields |
| POST | `/api/v1/vehicles/{id}/sell` | `{soldOn,soldPrice,version}` |
| GET POST | `/api/v1/customers` | query: `q` `linked` |
| GET PATCH | `/api/v1/customers/{id}` | |
| PUT | `/api/v1/customers/{id}/vehicles/{vehicleId}` | link vehicle |
| DELETE | `/api/v1/customers/{id}/vehicles/{vehicleId}` | **unlink → 204**; sold **409 SOLD_LOCKED**; audit UNLINK |
| GET PATCH | `/api/v1/vehicles/{id}/listing` | GET with no row = virtual empty draft, not persisted; first PATCH uses `''` |
| POST | `/api/v1/listings/{id}/checks` | Blocked=200; AI down=502 |
| POST | `/api/v1/listings/{id}/ready` | 409 `CHECK_STALE` / `NOT_PASSED` |
| POST | `/api/v1/listings/{id}/exports` | `text/plain` |
| GET | `/api/v1/audit?entityType=&entityId=` | this dealership only |
| POST | `/api/v1/assistant/ask` | `{text}`; does not write business tables |

## Internal only (Gateway → ai-service, browser 404)

| Method | Path |
|---|---|
| POST | `/internal/v1/ad-check` |
| POST | `/internal/v1/assistant` |

Body shapes: 14 §11.

Full schema: `openapi.yaml`.  
If details conflict, 14 wins.
