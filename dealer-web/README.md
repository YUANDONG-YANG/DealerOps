# dealer-web

Vue 3 SPA. Dev and image listen on **5173**. The browser calls Gateway **`/api/v1/**` only** through `src/api/http.ts` (never core `:8081`, never `/internal/v1`).

## Gateway origin (dynamic)

`http.ts` sets axios `baseURL` before any `/api/v1` call. First accepted value wins:

1. Runtime `window.__DEALER_GATEWAY_URL__` and/or `public/config.json` field `gatewayUrl` (Azure can replace `dist/config.json` or inject the window value without rebuilding the SPA)
2. Build-time `import.meta.env.VITE_GATEWAY_URL` from `.env` or Docker `ARG` / `ENV`
3. Relative `''` (same-origin Gateway)

Local default for (2) is `http://localhost:8080`. Do not treat that string as the Azure production URL. Values that point at `:8081`, `:8082`, or `/internal` are ignored.

See `.env.example`.

## Host (usual local path)

`dealer-platform/docker-compose.yml` already starts MySQL plus the three Java services (JWT and healthchecks stay there). **dealer-web is not added to that compose file**; run Vite on the host so CORS origin `http://localhost:5173` stays unchanged.

```text
npm ci
npm run dev
```

Health: `http://127.0.0.1:5173/` → 200.

Copy `.env.example` to `.env` and fill Entra keys.

## Image (LOCAL-AND-CLOUD target)

Vite **preview** on 5173 (not nginx). Entra `VITE_*` values still bake at build time. Prefer runtime `dist/config.json` (copied from `public/config.json`) or `window.__DEALER_GATEWAY_URL__` for the Gateway origin.

```text
docker build -t dealer-web .
docker run --rm -p 5173:5173 dealer-web
```

Optional build args: `VITE_GATEWAY_URL`, `VITE_ENTRA_TENANT_ID`, `VITE_ENTRA_CLIENT_ID`, `VITE_ENTRA_API_SCOPE`. On Azure, leave `VITE_GATEWAY_URL` empty and mount or replace `dist/config.json` with `{ "gatewayUrl": "https://<gateway-host>" }` instead of baking localhost.
