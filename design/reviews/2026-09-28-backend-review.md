# Backend review (2026-09-28)

Reviewed product server modules: `dealer-core` (servlet API, JPA, tenancy), `dealer-gateway` (Spring Cloud Gateway), and `ai-service` (internal model adapter). `references/` was not treated as product code. Generated output, `node_modules`, and `.git` were skipped. Tests and design docs were used only to decide whether a symbol has a caller or a required contract, not as review targets.

## Summary

| Category | High | Medium | Low |
| --- | --- | --- | --- |
| dead-code | 0 | 1 | 3 |
| duplication | 0 | 4 | 0 |
| design-pattern | 0 | 2 | 0 |
| correctness | 1 | 1 | 0 |

Twelve findings: 1 high, 8 medium, 3 low.

## Findings

### B-01 Linking a sold vehicle succeeds
- Severity: high
- Category: correctness
- Location: `dealer-core/src/main/java/com/dealerops/core/customer/CustomerService.java` lines 109-135 and 149-151; `dealer-core/src/main/java/com/dealerops/core/common/exception/ErrorCode.java` line 7; `dealer-core/src/main/java/com/dealerops/core/customer/CustomerVehicleController.java` lines 22-25; `dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleStatus.java` lines 3-6
- Evidence: `PUT` link loads the customer and vehicle with `findByIdAndDealerId`, rejects an existing link, then inserts `customer_vehicle`. It never reads `vehicle.getStatus()`. The same service's `unlink` rejects `VehicleStatus.SOLD` with `SOLD_LOCKED`. `VehicleStatus` has only `IN_STOCK` and `SOLD`, so a sold vehicle in this dealership can be newly linked. `ErrorCode.WRONG_DEALER_OR_SOLD` is declared and thrown only from the exception-handler test stub (`dealer-core/src/test/java/com/dealerops/core/common/exception/ApiExceptionHandlerTest.java` lines 38 and 103). No production path returns that code.
- Direction: Before insert, reject a this-store vehicle whose status is not `IN_STOCK` with `WRONG_DEALER_OR_SOLD` (400). Keep the existing `findByIdAndDealerId` miss as 404.

### B-02 Unmapped JWT role is stored as Dealer.User
- Severity: medium
- Category: correctness
- Location: `dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantFilter.java` lines 59-62, 105-107, and 128-132; `dealer-gateway/src/main/java/ca/sait/dealerops/gateway/config/SecurityConfig.java` lines 45-64
- Evidence: On `dealer-core`, a JWT whose `roles` contain neither `Platform.Admin` nor `Dealer.User` is forbidden except `GET /api/v1/me`. That `/me` path falls through to `upsertAppUser` with a null JWT role. When the `app_user` row has no role yet, the filter writes `AppRole.DEALER_USER` and leaves `dealer_id` null. Later authorization still uses the JWT, so this write does not by itself open business APIs. The gateway returns 401 for the same unmapped token on every `/api/v1` path, including `/me`, so the write happens when a client reaches core directly.
- Direction: Persist a role only when `JwtRoleMapper` returns one. Leave an unmapped token unmapped in `app_user` (or skip the upsert) on the `/me` path.

### B-03 Entra JWT helpers are copied between core and gateway
- Severity: medium
- Category: duplication
- Location: `dealer-core/src/main/java/com/dealerops/core/security/EntraJwtSupport.java` lines 15-94 and `dealer-gateway/src/main/java/ca/sait/dealerops/gateway/security/EntraJwtSupport.java` lines 15-94; `dealer-core/src/main/java/com/dealerops/core/config/JwtDecoderConfig.java` lines 19-61 and `dealer-gateway/src/main/java/ca/sait/dealerops/gateway/config/JwtDecoderConfig.java` lines 20-62; `dealer-core/src/main/java/com/dealerops/core/security/JwtRoleMapper.java` lines 12-24 and `dealer-gateway/src/main/java/ca/sait/dealerops/gateway/security/JwtRoleMapper.java` lines 11-24
- Evidence: The two `EntraJwtSupport` classes match, including issuer checks, JWKS URL rewriting, HS256 key padding, and audience validation. Both `JwtDecoderConfig` classes branch the same way (`useEntraJwks`, placeholder-issuer failure, dev HMAC decoder); only the decoder type differs (`JwtDecoder` vs `ReactiveJwtDecoder`). Both `JwtRoleMapper` classes scan `roles` for `Platform.Admin` then `Dealer.User` and return null otherwise. A fix in one module does not apply to the other.
- Direction: Put the shared issuer, audience, HMAC, and role-name rules in one small library both modules depend on. Keep the reactive vs servlet decoder beans in each module, calling that library.

