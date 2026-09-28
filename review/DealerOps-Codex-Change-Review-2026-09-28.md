# Review of Codex's Uncommitted Fix — 2026-09-28

Historical snapshot. Later working-tree fixes and current verification are recorded in [requirements verification](../requirements/analysis/12-Requirements-Code-Verification-2026-09-28.md). Do not treat the findings below as an unchanged active backlog.

Scope: the uncommitted working-tree changes present when this review started (`git status` shows ~65 modified files plus new `design/reviews/`, `design/assets/`, and three new `review/*.md` files). This review verifies the six High-severity findings from `review/DealerOps-Code-Review-2026-09-28.md` against those changes, and actually compiles/tests the three backend services plus type-checks the frontend — the prior `review/DealerOps-Requirements-Resolution-2026-09-28.md` note explicitly said its own read-only check "does not declare the whole code review closed" and that tests had not been run this round. No code was changed by this review; two test failures found below are still open.

## Verdict: the six High findings are correctly fixed

| ID | Evidence | Verdict |
|---|---|---|
| DC-1 (`ListingService.patchByVehicle` reset fields to defaults on partial PATCH) | New `applyPresentFields()` (`ListingService.java:86-104`) only writes a field when the request carries a non-null value; Jackson maps an omitted JSON key to `null`, so omitted fields now keep the stored value. | **Fixed** |
| DC-2 (`ComplianceCheckService` could stamp PASSED against a newer content version than evaluated) | `evaluatedContentVersion` is captured at the top of `check()` (line 76, before the AI call) and threaded through to `persistCheck()`, which now stamps that captured value instead of re-reading `current.getContentVersion()`. | **Fixed** |
| DW-1 (`AdsView.vue` vehicle-switch race could persist one vehicle's ad copy onto another) | `vehicleListSeq`/`listingLoadSeq` sequence counters plus a `loadedListingVehicleId` guard now gate every response handler (`select`, `refreshListing`, `save`, `runCheck`, `markReady`) so a stale response is dropped and `save()` refuses to fire if the loaded listing doesn't match the currently selected vehicle. | **Fixed** |
| GW-1 (gateway JWT defaults to `dev` mode with a hardcoded secret if `JWT_MODE` unset) | `JwtDecoderConfig.explicitJwtMode()` now throws `IllegalStateException` at startup if `JWT_MODE` isn't explicitly set via env/system property/command line (the `${JWT_MODE:dev}` Spring-config placeholder no longer counts as an explicit source). The classroom default HMAC secret is additionally rejected unless an active Spring profile is `dev`/`local`/`test`/`default`/`classroom`. | **Fixed** |
| GW-2 (`/internal/v1/**` shared-secret defaults to the same hardcoded value in all three services) | Both `InternalRouteFilter` (gateway) and `InternalGuardFilter` (ai-service) now fail closed at startup (`afterPropertiesSet`/`initFilterBean`) if `INTERNAL_TOKEN` is still the well-known default and no `dev`/`local` profile is active, with a matching runtime double-check in the filter itself. | **Fixed** |
| GW-3 (AI-call timeout didn't cancel the task, risking thread starvation on `ForkJoinPool.commonPool()`) | `TimedModelCall` now runs calls on a dedicated bounded `ThreadPoolExecutor` (16 threads, 16-deep queue, daemon threads) and calls `future.cancel(true)` on timeout instead of just abandoning the `CompletableFuture`. | **Fixed** |

Two related Medium findings were fixed as a side effect and are worth noting: **GW-6** (anonymous Swagger exposure) — `SecurityConfig.anonymousOpenApiEnabled()` now permits the OpenAPI paths only under a local/dev profile, denies otherwise; **GW-7** (CORS defined twice) — `spring.cloud.gateway.globalcors` was removed from `application.yaml` entirely, leaving `CorsConfig.java` as the sole CORS policy.

## Build and test verification (this review's own work, offline `mvn`)

| Module | Compile | Unit tests |
|---|---|---|
| `dealer-core` | Clean | All pass (surefire `*Test.java`; container-backed `*IT.java` not run — no Docker check attempted) |
| `ai-service` | Clean | All pass, including `TimedModelCallTest` and `InternalGuardFilterTest` |
| `dealer-gateway` | Clean | **2 failures** (see below) |
| `dealer-web` | `vue-tsc --noEmit` clean | No test runner installed for the existing `__tests__/*.spec.ts` files (pre-existing gap, not introduced by this diff) |

### Test regression: two gateway tests now fail

`CorsHeadersTest.corsOriginIsEnvNotLocalhostOnly` and `GatewayNotPublicTest.yamlRoutesInternalHeaderAndOmitsInternalFromCors` both assert that `application.yaml` still contains a literal `allowedHeaders: [Authorization, Content-Type]` line under `spring.cloud.gateway.globalcors`. That block was intentionally removed as the GW-7 fix (CORS now lives only in `CorsConfig.java`, which is what the sibling test `CorsHeadersTest.corsConfigReadsEnvOrigin` already checks and still passes). The two failing tests are testing the old, duplicated design — they need to be updated to assert against `CorsConfig.java` instead of `application.yaml`, not reverted. This is not a functional regression; it will fail CI as-is if committed unchanged.

## Not re-verified in this pass

Medium/Low items from the original code review (DC-3/DC-4 assistant issues, GW-4/GW-5/GW-8/GW-9/GW-10, DW-2/DW-3/DW-4/DW-5/DW-6/DW-7/DW-8) were not individually re-checked against the working tree in this pass — the diff is large enough (65+ files) that confirming those would need another dedicated pass. `dealer-core` and `ai-service` unit-test suites passing whole is reassuring but not proof each one was addressed.
