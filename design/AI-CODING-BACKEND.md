# AI coding spec: backend (compilable, wired to the contract)

You are the coding AI. Implement only the numbered tasks in this document (BE-Txx). Do not read withdrawn `01`–`06`. Do not implement work orders / leads / password login / Service Bus / a fifth auth repo.
Contract conflicts: HTTP JSON / paths / error codes follow `design/14-Backend-API-Contract.md`; data columns / tenant / membership / empty draft / SOLD / Gateway behavior follow `design/15-Data-Auth-and-Gateway.md`. `18`/`19` only fix file locations; they do not invent another contract.
Stack pinned: Java 21, Spring Boot 3.3.5, four independent repos (`dealer-core` / `dealer-gateway` / `ai-service` / `dealer-web`; `dealer-platform` holds env/compose only and does not run business). Ban merging into a monorepo. Ban core 21 + ai-service 17.
The browser only hits Gateway `http://localhost:8080` prefix `/api/v1/**`. core listens only on `8081`, ai-service only on `8082`; neither configures browser CORS or public Ingress.
Ignore `dealerId` in the client body/query/header (including `X-Dealer-Id`). Cross-store or this store has no such id → **404** `NOT_FOUND` (not 403). Staff without `membership.active=1` calling a business API → **403** `FORBIDDEN` (not 401/404). `GET /me` is still 200 with `dealerId=null`.
Roles come only from JWT `roles[]`: `Platform.Admin`, `Dealer.User`. If Admin and staff appear together → Admin wins. Admin hitting `/vehicles` `/customers` `/listings/**` `/audit` `/assistant` → 403; response body has no vin/cost/customer fields.
Features not listed here = do not build. Ban `ddl-auto=update`. Ban changing `V1__init.sql`, `13`–`19`, BRIEF, README. Ban exposing library `com.gateway` or `/api/ai/**` publicly.
Pagination envelope `{items,page,size,total}`, `page` from 0, `size` defaults to 10 and caps at 10. Error body `{code,message}`; `400 VALIDATION` may include `fieldErrors`. JSON camelCase, money as JSON number, dates `YYYY-MM-DD`, timestamps ISO-8601 UTC.
Implementation order aligns with BRIEF §11: empty repo starts → Flyway/entities → Gateway routes → JWT + `/me` → Admin → vehicle → customer/link-unlink → listing+rules (no AI) → ai-service adapter → checks → ready/export → assistant. Do not skip ahead before prior steps are done.

---

## Global pins (shared by every task)

### Versions

| Item | Value |
|---|---|
| Java | `21` |
| Spring Boot | `3.3.5` |
| Spring Cloud (gateway only) | `2023.0.4` |
| Flyway | Follow Boot BOM (`flyway-core` + `flyway-mysql`) |
| MySQL driver | `com.mysql:mysql-connector-j` (follow BOM) |
| ai-manager | Local development: `com.aimanager:aimanager:1.0.0-SNAPSHOT` (commit `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a`, `mvn install` first). Release: the **non-SNAPSHOT** immutable version built from the same commit. CI stub; do not hit paid endpoints. |
| JPA `ddl-auto` | `validate` (local empty DB relies on Flyway to create tables; ban `update`/`create`) |

### Package names (do not change)

| Repo | Root package |
|---|---|
| dealer-core | `com.dealerops.core` |
| dealer-gateway | `ca.sait.dealerops.gateway` |
| ai-service | `ca.sait.dealerops.aiservice` |

### Error-code enum (these only; do not add a 15th business code)

```java
public enum ErrorCode {
  VALIDATION(400),
  VIN_DUP(400),
  SOLD_PAIR_REQUIRED(400),
  WRONG_DEALER_OR_SOLD(400),
  UNAUTHORIZED(401),
  FORBIDDEN(403),
  NOT_FOUND(404),
  VERSION_CONFLICT(409),
  DUP_MEMBER(409),
  VEHICLE_ALREADY_LINKED(409),
  SOLD_LOCKED(409),
  CHECK_STALE(409),
  NOT_PASSED(409),
  AI_UNAVAILABLE(502);
}
```

### Pagination / error Java records (shared in core)

```java
public record PageResponse<T>(java.util.List<T> items, int page, int size, long total) {}
public record ErrorBody(String code, String message, java.util.Map<String, String> fieldErrors) {}
// fieldErrors is VALIDATION-only; other errors leave this field null; serialize NON_NULL
```

`size` handling: `int size = requested <= 0 ? 10 : Math.min(requested, 10);`

---

### BE-T01 Three-repo `pom.xml` dependency list
- Repo: dealer-core | dealer-gateway | ai-service
- Create/change files:
  - `dealer-core/pom.xml`
  - `dealer-gateway/pom.xml`
  - `ai-service/pom.xml`
- Must include: (class names, method signatures, annotations, config keys)

Shared by all three repos:

```xml
<properties>
  <java.version>21</java.version>
</properties>
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.3.5</version>
</parent>
```

`maven-compiler-plugin`: `release=21`. Package with `spring-boot-maven-plugin`.

**dealer-core required dependencies (keep if present, add if missing; do not add unlisted business starters):**

| artifact | Purpose |
|---|---|
| `spring-boot-starter-web` | HTTP `/api/v1/**` |
| `spring-boot-starter-validation` | Bean Validation |
| `spring-boot-starter-data-jpa` | Entity |
| `spring-boot-starter-oauth2-resource-server` | Verify Entra JWT |
| `org.flywaydb:flyway-core` | Migrations |
| `org.flywaydb:flyway-mysql` | MySQL dialect (required for Flyway 10+) |
| `com.mysql:mysql-connector-j` | Driver |
| `org.springframework.boot:spring-boot-starter-webflux` | `WebClient` outbound to Gateway only (do not start another Netty business port) |
| `spring-boot-starter-test` | test scope |

core **must not** depend on: `spring-cloud-starter-gateway`, `com.aimanager:aimanager`, any password/session starter.

**dealer-gateway required dependencies:**

| artifact | Purpose |
|---|---|
| `org.springframework.cloud:spring-cloud-starter-gateway` | Routing |
| `spring-boot-starter-oauth2-resource-server` | Verify user JWT |
| `spring-boot-starter-validation` | Config validation (optional) |
| `spring-boot-starter-test` | test |

BOM:

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.springframework.cloud</groupId>
      <artifactId>spring-cloud-dependencies</artifactId>
      <version>2023.0.4</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

gateway **must not** depend on: `spring-boot-starter-data-jpa`, `flyway-*`, `mysql-connector-j`, `aimanager`, `spring-boot-starter-web` (Gateway uses WebFlux; do not also pull MVC).

**ai-service required dependencies:**

| artifact | Purpose |
|---|---|
| `spring-boot-starter-web` | `/internal/v1/**` |
| `spring-boot-starter-validation` | body validation |
| `spring-boot-starter-webflux` | Self-managed 15s-timeout HttpClient (omit if using JDK HttpClient only; default is Webflux) |
| `com.aimanager:aimanager` | `1.0.0-SNAPSHOT` or the published immutable version |
| `spring-boot-starter-test` | test |

ai-service **must not** depend on: `spring-boot-starter-data-jpa`, `flyway-*`, `mysql-connector-j`, `spring-cloud-starter-gateway`, `oauth2-resource-server` (internal-header auth; do not verify user JWT).

`aimanager` repository (local may `mvn install` first; when CI uses a stub module keep this coordinate but exclude it in profile `stub`):

```xml
<repository>
  <id>github-ai-manager</id>
  <url>https://maven.pkg.github.com/YUANDONG-YANG/ai-manager</url>
</repository>
```

- Ban: mixing Java 17/21 across the three repos; gateway pulling JPA; core embedding `aimanager`; ai-service pulling Flyway; treating `com.gateway` as a Spring scan package.
- Acceptance:
  1. `rg "java.version" dealer-core/pom.xml dealer-gateway/pom.xml ai-service/pom.xml` is `21` in all three.
  2. `rg "spring-boot-starter-parent" */pom.xml` versions are all `3.3.5`.
  3. `rg "flyway-core|mysql-connector-j|oauth2-resource-server" dealer-gateway/pom.xml ai-service/pom.xml` has no Flyway/MySQL; gateway has no JPA; ai-service has no oauth2-resource-server.
  4. `rg "spring-cloud-starter-gateway" dealer-gateway/pom.xml` present; `rg "spring-cloud-starter-gateway" dealer-core/pom.xml ai-service/pom.xml` absent.
  5. After local `JAVA_HOME` points at 21: `mvn -q -f dealer-core/pom.xml -DskipTests compile`, gateway, and ai-service each exit 0 (ai-service may start with an empty adapter + optional dependency if SNAPSHOT is not installed, but the coordinate must be written).

---

### BE-T02 dealer-core empty repo can start
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/DealerCoreApplication.java`
  - `dealer-core/src/main/resources/application.yml`
  - `dealer-core/Dockerfile`
- Must include:

```java
@SpringBootApplication
public class DealerCoreApplication {
  public static void main(String[] args) { SpringApplication.run(DealerCoreApplication.class, args); }
}
```

`application.yml` pinned:

```yaml
server:
  port: ${CORE_PORT:8081}
