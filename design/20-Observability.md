# 20. Observability: application logging, release time, and local tracing (legacy Java reference)

> **Deprecated runtime details:** The logback/Spring Boot configuration described below belongs to the former Java services. The current runtime is .NET 10 / ASP.NET Core; do not add Java agents, Maven, or logback configuration to the current backend.

Status: **legacy Java reference only**. Current runtime observability follows the .NET 10 / ASP.NET Core services in `backend/dotnet/`.

## 1. Problem

Before this change, `dealer-core`, `dealer-gateway`, and `ai-service` had almost no
application logging: Spring Boot's default console-only logging, no file output, and
only two classes in the whole backend called an SLF4J logger. Security-relevant
rejections (failed logins, `TenantFilter` 401/403s, the `/internal/**` guard filters in
both the gateway and `ai-service`, AI provider failures) produced no log line at all.

## 2. Application logging (logback)

Each of the three Java services (`dealer-core`, `dealer-gateway`, `ai-service`) ships a
`src/main/resources/logback-spring.xml` with two appenders:

- Console (unchanged default pattern), for local `mvn spring-boot:run` / IDE use.
- A daily rolling file appender writing to `${LOG_DIR}/${spring.application.name}-<date>.log`,
  e.g. `dealer-core-2026-10-07.log`.

