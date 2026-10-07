# 20. Observability: application logging and local tracing

Status: **currently in force**, scope addendum to [SCOPE-BASELINE.md](SCOPE-BASELINE.md) — see "Scope note" below.

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
the external gateway line can be correlated with the internal AI-service line.

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
mvn -f dealer-core/pom.xml spring-boot:run
```

Repeat with `SW_AGENT_NAME=dealer-gateway` / `ai-service` for the other two services.
`dealer-web` is not instrumented (SkyWalking's Java agent does not apply to a Vite/Vue
frontend; browser RUM instrumentation was judged out of scope for this addendum).