spring:
  application:
    name: dealer-core
  datasource:
    url: ${MYSQL_URL:jdbc:mysql://localhost:3306/dealer_core?useSSL=false&allowPublicKeyRetrieval=true}
    username: ${MYSQL_USER:dealer}
    password: ${MYSQL_PASSWORD:dealer_dev_only}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate.jdbc.time_zone: UTC
  flyway:
    enabled: true
    locations: classpath:db/migration
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${ENTRA_ISSUER:https://login.microsoftonline.com/<tenant-id>/v2.0}
          audiences: ${ENTRA_AUDIENCE:api://dealer-api}
dealerops:
  gateway-base-url: ${GATEWAY_BASE_URL:http://localhost:8080}
  internal-token: ${INTERNAL_TOKEN:dealer-internal}
  ai-timeout-ms: 15000
```

**Do not** write `spring.web.cors` / `allowedOrigins: http://localhost:5173`.
`Dockerfile`: `EXPOSE 8081`; `ENTRYPOINT` runs the fat jar.

- Ban: listening on 8080; browser CORS; `ddl-auto=update`; implementing `/internal/v1/**`; changing `V1__init.sql`.
- Later Flyway scripts (do not rename `V1__init.sql`): `V{YYYYMMDD}_{n}__{action}.sql`, for example `V20260923_1__add_listing_search_index.sql`. `{n}` restarts at `1` each calendar day. Two underscores before the action. Do not use `V2__...`.
- Acceptance:
  1. `rg "ddl-auto" dealer-core/src/main/resources/application.yml` is only `validate`.
  2. `rg "allowedOrigins|localhost:5173" dealer-core` none.
  3. When MySQL `dealer_core` is up (compose database only): `mvn -f dealer-core/pom.xml spring-boot:run` logs contain `Tomcat started on port 8081`.
  4. `curl -s -o NUL -w "%{http_code}" http://127.0.0.1:8081/api/v1/me` → `401` (before Security is configured 403/401 is allowed; after this task + T08 it must be 401).

---

### BE-T03 dealer-gateway copy-paste route YAML
- Repo: dealer-gateway
- Create/change files:
  - `dealer-gateway/src/main/java/ca/sait/dealerops/gateway/GatewayApplication.java`
  - `dealer-gateway/src/main/resources/application.yaml`
  - `dealer-gateway/Dockerfile`
- Must include:

```java
@SpringBootApplication
public class GatewayApplication {
  public static void main(String[] args) { SpringApplication.run(GatewayApplication.class, args); }
}
```

**Copy the entire** `application.yaml` (port 8080 / upstream 8081 / 8082, internal header name). CORS is not in this file: it is only in `dealer-gateway` `CorsConfig`. Allowed origin is `CORS_ALLOWED_ORIGIN`, default `http://localhost:5173`. Do not set `spring.cloud.gateway.globalcors` or `DedupeResponseHeader`:

```yaml
server:
  port: ${GATEWAY_PORT:8080}

spring:
  application:
    name: dealer-gateway
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${ENTRA_ISSUER:https://login.microsoftonline.com/<tenant-id>/v2.0}
          audiences: ${ENTRA_AUDIENCE:api://dealer-api}
  cloud:
    gateway:
      routes:
        - id: dealer-core-public
          uri: ${CORE_URL:http://127.0.0.1:8081}
          predicates:
            - Path=/api/v1/**
          filters:
            - PreserveHostHeader
        - id: ai-service-internal
          uri: ${AI_URL:http://127.0.0.1:8082}
          predicates:
            - Path=/internal/v1/**
            - Header=X-Dealer-Internal, ${INTERNAL_TOKEN:dealer-internal}
          filters:
            - RemoveRequestHeader=Authorization
        - id: not-found
          uri: no://op
          predicates:
            - Path=/**
          filters:
            - SetStatus=404

dealerops:
  internal-header-name: X-Dealer-Internal
  internal-token: ${INTERNAL_TOKEN:dealer-internal}
```

When not in compose, `CORE_URL`/`AI_URL` default to `127.0.0.1` (table above). In compose, override to `http://host.docker.internal:8081` / `8082` (same as `env.example`).
`Dockerfile`: `EXPOSE 8080`.

- Ban: routing `/api/v1/**` to ai-service; listing `X-Dealer-Internal` in `Access-Control-Allow-Headers`; connecting MySQL; issuing JWT; package name `com.gateway`.
- Acceptance:
  1. `rg "Path=/api/v1" dealer-gateway/src/main/resources/application.yaml` and the same block `uri` contains `CORE_URL` or `8081`.
  2. `rg "Path=/internal/v1" dealer-gateway/src/main/resources/application.yaml` and contains `X-Dealer-Internal`.
  3. `rg "CORS_ALLOWED_ORIGIN" dealer-gateway/src/main/java/ca/sait/dealerops/gateway/config/CorsConfig.java` and the default origin is `http://localhost:5173`.
  4. `rg "X-Dealer-Internal" dealer-gateway/src/main/java/ca/sait/dealerops/gateway/config/CorsConfig.java` shows allowed headers that do not include that header. `application.yaml` has no `globalcors` and no `DedupeResponseHeader`.
  5. After gateway starts: `curl -s -o NUL -w "%{http_code}" http://localhost:8080/internal/v1/ad-check` → `404` (no internal header).
  6. `curl -s -o NUL -w "%{http_code}" http://localhost:8080/no-such` → `404`.

---

### BE-T04 ai-service empty repo + 15s timeout pattern
- Repo: ai-service
- Create/change files:
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/AiServiceApplication.java`
  - `ai-service/src/main/resources/application.yaml`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/config/AiTimeoutConfig.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/config/InternalGuardFilter.java`
  - `ai-service/Dockerfile`
- Must include:

```java
@SpringBootApplication(scanBasePackages = "ca.sait.dealerops.aiservice")
public class AiServiceApplication {
  public static void main(String[] args) { SpringApplication.run(AiServiceApplication.class, args); }
}
```

`application.yaml`:

```yaml
server:
  port: ${AI_PORT:8082}
spring:
  application:
    name: ai-service
dealerops:
  ai:
    timeout-ms: 15000
    require-internal-header: true
  internal-header-name: X-Dealer-Internal
  internal-token: ${INTERNAL_TOKEN:dealer-internal}
aimanager:
  api-key: ${AIMANAGER_API_KEY:}
  gateway-provider: ${AIMANAGER_GATEWAY_PROVIDER:openai}
  gateway-model: ${AIMANAGER_GATEWAY_MODEL:}
```

Timeout must be self-implemented (library `WebClient.blockOptional()` has no 15s guarantee). `AiTimeoutConfig` pinned:

```java
@Configuration
public class AiTimeoutConfig {
  @Bean
  public org.springframework.web.reactive.function.client.WebClient aiWebClient(
      @org.springframework.beans.factory.annotation.Value("${dealerops.ai.timeout-ms:15000}") long timeoutMs) {
    io.netty.channel.ChannelOption connect = io.netty.channel.ChannelOption.CONNECT_TIMEOUT_MILLIS;
    reactor.netty.http.client.HttpClient http = reactor.netty.http.client.HttpClient.create()
        .option(connect, 2000)
        .responseTimeout(java.time.Duration.ofMillis(Math.max(1000, timeoutMs - 2000)));
    return org.springframework.web.reactive.function.client.WebClient.builder()
        .clientConnector(new org.springframework.http.client.reactive.ReactorClientHttpConnector(http))
        .build();
  }
}
```

When the adapter calls the model, wrap again with `java.util.concurrent.CompletableFuture` + `orTimeout(15000, MILLISECONDS)`; total cap **15000ms**. Rate-limit queue off by default (do not start the ai-manager queue).

`InternalGuardFilter`: implement `OncePerRequestFilter`; if path starts with `/internal/v1/` and header `X-Dealer-Internal` ≠ `dealerops.internal-token` → `response.setStatus(404)` and return. No CORS config.

- Ban: scanning `com.gateway` or library web packages other than `com.manager`; starting `AIApplication`; exposing `/api/ai/request` `/chat` `/credentials` `/runtime`; configuring `5173` CORS; connecting a database; Flyway.
- Acceptance:
  1. `rg "scanBasePackages" ai-service/src/main/java` does not contain `com.gateway`.
  2. `rg "timeout-ms: 15000" ai-service/src/main/resources/application.yaml`.
  3. `rg "orTimeout|timeout-ms|responseTimeout" ai-service/src/main/java` has 15000 or `timeoutMs`.
  4. After start `curl -s -o NUL -w "%{http_code}" http://127.0.0.1:8082/internal/v1/ad-check` → `404`.
  5. `rg "localhost:5173" ai-service` none.

---

### BE-T05 Environment-variable table (copy all from env.example + local defaults)
- Repo: dealer-platform
- Create/change files: none (**do not change** `dealer-platform/env.example`). Each repo `application.yml` / `application.yaml` reads this table. The coding AI writes missing `INTERNAL_TOKEN` and `GATEWAY_BASE_URL` as yaml defaults in each repo; do not write them back into env.example.
- Must include: inject per the table. Empty “local default” cells must still use the listed default.

| Variable | Who | Local default (pinned) |
|---|---|---|
| `VITE_ENTRA_TENANT_ID` | web (this spec does not implement web) | empty string `""` (fill in Sprint 2) |
| `VITE_ENTRA_CLIENT_ID` | web | empty string `""` |
| `VITE_ENTRA_API_SCOPE` | web | `api://dealer-api/access_as_user` |
| `VITE_GATEWAY_URL` | web | `http://localhost:8080` |
| `GATEWAY_PORT` | gateway | `8080` |
| `CORE_URL` | gateway | compose: `http://host.docker.internal:8081`; host process: `http://127.0.0.1:8081` (yaml default is the latter) |
| `AI_URL` | gateway | compose: `http://host.docker.internal:8082`; host: `http://127.0.0.1:8082` |
| `CORE_PORT` | core | `8081` |
| `MYSQL_URL` | core | `jdbc:mysql://localhost:3306/dealer_core?useSSL=false&allowPublicKeyRetrieval=true` |
| `MYSQL_USER` | core | `dealer` |
| `MYSQL_PASSWORD` | core | `dealer_dev_only` |
| `AI_PORT` | ai-service | `8082` |
| `AIMANAGER_API_KEY` | **ai-service only** | empty string; if empty the first model call fails immediately and does not wait 15s |
| `AIMANAGER_GATEWAY_PROVIDER` | ai-service | `openai` |
| `AIMANAGER_GATEWAY_MODEL` | ai-service | empty string; must be the deployment name when hitting a real model |
| `ENTRA_ISSUER` | gateway + core | `https://login.microsoftonline.com/<tenant-id>/v2.0` |
| `ENTRA_AUDIENCE` | gateway + core | `api://dealer-api` |
| `INTERNAL_TOKEN` | gateway + core outbound + ai-service | `dealer-internal`, accepted only when the Spring profile is `dev` or `local`. Any other profile must set a non-default value shared by gateway, ai-service, and dealer-core. Web **does not read** it. |
| `GATEWAY_BASE_URL` | core outbound | `http://localhost:8080` |

Who does not read: web does not read `AIMANAGER_*` / `MYSQL_*` / `INTERNAL_TOKEN`; gateway/core do not read `AIMANAGER_API_KEY`; ai-service does not read `MYSQL_*`.

- Ban: committing a real key to Git; core reading `AIMANAGER_API_KEY`; changing `env.example`.
- Acceptance: `rg "AIMANAGER_API_KEY" dealer-core dealer-gateway` has no business read; `rg "INTERNAL_TOKEN|internal-token" dealer-core dealer-gateway ai-service` all three repos default to `dealer-internal`.

---

### BE-T06 core full package paths + Entity aligned to V1 (column by column)
- Repo: dealer-core
- Create/change files: (full paths)

```
dealer-core/src/main/java/com/dealerops/core/DealerCoreApplication.java
dealer-core/src/main/java/com/dealerops/core/config/SecurityConfig.java
dealer-core/src/main/java/com/dealerops/core/config/WebConfig.java
dealer-core/src/main/java/com/dealerops/core/config/JacksonConfig.java
dealer-core/src/main/java/com/dealerops/core/config/AiClientConfig.java
dealer-core/src/main/java/com/dealerops/core/security/JwtRoleMapper.java
dealer-core/src/main/java/com/dealerops/core/security/MeController.java
dealer-core/src/main/java/com/dealerops/core/security/MeService.java
dealer-core/src/main/java/com/dealerops/core/security/CurrentUser.java
dealer-core/src/main/java/com/dealerops/core/dealer/AdminDealerController.java
dealer-core/src/main/java/com/dealerops/core/dealer/AdminMemberController.java
dealer-core/src/main/java/com/dealerops/core/dealer/DealerAdminService.java
dealer-core/src/main/java/com/dealerops/core/dealer/MembershipService.java
dealer-core/src/main/java/com/dealerops/core/dealer/DealerEntity.java
dealer-core/src/main/java/com/dealerops/core/dealer/DealerRepository.java
dealer-core/src/main/java/com/dealerops/core/dealer/AppUserEntity.java
dealer-core/src/main/java/com/dealerops/core/dealer/AppUserRepository.java
dealer-core/src/main/java/com/dealerops/core/dealer/MembershipEntity.java
dealer-core/src/main/java/com/dealerops/core/dealer/MembershipRepository.java
dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleController.java
dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleService.java
dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleEntity.java
dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleRepository.java
dealer-core/src/main/java/com/dealerops/core/customer/CustomerController.java
dealer-core/src/main/java/com/dealerops/core/customer/CustomerVehicleController.java
dealer-core/src/main/java/com/dealerops/core/customer/CustomerService.java
dealer-core/src/main/java/com/dealerops/core/customer/CustomerEntity.java
dealer-core/src/main/java/com/dealerops/core/customer/CustomerRepository.java
dealer-core/src/main/java/com/dealerops/core/customer/CustomerVehicleEntity.java
dealer-core/src/main/java/com/dealerops/core/customer/CustomerVehicleRepository.java
dealer-core/src/main/java/com/dealerops/core/listing/ListingController.java
dealer-core/src/main/java/com/dealerops/core/listing/ListingService.java
dealer-core/src/main/java/com/dealerops/core/listing/ListingEntity.java
dealer-core/src/main/java/com/dealerops/core/listing/ListingRepository.java
dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckController.java
dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckService.java
dealer-core/src/main/java/com/dealerops/core/compliance/OmvicRuleEngine.java
dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckEntity.java
dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckRepository.java
dealer-core/src/main/java/com/dealerops/core/compliance/CheckStatusMapper.java
dealer-core/src/main/java/com/dealerops/core/audit/AuditController.java
dealer-core/src/main/java/com/dealerops/core/audit/AuditService.java
dealer-core/src/main/java/com/dealerops/core/audit/AuditEventEntity.java
dealer-core/src/main/java/com/dealerops/core/audit/AuditEventRepository.java
dealer-core/src/main/java/com/dealerops/core/assistant/AssistantController.java
dealer-core/src/main/java/com/dealerops/core/assistant/AssistantService.java
dealer-core/src/main/java/com/dealerops/core/assistant/AssistantResourceQuery.java
dealer-core/src/main/java/com/dealerops/core/common/exception/ApiException.java
dealer-core/src/main/java/com/dealerops/core/common/exception/ApiExceptionHandler.java
dealer-core/src/main/java/com/dealerops/core/common/exception/ErrorCode.java
dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantContext.java
dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantFilter.java
dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantGuard.java
dealer-core/src/main/java/com/dealerops/core/integration/AiGatewayClient.java
dealer-core/src/main/java/com/dealerops/core/integration/InternalHeaders.java
```

DTOs go in each domain `dto/` subpackage; class names appear in later tasks. This task first compiles Entity + Repository + enums.

Enums (`@Enumerated(EnumType.STRING)`; stored strings match the table exactly):

| Enum | Java names | DB values |
|---|---|---|
| `AppRole` | `PLATFORM_ADMIN`, `DEALER_USER` | Use `@JsonValue`/`AttributeConverter` to store **`Platform.Admin`** / **`Dealer.User`** (with the dot, matching JWT) |
| `VehicleStatus` | `IN_STOCK`, `SOLD` | `IN_STOCK` `SOLD` |
| `VehicleSource` | `TRADE_IN`, `AUCTION`, `PRIVATE_PURCHASE`, `OTHER` | same names |
| `ConditionCode` | `CERTIFIED`, `AS_IS`, `UNFIT`, `IRREPARABLE` | same names |
| `AdKind` | `CASH`, `FINANCE`, `LEASE` | same names |
| `AdMedium` | `ONLINE`, `RADIO_TV_BILLBOARD` | same names |
| `ListingStatus` | `DRAFT`, `READY` | same names |
| `AiStatus` | `SKIPPED`, `SUCCESS`, `FAILED`, `UNAVAILABLE` | same names |
| `Recommendation` | `BLOCKED`, `NEEDS_AI`, `PASSED`, `UNAVAILABLE` | same names |
| `EntityType` | `VEHICLE`, `CUSTOMER`, `CUSTOMER_VEHICLE`, `LISTING`, `DEALER`, `MEMBERSHIP` | same names |
| `AuditAction` | `CREATE`, `UPDATE`, `SELL`, `LINK`, `UNLINK` | same names |

**Column-by-column Entity (column names = V1; no extra columns).** All `@Table(name="...")`. `@Version` on tables that have `version`. Times: `created_at`/`updated_at`/`linked_at` use `@CreationTimestamp`/`@UpdateTimestamp` or `Instant`; `added_on`/`sold_on` use `LocalDate`. Money `BigDecimal`. `listing.last_check_id` **must not** be `@ManyToOne`.

`DealerEntity` ↔ `dealer`:

| Column | Java field | Annotations |
|---|---|---|
| `id` | `Long id` | `@Id @GeneratedValue(IDENTITY)` |
| `legal_name` | `String legalName` | `@Column(name="legal_name", nullable=false, length=200)` |
| `contact_phone` | `String contactPhone` | `nullable=false, length=40` |
| `contact_email` | `String contactEmail` | `nullable=false, length=120` |
| `contact_address` | `String contactAddress` | `nullable=false, length=300` |
| `active` | `boolean active` | `nullable=false` default true |
| `version` | `int version` | `@Version` |
| `created_at` | `Instant createdAt` | `nullable=false` |
| `updated_at` | `Instant updatedAt` | `nullable=false` |

`AppUserEntity` ↔ `app_user`:

| Column | Java field |
|---|---|
| `id` | `Long id` |
| `entra_tenant_id` | `String entraTenantId` length 64 NOT NULL |
| `entra_oid` | `String entraOid` length 64 NOT NULL |
| `display_name` | `String displayName` length 120 NOT NULL |
| `role` | `AppRole role` VARCHAR(32) NOT NULL |
| `dealer_id` | `Long dealerId` **nullable** (Admin must be null; **not** tenant authority) |
| `active` | `boolean active` default true |
| `created_at` | `Instant createdAt` |

No `version` column. UK: `(entraTenantId, entraOid)`.

`MembershipEntity` ↔ `membership`:

| Column | Java field |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` NOT NULL |
| `entra_oid` | `String entraOid` NOT NULL |
| `active` | `boolean active` default true |
| `created_by` | `String createdBy` NOT NULL (binder JWT `oid`) |
| `created_at` | `Instant createdAt` |

UK: `(dealerId, entraOid)`.

`VehicleEntity` ↔ `vehicle`:

| Column | Java field |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` NOT NULL |
| `vin` | `String vin` length 32 NOT NULL |
| `make` | `String make` length 80 NOT NULL |
| `model` | `String model` length 80 NOT NULL |
| `model_year` | `int modelYear` NOT NULL |
| `source` | `VehicleSource source` NOT NULL |
| `purchase_cost` | `BigDecimal purchaseCost` NOT NULL |
| `added_on` | `LocalDate addedOn` NOT NULL |
| `condition_code` | `ConditionCode conditionCode` NOT NULL |
| `repair_cost` | `BigDecimal repairCost` nullable |
| `carfax_url` | `String carfaxUrl` length 500 nullable |
| `sold_on` | `LocalDate soldOn` nullable |
| `sold_price` | `BigDecimal soldPrice` nullable |
| `status` | `VehicleStatus status` NOT NULL |
| `version` | `int version` `@Version` |
| `created_at` | `Instant createdAt` |
| `updated_at` | `Instant updatedAt` |

UK: `(dealerId, vin)`.

`CustomerEntity` ↔ `customer`:

| Column | Java field |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` NOT NULL |
| `name` | `String name` length 160 NOT NULL |
| `email` | `String email` length 160 NOT NULL |
| `phone` | `String phone` length 40 NOT NULL |
| `home_address` | `String homeAddress` length 300 NOT NULL |
| `version` | `int version` `@Version` |
| `created_at` | `Instant createdAt` |
| `updated_at` | `Instant updatedAt` |

`CustomerVehicleEntity` ↔ `customer_vehicle` (**no version**):

| Column | Java field |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` NOT NULL |
| `customer_id` | `Long customerId` NOT NULL |
| `vehicle_id` | `Long vehicleId` NOT NULL |
| `linked_at` | `Instant linkedAt` NOT NULL |

UK: `vehicleId` globally unique.

`ListingEntity` ↔ `listing`: `title`/`body` Java non-null `String`, default `""`, ban `Optional`.

| Column | Java field |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` NOT NULL |
| `vehicle_id` | `Long vehicleId` NOT NULL |
| `title` | `String title` length 200 NOT NULL default `""` |
| `body` | `String body` `@Column(columnDefinition="TEXT")` NOT NULL default `""` |
| `ad_kind` | `AdKind adKind` NOT NULL |
| `medium` | `AdMedium medium` NOT NULL |
| `status` | `ListingStatus status` NOT NULL |
| `content_version` | `int contentVersion` default 1 |
| `last_check_id` | `Long lastCheckId` nullable, no FK mapping |
| `version` | `int version` `@Version` |
| `created_at` | `Instant createdAt` |
| `updated_at` | `Instant updatedAt` |

UK: `vehicleId`.

`ComplianceCheckEntity` ↔ `compliance_check`:

| Column | Java field |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` NOT NULL |
| `listing_id` | `Long listingId` NOT NULL |
| `content_version` | `int contentVersion` NOT NULL |
| `rule_findings` | `String ruleFindingsJson` or `JsonNode`, `columnDefinition="JSON"` NOT NULL |
| `ai_status` | `AiStatus aiStatus` NOT NULL |
| `ai_notes` | JSON nullable |
| `recommendation` | `Recommendation recommendation` NOT NULL |
| `created_at` | `Instant createdAt` |

`AuditEventEntity` ↔ `audit_event`:

| Column | Java field |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` **nullable** |
| `actor_oid` | `String actorOid` NOT NULL |
| `entity_type` | `String entityType` NOT NULL |
| `entity_id` | `long entityId` NOT NULL |
| `action` | `String action` NOT NULL |
| `field_summary` | JSON nullable |
| `created_at` | `Instant createdAt` |

Repository interfaces: `JpaRepository<Entity, Long>`; names already listed above. Required methods:

```java
public interface MembershipRepository extends JpaRepository<MembershipEntity, Long> {
  java.util.List<MembershipEntity> findByEntraOidAndActiveTrue(String entraOid);
  java.util.Optional<MembershipEntity> findByDealerIdAndEntraOid(Long dealerId, String entraOid);
  long countByDealerIdAndActiveTrue(Long dealerId);
}
public interface AppUserRepository extends JpaRepository<AppUserEntity, Long> {
  java.util.Optional<AppUserEntity> findByEntraTenantIdAndEntraOid(String tid, String oid);
}
public interface VehicleRepository extends JpaRepository<VehicleEntity, Long> {
  boolean existsByDealerIdAndVin(Long dealerId, String vin);
  java.util.Optional<VehicleEntity> findByIdAndDealerId(Long id, Long dealerId);
}
public interface ListingRepository extends JpaRepository<ListingEntity, Long> {
  java.util.Optional<ListingEntity> findByVehicleIdAndDealerId(Long vehicleId, Long dealerId);
  java.util.Optional<ListingEntity> findByIdAndDealerId(Long id, Long dealerId);
}
public interface CustomerVehicleRepository extends JpaRepository<CustomerVehicleEntity, Long> {
  boolean existsByVehicleId(Long vehicleId);
  java.util.Optional<CustomerVehicleEntity> findByCustomerIdAndVehicleId(Long customerId, Long vehicleId);
}
```

`JacksonConfig`: `ObjectMapper` default camelCase; `JavaTimeModule`; dates `yyyy-MM-dd`; `WRITE_DATES_AS_TIMESTAMPS=false`.
`WebConfig`: empty, or explicitly do not register CORS.

- Ban: extra columns (mileage/APR/password); `ticket/` `lead/` `bus/` `password/`; `@ManyToOne` to `lastCheck`; changing SQL; `WHERE vehicle.dealer_id = app_user.dealer_id`.
- Acceptance:
  1. Empty DB `mvn -f dealer-core/pom.xml spring-boot:run` logs `Successfully applied 1 migration` and 9 tables.
  2. `rg "ddl-auto:\\s*update" dealer-core` none.
  3. `rg "@Column\\(name" dealer-core/src/main/java/com/dealerops/core` covers every snake column name in the tables above.
  4. `rg "class Ticket|class Lead|password_hash" dealer-core` none.
  5. Flyway still has only `V1__init.sql` (`ls dealer-core/src/main/resources/db/migration`).

---

### BE-T07 Exception mapping
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/common/exception/ErrorCode.java`
  - `dealer-core/src/main/java/com/dealerops/core/common/exception/ApiException.java`
  - `dealer-core/src/main/java/com/dealerops/core/common/exception/ApiExceptionHandler.java`
- Must include:

```java
public class ApiException extends RuntimeException {
  public ApiException(ErrorCode code, String message) {}
  public ErrorCode getCode() { return null; }
}
@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ErrorBody> handleApi(ApiException ex) {}
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorBody> handleValid(MethodArgumentNotValidException ex) {}
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ErrorBody> handleDup(DataIntegrityViolationException ex) {}
}
```

`handleValid` → HTTP 400, `code=VALIDATION`, `fieldErrors` field→message. Unique key `uk_vehicle_vin` → `VIN_DUP`; `uk_cv_vehicle` → `VEHICLE_ALREADY_LINKED`; `uk_membership` already active → `DUP_MEMBER`. Ban sending stack/SQL outbound.

- Ban: inventing new business `code`; returning `DataIntegrityViolation` text to the browser.
- Acceptance: `rg "enum ErrorCode" -A20 dealer-core/src/main/java/com/dealerops/core/common/exception/ErrorCode.java` contains this document’s 14 codes and no 15th business code. `rg "printStackTrace|e.getMessage\\(\\)" dealer-core/src/main/java/com/dealerops/core/common/exception/ApiExceptionHandler.java` does not write SQL into `ErrorBody.message`.

---

### BE-T08 TenantFilter / Security chain (JWT claim + membership)
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/config/SecurityConfig.java`
  - `dealer-core/src/main/java/com/dealerops/core/security/JwtRoleMapper.java`
  - `dealer-core/src/main/java/com/dealerops/core/security/CurrentUser.java`
  - `dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantContext.java`
  - `dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantFilter.java`
  - `dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantGuard.java`
- Must include:

JWT claim names (recognize only these):

| Claim | Use |
|---|---|
| `iss` | Must = `ENTRA_ISSUER` |
| `aud` | = `ENTRA_AUDIENCE` (`api://dealer-api` or API GUID) |
| `oid` | → `app_user.entra_oid` / `membership.entra_oid` |
| `tid` | → `app_user.entra_tenant_id` |
| `name` or `preferred_username` | write back `display_name` (update if present) |
| `roles` | **sole RBAC source** (array) |
| `scp` / `scope` | only proves `access_as_user`, **not** a role |
| `groups` | **ignore** |

```java
public final class JwtRoleMapper {
  public static AppRole mapRole(org.springframework.security.oauth2.jwt.Jwt jwt) {
    java.util.Collection<String> roles = jwt.getClaimAsStringList("roles");
    if (roles == null) roles = java.util.List.of();
    if (roles.contains("Platform.Admin")) return AppRole.PLATFORM_ADMIN;
    if (roles.contains("Dealer.User")) return AppRole.DEALER_USER;
    return null;
  }
}

public record CurrentUser(String oid, String tid, AppRole role, Long tenantDealerId) {}

public final class TenantContext {
  private static final ThreadLocal<CurrentUser> H = new ThreadLocal<>();
  public static void set(CurrentUser u) { H.set(u); }
  public static CurrentUser get() { return H.get(); }
  public static void clear() { H.remove(); }
}

@Component
public class TenantFilter extends OncePerRequestFilter {
  @Override
  protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) {}
}

public final class TenantGuard {
  public static void requireDealerUser() {}
  public static void requireAdmin() {}
  public static void assertSameDealer(Long resourceDealerId) {}
}
```

`SecurityConfig`:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
  @Bean
  SecurityFilterChain filterChain(HttpSecurity http, TenantFilter tenantFilter) throws Exception {
    http.csrf(csrf -> csrf.disable());
    http.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
    http.oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
    http.authorizeHttpRequests(a -> a
        .requestMatchers("/error").permitAll()
        .requestMatchers("/api/v1/**").authenticated()
        .anyRequest().denyAll());
    http.addFilterAfter(tenantFilter, BearerTokenAuthenticationFilter.class);
    return http.build();
  }
}
```

`TenantFilter` resolves membership (order pinned):

```
1. No Authentication or not Jwt → leave to Security (401)
2. role = JwtRoleMapper.mapRole(jwt); null and path is not GET /api/v1/me → 403 FORBIDDEN
3. upsert app_user by (tid, oid); displayName may update; authorization follows this JWT; DB role cannot elevate
4. If role == Platform.Admin:
     app_user.dealer_id must be written NULL (self-heal to null if not empty)
     TenantContext = (oid,tid,ADMIN,null)
     If path matches /api/v1/vehicles** /customers** /listings** /assistant** or GET /audit → 403 FORBIDDEN (body only {code,message})
     Allow /api/v1/admin/** and GET /api/v1/me
5. If role == Dealer.User:
     rows = membershipRepo.findByEntraOidAndActiveTrue(oid)
     rows.size>=2 → 500 (configuration error; do not continue business)
     path is GET /api/v1/me: allow even with 0 rows, tenantDealerId=null
     other /api/v1/**: 0 rows → 403 FORBIDDEN
     1 row: tenantDealerId = row.dealerId; if app_user.dealer_id differs, write back (self-heal, not 500)
6. Ignore req.getParameter("dealerId"), dealerId in JSON, Header X-Dealer-Id
7. finally TenantContext.clear()
```

`TenantGuard.assertSameDealer`: `resourceDealerId == null || !resourceDealerId.equals(tenantDealerId)` → throw `NOT_FOUND`. Do not 403.

- Ban: using `app_user.dealer_id` for `WHERE` isolation; client `dealerId` overriding tenant; cross-store 403; a fifth auth repo.
- Acceptance:
  1. `rg "getClaimAsStringList\\(\"roles\"\\)" dealer-core`.
  2. `rg "\"oid\"|getSubject|getClaimAsString\\(\"oid\"\\)" dealer-core/src/main/java/com/dealerops/core`.
  3. `rg "findByEntraOidAndActiveTrue" dealer-core`.
  4. `rg "groups" dealer-core/src/main/java/com/dealerops/core/security/JwtRoleMapper.java` does not authorize with groups.
  5. No JWT: `curl -s http://127.0.0.1:8081/api/v1/vehicles` → JSON `{"code":"UNAUTHORIZED",...}` HTTP 401 (same 401 via Gateway).

---

### BE-T09 `GET /api/v1/me`
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/security/MeController.java`
  - `dealer-core/src/main/java/com/dealerops/core/security/MeService.java`
  - `dealer-core/src/main/java/com/dealerops/core/security/dto/MeResponse.java`
- Must include:

```java
@RestController
@RequestMapping("/api/v1")
public class MeController {
  @GetMapping("/me")
  public MeResponse me() { return meService.me(TenantContext.get()); }
}
public record MeResponse(String entraOid, String displayName, String role, Long dealerId, String dealerLegalName) {}
```

`role` JSON must be `Platform.Admin` or `Dealer.User`. Admin: `dealerId=null`, `dealerLegalName=null`. Staff with no membership: still 200, last two null. With membership: `dealerId` comes from membership (if it disagrees with `app_user`, membership wins and write back), `dealerLegalName` = that store’s `legalName`.

| Method | HTTP | path | Error codes |
|---|---|---|---|
| `me()` | GET | `/api/v1/me` | `UNAUTHORIZED` 401 |

- Ban: requiring membership for 200; Admin filling dealerId.
- Acceptance: `rg "@GetMapping\\(\"/me\"\\)" dealer-core`. Staff JWT with no membership: `curl -H "Authorization: Bearer $T" http://localhost:8080/api/v1/me` → 200 and `dealerId` JSON `null`. No token → 401.

---

### BE-T10 Admin dealership CRUD
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/dealer/AdminDealerController.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/DealerAdminService.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/dto/DealerResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/dto/CreateDealerRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/dto/PatchDealerRequest.java`
- Must include:

```java
@RestController
@RequestMapping("/api/v1/admin/dealers")
public class AdminDealerController {
  @GetMapping
  public PageResponse<DealerResponse> list(@RequestParam(required=false) String q,
      @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="10") int size) {}
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public DealerResponse create(@Valid @RequestBody CreateDealerRequest body) {}
  @GetMapping("/{id}")
  public DealerResponse get(@PathVariable Long id) {}
  @PatchMapping("/{id}")
  public DealerResponse patch(@PathVariable Long id, @Valid @RequestBody PatchDealerRequest body) {}
}
public record DealerResponse(Long id, String legalName, String contactPhone, String contactEmail,
    String contactAddress, boolean active, long staffCount, int version) {}
public record CreateDealerRequest(
    @NotBlank String legalName, @NotBlank String contactPhone,
    @NotBlank String contactEmail, @NotBlank String contactAddress) {}
public record PatchDealerRequest(
    @NotNull Integer version, @NotBlank String legalName, @NotBlank String contactPhone,
    @NotBlank String contactEmail, @NotBlank String contactAddress, @NotNull Boolean active) {}
```

`staffCount` = `membershipRepository.countByDealerIdAndActiveTrue(id)`. Ignore body.`id` / `dealerId`. No DELETE dealership. Staff hitting these URLs → Filter/method `403 FORBIDDEN`.

| Method | HTTP | path | Error codes |
|---|---|---|---|
| `list` | GET | `/api/v1/admin/dealers` | 401; 403 FORBIDDEN |
| `create` | POST | `/api/v1/admin/dealers` | 400 VALIDATION; 403 |
| `get` | GET | `/api/v1/admin/dealers/{id}` | 404 NOT_FOUND; 403 |
| `patch` | PATCH | `/api/v1/admin/dealers/{id}` | 400; 404; 409 VERSION_CONFLICT; 403 |

- Ban: `DELETE /admin/dealers/{id}`; Admin responses carrying vehicles.
- Acceptance: `rg "DeleteMapping" dealer-core/src/main/java/com/dealerops/core/dealer/AdminDealerController.java` has no delete-dealership. `curl` Admin POST missing `legalName` → 400 `VALIDATION`. Staff JWT GET `/api/v1/admin/dealers` → 403.

---

### BE-T11 Admin membership
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/dealer/AdminMemberController.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/MembershipService.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/dto/MemberResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/dto/CreateMemberRequest.java`
- Must include:

```java
@RestController
@RequestMapping("/api/v1/admin/dealers/{id}/members")
public class AdminMemberController {
  @GetMapping
  public PageResponse<MemberResponse> list(@PathVariable Long id,
      @RequestParam(required=false) String q,
      @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="10") int size) {}
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public MemberResponse add(@PathVariable Long id, @Valid @RequestBody CreateMemberRequest body) {}
  @DeleteMapping("/{entraOid}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(@PathVariable Long id, @PathVariable String entraOid) {}
}
public record MemberResponse(String entraOid, String displayName, String role, boolean active) {}
public record CreateMemberRequest(@NotBlank String entraOid, @NotBlank String displayName) {}
```

Bind: write/update `app_user` (`role=Dealer.User`, `dealer_id=this store`) + `membership`. This store already **active** → `409 DUP_MEMBER`. This oid still active at **another store** → `409 DUP_MEMBER`. Re-bind after unbind: reactivate `active=1`, do not INSERT a second row. Do not invent email. Do not delete Entra.

Unbind: `membership.active=0`; `app_user.dealer_id=NULL`; **do not change** `app_user.role`; do not delete `app_user`. Audit `entityType=MEMBERSHIP`.

| Method | HTTP | path | Error codes |
|---|---|---|---|
| `list` | GET | `/api/v1/admin/dealers/{id}/members` | 404 store missing; 403 |
| `add` | POST | same | 400 VALIDATION; 404; 409 DUP_MEMBER; 403 |
| `remove` | DELETE | `/api/v1/admin/dealers/{id}/members/{entraOid}` | 404 no binding; 403; 204 no body |

- Ban: deleting Entra; changing `role` on unbind; a dealership switcher; two `active=1` rows for one person.
- Acceptance: same oid POST twice in a row → second 409 `DUP_MEMBER`. DELETE → 204. That staff GET `/api/v1/vehicles` → 403. `GET /me` → 200 `dealerId=null`.

---

### BE-T12 Vehicle Controller (DMS)
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleController.java`
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleService.java`
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/dto/VehicleResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/dto/CreateVehicleRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/dto/PatchVehicleRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/dto/SellVehicleRequest.java`
- Must include:

```java
@RestController
@RequestMapping("/api/v1/vehicles")
public class VehicleController {
  @GetMapping
  public PageResponse<VehicleResponse> list(
      @RequestParam(required=false) String q,
      @RequestParam(required=false) VehicleStatus status,
      @RequestParam(required=false) ConditionCode condition,
      @RequestParam(defaultValue="0") int page,
      @RequestParam(defaultValue="10") int size) {}
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public VehicleResponse create(@Valid @RequestBody CreateVehicleRequest body) {}
  @GetMapping("/{id}")
  public VehicleResponse get(@PathVariable Long id) {}
  @PatchMapping("/{id}")
  public VehicleResponse patch(@PathVariable Long id, @Valid @RequestBody PatchVehicleRequest body) {}
  @PostMapping("/{id}/sell")
  public VehicleResponse sell(@PathVariable Long id, @Valid @RequestBody SellVehicleRequest body) {}
}
public record VehicleResponse(Long id, String vin, String make, String model, int modelYear,
    VehicleSource source, BigDecimal purchaseCost, LocalDate addedOn, ConditionCode conditionCode,
    BigDecimal repairCost, String carfaxUrl, LocalDate soldOn, BigDecimal soldPrice,
    VehicleStatus status, int version) {}
public record CreateVehicleRequest(
    @NotBlank String make, @NotBlank String model, @NotNull Integer modelYear, @NotBlank String vin,
    @NotNull VehicleSource source, @NotNull BigDecimal purchaseCost, @NotNull LocalDate addedOn,
    @NotNull ConditionCode conditionCode, BigDecimal repairCost, String carfaxUrl) {}
public record PatchVehicleRequest(
    @NotNull Integer version, @NotBlank String make, @NotBlank String model, @NotNull Integer modelYear,
    @NotBlank String vin, @NotNull VehicleSource source, @NotNull BigDecimal purchaseCost,
    @NotNull LocalDate addedOn, @NotNull ConditionCode conditionCode, BigDecimal repairCost, String carfaxUrl) {}
public record SellVehicleRequest(@NotNull LocalDate soldOn, @NotNull BigDecimal soldPrice, @NotNull Integer version) {}
```

Server POST: ignore `dealerId`/`status`/`soldOn`/`soldPrice`; `status=IN_STOCK`; `sold*` must be NULL. `dealerId=tenantDealerId`. Same-store VIN duplicate → `400 VIN_DUP`. List default `createdAt` descending. `condition` query = `conditionCode`.

Sold lock / sell (translate into code):

```
function patchVehicle(id, body):
  v = loadById(id) or 404
  if v.dealerId != tenantDealerId: 404
  if body.version != v.version: 409 VERSION_CONFLICT
  if v.status == SOLD:
    if any change among make,model,modelYear,vin,source,purchaseCost,addedOn,repairCost,carfaxUrl:
      409 SOLD_LOCKED
  if vin changed and existsByDealerIdAndVin(tenant, body.vin): 400 VIN_DUP
  oldCondition = v.conditionCode
  apply whitelist fields (never status/soldOn/soldPrice/dealerId)
  if oldCondition != v.conditionCode:
    listing = findByVehicleId; if present: listing.contentVersion++; listing.status=DRAFT
    // do not clear last_check_id
  audit VEHICLE/UPDATE
  return v

function sell(id, body):
  if body.soldOn==null or body.soldPrice==null: 400 SOLD_PAIR_REQUIRED
  if body.soldPrice <= 0: 400 SOLD_PAIR_REQUIRED
  v = load or 404; cross-tenant 404
  if body.version != v.version: 409 VERSION_CONFLICT
  if v.status == SOLD: 409 SOLD_LOCKED
  v.status=SOLD; v.soldOn=body.soldOn; v.soldPrice=body.soldPrice
  // do not delete customer_vehicle
  audit VEHICLE/SELL
```

| Method | HTTP | path | Error codes |
|---|---|---|---|
| `list` | GET | `/api/v1/vehicles` | 401; 403 |
| `create` | POST | `/api/v1/vehicles` | 400 VALIDATION / VIN_DUP; 403 |
| `get` | GET | `/api/v1/vehicles/{id}` | 404; 403 |
| `patch` | PATCH | `/api/v1/vehicles/{id}` | 404; 409 SOLD_LOCKED / VERSION_CONFLICT; 400 VIN_DUP / VALIDATION |
| `sell` | POST | `/api/v1/vehicles/{id}/sell` | 400 SOLD_PAIR_REQUIRED; 409 SOLD_LOCKED / VERSION_CONFLICT; 404 |

Audit: `VEHICLE` + `CREATE`/`UPDATE`/`SELL`. `fieldSummary` has no customer PII.

- Ban: PATCH changing `status`/`sold*`; using purchase cost as advertised price; Admin 200 carrying vin.
- Acceptance: `rg "@PostMapping\\(\"/\\{id\\}/sell\"\\)" dealer-core`. Same-store double POST same VIN → 400 `VIN_DUP`. Sold PATCH `make` → 409 `SOLD_LOCKED`. After sell the CRM link remains (DB `customer_vehicle` row still there).

---

### BE-T13 Customer Controller (CRM)
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/customer/CustomerController.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/CustomerService.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/CustomerListItem.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/CustomerDetail.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/CreateCustomerRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/PatchCustomerRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/LinkedVehicleBrief.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/LinkedVehicleItem.java`
- Must include:

```java
@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {
  @GetMapping
  public PageResponse<CustomerListItem> list(
      @RequestParam(required=false) String q,
      @RequestParam(required=false) Boolean linked,
      @RequestParam(defaultValue="0") int page,
      @RequestParam(defaultValue="10") int size) {}
  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CustomerDetail create(@Valid @RequestBody CreateCustomerRequest body) {}
  @GetMapping("/{id}")
  public CustomerDetail get(@PathVariable Long id) {}
  @PatchMapping("/{id}")
  public CustomerDetail patch(@PathVariable Long id, @Valid @RequestBody PatchCustomerRequest body) {}
}
public record LinkedVehicleBrief(Long id, int modelYear, String make, String model) {}
public record LinkedVehicleItem(Long id, String vin, int modelYear, String make, String model, VehicleStatus status) {}
public record CustomerListItem(Long id, String name, String email, String phone, String homeAddress,
    LinkedVehicleBrief linkedVehicle, int version) {}
public record CustomerDetail(Long id, String name, String email, String phone, String homeAddress,
    java.util.List<LinkedVehicleItem> linkedVehicles, int version) {}
public record CreateCustomerRequest(@NotBlank String name, @NotBlank String email,
    @NotBlank String phone, @NotBlank String homeAddress) {}
public record PatchCustomerRequest(@NotNull Integer version, @NotBlank String name,
    @NotBlank String email, @NotBlank String phone, @NotBlank String homeAddress) {}
```

List `linkedVehicle`: if many vehicles take the latest `linkedAt`; none linked `null`. Detail `linkedVehicles` is the full array. Ignore `dealerId`. PATCH audit `CUSTOMER`/`UPDATE`; `fieldSummary` **must not** contain full phone/email/address (only `{"contactFieldsChanged":true}` or field-name booleans).

| Method | HTTP | path | Error codes |
|---|---|---|---|
| `list` | GET | `/api/v1/customers` | 401; 403 |
| `create` | POST | `/api/v1/customers` | 400 VALIDATION; 403 |
| `get` | GET | `/api/v1/customers/{id}` | 404; 403 |
| `patch` | PATCH | `/api/v1/customers/{id}` | 404; 409 VERSION_CONFLICT; 400; 403 |

- Ban: writing full number/email/address into `fieldSummary`.
- Acceptance: `rg "homeAddress|email|phone" dealer-core/src/main/java/com/dealerops/core/audit` must not `put("phone", customer.getPhone())` when writing JSON. Cross-store GET customer → 404.

---

### BE-T14 Link vehicle PUT + unlink DELETE + SOLD lock
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/customer/CustomerVehicleController.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/LinkResponse.java`
- Must include:

```java
@RestController
@RequestMapping("/api/v1/customers/{id}/vehicles")
public class CustomerVehicleController {
  @PutMapping("/{vehicleId}")
  public LinkResponse link(@PathVariable Long id, @PathVariable Long vehicleId) {}
  @DeleteMapping("/{vehicleId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void unlink(@PathVariable Long id, @PathVariable Long vehicleId) {}
}
public record LinkResponse(Long id, Long customerId, Long vehicleId, Instant linkedAt) {}
```

No body (ignore if present). No optimistic lock.

Pseudocode (must translate as-is):

```
function link(customerId, vehicleId):
  c = findCustomer(customerId)
  v = findVehicle(vehicleId)
  if c==null or v==null: 404
  if c.dealerId != tenantDealerId or v.dealerId != tenantDealerId: 404 NOT_FOUND   // cross-store is not 400
  // same-dealer SOLD and IN_STOCK may both be linked; do not throw WRONG_DEALER_OR_SOLD
  if existsByVehicleId(vehicleId): 409 VEHICLE_ALREADY_LINKED
  row = insert(dealerId=tenant, customerId, vehicleId, linkedAt=now)
  audit CUSTOMER_VEHICLE/LINK entityId=row.id fieldSummary={customerId,vehicleId}
  return 200 LinkResponse

function unlink(customerId, vehicleId):
  c = findCustomer(customerId); v = findVehicle(vehicleId)
  if c==null or v==null: 404
  if c.dealerId != tenant or v.dealerId != tenant: 404
  row = findByCustomerIdAndVehicleId(...)
  if row==null: 404
  if v.status == SOLD: 409 SOLD_LOCKED
  hardDelete(row)            // V1 has no soft-delete column
  // do not change vehicle.status
  audit CUSTOMER_VEHICLE/UNLINK entityId=row.id fieldSummary={customerId,vehicleId}
  return 204
```

| Method | HTTP | path | Error codes |
|---|---|---|---|
| `link` | PUT | `/api/v1/customers/{id}/vehicles/{vehicleId}` | 404 NOT_FOUND; 409 VEHICLE_ALREADY_LINKED; 403 |
| `unlink` | DELETE | same | 204; 404; 409 SOLD_LOCKED; 403 |

- Ban: using PUT as unlink; DELETE succeeding on a sold vehicle; a soft-delete column.
- Acceptance: `rg "@DeleteMapping" dealer-core/src/main/java/com/dealerops/core/customer/CustomerVehicleController.java`. Same-dealer sold vehicle PUT on an unlinked vehicle → 200. Missing customer or vehicle → `NOT_FOUND`. A second link → 409 `VEHICLE_ALREADY_LINKED`. Sold vehicle DELETE → 409 `SOLD_LOCKED`. In-stock DELETE → 204 and `SELECT * FROM customer_vehicle WHERE vehicle_id=?` empty.

---

### BE-T15 Listing empty-draft GET/PATCH
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/listing/ListingController.java`
  - `dealer-core/src/main/java/com/dealerops/core/listing/ListingService.java`
  - `dealer-core/src/main/java/com/dealerops/core/listing/dto/ListingResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/listing/dto/PatchListingRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/CheckStatusMapper.java`
- Must include:

```java
@RestController
public class ListingController {
  @GetMapping("/api/v1/vehicles/{id}/listing")
  public ListingResponse getByVehicle(@PathVariable Long id) {}
  @PatchMapping("/api/v1/vehicles/{id}/listing")
  public ListingResponse patchByVehicle(@PathVariable Long id, @RequestBody PatchListingRequest body) {}
  @PostMapping("/api/v1/listings/{id}/ready")
  public ListingResponse ready(@PathVariable Long id, @Valid @RequestBody VersionBody body) {}
  @PostMapping("/api/v1/listings/{id}/exports")
  public ResponseEntity<String> export(@PathVariable Long id, @Valid @RequestBody VersionBody body) {}
}
public record VersionBody(@NotNull Integer version) {}
public record PatchListingRequest(Integer version, String title, String body, AdKind adKind, AdMedium medium) {}
public record ListingResponse(Long id, Long vehicleId, String title, String body, AdKind adKind, AdMedium medium,
    ListingStatus status, int contentVersion, Long lastCheckId, CheckResponse lastCheck,
    String checkStatus, int version) {}
```

`CheckResponse` is in T16. `checkStatus` five-state string: `BLOCKED|NEEDS_AI|PASSED|STALE|AI_UNAVAILABLE`.

Empty-draft pseudocode:

```
function getListing(vehicleId):
  v = findVehicle(vehicleId) or 404; if v.dealerId!=tenant: 404
  row = listingRepo.findByVehicleIdAndDealerId(vehicleId, tenant)
  if row==null:
    return virtual { id:null, vehicleId, title:"", body:"", adKind:CASH, medium:ONLINE,
                     status:DRAFT, contentVersion:1, lastCheckId:null, lastCheck:null,
                     checkStatus:NEEDS_AI, version:0 }
    // ban INSERT
  last = loadCheck(row.lastCheckId) // missing / listingId or dealerId mismatch → treat as no check
  return toDto(row, last)

function patchListing(vehicleId, body):
  v = find or 404
  title = body.title==null ? "" : body.title
  text  = body.body==null ? "" : body.body
  kind  = body.adKind==null ? CASH : body.adKind
  med   = body.medium==null ? ONLINE : body.medium
  row = findByVehicle
  if row==null:
    if body.version!=null && body.version!=0: 409 VERSION_CONFLICT
    INSERT title,body use '' to satisfy NOT NULL; status=DRAFT; contentVersion=1; lastCheckId=null
  else:
    if body.version==null or body.version!=row.version: 409 VERSION_CONFLICT
    row.title=title; row.body=text; row.adKind=kind; row.medium=med
    row.contentVersion++; row.status=DRAFT
    // do not clear last_check_id
  return getListing(vehicleId)
```

The client **must not** PATCH `lastCheckId` (do not put that field on the record).

| Method | HTTP | path | Error codes |
|---|---|---|---|
| `getByVehicle` | GET | `/api/v1/vehicles/{id}/listing` | 404; 403 |
| `patchByVehicle` | PATCH | same | 404; 409 VERSION_CONFLICT; 400 VALIDATION |
| `ready` | POST | `/api/v1/listings/{id}/ready` | see T17 |
| `export` | POST | `/api/v1/listings/{id}/exports` | see T17 |

- Ban: INSERT on GET with no row; JDBC `null` into `title`/`body`; making V1 nullable.
- Acceptance: GET listing on a new vehicle → `id` JSON `null` and `SELECT COUNT(*) FROM listing WHERE vehicle_id=?` = 0. First PATCH without title → DB `title=''`. `rg "lastCheckId" dealer-core/src/main/java/com/dealerops/core/listing/dto/PatchListingRequest.java` has no such field.

---

### BE-T16 Check + OMVIC + Blocked skips AI
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckController.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckService.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/OmvicRuleEngine.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/dto/CheckResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/dto/RuleFinding.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/dto/AiNote.java`
  - `dealer-core/src/main/java/com/dealerops/core/listing/dto/VersionBody.java` (if T15 did not create it)
- Must include:

```java
@RestController
@RequestMapping("/api/v1/listings")
public class ComplianceCheckController {
  @PostMapping("/{id}/checks")
  public CheckResponse check(@PathVariable Long id, @Valid @RequestBody VersionBody body) {}
}
public record RuleFinding(String ruleId, String severity, boolean passed, String message) {}
public record AiNote(String message) {}
public record CheckResponse(Long id, Long listingId, int contentVersion,
    java.util.List<RuleFinding> ruleFindings, AiStatus aiStatus, java.util.List<AiNote> aiNotes,
    Recommendation recommendation, String checkStatus, Instant createdAt) {}
public record OmvicResult(java.util.List<RuleFinding> findings, boolean hardBlocked) {}
public class OmvicRuleEngine {
  public OmvicResult run(ListingEntity listing, VehicleEntity vehicle, DealerEntity dealer) { return null; }
}
```

`severity`: `BLOCK` | `REVIEW`. `OmvicRuleEngine` **implements 15 §6 as-is** (empty-draft hard block, PRICE, dealership name/contacts, condition, FINANCE APR, LEASE…). Do not use purchase cost as advertised price. No APR column: scan copy only.

Blocked / AI-failure pseudocode:

```
function postCheck(listingId, version):
  listing = findByIdAndDealerId or 404
  if version != listing.version: 409 VERSION_CONFLICT
  vehicle = find(listing.vehicleId); dealer = find(listing.dealerId)
  omvic = OmvicRuleEngine.run(listing, vehicle, dealer)

  if omvic.hardBlocked:
    // ban calling AiGatewayClient
    check = INSERT compliance_check(
      dealerId, listingId, listing.contentVersion,
      ruleFindings=omvic.findings, aiStatus=SKIPPED, aiNotes=null,
      recommendation=BLOCKED)
    listing.lastCheckId = check.id   // same transaction
    return 200 toDto(check)          // Blocked is not 4xx

  try:
    notes = AiGatewayClient.adCheck(toPublic(listing), toVehiclePublic(vehicle), toDealerPublic(dealer))
    // vehiclePublic has no purchaseCost/repairCost/soldPrice
    check = INSERT(..., aiStatus=SUCCESS, aiNotes=notes, recommendation=PASSED)
    listing.lastCheckId = check.id
    return 200 toDto(check)
  catch AiCallFailed:   // timeout / 5xx / agreed failure body
    check = INSERT(..., aiStatus=UNAVAILABLE, aiNotes=null, recommendation=UNAVAILABLE)
    listing.lastCheckId = check.id
    throw ApiException(AI_UNAVAILABLE, "AI check failed.")   // HTTP 502; row already written
```

`CheckStatusMapper.derive(listing, lastCheck)`:

```
if lastCheck==null: return NEEDS_AI
if lastCheck.contentVersion != listing.contentVersion:
  if lastCheck.recommendation == PASSED: return STALE
  return NEEDS_AI          // after BLOCKED/UNAVAILABLE then edit: not Stale
if lastCheck.recommendation == BLOCKED: return BLOCKED
if lastCheck.recommendation == PASSED: return PASSED
if lastCheck.recommendation == UNAVAILABLE: return AI_UNAVAILABLE
return NEEDS_AI
```

| Method | HTTP | path | Error codes |
|---|---|---|---|
| `check` | POST | `/api/v1/listings/{id}/checks` | 200 (including BLOCKED); 502 AI_UNAVAILABLE; 409 VERSION_CONFLICT; 404; 403 |

- Ban: HTTP to `/internal/v1/ad-check` on a hard miss; Blocked as 4xx; AI failure as Pass; putting the rule engine in ai-service.
- Acceptance:
  1. listing with empty title+body POST checks → 200, `recommendation=BLOCKED`, `aiStatus=SKIPPED`.
  2. Packet capture / WireMock at the same time: `/internal/v1/ad-check` **0 times**.
  3. `rg "adCheck\\(" dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckService.java` only on the `hardBlocked==false` branch.
  4. After disconnecting ai-service, POST checks on an ad with no hard miss → 502 `AI_UNAVAILABLE` and `SELECT recommendation FROM compliance_check ORDER BY id DESC LIMIT 1` = `UNAVAILABLE`.

---

### BE-T17 Ready + Export
- Repo: dealer-core
- Create/change files: `ListingController` / `ListingService` (paths already listed in T15)
- Must include:

```java
@PostMapping("/api/v1/listings/{id}/ready")
public ListingResponse ready(@PathVariable Long id, @Valid @RequestBody VersionBody body) {}
@PostMapping("/api/v1/listings/{id}/exports")
public ResponseEntity<String> export(@PathVariable Long id, @Valid @RequestBody VersionBody body) {}
```

```
function assertExportable(listing, version):
  if listing.dealerId != tenant: 404
  if version != listing.version: 409 VERSION_CONFLICT
  last = loadCheck(listing.lastCheckId)
  if last==null or last.recommendation != PASSED: 409 NOT_PASSED
  if last.contentVersion != listing.contentVersion: 409 CHECK_STALE
  if derive==STALE: 409 CHECK_STALE

function ready(...):
  assertExportable
  listing.status = READY
  return 200 ListingResponse

function export(...):
  assertExportable
  text = dealer.legalName + contactPhone + contactEmail + contactAddress
        + vehicle.modelYear/make/model/vin/conditionCode/source
        + listing.title + listing.body
        + last.createdAt
  // no purchaseCost/repairCost/soldPrice; no customer
  return 200 Content-Type: text/plain; charset=UTF-8
```

| Method | HTTP | path | Error codes |
|---|---|---|---|
| `ready` | POST | `/api/v1/listings/{id}/ready` | 409 CHECK_STALE / NOT_PASSED / VERSION_CONFLICT; 404; 403 |
| `export` | POST | `/api/v1/listings/{id}/exports` | same |

- Ban: Blocked/Needs AI/UNAVAILABLE becoming READY; writing cost or customer into TXT.
- Acceptance: `curl -D- -X POST .../exports` response headers contain `text/plain`. POST ready with no check → 409 `NOT_PASSED`. After changing title, ready → 409 `CHECK_STALE`. `rg "purchaseCost|soldPrice|homeAddress" dealer-core/src/main/java/com/dealerops/core/listing/ListingService.java` export method has none of those fields.

---

### BE-T18 Audit GET
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/audit/AuditController.java`
  - `dealer-core/src/main/java/com/dealerops/core/audit/AuditService.java`
  - `dealer-core/src/main/java/com/dealerops/core/audit/dto/AuditItem.java`
- Must include:

```java
@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {
  @GetMapping
  public PageResponse<AuditItem> list(
      @RequestParam String entityType,
      @RequestParam Long entityId,
      @RequestParam(defaultValue="0") int page,
      @RequestParam(defaultValue="10") int size) {}
}
public record AuditItem(Long id, String entityType, Long entityId, String action,
    java.util.Map<String, Object> fieldSummary, String actorOid, Instant createdAt) {}
```

`entityType`+`entityId` are **required**; missing → `400 VALIDATION`. Staff only this store; entity not in this store → 404. Staff querying `DEALER`/`MEMBERSHIP` → 403. Admin querying `VEHICLE`/`CUSTOMER`/`CUSTOMER_VEHICLE`/`LISTING` → 403, no `fieldSummary` business content. This course has no Admin audit page: Admin hitting this API is **always 403**.

Write path (called by Vehicle/Customer/Membership):

```java
public void record(String entityType, long entityId, String action, Long dealerId,
    String actorOid, java.util.Map<String, Object> fieldSummary) {}
```

| Method | HTTP | path | Error codes |
|---|---|---|---|
| `list` | GET | `/api/v1/audit` | 400 VALIDATION; 403; 404 |

- Ban: summaries writing full phone/email/address.
- Acceptance: `rg "@RequestParam String entityType" dealer-core/src/main/java/com/dealerops/core/audit/AuditController.java`. Staff querying another store’s entityId → 404. `rg "put\\(\"phone\"" dealer-core` none.

---

### BE-T19 Assistant core `POST /assistant/ask`
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/assistant/AssistantController.java`
  - `dealer-core/src/main/java/com/dealerops/core/assistant/AssistantService.java`
  - `dealer-core/src/main/java/com/dealerops/core/assistant/AssistantResourceQuery.java`
  - `dealer-core/src/main/java/com/dealerops/core/assistant/dto/AskRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/assistant/dto/AskResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/assistant/dto/ResourceCard.java`
- Must include:

```java
@RestController
@RequestMapping("/api/v1/assistant")
public class AssistantController {
  @PostMapping("/ask")
  public AskResponse ask(@Valid @RequestBody AskRequest body) {}
}
public record AskRequest(@NotBlank String text) {}
public record ResourceCard(String kind, Long id, String label, String status, Long vehicleId, String checkStatus) {}
public record AskResponse(String summary, boolean summaryAvailable, java.util.List<ResourceCard> cards) {}
```

`kind`: `VEHICLE`|`CUSTOMER`|`LISTING`. Cards have no phone/email/address. `AssistantResourceQuery.load(tenantDealerId, text)` at most 5 this-store resources. Admin → 403. Do not write `vehicle`/`customer`/`listing`/`compliance_check`. Do not retain per-user conversation history in memory: it is not sent on the next call (question + resources only) and must not grow for the life of the JVM. Do not persist it to a business table.

Model down: still **200**, `summary=null`, `summaryAvailable=false`, `cards`=retrieval list. Do not 502 (502 is only for ad check).

| Method | HTTP | path | Error codes |
|---|---|---|---|
| `ask` | POST | `/api/v1/assistant/ask` | 400 VALIDATION (empty text); 403; 401 |

- Ban: writing business tables; PII on cards; inventing ids into cards (must fall in this retrieval set).
- Acceptance: `rg "save\\(|persist\\(" dealer-core/src/main/java/com/dealerops/core/assistant` none. Empty `{"text":""}` → 400. Admin POST → 403. After stopping ai-service, staff POST → 200 and `summaryAvailable=false`.

---

### BE-T20 core `AiGatewayClient` (via Gateway, ≤15s)
- Repo: dealer-core
- Create/change files:
  - `dealer-core/src/main/java/com/dealerops/core/integration/AiGatewayClient.java`
  - `dealer-core/src/main/java/com/dealerops/core/integration/InternalHeaders.java`
  - `dealer-core/src/main/java/com/dealerops/core/config/AiClientConfig.java`
  - `dealer-core/src/main/java/com/dealerops/core/integration/dto/AdCheckInternalRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/integration/dto/AssistantInternalRequest.java`
- Must include:

```java
public final class InternalHeaders {
  public static final String NAME = "X-Dealer-Internal";
}
@Configuration
public class AiClientConfig {
  @Bean
  WebClient gatewayWebClient(
      @Value("${dealerops.gateway-base-url}") String base,
      @Value("${dealerops.ai-timeout-ms:15000}") long timeoutMs) {
    HttpClient http = HttpClient.create()
        .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 2000)
        .responseTimeout(Duration.ofMillis(timeoutMs - 2000));
    return WebClient.builder().baseUrl(base)
        .clientConnector(new ReactorClientHttpConnector(http)).build();
  }
}
@Component
public class AiGatewayClient {
  public java.util.List<AiNote> adCheck(AdCheckInternalRequest body) { return null; }
  public String assistant(AssistantInternalRequest body) { return null; }
}
public record ListingPublic(String title, String body, String adKind, String medium) {}
public record VehiclePublic(int modelYear, String make, String model, String vin,
    String conditionCode, String source) {}
public record DealerPublic(String legalName, String contactPhone, String contactEmail, String contactAddress) {}
public record AdCheckInternalRequest(ListingPublic listing, VehiclePublic vehiclePublic, DealerPublic dealerPublic) {}
public record ResourceRef(String kind, Long id, String label, String status) {}
public record AssistantInternalRequest(String question, java.util.List<ResourceRef> resources) {}
```

`adCheck`: `POST {base}/internal/v1/ad-check`, header `X-Dealer-Internal: ${INTERNAL_TOKEN}`, **do not** forward the user `Authorization`. 4xx/5xx/timeout → throw `AiCallFailed` (check path becomes 502 via T16).
`assistant`: `POST {base}/internal/v1/assistant`, same header; failure throws `AiCallFailed` (T19 swallows it into 200).

Base URL **must be Gateway** (default `http://localhost:8080`); ban a product path that calls `8082` directly.

- Ban: core holding `AIMANAGER_API_KEY`; embedding the ai-manager JAR; sending the user JWT to AI.
- Acceptance: `rg "8082" dealer-core/src/main/resources dealer-core/src/main/java/com/dealerops/core/integration` has no product base. `rg "X-Dealer-Internal" dealer-core`. `rg "AIMANAGER" dealer-core` none. WireMock asserts outbound URL path=`/internal/v1/ad-check` with the internal header and no `Authorization`.

---

### BE-T21 Gateway JWT + InternalRouteFilter
- Repo: dealer-gateway
- Create/change files:
  - `dealer-gateway/src/main/java/ca/sait/dealerops/gateway/config/SecurityConfig.java`
  - `dealer-gateway/src/main/java/ca/sait/dealerops/gateway/filter/InternalRouteFilter.java`
- Must include:

```java
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {
  @Bean
  SecurityWebFilterChain chain(ServerHttpSecurity http) {
    http.csrf(ServerHttpSecurity.CsrfSpec::disable);
    http.oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
    http.authorizeExchange(a -> a
        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        .pathMatchers("/api/v1/**").authenticated()
        .pathMatchers("/internal/v1/**").permitAll()  // Header predicate + 404 fallback; do not 401
        .anyExchange().denyAll());
    return http.build();
  }
}
```

`InternalRouteFilter`: if path starts with `/internal/v1/` and the header is not `INTERNAL_TOKEN` → `setComplete` status **404** (not 401). Without a header the request never enters the `ai-service-internal` route; yaml already 404s; this is a second layer against a misconfigured direct call.

Gateway **forwards** `Authorization` on `/api/v1/**`. Unmappable role: `/api/v1/**` → **401** (no `roles` containing one of the two). Mapping function is the same as T08 (Admin wins). Gateway does not issue tokens.

- Ban: a fifth auth repo; cookie sessions; CORS exposing the internal header.
- Acceptance:
  1. `curl http://localhost:8080/api/v1/me` → 401.
  2. `curl http://localhost:8080/internal/v1/ad-check` → 404.
  3. `curl -H "X-Dealer-Internal: dealer-internal" -H "Content-Type: application/json" -d "{}" http://localhost:8080/internal/v1/ad-check` reaches 8082 when ai-service is up (not 401).
  4. Browser preflight OPTIONS `/api/v1/vehicles` from `http://localhost:5173` → ACAO includes that origin; `Access-Control-Allow-Headers` does not include `X-Dealer-Internal`.

---

### BE-T22 ai-service two internal POSTs + failure body (so core becomes 502)

Implement [AI-PROTOCOL-AND-RULES.md](AI-PROTOCOL-AND-RULES.md) §B exactly. Local `INTERNAL_TOKEN` default is **`dealer-internal`**, accepted only when the Spring profile is **`dev`** or **`local`**.
- Repo: ai-service
- Create/change files:
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/adapter/adcheck/AdCheckController.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/adapter/adcheck/AdCheckAdapter.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/adapter/assistant/AssistantController.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/adapter/assistant/AssistantAdapter.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/support/AiManagerFactory.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/support/ModelFailureException.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/support/AiFailureBody.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/config/AiExceptionHandler.java`
- Must include:

```java
@RestController
@RequestMapping("/internal/v1")
public class AdCheckController {
  @PostMapping("/ad-check")
  public AdCheckOkResponse adCheck(@RequestBody AdCheckInternalRequest body) {}
}
@RestController
@RequestMapping("/internal/v1")
public class AssistantController {
  @PostMapping("/assistant")
  public AssistantOkResponse assistant(@RequestBody AssistantInternalRequest body) {}
}
public record AdCheckOkResponse(boolean success, java.util.List<AiNote> notes) {}
public record AssistantOkResponse(boolean success, String summary) {}
public record AiNote(String message) {}
public record AiFailureBody(boolean success, String code, String message) {}
// code only: AI_TIMEOUT | AI_KEY_MISSING | AI_PROVIDER_FAILED
```

Request-record fields (aligned with 14 §11; may share shape with core):

```java
public record AdCheckInternalRequest(ListingIn listing, VehiclePublic vehiclePublic, DealerPublic dealerPublic) {}
public record ListingIn(String title, String body, String adKind, String medium) {}
public record VehiclePublic(int modelYear, String make, String model, String vin, String conditionCode, String source) {}
public record DealerPublic(String legalName, String contactPhone, String contactEmail, String contactAddress) {}
public record AssistantInternalRequest(String question, java.util.List<ResourceIn> resources) {}
public record ResourceIn(String kind, Long id, String label, String status) {}
```

`AdCheckAdapter.run(req)`:

```
if blank(AIMANAGER_API_KEY): throw ModelFailureException(AI_KEY_MISSING)   // immediately, do not wait 15s
id = UUID
try:
  AiManager mgr = AiManagerFactory.create()
  mgr.startConversation(id, system)   // system=review notes, not the 15 hard rules
  AIResponse r = mgr.request(userJson) with 15s orTimeout
  if !r.isSuccess(): throw AI_PROVIDER_FAILED
  return notes from content   // elements at least {message}
finally:
  mgr.closeConversation(id)
```

Use only `com.manager.AiManager` `request(String)`, `startConversation(id, systemMessage)`, `closeConversation`.

`AiExceptionHandler`: **unified failure contract** (PROTOCOL §B.2; same shape for assistant):

```
HTTP 504 | 503 | 502
Content-Type: application/json
{"success":false,"code":"AI_TIMEOUT"|"AI_KEY_MISSING"|"AI_PROVIDER_FAILED","message":"<fixed English from PROTOCOL>"}
```

| Reason | HTTP | `code` |
|---|---|---|
| connect+response timeout | **504** | `AI_TIMEOUT` |
| `AIMANAGER_API_KEY` missing or blank | **503** | `AI_KEY_MISSING` |
| Invalid key / `isSuccess()==false` / parse failure / vendor error | **502** | `AI_PROVIDER_FAILED` |

core `AiGatewayClient`: HTTP ≠ 200, or body.`success` ≠ true, or read timeout → `AiCallFailed`. Check path → persist UNAVAILABLE + public **502 `AI_UNAVAILABLE`**. Assistant path → public still 200.

ai-service **must not** write `compliance_check` itself, must not return the five states to the browser, must not return a fake Passed.

| Method | HTTP | path | Success body | Failure |
|---|---|---|---|---|
| `adCheck` | POST | `/internal/v1/ad-check` | 200 `{success:true,notes[]}` | 504/503/502 `{success:false,code,message}`; no internal header 404 |
| `assistant` | POST | `/internal/v1/assistant` | 200 `{success:true,summary}` | same failure shape |

- Ban: scanning `com.gateway`; exposing `/api/ai/**`; rule engine; business tables; 200 empty notes pretending success.
- Acceptance:
  1. `rg "com.gateway" ai-service/src/main/java` none.
  2. `rg "@PostMapping\\(\"/ad-check\"\\)" ai-service` and `@PostMapping("/assistant")`.
  3. After start with `AIMANAGER_API_KEY=`: `curl -H "X-Dealer-Internal: dealer-internal" -H "Content-Type: application/json" -d "{\"listing\":{\"title\":\"t\",\"body\":\"b\",\"adKind\":\"CASH\",\"medium\":\"ONLINE\"},\"vehiclePublic\":{\"modelYear\":2020,\"make\":\"T\",\"model\":\"C\",\"vin\":\"1\",\"conditionCode\":\"AS_IS\",\"source\":\"AUCTION\"},\"dealerPublic\":{\"legalName\":\"X\",\"contactPhone\":\"1\",\"contactEmail\":\"a@b.c\",\"contactAddress\":\"z\"}}" http://127.0.0.1:8082/internal/v1/ad-check` → **503** and body contains `"success":false` and `"code":"AI_KEY_MISSING"` (returns within 1 second).
  4. Same URL with no header → 404.
  5. core POST `/api/v1/listings/{id}/checks` on a listing with no hard miss at this point → **502** `AI_UNAVAILABLE` and the check row is written.

---

### BE-T23 Implementation order (align BRIEF §11; do not skip)
- Repo: dealer-core | dealer-gateway | ai-service | dealer-platform
- Create/change files: no new files. The coding AI opens PRs in the sequence below; do not start the next number until the "done when" bar is met.
- Must include: mapping table (BRIEF # → this document's tasks):

| Seq | BRIEF | Repo | Which BE-T | Done when (decidable) |
|---|---|---|---|---|
| 1 | BRIEF-1 | local machine | (environment) | `java -version` contains `21` |
| 2 | BRIEF-2 | three Java repos | T01 T02 T03 T04 | three repos `mvn -DskipTests compile` exit 0; core 8081 / gw 8080 / ai 8082 can start (core without a DB may fail datasource; compile the main class first) |
| 3 | BRIEF-3 | core | T06 T07 | Flyway one DB 9 tables; `ddl-auto=validate` |
| 4 | BRIEF-4 | gateway | T03 T21 T05 | `curl :8080/internal/v1/ad-check` → 404; CORS only 5173 |
| 5 | BRIEF-5 | gateway+core | T08 T09 | no token 401; `GET /me` 200; body `dealerId` cannot change tenant |
| 6 | BRIEF-6 | core | T10 T11 | two stores two staff can be inserted; staff hitting admin → 403 |
| 7 | BRIEF-7 | core | T12 T18 | VIN unique; sold lock; sale as a pair; `audit_event` exists |
| 8 | BRIEF-8 | core | T13 T14 T18 | cross-store 404; one vehicle one customer 409; sold unlink 409; in-stock 204 |
| 9 | BRIEF-9 | core | T15 T16 (Omvic only; Client may stub-throw failure) | missing price / FINANCE missing APR → 200 BLOCKED; **zero** internal AI calls |
| 10 | BRIEF-10 | ai-service | T04 T22 | do not expose `com.gateway`; missing Key → 503; CI stub |
| 11 | BRIEF-11 | core+ai | T16 T20 T22 | checks via Gateway; failure 502+already persisted; condition change → STALE |
| 12 | BRIEF-12 | core | T17 | not Passed/Stale → 409; export `text/plain` |
| 13 | BRIEF-13 | core+ai | T19 T20 T22 | ≤5 cards; invented ids discarded; model down 200 `summaryAvailable=false` |
| — | BRIEF-14 | web | **do not** (this document does not cover frontend) | — |
| — | BRIEF-15 | platform | T05 read-only env | **do not change** env.example / Bicep / SQL |

Local integration start order: MySQL:3306 → core:8081 → ai-service:8082 → gateway:8080. Product curls always hit `http://localhost:8080`.

- Ban: doing assistant before `/me`; putting rules into ai-service first; doing cloud Bicep before an empty repo starts; doing BRIEF-14 frontend.
- Acceptance: commit message or PR title contains `BE-Txx`. `rg "BRIEF-14|dealer-web" ` in this backend commit fails. git diff does not include `design/13`–`19`, `IMPLEMENTATION-BRIEF.md`, `V1__init.sql`, `README`.

---

## Do-not list (pinned again)

Work orders, leads, password tables, CSRF cookie sessions, Service Bus/outbox, a fifth `dealer-auth` repo, buyer `/public/**`, KPI, APR/warranty columns, `ddl-auto=update`, changing V1, public 8081/8082 CORS, treating `com.gateway` as an API, core calling 8082 as a product path, Admin reading or writing vehicles/customers/ads.