`LOG_DIR` is read from the `dealerops.log-dir` application property (same
`${ENV_VAR:default}` convention the rest of `application.yml`/`application.yaml` already
uses, e.g. `INTERNAL_TOKEN`, `DEV_JWT_SECRET`). The default is the relative path `log-sum`,
resolved against the process's working directory; all three services are normally started
from the repo root, so they share one `log-sum/` folder there. Set the `LOG_DIR` environment
variable to override it in any other environment (Azure VM, a teammate's machine, CI) or when
a service is started from a different working directory. No new log-field schema was
introduced — this is plain SLF4J text logging, consistent with
[SCOPE-BASELINE.md](SCOPE-BASELINE.md)'s "no new log-field specification" line.

At service startup, a small initializer truncates the current service/date file in place before
normal application logging continues. This keeps the required daily filename while ensuring a
restart does not retain the previous process's output. IntelliJ local run configurations set
`LOG_DIR=$PROJECT_DIR$/log-sum`; command-line launches should set the equivalent repository-level
`LOG_DIR` when their working directory is a module folder.

Spring Boot liveness and readiness probes are exposed for all three Java services. Core readiness
includes MySQL, and gateway readiness checks both core and ai-service health endpoints. Use
`/actuator/health/readiness` as the local “safe to use” check and
`/actuator/health/liveness` as the process liveness check.

Logging was added at single, centralized points per service rather than scattered calls,
matching the existing `ApiExceptionHandler` convention:

- `dealer-core`: `AuthService.login()` logs success/failure (username only, never the
  password). `TenantFilter`'s private `write()` helper — the single exit point for every
  401/403/500 rejection in that filter — logs method, path, status, and code.
- `ai-service`: `InternalGuardFilter` logs a rejected `/internal/**` request. `AiExceptionHandler`
  logs every `ModelFailureException` (warn for timeout/key-missing, error for a provider
  failure), covering both `AdCheckAdapter` and `AssistantAdapter` without touching either.
- `dealer-gateway`: `InternalRouteFilter` logs a rejected `/internal/**` request.
  `SecurityConfig`'s `writeError()` — the single exit point for 401/403 — logs method, path,
  status, and code.

`dealer-web` (Vue/Vite) is not a JVM service; logback does not apply. It keeps its existing
`console.error` on the one place that already had it (`main.ts` startup failure). No new
frontend logging infrastructure was added.

### Gateway request log fields

Every gateway request is written to the dated gateway log with a single structured text line:

```text
requestId=<id> user=<username> service=<dealer-core|ai-service|unmatched> \
downstreamService=<service> downstreamUri=<target-uri> \
api=<method> <path> query=<query-json> params=<body-json> \
route=<route-id> status=<http-status> durationMs=<elapsed-time>
```

The gateway obtains `user` from the authenticated JWT principal; unauthenticated login and
internal downstream calls are recorded as `anonymous`. JSON request bodies and query values
are included for local debugging, while passwords, tokens, authorization values, secrets, and
cookies are replaced with `[REDACTED]`. The request ID is forwarded across gateway hops so
the external gateway line can be correlated with the internal AI-service line. Core calls
ai-service directly (`AI_BASE_URL`, see [18-Backend-Core-Engineering.md](18-Backend-Core-Engineering.md)),
so `AiGatewayClient` copies the incoming `X-Request-ID` onto each `/internal/v1/**` call; the
gateway, core, and ai-service lines for one browser request share one `requestId`.

`ai-service` keeps its defaults in `application.yaml`. The vendored ai-manager sources
(`com.manager`, see `backend/java/ai-service/README.md`) bring no Spring configuration file, so
`spring.application.name` is always `ai-service` and the log is `ai-service-<date>.log`. The
`ai-service` build also excludes the local, Git-ignored key
notes (`ai-key.md`, `api-key.md`) from the jar.

## 3. Local tracing (SkyWalking) — scope note

[15-Data-Auth-and-Gateway.md §9](15-Data-Auth-and-Gateway.md) argued against Service Bus
partly because it would need "a second observability stack" the three-person sprint has no
time for, and [SCOPE-BASELINE.md](SCOPE-BASELINE.md) defers "a full observability schema."
Neither line is a blanket ban on a developer-local tracing tool, but this addition is close
enough to that boundary that it is recorded here explicitly, with the deliberately narrow
scope that keeps it out of the way of grading and the Azure deploy:

- **Local-only.** SkyWalking's OAP collector + UI run via `docker compose -f
  deploy/skywalking/docker-compose.yml up -d` (H2 storage, no Elasticsearch). They are not
  part of `deploy/terraform`, the Azure App Service deploy, or any CI workflow. The two-environment
  split (Azure VM + local VM) is unaffected either way.
- **Opt-in per service, per developer.** The Java agent is not baked into any run
  configuration or startup script. A developer who wants traces downloads the agent once
  (`deploy/skywalking/download-agent.sh`, fetches into the gitignored
  `deploy/skywalking/agent/`) and adds `-javaagent:deploy/skywalking/agent/skywalking-agent.jar`
  plus `SW_AGENT_NAME=<service-name>` to their own local JVM invocation. Running any service
  without that flag works exactly as before — SkyWalking is invisible to the app otherwise.
- **No new cost or identity footprint.** Nothing is deployed to Azure; no new Key Vault
  secret, App Service, or Terraform resource exists because of this.
- **Versions pinned together.** OAP server, UI, and Java agent are all `9.7.0` (the last
  release where all three shipped from the same Apache release train), avoiding protocol
  drift between agent and collector.

This is a scope addendum under SCOPE-BASELINE's own change process ("re-sign of this page or
email confirmation"); it is recorded here as the team's decision, but still needs the
instructor sign-off that document calls for before being treated as settled for grading
purposes.

## 4. Local setup

```
# One-time per developer, per machine:
docker compose -f deploy/skywalking/docker-compose.yml up -d
deploy/skywalking/download-agent.sh

# UI: http://localhost:8088

# To trace a service locally, add to its JVM invocation, e.g. for dealer-core:
SW_AGENT_NAME=dealer-core \
SW_AGENT_COLLECTOR_BACKEND_SERVICES=127.0.0.1:11800 \
JAVA_TOOL_OPTS="-javaagent:$(pwd)/deploy/skywalking/agent/skywalking-agent.jar" \
mvn -f backend/java/dealer-core/pom.xml spring-boot:run
```

Repeat with `SW_AGENT_NAME=dealer-gateway` / `ai-service` for the other two services.
`dealer-web` is not instrumented (SkyWalking's Java agent does not apply to a Vite/Vue
frontend; browser RUM instrumentation was judged out of scope for this addendum).

## 5. Release time on every app

Every deploy must be visible: each of the four apps reports when it was published, so a tester or the project manager can confirm which release is running without opening the Azure portal.

**Value.** One UTC string per app, `yyyy-MM-ddTHH:mm:ssZ` (second precision), resolved once at startup:

1. `PUBLISHED_AT` (Java apps) or `VITE_PUBLISHED_AT` (web) when set. `deploy/terraform/deploy-apps.sh` generates one timestamp per run and stamps it on every app it deploys, so a full deploy shows the same time on all four. A partial deploy (`deploy-apps.sh core web`) changes only the apps it touched.
2. Otherwise the build time. The Java apps read `build.time` from `META-INF/build-info.properties`, which the `spring-boot-maven-plugin` `build-info` goal writes on every Maven build. The web app uses the Vite build time, or the dev-server start time under `npm run dev`. Because every local start begins with a clean build ([AGENTS.md](../AGENTS.md)), a local run shows its own build time.
3. Otherwise `local` (a Java app built without Maven, for example by an IDE compiler alone).

**Where it appears.**

| Place | What it shows | Source |
|---|---|---|
| Startup log of each Java app | `Release: <service> published <time>`, one INFO line at `ApplicationReadyEvent` | `ReleaseInfo` (core, ai-service), `ReleaseEndpoint` (gateway) |
| `GET /actuator/info` on core and ai-service | `release.publishedAt` plus Spring's `build` block | `ReleaseInfo` `InfoContributor` |
| `GET /actuator/release` on the gateway | `{"gateway","core","ai"}`. Core and ai-service are read from their `/actuator/info` with a 2 s timeout; an unreachable app shows `unavailable` | `ReleaseEndpoint` |
| Swagger description (served through the gateway) | title `DealerOps Gateway API`, version `v1`, `API published <time>` (the dealer-core release time), plus a pointer to `/actuator/release` | core `OpenApiConfig` |
| Web app, fixed at the bottom left of every page, including `/login`, except the public landing page `/` | `Published (UTC)` with one line each for web, gateway, core and ai | `dealer-web/src/App.vue` |

**Access.**
- `GET /actuator/release` is anonymous on the gateway because the footer is shown before sign-in. It returns only timestamps.
- Core and ai-service expose `info` alongside `health`. Core permits only `/actuator/health` and `/actuator/info` anonymously. Neither app is reachable from a browser (design/15 §10), so only the gateway reads them.
- Every other actuator path stays closed, and the catch-all 404 route on the gateway excludes `/actuator/release`.

**Terraform.**
- `PUBLISHED_AT` is part of `common_app_settings`, so it is set on all three Java apps.
- Each app ignores later changes to it, so the value written by the deploy step survives the next `terraform apply`.
- The variable `published_at` (default `cloud`) is only the value before the first deploy.

## 6. Service-level objectives (NFR-07)

Targets for the cloud deployment. They are measured from the gateway request log and `/actuator/health`; no load test has been run yet, so they are objectives, not measured results.

| Objective | Target |
|---|---|
| Availability of `/actuator/health` on the gateway (all downstream `UP`) | 99.5% per calendar month |
| Non-AI API latency at the gateway | p95 under 1 s |
| Ad compliance check | completes or returns `AI_UNAVAILABLE` within 15 s (AI-02) |
| Throughput per signed-in user | up to 600 requests/min before `RATE_LIMITED` (design/19 §1.5.1) |

## 7. Application logging convention (current .NET runtime, 2026-10-21)

This section applies to the active .NET 10 services and replaces §2's per-class guidance for them. Logs are for operators; the business record of who changed what is the audit trail (requirements AUD-01–16, design/15 §8.8), not the log.

- **Injection.** A class that logs takes `ILogger<T>` in its constructor and keeps it in `private readonly ILogger<T> _logger`. No extra registration is needed.
- **Structured templates.** Use message templates with named placeholders, never string interpolation, for example `"Payment recorded paymentId={PaymentId} vehicleId={VehicleId} dealerId={DealerId} by {Actor}"`. Log at key business points: a completed change, a rejected attempt, an external call that fails.
- **Levels.** `Information` for a successful business change and for the one access line per request; `Warning` for a rejected or suspicious attempt (failed sign-in, forbidden action, cross-dealership access, rate limit) and for a pipeline failure the request still answers; `Error` only together with the caught exception. Do not log the same failure twice.
- **No personal data, secrets, prompts, or ad text.** Log ids and usernames only. Never log passwords, tokens or claims, API keys, email addresses, phone numbers, home addresses, note or message bodies, a typed sign-in identifier that matched no account, model prompts or responses, assistant questions, or listing title/body text. An update line names the changed field keys, never their values. Do not log a query string, an audit JSON blob, or an exception message that can echo a token or a row value.
- **Correlation.** A line written during a request includes the request id that already exists (`X-Request-ID`, stored on the request and echoed as `[{RequestId}]` on the access line). No second id is created. A startup line has none.
- **Comments.** Classes and public methods carry a `///` summary of their responsibility; inline comments explain why, not what.

### 7.1 Gateway events (`DealerOps.Gateway`)

Besides the per-request line (`requestId`, method, path, `user`, status, `durationMs`), the gateway writes one `Warning` per rejection:

| Event | Fields | Source |
|---|---|---|
| `Rejected JWT` | `reason` (exception type name only), method, path | `Program.cs` `OnAuthenticationFailed` |
| `Rejected token without an API role` (401) | `user`, method, path | `Program.cs` role gate |
| `Forbidden platform admin on business route` (403) | `user`, method, path | `Program.cs` role gate (AUTH-08) |
| `Rate limit exceeded` (429) | `clientIp`, `user` (or `anonymous`), method, path | `Middleware/RateLimitSetup.cs` (design/19 §1.5.1) |
| `Downstream health check failed` | `service`, and `status` or `reason` | `Health/DownstreamHealthCheck.cs` |
| `Rejecting … (missing or invalid / non-internal path carries X-Dealer-Internal)` | method, path, header name | `Middleware/InternalRouteFilter.cs` |

### 7.2 AI service events (`DealerOps.AiService`)

`AiProviderClient.ChatAsync` is the single model-call point, so it logs every call:

- `Information` `AI call operation={Operation} model={Model} durationMs={DurationMs} outcome={Outcome}`, once per call in `finally`. `operation` is `ad-check` or `assistant`; `outcome` is `ok`, `provider_status`, `timeout`, `unreachable`, or `error`.
- `Warning` `AI provider failed` (`operation`, `model`, provider HTTP `status`) or `AI provider unreachable` (`operation`, `model`, `reason` = `HttpRequestError`).
- `AiExceptionFilter` logs `AI request failed code={Code} status={Status} {Path}` as a `Warning`; `InternalGuardFilter` logs a rejected `/internal/**` request.

The system prompt, the listing JSON, the assistant question, and the model reply are never logged.

### 7.3 Core events (`DealerOps.Core`)

Every `Information` line ends with `by {Actor}` (the signed-in username) unless marked *system* or *self*. `dealerId` is present on every tenant-scoped event.

| Module | Information events | Extra fields |
|---|---|---|
| Auth (`AuthService`, `AdminSeeder`) | Account registered; Sign-in succeeded; Seeded platform admin account | `userId`, `username`, `method` (`password`/`google`/`firebase`) — *self/system* |
| Me (`MeController`) | Profile updated; Account self-deleted | `userId`, `username`, `fields` — *self* |
| Dealer admin | Dealer created; Dealer updated | `fields` |
| Membership | Member bound; Member role changed; Member password reset; Member unbound | `username`, `newLogin`, `PreviousRole`→`Role` |
| Join requests | Join request filed (*self*); approved; rejected | `username`, `membershipId` |
| Vehicle | created; updated; sold; repair cost updated; deleted | `vehicleId`, `stockNumber`, `fields` |
| Vehicle photo | uploaded; enhanced; deleted | `photoId`, `vehicleId`, `bytes`, `preset`, `previousPreset` |
| Payment | Payment recorded; Payment removed | `paymentId`, `vehicleId`, `amount`, `method`, `paidOn` |
| Customer | created; updated; deleted; vehicle linked; vehicle unlinked | `customerId`, `fields`, `linkId`, `vehicleId` |
| Lead | created; updated; note added | `leadId`, `customerId`, `OldStage`→`NewStage`, `fields`, `noteId` |
| Buyer site | Buyer inquiry filed (anonymous) | `leadId`, `vehicleId`, `customerId`, `newCustomer` |
| Work order | created; updated; completed | `workOrderId`, `vehicleId`, `fields`, `status`, `cost` |
| Listing | created; updated; marked ready; exported | `listingId`, `vehicleId`, `contentVersion` |
| Compliance | Compliance check recorded; Compliance rule override | `listingId`, `checkId`, `recommendation`, `aiStatus`, `ElapsedMs`; `ruleId`, `Action` |
| Notifications | Notification created (*system*); Notification resolved | `notificationId`, `kind`, `action` |

`Warning` events:

| Event | Fields | Source |
|---|---|---|
| Sign-in failed | `username` (`anonymous` when no account matched), `method`, `reason` | `AuthService` (with a `LOGIN_FAILED` audit row) |
| Manager removal rejected | `dealerId`, `username`, actor | `MembershipService` |
| Self-deletion refused for platform admin | `username` | `MeController` |
| Change to closed work order rejected | `workOrderId`, `status`, `dealerId`, actor | `WorkOrderService` |
| Vehicle photo enhancement rejected | `photoId`, `vehicleId`, `preset`, `code` | `VehiclePhotoService` |
| Ad check AI unavailable | `listingId`, `dealerId`, actor, with the exception | `ComplianceCheckService` (check stored as `UNAVAILABLE`) |
| AI call failed / reported failure / returned no summary | `path`, `status`, `error`, `elapsedMs` | `Integration/AiGatewayClient` |
| vPIC call failed / returned no Results | `operation`, `status`, `error`, `elapsedMs` | `Catalog/VehicleCatalogService` (`CATALOG_UNAVAILABLE`) |
| Rejected JWT | `reason` (exception type name only), method, path, request id | `Program.cs` `OnChallenge`, only when token validation threw |
| Forbidden | method, path, request id | `Program.cs` `OnForbidden` (authorization middleware) |
| Version conflict | method, path, request id | `ApiExceptionFilter`, the concurrency collision only |
| Audit summary unreadable | `auditEventId`, `column` (`fieldSummary` or `previousValues`) | `AuditService` |
| Schema upgrade skipped | statement, MySQL error text | `Program.cs` startup, when existing rows block a constraint |

`Error`, one line, exception attached: unhandled exception in `Program.cs`, with method, path, and request id. A client disconnect (`OperationCanceledException`) is not logged.

### 7.4 Core pipeline (host, exception filter, audit read)

These lines are the host and the audit reader. They are not a second copy of the business events above.

- **Access line.** `RequestLoggingMiddleware` already writes one `Information` line per request: method, path, status, duration, and the existing request id. The query string is not included. A 401 with no token stays on that line only; there is no exception to log.
- **Unhandled exception.** `Error`, with the exception, method, path, and the existing request id. `ApiException` is handled before this and is not logged again: the access line already has the status, and the domain service logs the rejection when it is one.
- **Rejected JWT.** `Warning` when a presented token fails validation. `reason` is the exception type name. The token and the exception message are not logged. A missing token is not this line.
- **Forbidden.** `Warning` from the authorization middleware only. Dealership rejections that a service or the tenant middleware already logs are not written again here.
- **Version conflict.** `Warning` only for `DbUpdateConcurrencyException` (two saves passed the service check and collided). The exception text is omitted because it can contain row values. A version check the service throws itself is an `ApiException` and is not logged again in the filter.
- **Audit summary.** `Warning` when stored `fieldSummary` or `previousValues` JSON cannot be parsed. The line has the audit event id and the column name. The JSON and the parser message are omitted because they hold contact values. A record history still returns that row with the blob empty. A customer or vehicle history match that cannot read `fieldSummary` drops the link row, because it can no longer tell which record the row belongs to.
- **Startup schema.** An index, foreign key, or column that is already present is not a failure and is not logged. A constraint the existing rows block is the `Warning` already written at startup (statement and MySQL error text). That line has no request id.
