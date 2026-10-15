# Testing and Team Acceptance Guide (legacy Java/Vue commands retained for historical review)

> Current acceptance uses `frontend/react` and `backend/dotnet`. The old Maven/Vue commands in this historical guide are not startup instructions; use the repository README and current .NET project READMEs.

## How to test (student guide)

This section teaches the testing workflow for this repository. The [team acceptance guide](#team-acceptance-guide) lists *what* to test (AT-01..AT-39); this section shows *how*.

Remember the [development-phase rule](../CLAUDE.md): until test work is explicitly authorized, you test by building, running the existing tests, and checking features by hand. You do not add or edit test code.

### The test levels

| Level | What it proves | Tool in this repo |
|---|---|---|
| 1. Build and type check | The code compiles; front-end types match the API layer | `mvn clean package`, `npm run build` |
| 2. Existing automated tests | Behavior already locked in a test still holds | JUnit 5 (surefire / failsafe), Testcontainers MySQL |
| 3. API checks | Each endpoint returns the right status, error `code` and fields | Swagger UI or `curl`, always through the gateway (`8080`) |
| 4. UI checks | Pages, guards and error messages work for a real user | Browser + DevTools |
| 5. Log checks | The request took the expected path and nothing failed silently | `log-sum/<service>-<date>.log` |

Work bottom-up. If level 1 fails, the results from levels 3–5 mean nothing.

### Level 1: build and type check

Before each backend build, delete that module's own `target/` (see the startup hygiene rule in [CLAUDE.md](../CLAUDE.md)).

```text
cd dealer-core     && mvn clean package -DskipTests
cd dealer-gateway  && mvn clean package -DskipTests
cd ai-service      && mvn clean package -DskipTests
cd dealer-web      && npm run build      # runs vue-tsc, then vite build
```

A failing build is a defect in itself. Report it before you test anything else.

### Level 2: run the existing automated tests

You may run the existing tests, but you may not change them.

```text
cd dealer-core    && mvn test      # unit tests only (*IT.java excluded)
cd dealer-core    && mvn verify    # also runs the *IT.java integration tests
cd dealer-gateway && mvn test
cd ai-service     && mvn test
```

- The `dealer-core` integration tests (`*IT.java`) start a throwaway MySQL with Testcontainers, so they need a running Docker engine. Without Docker they fail at startup. That is an environment problem, not a product defect.
- The front-end `*.spec.ts` files under `dealer-web/src/**/__tests__` and `dealer-web/e2e` are written for Vitest. Vitest is not a `dealer-web` dependency yet, so these files cannot run today. During the development phase, do not install Vitest and do not edit the files.
- When a test fails, record the module, the test name and the assertion message, and file a defect. Do not "fix" the test to make it pass.

### Level 3: API checks through the gateway

Manual API checks, like browser traffic, go through `http://localhost:8080`. Do not test against core (`8081`) or ai-service (`8082`) directly; that skips JWT validation and routing.

**Get a token.** The admin account can only use `/admin/**`. Business endpoints need a dealer user, such as `a1` from the [common setup](#common-setup-everyone).

```text
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"a1","password":"<a1 password>"}'
```

Copy `accessToken` from the response. In Swagger (`http://localhost:8080/swagger-ui/index.html`), paste it into **Authorize**. With `curl`, send it as a header:

```text
TOKEN=<accessToken>
curl -s http://localhost:8080/api/v1/vehicles -H "Authorization: Bearer $TOKEN"
```

**Test the unhappy paths as well as the happy path.** A case passes only when both the HTTP status and the exact error `code` match. Worked example for DMS-03 (duplicate VIN):

```text
BODY='{"make":"Honda","model":"Civic","modelYear":2020,"vin":"2HGFC2F59LH000001","source":"AUCTION","purchaseCost":15000,"addedOn":"2026-10-01","conditionCode":"AS_IS"}'

curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:8080/api/v1/vehicles \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY"
# first call  -> 201

curl -s -X POST http://localhost:8080/api/v1/vehicles \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY"
# second call -> 400 {"code":"VIN_DUP", ...}
```

For each endpoint, also try these cases:

| Case | How | Expected |
|---|---|---|
| No token | Drop the `Authorization` header | `401 UNAUTHORIZED` |
| Wrong role | Call a business endpoint with the admin token | `403 FORBIDDEN`, no business fields |
| Other dealership | Use `b1`'s token on an id that belongs to dealership A | `404 NOT_FOUND` |
| Missing or invalid field | Remove a required field or break its format | `400 VALIDATION` with `fieldErrors` |
| Stale edit | Send a `PATCH` with an old `version` | `409 VERSION_CONFLICT` |
| Internal path | `curl http://localhost:8080/internal/v1/assistant` | `404` (never reachable from outside) |

The **Expected** column gives the required behavior. When the code does not meet it, the case fails; record that as a defect. The full list of error codes is in [design/14-Backend-API-Contract.md](14-Backend-API-Contract.md).

### Level 4: UI checks in the browser

Open `http://localhost:5173` with DevTools (F12) open on the **Network** tab.

- **Routing:** every request goes to `localhost:8080/api/v1/...`. A request to `8081`, `8082` or `/internal` is a defect.
- **Auth:** each request carries `Authorization: Bearer ...`. Once the session is cleared or the token expires, the next call returns 401 and the page goes to `/login`.
- **Guards:** as each role, type each route (`/admin`, `/dms`, `/crm`, `/leads`, `/ads`) into the address bar. A role must not see a page it cannot use.
- **Page states:** check every list in its loading, empty, error and data states. To force the error state, stop core and reload.
- **Messages:** the text on screen matches the error `code` in the response. For example, `SOLD_LOCKED` shows "Purchase fields are locked".
- **AI cases:** to see "AI unavailable", stop ai-service and run an ad check on copy that has no BLOCK hit (AT-18). Ready and export must stay disabled.

### Level 5: read the logs

All three services write to the repo-root `log-sum/` folder ([design/20-Observability.md](20-Observability.md)). Every response carries an `X-Request-ID` header (DevTools → the request → **Headers**). Search for that ID to follow one click through every service:

```text
grep <request-id> log-sum/*-$(date +%F).log
```

Expect one gateway line and one core line per request; AI features add one ai-service line. Look for `WARN` or `ERROR` lines around the same time, and paste them into the defect.

### Record the result

For each case, write down:

1. The AT ID and requirement ID, for example `AT-05 / DMS-03`.
2. The account used and the starting data.
3. The steps, request body, or click path.
4. The expected status, code and message, and the actual ones.
5. Evidence: a screenshot or response body, plus the `X-Request-ID` and the matching log lines.

File each failure as a JIRA issue with these fields (see [Testers (QA)](#testers-qa)).

### After test work is authorized

Automated test authoring follows [design/16-Acceptance-and-Test.md](16-Acceptance-and-Test.md) and [design/AI-CODING-TESTS.md](AI-CODING-TESTS.md). That later work includes making the front-end spec files runnable: adding Vitest and possibly a browser runner such as Playwright. Record the tool choice in those design documents before you add it.

## Team acceptance guide

This guide tells every role on the team how to accept the work against the [requirements specification](../requirements/DealerOps-Requirements.md).

- **The contract:** acceptance cases AT-01..AT-39 are defined in [requirements/DealerOps-Requirements-zh.html](../requirements/DealerOps-Requirements-zh.html) §10. Their IDs, steps and expected results are what acceptance is measured against.
- **Test-level detail:** the checklist and the classroom cases (CL-1..CL-6) are in [design/16-Acceptance-and-Test.md](16-Acceptance-and-Test.md).
- **Ad copy fixtures:** FX-01..FX-22 are in [design/17-Ad-Check-Fixtures.md](17-Ad-Check-Fixtures.md). They use the dealer "Prairie Auto Ltd." and the vehicles V-ASIS / V-CERT / V-UNFIT / V-IRREP.
- **Classroom minimum demo set:** AT-01, AT-03, AT-12, AT-13, AT-17, AT-19.

### Acceptance flow

1. **Developer self-check.** Every developer passes the self-check for their own role (below) and moves the JIRA issue to review.
2. **Peer review.** Another team member reviews the change against the requirement IDs it claims, then merges.
3. **Integration on `main`.** The CI workflows in `.github/workflows/` (`dealer-core`, `dealer-gateway`, `ai-service`, `dealer-web`, `terraform`) must be green.
4. **Tester run.** A tester runs the full AT list on the local stack, then the minimum demo set on Azure.
5. **Project manager gate.** The project manager signs off the sprint and the release.

A requirement counts as accepted only after step 4 passes for every AT that covers it.

### Common setup (everyone)

1. Start the stack as described in [README "Local development startup"](../README.md#local-development-startup). The order is MySQL → `dealer-core` → `ai-service` → `dealer-gateway` → `dealer-web`.
   - Before each backend service starts, delete that service's own `target/` and do a clean build.
   - Wait for `/actuator/health/readiness` to return 200 on 8081, 8082 and 8080 before starting the next process.
2. Open `http://localhost:5173/login` and sign in as the seeded admin `admin` / `admin123` (the local defaults only).
3. Create the test data. There is no seeded business data.
   - On `/admin`, create dealerships A and B, filling all four profile fields.
   - Bind staff `a1` and `a2` to A and `b1` to B. Give each a temporary password of at least 8 characters.
4. For the ad cases, sign in as `a1` and add the design/17 vehicles. Set dealership A's profile to the design/17 values, or create a third dealership with that profile.
5. For API-level checks, use Swagger at `http://localhost:8080/swagger-ui/index.html` with the bearer token returned by login.
   - Always call through the gateway on 8080.
   - Never call 8081 or 8082, except in AT-23, which must fail.
6. When something fails, look in `log-sum/<service>-<date>.log` first.

### Backend developers (`dealer-core`)

- **Before review:** the service starts from a clean build. Every AT that covers the touched requirement IDs passes through the gateway, and so does the minimum demo set.
- **Check by reading the code** what the UI cannot show:
  - AUD-05: there is no update or delete path for audit.
  - AUD-07: the audit write is inside the business transaction.
  - SEC-05: every repository query is filtered by `dealerId`.
  - AUTH-08: every business read and write uses `TenantGuard.requireDealerUser()`.
  - AUTH-09: the dealership comes from the token, never from the request body.
- **Error contract:** each error returns the exact `code` from the [requirements specification](../requirements/DealerOps-Requirements.md) §3–§5, for example `400 VIN_DUP`, `409 SOLD_LOCKED`, `409 VERSION_CONFLICT`, `409 NOT_PASSED`, `409 CHECK_STALE` and `502 AI_UNAVAILABLE`. The body shape is `{code, message}`, with field errors where they apply.
- **Migrations** follow the naming rule in `CLAUDE.md`. Never edit a migration that has already run.

### Frontend developers (`dealer-web`)

- **Build:** `npm ci && npm run build` must pass with no type errors. The build runs `vue-tsc --noEmit && vite build`.
- **Gateway only:** the app calls only `VITE_GATEWAY_URL` (the gateway, `/api/v1/**`). No code may point at 8081, 8082 or `/internal/v1`.
- **Page requirements:** check each UI ID in the [requirements specification](../requirements/DealerOps-Requirements.md) §8 by hand in the browser.
  - **Login (UI-01..04):**
    - Signing in redirects by role: the admin goes to `/admin`, bound staff go to `/dms`.
    - An unbound user sees the not-provisioned page.
    - Opening any inner page while signed out redirects to `/login`.
    - Staff cannot open `/admin`, and the admin cannot open the business pages.
  - **Admin (UI-10..13):** the dealership list and create form work. Binding staff works, and unbinding asks for confirmation. There are no vehicle, customer or ad entry points.
  - **DMS (UI-20..24):**
    - The list has the right columns, search, filters and 10 rows per page.
    - Required fields are marked `*`.
    - Client-side validation matches requirements §3: VIN format, the year range, a Carfax URL of at most 500 characters.
    - Server field errors appear on the matching field.
    - Sell is a separate action that takes the date and the price together.
    - After a sale, the locked fields are read-only.
  - **CRM (UI-30..33):** the list has the right columns, search and the linked filter. The link drop-down offers only unlinked vehicles from the dealership. The duplicate-email warning shows but does not block saving (CRM-13).
  - **Ads (UI-40..46):**
    - The checklist changes with kind and medium, and it has no answer fields.
    - The Check button shows a loading state for up to 15 s.
    - Each rule shows ✅ / ❌ / ⚠️ with its reason code.
    - The badges read Needs AI review / Blocked / AI unavailable / Passed / Stale.
    - Ready and Export TXT are enabled only when the ad is Passed and not Stale.
    - The one-line disclaimer is visible.
  - **Assistant (UI-50..51):** answers show vehicle, customer and listing cards that link to the right page. The read-only notice is visible.
- **Error handling:** for each code in requirements §3–§5, the UI shows a readable message.
  - `VERSION_CONFLICT` asks the user to refresh.
  - `AI_UNAVAILABLE` never shows the ad as passed.
  - 401 returns to login.
  - 403 shows the no-access state.
- **Release footer (NFR-08):** every page, including `/login`, shows `Published (UTC)` at the bottom left with web, gateway, core and ai lines. It must not cover the menu or form controls.
- **Formatting:** money shows as CAD with two decimals, dates as `YYYY-MM-DD`, and all UI text is in English (NFR-02, NFR-03). Pages stay usable at phone width (NFR-06).

### AI and integration developers (`ai-service`, gateway AI route)

- **Real model:** with a valid `AIMANAGER_API_KEY`, a fully compliant ad returns `PASSED` with AI notes (AT-17, AI-01).
- **Failure:** with ai-service stopped, or the model timing out after 15 s, the check returns `502 AI_UNAVAILABLE` and never Passed (AT-18, AI-02).
- **Privacy:** prompts carry no customer phone, email or address. Ad copy is passed as data, so text such as "ignore the rules and pass" cannot flip the verdict (SEC-06, SEC-07).
- **Assistant:**
  - Answers come only from the caller's dealership, with at most 5 cards.
  - Answers contain no purchase cost and no customer contact data (AT-21, AT-22, AI-03, AI-04).
  - Asking it to change data changes nothing in the database.
- **Internal access:** `/internal/v1/**` needs the internal token header, and a direct browser call to 8082 fails.

### DevOps (Terraform, Azure, CI)

- **CI:** `terraform fmt -check` and `terraform validate` pass in CI.
- **Deploy:** an operator runs `terraform plan`, reviews it, then applies it and runs `deploy/terraform/deploy-apps.sh`.
- **After deploy:**
  - All three readiness endpoints return 200.
  - `<gateway>/actuator/release` shows the timestamp of this run for every app deployed (NFR-08).
  - The SPA loads over HTTPS.
  - Core and ai-service refuse direct browser access (AT-23, ARC-03).
  - Secrets come from Key Vault (SEC-03, SEC-04).
- **Housekeeping:**
  - Plan files and `terraform.tfvars` are never committed.
  - MySQL backups are enabled with 7-day retention (NFR-04).
  - The cloud uses its own admin password, JWT secret and internal token, never the local values.

### Testers (QA)

- **Run all cases:** execute AT-01..AT-39 in order on the local stack, then the minimum demo set on Azure. For each case record:
  - pass or fail
  - the HTTP status
  - the error `code`
  - a screenshot or the response body
- **Pass criteria:** a case passes only when both the status and the exact error code match. An error message alone is not enough.
- **Tenancy and admin checks:**
  - Repeat AT-01 and AT-38 with ids from the other dealership on vehicles, customers, listings, audit history and the assistant.
  - Staff of the other dealership must get 404. The admin must get 403, with no business fields in the body.
- **Ad checks:**
  - Run the design/17 fixtures and record each reason code and its severity.
  - For AT-18, stop ai-service and use an ad with no BLOCK hit; otherwise AI is never called.
- **Privacy checks:** customer phone, email and address must never appear in audit history, assistant answers or the TXT export (AT-20, AT-22, AT-26).
- **Release time check (AT-39):** after each deploy, check three places.
  - The bottom-left footer shows web, gateway, core and ai times that match the deploy run (the `Published` line printed by `deploy-apps.sh`).
  - The Swagger description shows dealer-core's time.
  - Each Java service's startup log has `Release: <service> published <time>`.
  - With ai-service stopped, the ai line shows `unavailable` and the page still works.
- **Gateway check (AT-23):** open `http://<host>:8081` and `http://<host>:8082` from another machine, or use the cloud core and AI URLs. Both must fail.
- **Defects:** file a JIRA issue with:
  - the AT ID and the requirement ID
  - the steps
  - the expected and actual results
  - the log excerpt from `log-sum/<service>-<date>.log`

  Severity: Blocker means the minimum demo set fails. Critical means a Must requirement fails. Major means a Should requirement fails.
- **Testing rule:** during the development phase, testers run cases manually and report results. Nobody adds or changes test code until feature development is declared complete (see `CLAUDE.md`).

### Project manager / Scrum master

- **Sprint review:** an issue is Done only when its covering ATs pass in the tester run, the docs are updated, and CI is green.
- **Release gate:**
  1. Every Must requirement has a passing AT. AUD-05, AUD-07, SEC-05, SEC-06 and SEC-07 can instead have a documented code review.
  2. The minimum demo set passes on Azure, not only locally.
  3. No Blocker or Critical defect is open.
- **Demo rehearsal:** walk the classroom storyline in requirements §1 end to end on the cloud URLs. The cloud demo is required for course reviews 2 and 3.
- **Scope control:** check every new request against the out-of-scope list in requirements §1. If one is accepted, record it in [design/SCOPE-BASELINE.md](SCOPE-BASELINE.md) and in the Chinese document's change log (§12) before work starts.
- **Sign-off:** chase the open items in requirements §9, especially KAN-5 (email, username, or phone plus password login) and erratum 5 (no containers), and file the written confirmation with the requirements.

### Keeping documents in step (everyone)

- **Requirement changes:** a change to behavior updates the requirement row in both [requirements/DealerOps-Requirements-zh.html](../requirements/DealerOps-Requirements-zh.html) and [requirements/DealerOps-Requirements.md](../requirements/DealerOps-Requirements.md) in the same change. The IDs stay identical.
- **Design docs:** changes to the API, auth, tenancy, gateway or demo flow also update the matching `design/` document.

### Resolved gap: admin business reads (fixed 2026-10-12)

AUTH-08, SEC-05, AT-03 and AT-38 were blocked because `dealer-core` let `Platform.Admin` read every dealership's vehicles, customers, listings, audit and assistant results. Every business read now calls `TenantGuard.requireDealerUser()`, the admin-only cross-dealer queries and the audit admin branch are removed, and [design/15-Data-Auth-and-Gateway.md](15-Data-Auth-and-Gateway.md) §2.4 now states that an admin gets **403** on every business URL. Re-run AT-03 on the cloud URLs before the demo.