### B-04 Gateway CORS is configured twice
- Severity: medium
- Category: duplication
- Location: `dealer-gateway/src/main/java/ca/sait/dealerops/gateway/config/CorsConfig.java` lines 20-32; `dealer-gateway/src/main/resources/application.yaml` lines 17-30
- Evidence: `CorsWebFilter` allows one origin from `CORS_ALLOWED_ORIGIN`, methods `GET, POST, PUT, PATCH, DELETE, OPTIONS`, and headers `Authorization` and `Content-Type`, with credentials off. `spring.cloud.gateway.globalcors` repeats those same rules. The default filter `DedupeResponseHeader=Access-Control-Allow-Origin Access-Control-Allow-Credentials, RETAIN_UNIQUE` exists because both sources can emit the CORS headers.
- Direction: Keep a single CORS definition (the `globalcors` block or `CorsWebFilter`) and drop the other once header behavior is checked in the browser.

### B-05 Membership search method is unused; list loads every row
- Severity: medium
- Category: dead-code
- Location: `dealer-core/src/main/java/com/dealerops/core/dealer/MembershipRepository.java` lines 17-21; `dealer-core/src/main/java/com/dealerops/core/dealer/MembershipService.java` lines 43-57
- Evidence: `findByDealerIdAndEntraOidContainingIgnoreCase` has no callers in main or test Java. `list` calls `findByDealerId(dealerId, Pageable.unpaged())`, sorts and filters in memory (`matches` on display name and oid, lines 139-147), then slices with `subList`. The repository already exposes a pageable dealer query, and `Paging` already caps page size, but this path bypasses both.
- Direction: Delete the unused finder or use a pageable query that applies `q` in the database, and return that page through `Paging`.

### B-06 Tenant and actor lookups are copied into each service
- Severity: medium
- Category: duplication
- Location: `dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleService.java` lines 198-206; `dealer-core/src/main/java/com/dealerops/core/customer/CustomerService.java` lines 215-223; `dealer-core/src/main/java/com/dealerops/core/listing/ListingService.java` lines 194-197; `dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckService.java` lines 207-210; `dealer-core/src/main/java/com/dealerops/core/dealer/DealerAdminService.java` lines 122-125; `dealer-core/src/main/java/com/dealerops/core/dealer/MembershipService.java` lines 158-166
- Evidence: `requireTenant()` is the same pair of calls in vehicle, customer, listing, and compliance (`TenantGuard.requireDealerUser()` then `TenantContext.get().tenantDealerId()`). `actorOid()` is the same null-safe `CurrentUser.oid()` read in vehicle, customer, dealer admin, and membership. `MembershipService.currentTid()` is the same pattern for `tid`.
- Direction: Add those accessors once on `TenantGuard` or `CurrentUser` and call them from the services. Leave role checks in `TenantGuard`.

### B-07 Last-check ownership is implemented twice
- Severity: medium
- Category: duplication
- Location: `dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckService.java` lines 136-146; `dealer-core/src/main/java/com/dealerops/core/assistant/AssistantResourceQuery.java` lines 79-88
- Evidence: Both load `lastCheckId` with `findByIdAndDealerId` and then keep the row only when `listingId` and `dealerId` match the listing. Listing responses go through `loadCheck`. Assistant listing cards repeat the filter inline. The two copies can drift (one can drop the dealer or listing match).
- Direction: Have `AssistantResourceQuery` call `ComplianceCheckService.loadCheck` (or one shared package-visible helper) for the listing card.

### B-08 Ad-check and assistant adapters repeat the same model call
- Severity: medium
- Category: design-pattern
- Location: `ai-service/src/main/java/ca/sait/dealerops/aiservice/adapter/assistant/AssistantAdapter.java` lines 32-61; `ai-service/src/main/java/ca/sait/dealerops/aiservice/adapter/adcheck/AdCheckAdapter.java` lines 34-64
- Evidence: Both adapters check `factory.hasApiKey()`, start a conversation with a fresh UUID, serialize the request, call `timedModelCall.request`, map a null or failed `AIResponse` to `ModelFailureException.providerFailed()`, and close the conversation in `finally` while swallowing close failures. Only the system prompt and the success mapping differ (trimmed text vs line-split notes). `AiManagerFactory` already exists; it does not own this lifecycle.
- Direction: Extract a small template that runs key check, start, timed request, and close, and let each adapter supply the prompt and the success mapper. Leave `notesFrom` on the ad-check adapter.

### B-09 Customer-vehicle queries omit dealer id
- Severity: medium
- Category: design-pattern
- Location: `dealer-core/src/main/java/com/dealerops/core/customer/CustomerVehicleRepository.java` lines 9-15; `dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleRepository.java` lines 12-14; `dealer-core/src/main/java/com/dealerops/core/customer/CustomerService.java` lines 119-120, 147, and 164-165
- Evidence: Vehicle, customer, listing, and compliance repositories expose `findByIdAndDealerId`. `CustomerVehicleRepository` uses `existsByVehicleId`, `findByCustomerIdAndVehicleId`, and `findByCustomerIdOrderByLinkedAtDesc` with no dealer parameter. Callers in `CustomerService` pass only ids. Those queries depend on the Hibernate `tenantFilter` being enabled. `@Filter` does not apply to every access path, which is why the other repositories keep `dealerId` in the method.
- Direction: Add `dealerId` to those three methods and pass `requireTenant()` from `CustomerService`, matching `findByIdAndDealerId`.

