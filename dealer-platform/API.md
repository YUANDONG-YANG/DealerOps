# API inventory (via Gateway, prefix /api/v1)

The browser only calls `http://localhost:8080`. core=8081 and ai-service=8082 are not browser-direct.

**Full request/response/error codes:** [design/14-Backend-API-Contract.md](../design/14-Backend-API-Contract.md) (current v6). Do not use the retired [design/archive/04-API-Contract.md](../design/archive/04-API-Contract.md).

Shared rules: every path except login needs the Bearer token from login; pagination `{items,page,size,total}` (default size=10); errors `{code,message}`; writes carry `version`; cross-dealership id → **404** (not 403); ignore client `dealerId`. Staff without valid `membership.active=1` → **403**. `SOLD_LOCKED` = **409**.

## Public

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/auth/login` | Anonymous; `{username,password}` → `{accessToken,role,displayName}`; bad credentials → **401** `UNAUTHORIZED` |
| GET | `/api/v1/me` | Authenticated (`Authorization: Bearer <accessToken>`) |

## Admin (Platform.Admin)

| Method | Path |
|---|---|
| GET | `/api/v1/admin/dealers` |
| POST | `/api/v1/admin/dealers` |
| GET | `/api/v1/admin/dealers/{id}` |
| PATCH | `/api/v1/admin/dealers/{id}` |
| GET | `/api/v1/admin/dealers/{id}/members` |
| POST | `/api/v1/admin/dealers/{id}/members` |
| DELETE | `/api/v1/admin/dealers/{id}/members/{username}` |

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

Request shapes: 14 §11. **Internal success/failure JSON and sold-link codes: PROTOCOL wins** (`design/AI-PROTOCOL-AND-RULES.md` §A.1 / §B) over 14 §11 sketches and any older `{failed,reason}` drafts.

Full schema: `openapi.yaml`.  
If public-path details conflict, 14 wins. If internal AI or `WRONG_DEALER_OR_SOLD` vs 404 conflict, PROTOCOL wins.
