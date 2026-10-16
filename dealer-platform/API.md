# API inventory (via Gateway, prefix /api/v1)

The browser only calls the gateway: `http://localhost:8080` locally, or `terraform output -raw gateway_public_url` on a deployed stack ([deploy/README.md](../deploy/README.md)). core=8081 and ai-service=8082 are not browser-direct, and in Azure the platform refuses them.

**Full request/response/error codes:** [design/14-Backend-API-Contract.md](../design/14-Backend-API-Contract.md) (current v6.1). Do not use the retired [design/archive/04-API-Contract.md](../design/archive/04-API-Contract.md).

Shared rules: every `/api/v1` path except the sign-in routes and `GET /api/v1/catalog/**` needs a Bearer token; pagination `{items,page,size,totalElements}` (default size=10); errors `{code,message,requestId}` plus optional `fieldErrors`; writes carry `version` where specified; cross-dealership id → **404** (not 403); ignore client `dealerId`. Staff without valid `membership.active=1` → **403** on everything except `/me`. `SOLD_LOCKED` = **409**. Every route below enters through Gateway `/api/v1/**` and is proxied to dealer-core (photo paths use their own `dealer-core-photos` route).

## Public

| Method | Path | Who |
|---|---|---|
| POST | `/api/v1/auth/login` | Anonymous; `{identifier,password}` where identifier is the email, username, or phone → `{accessToken,role,displayName}`; bad credentials → **401** `UNAUTHORIZED` |
| POST | `/api/v1/auth/register` | Anonymous; `{username,displayName,email,phone,password}` with at least one of email or phone; creates an unbound `Dealer.User` and returns the same session response (**201**) |
| POST | `/api/v1/auth/google` | Anonymous; `{idToken,dealerId?}` → `{status: ok\|needs_dealer\|pending_approval, login}` |
| POST | `/api/v1/auth/firebase` | Anonymous; `{idToken,username?,displayName?,phone?}` → `{accessToken,role,displayName}`; creates an unbound `Dealer.User` on first use |
| GET | `/api/v1/catalog/makes` | Anonymous vPIC make options (cached) |
| GET | `/api/v1/catalog/models?make=` | Anonymous vPIC model options for one make |
| GET | `/api/v1/catalog/vin/{vin}` | Anonymous read-only vPIC decode |
| GET | `/api/v1/catalog/dealers` | Anonymous active-dealership directory `[{id,legalName}]` for the Google dealership picker |
| GET | `/actuator/release` | Anonymous; served by the Gateway itself → `{web,gateway,core,ai}` release times |

## Any signed-in user

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/me` | Identity, dealership display fields, own email/phone, `signInMethod`, Google profile fields; 200 even when unbound |
| PATCH | `/api/v1/me` | `{displayName,phone?}` → same shape as GET; **409** `DISPLAY_NAME_TAKEN` / `PHONE_TAKEN` |
| DELETE | `/api/v1/me` | Soft-delete own account → **204**; Platform.Admin → **403** |

`/me` is exempt from the membership gate, so an unbound `Dealer.User` can read, edit, and delete its own account.

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
| GET | `/api/v1/admin/pending-users` |

There is no `DELETE /admin/dealers/{id}`. Platform.Admin may call only `/api/v1/me` (except `DELETE`), `/api/v1/admin/**`, and the anonymous routes; every business URL below returns **403** `FORBIDDEN` with no business fields.

## Dealer.User (tenant only from JWT + membership)

| Method | Path | Notes |
|---|---|---|
| GET POST | `/api/v1/vehicles` | query: `q` `make` `model` `modelYear` `status` `condition` `bodyType` |
| GET PATCH | `/api/v1/vehicles/{id}` | sold vehicles cannot change purchase fields |
| POST | `/api/v1/vehicles/{id}/sell` | `{soldOn,soldPrice,version}`; missing date/price or price ≤ 0 → **400** `SOLD_PAIR_REQUIRED` |
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
| GET | `/api/v1/members` | Active staff usernames in this dealership for lead/work-order assignment |
| GET POST | `/api/v1/leads` | List/filter leads or create a lead with an existing or new customer |
| GET PATCH | `/api/v1/leads/{id}` | Read or update an open lead |
| POST | `/api/v1/leads/{id}/notes` | Append a note; notes are newest first |
| GET POST | `/api/v1/vehicles/{vehicleId}/work-orders` | List/create vehicle reconditioning work orders |
| PATCH | `/api/v1/work-orders/{id}` | Update work order; completing it adds cost to vehicle repair cost; open work blocks sale |
| GET POST | `/api/v1/vehicles/{vehicleId}/photos` | List/upload vehicle photos (multipart upload) |
| GET | `/api/v1/vehicles/{vehicleId}/photos/{photoId}/content` | Authenticated original/enhanced image bytes |
| POST | `/api/v1/vehicles/{vehicleId}/photos/{photoId}/enhance` | Generate enhanced JPEG from a supported preset |
| DELETE | `/api/v1/vehicles/{vehicleId}/photos/{photoId}` | Delete photo and enhanced copy |
| GET | `/api/v1/dealer/join-requests` | Pending Google join requests to this dealership (array, newest first) |
| POST | `/api/v1/dealer/join-requests/{username}/approve` | Bind the account to this dealership → **204** |
| POST | `/api/v1/dealer/join-requests/{username}/reject` | Clear the request → **204** |
| GET | `/api/v1/dealer/notifications?includeResolved=` | Dealer-wide inbox (array); unresolved only by default |

## Internal only (core → ai-service at `AiService:BaseUrl`, browser 404)

| Method | Path |
|---|---|
| POST | `/internal/v1/ad-check` |
| POST | `/internal/v1/assistant` |

Request shapes: 14 §11. **Internal success/failure JSON and sold-link codes: PROTOCOL wins** (`design/AI-PROTOCOL-AND-RULES.md` §A.1 / §B) over 14 §11 sketches and any older `{failed,reason}` drafts.

Full route/schema inventory: `openapi.yaml`; business rules and exact extension DTOs: [design/14](../design/14-Backend-API-Contract.md) and [design/21](../design/21-Feature-Extensions.md).
If public-path details conflict, 14 wins. If internal AI or `WRONG_DEALER_OR_SOLD` vs 404 conflict, PROTOCOL wins.