### B-10 Assistant card filter cannot drop a card
- Severity: low
- Category: dead-code
- Location: `dealer-core/src/main/java/com/dealerops/core/assistant/AssistantService.java` lines 38-52
- Evidence: `allowed` is built from `cards` as `kind:id`. `verified` then keeps cards whose `kind:id` is in that set. The model response is only a summary string (`AiGatewayClient.assistant` at `dealer-core/src/main/java/com/dealerops/core/integration/AiGatewayClient.java` lines 37-46). The filter never reads the summary, so every retrieved card is returned.
- Direction: If cards must stay the retrieval set, return `cards` directly. If the summary must be checked, compare ids that appear in the summary with that set.

### B-11 Empty web config class
- Severity: low
- Category: dead-code
- Location: `dealer-core/src/main/java/com/dealerops/core/config/WebConfig.java` lines 4-7
- Evidence: `@Configuration` class `WebConfig` has an empty body. The comment says CORS belongs to the gateway. No beans, interceptors, or MVC customizers are registered. Nothing references the class except its own declaration.
- Direction: Remove the class when the next core change touches config. CORS stays on the gateway.

### B-12 AI client accessors are unused
- Severity: low
- Category: dead-code
- Location: `ai-service/src/main/java/ca/sait/dealerops/aiservice/support/TimedModelCall.java` lines 20-30 and 36-37; `ai-service/src/main/java/ca/sait/dealerops/aiservice/support/AiTimeouts.java` lines 12-14; `ai-service/src/main/java/ca/sait/dealerops/aiservice/config/AiTimeoutConfig.java` lines 28-35; `ai-service/src/main/java/ca/sait/dealerops/aiservice/support/AiManagerFactory.java` lines 20-22
- Evidence: `TimedModelCall` stores `aiWebClient` and exposes `aiWebClient()`. No caller reads it. Adapters call `request`, which times a `Supplier` with `CompletableFuture` and recomputes `connectTimeoutMs + responseTimeoutMs`. `AiTimeouts.totalMs()` has no callers. `AiTimeoutConfig.aiWebClient` is only injected into that unused field. `AiManagerFactory.apiKey()` has no callers; `hasApiKey()` reads the field directly.
- Direction: Drop the unused getter, `totalMs()`, and `apiKey()` unless a later HTTP adapter is actually going to use the `WebClient`. If it will, call `totalMs()` from `request` so the sum lives in one place.

## Not flagged

- `TenantGuard.assertSameDealer` has no Java callers. `design/18-Backend-Core-Engineering.md` and `review/DealerOps-Design-Review-2026-09-23.md` tell the team to keep it as a second line next to `findByIdAndDealerId`. It was not marked dead.
- `AssistantService` retains up to three texts per oid (`AssistantService.java` lines 24 and 58-71) and never reads them back. `design/AI-CODING-BACKEND.md` BE-T19 requires that in-memory map and forbids persisting it. It was not marked dead.
- `EntityType.LISTING`, `AiStatus.FAILED`, and `Recommendation.NEEDS_AI` are named by the API contract (`design/14-Backend-API-Contract.md`, `design/AI-CODING-BACKEND.md`) even where production code does not write them.
- `ErrorCode.WRONG_DEALER_OR_SOLD` is a required response code. The gap is that link never throws it (B-01), not that the constant should be deleted.
- `Paging.of(int, int)` (lines 18-20) has no callers; the three-argument overload is what services use. Too small to list on its own.
- `spring-boot-starter-validation` on `ai-service` and `dealer-gateway` has no `jakarta.validation` use in those modules. Not flagged; it may stay for contract parity with core.
- `OmvicRuleEngine.run` is one long method of independent checks (`OmvicRuleEngine.java` lines 74-183). Splitting each rule into a strategy would be a rewrite, not a small structural fix.
- Admin business blocking uses path prefixes in `TenantFilter.adminBlockedBusiness` (lines 147-156). Current business controllers sit under those prefixes or call `requireDealerUser()`. A policy type is optional until a new top-level path appears.
- Gateway `NotRoutePredicateFactory`, `InternalRouteFilter`, and ai-service `InternalGuardFilter` are live. The missing Spring Cloud Gateway `Not` predicate is why the custom factory exists (`NotRoutePredicateFactory.java` lines 12-15).
- Cross-module internal DTOs (`VehiclePublic`, `DealerPublic`, `AdCheckInternalRequest`, `AssistantInternalRequest` / `ResourceRef`) match the ai-service records by JSON fields. Separate deployables need their own records.
- `dealer-core` `findById` on `DealerRepository` is used for the dealer row itself (admin, `/me`, listing export, compliance), not for tenant-owned business entities.
- Sold-vehicle PATCH may still change `conditionCode`. `design/14-Backend-API-Contract.md` allows that and reserves `SOLD_LOCKED` for purchase fields, a second sell, and unlink.
- No commented-out production blocks were found in the three modules' `src/main` Java.
