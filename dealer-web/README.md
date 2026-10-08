# dealer-web

Vue 3 SPA. Dev server listens on **5173**. The browser calls Gateway **`/api/v1/**` only** through `src/api/http.ts` (never core `:8081`, never `/internal/v1`).

## Gateway origin (dynamic)

`http.ts` sets axios `baseURL` before any `/api/v1` call. First accepted value wins:

1. Runtime `window.__DEALER_GATEWAY_URL__` and/or `public/config.json` field `gatewayUrl` (a deployed site can be repointed by replacing `dist/config.json`, with no rebuild)
2. Build-time `import.meta.env.VITE_GATEWAY_URL` from `.env` or the environment of `npm run build`
3. Relative `''` (same-origin Gateway)

Local default for (2) is `http://localhost:8080`. Do not treat that string as the Azure production URL. Values that point at `:8081`, `:8082`, or `/internal` are ignored.

See `.env.example`.

## Local run

Start MySQL, `dealer-core`, `ai-service`, and `dealer-gateway` first ([README](../README.md) "Local development startup"), then:

```text
npm ci
cp .env.example .env
npm run dev
```

Health: `http://127.0.0.1:5173/` → 200. Keep `VITE_GATEWAY_URL=http://localhost:8080` so the gateway's CORS origin `http://localhost:5173` stays unchanged.

## Sign-in (admin-issued username/password)

Admin-issued username and password, as the client specification requires. See [design/15-Data-Auth-and-Gateway.md](../design/15-Data-Auth-and-Gateway.md) §8.

The `/login` page posts `{ username, password }` to `POST /api/v1/auth/login` on the gateway and stores the returned JWT. Only the platform admin can create a staff login, from `/admin` (binds a dealership, username, and temporary password in one step). The platform admin account itself is seeded on `dealer-core` startup from `ADMIN_USERNAME` / `ADMIN_PASSWORD` (see `dealer-platform/env.example`); there is no self-registration.

After sign-in, the SPA calls `GET /api/v1/me`. Admin lands on `/admin`. Staff without an active membership see the no-access landing; staff with a membership land on `/dms`.

## Cloud build

The SPA is static files on Azure Static Web Apps. `deploy/terraform/deploy-apps.sh` runs the build with the gateway URL and the publish timestamp injected, then uploads `dist/`. The footer at the bottom left shows `VITE_PUBLISHED_AT` for web (the build time when unset) and the gateway, core and ai release times from `GET /actuator/release` ([design/20-Observability.md](../design/20-Observability.md) §5):

```text
VITE_GATEWAY_URL=https://<gateway-host> VITE_PUBLISHED_AT=<utc timestamp> npm run build
```

`public/staticwebapp.config.json` is copied into `dist/` and gives Static Web Apps the SPA fallback rewrite, so a deep link such as `/dms` is served `index.html` instead of a 404. `public/config.json` ships with an empty `gatewayUrl`; replace it in `dist/` to repoint a deployed site without rebuilding. Full procedure: [deploy/README.md](../deploy/README.md).
