# DealerOps Code Review — 2026-09-28

Historical snapshot. Later working-tree fixes and current verification are recorded in [requirements verification](../requirements/analysis/12-Requirements-Code-Verification-2026-09-28.md). Do not treat the findings below as an unchanged active backlog.

Update: the findings below describe the reviewed HEAD, not all current uncommitted changes. See [requirements resolution](DealerOps-Requirements-Resolution-2026-09-28.md) for the six documentation fixes and a limited recheck of existing code changes. RA-1/RA-3 are no longer current documentation defects; this does not claim the entire code report is closed.

Scope: (1) audit of `requirements/analysis/` against the current state of `design/` and the actual code (the analysis docs note they were never verified against code except for A2/A3/B4); (2) a fresh line-by-line code review of all four services — `dealer-core`, `dealer-gateway`, `ai-service`, `dealer-web` — against the current commit (`1694510`). No code was changed by this review.

Method: read the requirement/design docs directly; verified the A2/A3/B4 fix (`128c86b`) against `OmvicRuleEngine.java`, `CustomerService.java`, `CrmView.vue`. The four codebases were then reviewed in parallel by dedicated passes (dealer-core; dealer-gateway + ai-service; dealer-web), each reading the full source tree of its module.

---

## Part 1 — Requirements-analysis audit

The existing `requirements/analysis/` set (01–11, Traceability-Matrix) is thorough and its A2/A3/B4 findings were correctly closed in code. Three problems remain:

| ID | Severity | Finding |
|---|---|---|
| RA-1 | **Medium** | The A3 fix (sold vehicles can now be linked) updated code, tests, `requirements/analysis/*`, and `design/16`, but **not** `design/14-Backend-API-Contract.md:427,723`, `design/18-Backend-Core-Engineering.md:210,281`, or `design/13-Frontend-Engineering.md:179`. Those three still document `WRONG_DEALER_OR_SOLD` blocking a sold-vehicle link and the picker calling `GET /vehicles?status=IN_STOCK` — both false against current code. A reader or coding agent following 13/14/18 alone would reintroduce the bug A3 fixed. |
| RA-2 | Low | `ErrorCode.WRONG_DEALER_OR_SOLD` (`dealer-core/.../common/exception/ErrorCode.java:7`) is now unreachable from the real link flow — `CustomerService.link()` no longer throws it. Only a generic exception-mapping test (`ApiExceptionHandlerTest.java:38,103`) still exercises the code, giving false confidence that it's live. |
| RA-3 | Low | Internal inconsistency in the analysis set itself: `requirements/analysis/07-Open-Questions-and-Assumptions.md` Q-15 assumes OMVIC rules live in "a config file, effective on restart"; `requirements/analysis/08-Design-Review.md` finding A7 (independently verified true in this review) says they're hardcoded `static final Pattern` constants in `OmvicRuleEngine`. The two were never reconciled. |

Also confirmed: A8 ("no legal-advice disclaimer") is genuinely still open on `main` — `10-Cursor-Change-Review.md`'s "Verified OK: disclaimer present in `AdWorkspace.vue`" referred to Cursor's reverted work-in-progress branch, not the code that actually landed in `128c86b`. No disclaimer text exists in `dealer-web/src/views/` today. The open-items table in `requirements/ANALYSIS-LOG.md` is otherwise accurate.

---

## Part 2 — Code review findings

### dealer-gateway / ai-service

