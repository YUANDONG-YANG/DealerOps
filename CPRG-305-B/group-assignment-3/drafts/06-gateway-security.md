# Security-boundary cases: Gateway

Security boundary of `DealerOps.Gateway` on the current .NET stack. Case IDs are execution IDs for this check.

## What this product implements

| Control | Where |
|---|---|
| Browser routes | `backend/dotnet/DealerOps.Gateway/appsettings.json` `ReverseProxy`: `/api/v1/vehicles/{vehicleId}/photos/{**catch-all}` and `/api/v1/{**catch-all}` to the `core` cluster; `/internal/v1/{**catch-all}` to the `ai` cluster. Cluster addresses come from `CORE_URL` and `AI_URL` when set, otherwise `http://localhost:8081` and `http://localhost:8082`. |
| Public health | `GET /actuator/health` in `backend/dotnet/DealerOps.Gateway/Program.cs`, mapped before authentication. Body from `backend/dotnet/DealerOps.Gateway/Health/DownstreamHealthCheck.cs`. |
| Unknown route | `MapFallback` in `Program.cs`, after the reverse proxy is mapped. |
| CORS | Policy `Gateway` in `Program.cs`. One origin: `CORS_ALLOWED_ORIGIN`, else `dealerops:corsAllowedOrigin`, else `http://localhost:5174` (`appsettings.json`). Methods `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`. Request headers `Authorization` and `Content-Type` only. Credentials disallowed. |
| Browser contract | `frontend/react/src/api/gateway.ts` `resolveGatewayUrl` refuses a base URL on port 8081 or 8082, or any URL that contains `/internal`. |
| Internal credential | `backend/dotnet/DealerOps.Gateway/Middleware/InternalRouteFilter.cs`. Header name `X-Dealer-Internal` (`dealerops:internalHeaderName`). The credential is `INTERNAL_TOKEN` or `dealerops:internalToken`. The value is not recorded here. |

JWT validation is configured in `Program.cs` and `backend/dotnet/DealerOps.Gateway/Security/JwtSupport.cs` (issuer `dealerops-core`, audience `api://dealer-api`, HS256, lifetime check, 30-second clock skew). It runs after the health map and after `InternalRouteFilter`. It is not a case in this set.

`Program.cs` listens on `http://*:{GATEWAY_PORT}` and uses port 8080 when `GATEWAY_PORT` is unset.

## Execution this session

Checked on 2026-11-02 without starting any service. Nothing was listening on port 8080. `curl` to `http://127.0.0.1:8080/actuator/health` failed to connect and returned no HTTP response. The same check against `/not-a-gateway-route`, `/internal/v1/ad-check`, and an `Origin: https://disallowed.example` preflight also failed to connect. Ports 8081 and 8082 were not accepting connections either. That port check is not a gateway HTTP result.

**PASS** is used only for a result observed live against an already-running gateway. Every case below is **NOT RUN**. The Actual result column does not invent HTTP status codes.

## Cases

| Case ID | Control | Request shape | Expected result | Actual result | Status |
|---|---|---|---|---|---|
| GW-01 | Public health endpoint, mapped before authentication (`Program.cs` `MapGet("/actuator/health")`; `DownstreamHealthCheck.CheckAsync`). | `GET /actuator/health` on the gateway, with no `Authorization` header. | The handler returns `Results.Ok` (HTTP 200) with JSON `status` and `components.core.status` and `components.ai.status`. Each component is `UP` or `DOWN`. Overall `status` is `UP` only when both downstream probes succeed. | Not observed. Gateway was not accepting connections. | NOT RUN |
| GW-02 | Catch-all for a path that matches no gateway route (`Program.cs` `MapFallback`). Published routes are the reverse-proxy paths above, plus `/actuator/health`, `/actuator/release`, and `/swagger` in dev mode. | `GET /not-a-gateway-route` on the gateway. | `MapFallback` returns `Results.NotFound` (HTTP 404) with `{ "code": "NOT_FOUND", "message": "Not found" }`. | Not observed. Gateway was not accepting connections. | NOT RUN |
| GW-03 | CORS policy `Gateway` for an origin other than the single configured origin (`Program.cs`). | `GET /actuator/health` on the gateway with `Origin: https://disallowed.example`. | That origin is not the configured origin (default `http://localhost:5174` when `CORS_ALLOWED_ORIGIN` and `dealerops:corsAllowedOrigin` are unset). The policy does not emit `Access-Control-Allow-Origin` for it. Allowed request headers stay `Authorization` and `Content-Type`, and credentials stay disallowed. This application does not assign a separate HTTP status for a disallowed origin. | Not observed. Gateway was not accepting connections. | NOT RUN |
| GW-04 | Browser contract must not call Core or AiService directly (`frontend/react/src/api/gateway.ts`). Gateway destinations are fixed server-side (`appsettings.json` clusters `core` and `ai`; `Program.cs` `CORE_URL` / `AI_URL`). | Browser gateway base set to `http://localhost:8081` or `http://localhost:8082`, or to a URL that contains `/internal`. | `resolveGatewayUrl` discards that value and does not send the API call there. The gateway has no route whose match is a caller-chosen Core or AiService address. This guard does not produce a gateway HTTP status. | Not observed. Gateway was not accepting connections. The browser guard was not exercised against a live gateway. | NOT RUN |
| GW-05 | Internal route without the internal credential (`InternalRouteFilter`, before the reverse proxy). | `POST /internal/v1/ad-check` on the gateway with no `X-Dealer-Internal` header. | The filter treats `/internal` and `/internal/**` without a matching credential as not found. It sets HTTP 404 and writes `{ "code": "NOT_FOUND", "message": "Not found" }`. The `/internal/v1/{**catch-all}` proxy route is not reached. | Not observed. Gateway was not accepting connections. | NOT RUN |
