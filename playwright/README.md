# DealerOps E2E tests

Browser end-to-end tests for the React frontend and .NET gateway, written with Playwright.

## Prerequisites

1. MySQL, the .NET SDK and Node.js as for `start-local.sh`, plus the shared `ai-service` on 8082
   (started by `start-local.sh`) for AI-dependent cases.
2. Install dependencies once:

```bash
cd playwright
npm install
npx playwright install chromium
```

## Private test stack

Tests never run against the shared development stack (web 5174, gateway 8080, core 8081,
database `dealer_core`). `scripts/e2e-stack.sh` builds core and gateway from the working tree and
runs them with the React dev server on their own ports and database:

| Part | Address |
| --- | --- |
| Web | `http://localhost:5175` |
| Gateway | `http://127.0.0.1:18080` |
| Core | `http://127.0.0.1:18081` |
| Database | `dealer_core_e2e` (created on first start; schema by `EnsureCreated`) |

The script refuses to start if it would use the shared ports or database. Logs are in
`.stack/logs/`. Override with `E2E_CORE_PORT`, `E2E_GATEWAY_PORT`, `E2E_WEB_PORT`, `E2E_DB_NAME`.

## Running

| Command | Purpose |
| --- | --- |
| `npm test` | Rebuild and (re)start the private stack, then run the full suite |
| `npm run test:only -- tests/crm.spec.ts` | Run specs against the already running stack |
| `npm run stack:start` / `npm run stack:stop` | Start or stop the private stack |
| `npm run test:ui` | Interactive UI mode with time-travel debugging |
| `npm run report` | Open the last HTML report |
| `npm run codegen` | Record a new flow in the browser and generate code |
| `npm run autofix` | Run the suite and let Claude Code fix failures (see below) |

Failed tests keep a trace, screenshot and video under `test-results/`.
Open a trace with `npx playwright show-trace <path>/trace.zip`.

## Layout

| Path | Contents |
| --- | --- |
| `tests/global.setup.ts` | Seeds dealerships and staff (runs first) |
| `tests/api/` | Gateway API acceptance tests: tenancy, vehicles, customers, ads, assistant, leads, work orders, catalog/photos, contract |
| `tests/ui/` | Browser tests per page: DMS, CRM, ads, admin, assistant, leads, team/profile, register/landing, cross-cutting |
| `tests/*.spec.ts` | Login, route guards and navigation smoke tests |

Test titles start with the requirement IDs they cover (for example `AT-12 / AD-R07`), taken from
`requirements/DealerOps-Requirements.md` and `requirements/analysis/06-Pages-and-Acceptance.md`.
A failing test whose assertion matches the requirement points to an application defect; do not
weaken it to make the suite pass.

AI-dependent cases skip when the gateway reports the AI service as down. When several suites run
at the same time, give each run its own `--output` directory so they do not clear each other's
`test-results/`.

## Test data

`tests/global.setup.ts` runs first and idempotently creates two dealerships (`E2E Motors` with
`e2e.staff` and `e2e.staff2`, `E2E Rival Autos` with `e2e.rival`) through the admin API. Specs
that change accounts create their own throwaway dealership and staff instead. Specs sign in by calling the login API and
injecting the token into `sessionStorage`, so only `auth.spec.ts` exercises the login form.

Seeding only runs against `localhost` unless `E2E_ALLOW_REMOTE_SEED=1` is set. All of it lands in
`dealer_core_e2e`, so the development database stays clean.

## Configuration

All values are read from environment variables with local defaults (`support/env.ts`):

| Variable | Default |
| --- | --- |
| `E2E_WEB_URL` | `http://localhost:5175` |
| `E2E_GATEWAY_URL` | `http://127.0.0.1:18080` |
| `E2E_ADMIN_USER` / `E2E_ADMIN_PASSWORD` | local admin from `start-local.sh` |
| `E2E_STAFF_USER` / `E2E_STAFF_PASSWORD` | seeded staff account |
| `E2E_DEALER_NAME` | `E2E Motors` |

Never commit real credentials; pass them through the environment.

## Writing tests

- Import `test` and `expect` from `support/fixtures.ts`, not from `@playwright/test`.
- Use the `adminPage` or `staffPage` fixture for a signed-in page.
- Every test automatically fails on uncaught page errors, app console errors and 5xx
  responses. Errors logged by third-party widgets (such as Google sign-in) are ignored.
- Prefer `getByRole`, `getByLabel` and `getByPlaceholder` over CSS selectors.
- Use unique values (for example `Date.now()`) for fields that must be unique.
- Do not use fixed sleeps; rely on auto-waiting assertions.

## Automatic fixing

`npm run autofix` runs the suite up to `MAX_ROUNDS` times (default 3). After each failing
run it calls `claude -p` with the failure log and artifacts and asks for the smallest fix in
application source. Guard rails:

- The agent may not edit `playwright/` or configuration files; the script also verifies this
  after each round by comparing file fingerprints and stops with exit code 3 on a violation.
- It never commits, pushes or resets. Review the diff yourself before committing.
- When backend source changes, the script rebuilds and restarts the private stack before the
  next round; the shared development stack is never restarted.
- Each round's analysis is saved in `.autofix/claude-round-<n>.md`.