| ID | Severity | Evidence | Failure scenario |
|---|---|---|---|
| GW-1 | **High** | `dealer-gateway/.../security/EntraJwtSupport.java:21,60-65`, `.../config/JwtDecoderConfig.java:28,41,53-62` | JWT mode defaults to `dev` when `JWT_MODE` is unset, signing/validating with a hardcoded, git-committed HMAC secret (`"dealer-dev-jwt-secret-change-me"`). A deployment that forgets to set `JWT_MODE=entra` accepts tokens forged with this public secret for any role, including `Platform.Admin`. |
| GW-2 | **High** | `dealer-gateway/.../application.yaml:50,74`, `.../filter/InternalRouteFilter.java:24-25,34`, `ai-service/.../application.yaml:15`, `.../config/InternalGuardFilter.java:18,28` | `/internal/v1/**` — reachable through the public gateway, not a private network — is gated only by a shared-secret header whose default (`"dealer-internal"`) is identical and hardcoded across all three services. If `INTERNAL_TOKEN` isn't rotated, anyone can call the AI endpoints directly with arbitrary JSON and no tenant/user identity (the gateway strips `Authorization` on this route), burning AI budget and bypassing dealer-core. |
| GW-3 | **High** | `ai-service/.../support/TimedModelCall.java:36-52` | `CompletableFuture.supplyAsync(call).orTimeout(...)` does not cancel/interrupt the task on timeout; the blocking AI call keeps running on the JVM-wide `ForkJoinPool.commonPool()`. Sustained AI-provider slowness accumulates orphaned blocked threads on a pool shared with other parallel work — a thread-starvation risk, not a clean fail-closed. |
| GW-4 | Medium | `dealer-gateway/.../application.yaml:33,41,47` | No connect/response timeout configured for the proxied routes to `CORE_URL`/`AI_URL`; a hung backend can hold gateway connections open indefinitely (contrasts with ai-service's own deliberate 2s/13s outbound budget). |
| GW-5 | Medium | `ai-service/.../support/AiManagerFactory.java:32-38`, `.../adapter/adcheck/AdCheckAdapter.java:39-55`, `.../AssistantAdapter.java:37-52` | A new `AiManager` is built per request; only `closeConversation(...)` runs in `finally`, never a close/shutdown of the manager itself. If the third-party manager opens its own HTTP client per instance, this leaks a client per request under load (inferred from the call pattern, not confirmed against the library's internals). |
| GW-6 | Medium | `dealer-gateway/.../application.yaml:40-45`, `.../config/SecurityConfig.java:30-34` | Swagger/OpenAPI docs for dealer-core are proxied through the gateway `permitAll`, no bearer token required — exposes the full internal API schema to anonymous callers. |
| GW-7 | Low | `dealer-gateway/.../config/CorsConfig.java`, `.../application.yaml:16-28` | CORS is defined twice (a manual `CorsWebFilter` bean and Spring Cloud Gateway `globalcors`), reconciled only by a `DedupeResponseHeader` filter — the two can drift apart. |
| GW-8 | Low | `ai-service/.../application.yaml:21` | `aimanager.expected-commit` is set but never read anywhere in the source — dead config. |
| GW-9 | Low | `dealer-gateway/.../security/EntraJwtSupport.java:60-65` | A dev HMAC secret shorter than 32 bytes is zero-padded rather than rejected, silently weakening key entropy if a short custom `DEV_JWT_SECRET` is ever set. |
| GW-10 | Low | `ai-service/.../prompt/SystemPrompts.java:7-21` | Untrusted dealer-authored ad copy is embedded directly as prompt content with only prompt-level defenses ("never say OMVIC approved", "never output SQL") — standard prompt-injection exposure. Currently low-impact only because a successful AI call always yields PASSED regardless of note content (tracked separately as A4). |

Verified sound: the gateway never trusts a client-supplied tenant/user header for `/api/v1/**` (only forwards `Authorization`, unmodified); unknown JWT roles are rejected with 401 rather than defaulted permissively; AI failure handling (`ModelFailureException`, `AiExceptionHandler`) fails closed on missing key / timeout / parse failure.

### dealer-core

| ID | Severity | Evidence | Failure scenario |
|---|---|---|---|
| DC-1 | **High** | `listing/ListingService.java:57-60,82-87` (`patchByVehicle`) | Not a real merge-patch: any field left `null` in the request is overwritten with a hardcoded default (`adKind→CASH`, `medium→ONLINE`, `title`/`body`→`""`), not left unchanged. `PATCH {version, title:"New headline"}` on an existing LEASE/RADIO_TV_BILLBOARD ad silently resets it to CASH/ONLINE with no error, changing which `OmvicRuleEngine` branches apply on the next check. |
| DC-2 | **High** | `compliance/ComplianceCheckService.java:67-118` (esp. 84-113) and `149-175` (esp. 164) | The persisted check's `contentVersion` is re-fetched (`current.getContentVersion()`) at save time rather than the version actually evaluated at the start of `check()`. If the ad is edited (bumping content version) while an in-flight AI call is running (up to the 13s timeout budget), the resulting check is stamped with the *new* version. `CheckStatusMapper.derive()` then reports PASSED instead of STALE, and `ListingService.assertExportable()`'s staleness gate — which compares exactly these two version fields — lets `ready()`/`export()` proceed on ad copy that was never actually checked. |
| DC-3 | Medium | `assistant/AssistantService.java:48-51` | The "verified resource card" filter is a no-op: `allowed` is built from the same `cards` list it's then used to filter, so every card is always marked verified regardless of whether the AI's summary text actually referenced it. |
| DC-4 | Medium | `assistant/AssistantService.java:24,39,58-72` | Per-user conversation history (`recent`, a `ConcurrentHashMap<String, Deque<String>>`) is written by `remember()` but never read anywhere, and has no eviction — unbounded growth for the life of the JVM as distinct users call the assistant. |
| DC-5 | Low | `customer/CustomerService.java:140-144` (`unlink`) | `vehicleRepository.findByIdAndDealerId(vehicleId, tenant)` is called twice in the same method — redundant duplicate query. |
| DC-6 | Low | `vehicle/VehicleService.java:80,129`, `customer/CustomerService.java:77,104` | Audit `fieldSummary` values are hardcoded constants (e.g. `Map.of("contactFieldsChanged", true)`) regardless of which fields actually changed — the audit trail records a fixed flag, not a real diff. |

Fresh code-level confirmation of already-tracked design gaps (included as requested, not new items): **A4** confirmed at `ComplianceCheckService.java:111-112` (AI `SUCCESS` hardcodes `PASSED` regardless of note content); **A5** confirmed at `VehicleService.java:102-121` (only `conditionCode` changes bump the linked listing's version — make/model/year/VIN/source/cost/addedOn edits don't); **A6** confirmed across `CreateVehicleRequest`/`PatchVehicleRequest`/`CreateCustomerRequest`/`PatchCustomerRequest` (no VIN 17-char check, no year bound, no email/phone pattern, no `soldOn ≥ addedOn` check) and `listing/dto/PatchListingRequest.java` (zero validation annotations, and `ListingController.java:30-33` doesn't even apply `@Valid` to it).

Tenant isolation verified sound: every entity-by-ID lookup goes through `findByIdAndDealerId`-style repository methods scoped to `TenantContext` (itself derived server-side from JWT + DB membership, never from client input), backed by a defense-in-depth Hibernate `@Filter`. No cross-tenant leak found.

### dealer-web

| ID | Severity | Evidence | Failure scenario |
|---|---|---|---|
| DW-1 | **High** | `dealer-web/src/views/AdsView.vue:87-105` (`select()`) | No request-sequencing guard around `listingsApi.get(vehicle.id)`. Opening vehicle A then quickly vehicle B, with A's response arriving after B's, overwrites `listing.value` with A's title/body while `selected.value` stays B. `save()` then PATCHes B's id with A's content — cross-record ad-copy corruption, not just a display glitch. |
| DW-2 | Medium | `dealer-web/src/views/DmsView.vue:137-150`, `dealer-web/src/views/CrmView.vue:170-192` | Same missing request-sequencing on the edit-drawer GET: double-clicking Edit on two different rows quickly can load the wrong record's data into the drawer. |
| DW-3 | Medium | `dealer-web/src/views/DmsView.vue:226-229`, `dealer-web/src/views/CrmView.vue:262-265` vs `dealer-web/src/views/AdsView.vue:224-230` | Dms/Crm only call `openDeepLink()` in `onMounted`, with no `watch()` on the route query id; Ads correctly uses `watch(() => route.query.vehicleId, ..., { immediate: true })`. If the route stays on the same component and only the query id changes, Dms/Crm won't reopen the drawer for the new id — inconsistent with Ads. |
| DW-4 | Medium | `DmsView.vue:84-99`, `CrmView.vue:83-98`, `AdsView.vue:66-85`, `AdminView.vue:56-72` | List-load calls have no cancellation/sequence token. Rapid Search→Reset or fast pagination can let an older response resolve after a newer one, leaving the table showing stale results (last-response-wins, not last-request-wins). |
| DW-5 | Low | `DmsView.vue:72-82`, `CrmView.vue:57-81`, `AdminView.vue:154-229` | Backend validation detail is discarded: these all map errors to hardcoded strings like "Check required fields" instead of reading `error.response.data.message` (already exposed by `api/http.ts:53-56`'s `messageOf()`), dropping field-specific server messages. |
| DW-6 | Low | `DmsView.vue:293-322`, `CrmView.vue:309-327`, `AdminView.vue:348-353` | No client-side required-field/format validation (`el-form` `rules` unused) before submit — invalid data round-trips to the server before the user sees an error. |
| DW-7 | Low | `dealer-web/src/main.ts:11-15` | `applyGatewayUrl().then(() => initializeMsal()).finally(...)` has no `.catch()`; if `initializeMsal()` rejects, it's an unhandled promise rejection with no user-facing error (the app still mounts via `.finally()`). |
| DW-8 | Low | `dealer-web/src/auth/msal.ts:95-104` (`accessToken`) | On silent-token failure, `acquireTokenRedirect()` is called with no de-dup guard; multiple near-simultaneous calls (e.g. two views loading data at once near token expiry) can trigger concurrent redirect attempts. |

Verified clean: no `v-html` anywhere (no XSS injection points); no leaked event listeners/timers; optimistic-locking `version` correctly round-tripped on every write, with 409 `VERSION_CONFLICT` surfaced as "Refresh and retry" rather than swallowed; router guard correctly sequenced after MSAL init, `meta.roles` enforced.

---

## Priority summary

**High** (correctness/security, worth fixing before any grading/demo that would expose them): DC-1, DC-2, DW-1, GW-1, GW-2, GW-3.
**Medium**: DC-3, DC-4, DW-2, DW-3, DW-4, GW-4, GW-5, GW-6, RA-1.
**Low**: everything else above.

No code was changed as part of this review — findings only.
