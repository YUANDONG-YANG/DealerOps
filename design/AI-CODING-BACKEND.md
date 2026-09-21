# AI 编码规格：后端（可编译、按契约接线）

你是编码 AI。只实现本文编号任务（BE-Txx）。不要读废止的 `01`–`06`，不要实现工单/线索/密码登录/Service Bus/第五 auth 仓。
契约冲突：HTTP JSON / 路径 / 错误码以 `design/14-Backend-API-Contract.md` 为准；数据列 / 租户 / membership / 空草稿 / SOLD / Gateway 行为以 `design/15-Data-Auth-and-Gateway.md` 为准。`18`/`19` 只定文件位置，不另造契约。
栈钉死：Java 21、Spring Boot 3.3.5、四仓独立（`dealer-core` / `dealer-gateway` / `ai-service` / `dealer-web`；`dealer-platform` 只放 env/compose，不跑业务）。禁止 monorepo 合并、禁止 core 21 + ai-service 17。
浏览器只打 Gateway `http://localhost:8080` 前缀 `/api/v1/**`。core 只听 `8081`，ai-service 只听 `8082`，两者不对浏览器配 CORS，不对外 Ingress。
忽略客户端 body/query/header 里的 `dealerId`（含 `X-Dealer-Id`）。跨店或本店无此 id → **404** `NOT_FOUND`（不 403）。店员无 `membership.active=1` 调业务接口 → **403** `FORBIDDEN`（不是 401/404）。`GET /me` 仍 200 且 `dealerId=null`。
角色仅 JWT `roles[]`：`Platform.Admin`、`Dealer.User`。Admin 与店员同时出现 → Admin 赢。Admin 打 `/vehicles` `/customers` `/listings/**` `/audit` `/assistant` → 403，响应体无 vin/成本/客户字段。
未在本文列出的功能 = 不做。禁止 `ddl-auto=update`。禁止改 `V1__init.sql`、禁止改 `13`–`19`、BRIEF、README。禁止对外暴露库 `com.gateway` 或 `/api/ai/**`。
分页信封 `{items,page,size,total}`，`page` 从 0，`size` 默认 10 且封顶 10。错误体 `{code,message}`；`400 VALIDATION` 可带 `fieldErrors`。JSON camelCase，金额 JSON number，日期 `YYYY-MM-DD`，时间戳 ISO-8601 UTC。
实现序对齐 BRIEF §11：空仓能启动 → Flyway/实体 → Gateway 路由 → JWT + `/me` → Admin → vehicle → customer/挂解绑 → listing+规则（不调 AI）→ ai-service 适配器 → checks → ready/export → assistant。未完成前序不要跳做后序。

---

## 全局钉死（所有任务共用）

### 版本

| 项 | 值 |
|---|---|
| Java | `21` |
| Spring Boot | `3.3.5` |
| Spring Cloud（仅 gateway） | `2023.0.4` |
| Flyway | 跟 Boot BOM（`flyway-core` + `flyway-mysql`） |
| MySQL 驱动 | `com.mysql:mysql-connector-j`（跟 BOM） |
| ai-manager | 本机开发：`com.aimanager:aimanager:1.0.0-SNAPSHOT`（commit `c07e1f2afe5dd692c20f3567ad3a42a90d31a87a`，先 `mvn install`）。发布：同 commit 打的**非 SNAPSHOT** 不可变版本。CI stub，不打付费端点。 |
| JPA `ddl-auto` | `validate`（本地空库靠 Flyway 建表；禁止 `update`/`create`） |

### 包名（不要改）

| 仓 | 根包 |
|---|---|
| dealer-core | `com.dealerops.core` |
| dealer-gateway | `ca.sait.dealerops.gateway` |
| ai-service | `ca.sait.dealerops.aiservice` |

### 错误码枚举（只这些，不要第 13 个业务码）

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

### 分页 / 错误 Java 记录（core 共用）

```java
public record PageResponse<T>(java.util.List<T> items, int page, int size, long total) {}
public record ErrorBody(String code, String message, java.util.Map<String, String> fieldErrors) {}
// fieldErrors 仅 VALIDATION 使用；其他错误该字段为 null，序列化时 NON_NULL
```

`size` 处理：`int size = requested <= 0 ? 10 : Math.min(requested, 10);`

---

### BE-T01 三仓 `pom.xml` 依赖清单
- 仓：dealer-core | dealer-gateway | ai-service
- 新建/改文件：
  - `dealer-core/pom.xml`
  - `dealer-gateway/pom.xml`
  - `ai-service/pom.xml`
- 必须包含：（类名、方法签名、注解、配置键）

三仓共同：

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

`maven-compiler-plugin`：`release=21`。打包用 `spring-boot-maven-plugin`。

**dealer-core 必须依赖（有则保留，无则加；不要加没列的业务 starter）：**

| artifact | 用途 |
|---|---|
| `spring-boot-starter-web` | HTTP `/api/v1/**` |
| `spring-boot-starter-validation` | Bean Validation |
| `spring-boot-starter-data-jpa` | Entity |
| `spring-boot-starter-oauth2-resource-server` | 验 Entra JWT |
| `org.flywaydb:flyway-core` | 迁移 |
| `org.flywaydb:flyway-mysql` | MySQL 方言（Flyway 10+ 必需） |
| `com.mysql:mysql-connector-j` | 驱动 |
| `org.springframework.boot:spring-boot-starter-webflux` | 仅给 `WebClient` 出站 Gateway（不要另起 Netty 业务端口） |
| `spring-boot-starter-test` | test scope |

core **禁止**依赖：`spring-cloud-starter-gateway`、`com.aimanager:aimanager`、任何密码/session starter。

**dealer-gateway 必须依赖：**

| artifact | 用途 |
|---|---|
| `org.springframework.cloud:spring-cloud-starter-gateway` | 路由 |
| `spring-boot-starter-oauth2-resource-server` | 验用户 JWT |
| `spring-boot-starter-validation` | 配置校验（可有） |
| `spring-boot-starter-test` | test |

BOM：

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

gateway **禁止**依赖：`spring-boot-starter-data-jpa`、`flyway-*`、`mysql-connector-j`、`aimanager`、`spring-boot-starter-web`（Gateway 用 WebFlux；不要同时拉 MVC）。

**ai-service 必须依赖：**

| artifact | 用途 |
|---|---|
| `spring-boot-starter-web` | `/internal/v1/**` |
| `spring-boot-starter-validation` | body 校验 |
| `spring-boot-starter-webflux` | 自管 15s 超时的 HttpClient（若只用 JDK HttpClient 可省略，默认用 Webflux） |
| `com.aimanager:aimanager` | `1.0.0-SNAPSHOT` 或已打的不可变版 |
| `spring-boot-starter-test` | test |

ai-service **禁止**依赖：`spring-boot-starter-data-jpa`、`flyway-*`、`mysql-connector-j`、`spring-cloud-starter-gateway`、`oauth2-resource-server`（内部头鉴权，不验用户 JWT）。

`aimanager` 仓库（本机可先 `mvn install`，CI 用 stub 模块时仍保留此坐标但 profile `stub` 排除）：

```xml
<repository>
  <id>github-ai-manager</id>
  <url>https://maven.pkg.github.com/YUANDONG-YANG/ai-manager</url>
</repository>
```

- 禁止：三仓混用 Java 17/21；gateway 拉 JPA；core 嵌 `aimanager`；ai-service 拉 Flyway；把 `com.gateway` 当 Spring 扫描包。
- 验收：
  1. `rg "java.version" dealer-core/pom.xml dealer-gateway/pom.xml ai-service/pom.xml` 三处都是 `21`。
  2. `rg "spring-boot-starter-parent" */pom.xml` 版本都是 `3.3.5`。
  3. `rg "flyway-core|mysql-connector-j|oauth2-resource-server" dealer-gateway/pom.xml ai-service/pom.xml` 无 Flyway/MySQL；gateway 无 JPA；ai-service 无 oauth2-resource-server。
  4. `rg "spring-cloud-starter-gateway" dealer-gateway/pom.xml` 有；`rg "spring-cloud-starter-gateway" dealer-core/pom.xml ai-service/pom.xml` 无。
  5. 本机 `JAVA_HOME` 指向 21 后：`mvn -q -f dealer-core/pom.xml -DskipTests compile`、gateway、ai-service 各自 exit 0（ai-service 在 SNAPSHOT 未安装时允许先空适配器 + optional 依赖，但坐标必须写上）。

---

### BE-T02 dealer-core 空仓能启动
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/DealerCoreApplication.java`
  - `dealer-core/src/main/resources/application.yml`
  - `dealer-core/Dockerfile`
- 必须包含：

```java
@SpringBootApplication
public class DealerCoreApplication {
  public static void main(String[] args) { SpringApplication.run(DealerCoreApplication.class, args); }
}
```

`application.yml` 写死：

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
  internal-token: ${INTERNAL_TOKEN:dealer-internal-dev-only}
  ai-timeout-ms: 15000
```

**不要**写 `spring.web.cors` / `allowedOrigins: http://localhost:5173`。
`Dockerfile`：`EXPOSE 8081`；`ENTRYPOINT` 跑 fat jar。

- 禁止：监听 8080；配浏览器 CORS；`ddl-auto=update`；实现 `/internal/v1/**`；改 `V1__init.sql`。
- 验收：
  1. `rg "ddl-auto" dealer-core/src/main/resources/application.yml` 只有 `validate`。
  2. `rg "allowedOrigins|localhost:5173" dealer-core` 无。
  3. MySQL `dealer_core` 已起（compose 仅库）时：`mvn -f dealer-core/pom.xml spring-boot:run` 日志含 `Tomcat started on port 8081`。
  4. `curl -s -o NUL -w "%{http_code}" http://127.0.0.1:8081/api/v1/me` → `401`（未配 Security 前可先 403/401，完成本任务+T08 后必须 401）。

---

### BE-T03 dealer-gateway 可复制路由 YAML
- 仓：dealer-gateway
- 新建/改文件：
  - `dealer-gateway/src/main/java/ca/sait/dealerops/gateway/GatewayApplication.java`
  - `dealer-gateway/src/main/resources/application.yaml`
  - `dealer-gateway/Dockerfile`
- 必须包含：

```java
@SpringBootApplication
public class GatewayApplication {
  public static void main(String[] args) { SpringApplication.run(GatewayApplication.class, args); }
}
```

**整文件复制** `application.yaml`（端口 8080 / 上游 8081 / 8082、内部头名、CORS origin 钉死）：

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
      globalcors:
        add-to-simple-url-handler-mapping: true
        cors-configurations:
          '[/**]':
            allowedOrigins:
              - "http://localhost:5173"
            allowedMethods: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
            allowedHeaders: [Authorization, Content-Type]
            exposedHeaders: []
            allowCredentials: false
      default-filters:
        - DedupeResponseHeader=Access-Control-Allow-Origin Access-Control-Allow-Credentials, RETAIN_UNIQUE
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
            - Header=X-Dealer-Internal, ${INTERNAL_TOKEN:dealer-internal-dev-only}
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
  internal-token: ${INTERNAL_TOKEN:dealer-internal-dev-only}
```

本机未进 compose 时 `CORE_URL`/`AI_URL` 默认 `127.0.0.1`（上表）。进 compose 时环境覆盖为 `http://host.docker.internal:8081` / `8082`（与 `env.example` 一致）。
`Dockerfile`：`EXPOSE 8080`。

- 禁止：把 `/api/v1/**` 转到 ai-service；`Access-Control-Allow-Headers` 列出 `X-Dealer-Internal`；连 MySQL；签发 JWT；包名 `com.gateway`。
- 验收：
  1. `rg "Path=/api/v1" dealer-gateway/src/main/resources/application.yaml` 且同行块 `uri` 含 `CORE_URL` 或 `8081`。
  2. `rg "Path=/internal/v1" dealer-gateway/src/main/resources/application.yaml` 且含 `X-Dealer-Internal`。
  3. `rg "allowedOrigins" -A2 dealer-gateway/src/main/resources/application.yaml` 含 `http://localhost:5173`。
  4. `rg "X-Dealer-Internal" dealer-gateway/src/main/resources/application.yaml` 的 CORS `allowedHeaders` 段不含该头。
  5. gateway 启动后：`curl -s -o NUL -w "%{http_code}" http://localhost:8080/internal/v1/ad-check` → `404`（无内部头）。
  6. `curl -s -o NUL -w "%{http_code}" http://localhost:8080/no-such` → `404`。

---

### BE-T04 ai-service 空仓 + 15s 超时写法
- 仓：ai-service
- 新建/改文件：
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/AiServiceApplication.java`
  - `ai-service/src/main/resources/application.yaml`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/config/AiTimeoutConfig.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/config/InternalGuardFilter.java`
  - `ai-service/Dockerfile`
- 必须包含：

```java
@SpringBootApplication(scanBasePackages = "ca.sait.dealerops.aiservice")
public class AiServiceApplication {
  public static void main(String[] args) { SpringApplication.run(AiServiceApplication.class, args); }
}
```

`application.yaml`：

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
  internal-token: ${INTERNAL_TOKEN:dealer-internal-dev-only}
aimanager:
  api-key: ${AIMANAGER_API_KEY:}
  gateway-provider: ${AIMANAGER_GATEWAY_PROVIDER:openai}
  gateway-model: ${AIMANAGER_GATEWAY_MODEL:}
```

超时必须自做（库 `WebClient.blockOptional()` 无 15s 保证）。`AiTimeoutConfig` 钉死：

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

适配器调用模型时再用 `java.util.concurrent.CompletableFuture` + `orTimeout(15000, MILLISECONDS)` 包一层，总上限 **15000ms**。限流队列默认关（不要启 ai-manager 队列）。

`InternalGuardFilter`：实现 `OncePerRequestFilter`；若 path 以 `/internal/v1/` 开头且头 `X-Dealer-Internal` ≠ `dealerops.internal-token` → `response.setStatus(404)` 并 return。无 CORS 配置。

- 禁止：扫描 `com.gateway`、`com.manager` 以外的库 Web 包；启动 `AIApplication`；暴露 `/api/ai/request` `/chat` `/credentials` `/runtime`；配 `5173` CORS；连库；Flyway。
- 验收：
  1. `rg "scanBasePackages" ai-service/src/main/java` 不含 `com.gateway`。
  2. `rg "timeout-ms: 15000" ai-service/src/main/resources/application.yaml`。
  3. `rg "orTimeout|timeout-ms|responseTimeout" ai-service/src/main/java` 存在 15000 或 `timeoutMs`。
  4. 启动后 `curl -s -o NUL -w "%{http_code}" http://127.0.0.1:8082/internal/v1/ad-check` → `404`。
  5. `rg "localhost:5173" ai-service` 无。

---

### BE-T05 环境变量表（从 env.example 抄全 + 本地缺省）
- 仓：dealer-platform
- 新建/改文件：无（**不要改** `dealer-platform/env.example`）。各仓 `application.yml` / `application.yaml` 按本表读。编码 AI 把缺的 `INTERNAL_TOKEN`、`GATEWAY_BASE_URL` 写进各仓 yaml 默认值，不回写 env.example。
- 必须包含：按下表注入。空单元格的「本地默认」必须用。

| 变量 | 给谁 | 本地默认（写死） |
|---|---|---|
| `VITE_ENTRA_TENANT_ID` | web（本规格不实现 web） | 空串 `""`（Sprint 2 再填） |
| `VITE_ENTRA_CLIENT_ID` | web | 空串 `""` |
| `VITE_ENTRA_API_SCOPE` | web | `api://dealer-api/access_as_user` |
| `VITE_GATEWAY_URL` | web | `http://localhost:8080` |
| `GATEWAY_PORT` | gateway | `8080` |
| `CORE_URL` | gateway | compose：`http://host.docker.internal:8081`；本机直接跑：`http://127.0.0.1:8081`（yaml 默认后者） |
| `AI_URL` | gateway | compose：`http://host.docker.internal:8082`；本机：`http://127.0.0.1:8082` |
| `CORE_PORT` | core | `8081` |
| `MYSQL_URL` | core | `jdbc:mysql://localhost:3306/dealer_core?useSSL=false&allowPublicKeyRetrieval=true` |
| `MYSQL_USER` | core | `dealer` |
| `MYSQL_PASSWORD` | core | `dealer_dev_only` |
| `AI_PORT` | ai-service | `8082` |
| `AIMANAGER_API_KEY` | **仅** ai-service | 空串；空则首次模型调用立即失败，不挂满 15s |
| `AIMANAGER_GATEWAY_PROVIDER` | ai-service | `openai` |
| `AIMANAGER_GATEWAY_MODEL` | ai-service | 空串；联调真模型时必须填部署名 |
| `ENTRA_ISSUER` | gateway + core | `https://login.microsoftonline.com/<tenant-id>/v2.0` |
| `ENTRA_AUDIENCE` | gateway + core | `api://dealer-api` |
| `INTERNAL_TOKEN` | gateway + core 出站 + ai-service | `dealer-internal-dev-only`（env.example 未列；yaml 默认此值。web **不读**） |
| `GATEWAY_BASE_URL` | core 出站 | `http://localhost:8080` |

谁不读：web 不读 `AIMANAGER_*` / `MYSQL_*` / `INTERNAL_TOKEN`；gateway/core 不读 `AIMANAGER_API_KEY`；ai-service 不读 `MYSQL_*`。

- 禁止：把真实 Key 写进 Git；core 读 `AIMANAGER_API_KEY`；改 `env.example`。
- 验收：`rg "AIMANAGER_API_KEY" dealer-core dealer-gateway` 无业务读取；`rg "INTERNAL_TOKEN|internal-token" dealer-core dealer-gateway ai-service` 三仓都有默认 `dealer-internal-dev-only`。

---

### BE-T06 core 完整包路径 + Entity 对齐 V1（逐列）
- 仓：dealer-core
- 新建/改文件：（完整路径）

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

DTO 放各域 `dto/` 子包，类名见后续任务。本任务先把 Entity + Repository + 枚举编过。

枚举（`@Enumerated(EnumType.STRING)`，库内存字符串与下表完全一致）：

| 枚举 | Java 名 | DB 值 |
|---|---|---|
| `AppRole` | `PLATFORM_ADMIN`, `DEALER_USER` | 用 `@JsonValue`/`AttributeConverter` 存 **`Platform.Admin`** / **`Dealer.User`**（带点，与 JWT 一致） |
| `VehicleStatus` | `IN_STOCK`, `SOLD` | `IN_STOCK` `SOLD` |
| `VehicleSource` | `TRADE_IN`, `AUCTION`, `PRIVATE_PURCHASE`, `OTHER` | 同名 |
| `ConditionCode` | `CERTIFIED`, `AS_IS`, `UNFIT`, `IRREPARABLE` | 同名 |
| `AdKind` | `CASH`, `FINANCE`, `LEASE` | 同名 |
| `AdMedium` | `ONLINE`, `RADIO_TV_BILLBOARD` | 同名 |
| `ListingStatus` | `DRAFT`, `READY` | 同名 |
| `AiStatus` | `SKIPPED`, `SUCCESS`, `FAILED`, `UNAVAILABLE` | 同名 |
| `Recommendation` | `BLOCKED`, `NEEDS_AI`, `PASSED`, `UNAVAILABLE` | 同名 |
| `EntityType` | `VEHICLE`, `CUSTOMER`, `CUSTOMER_VEHICLE`, `LISTING`, `DEALER`, `MEMBERSHIP` | 同名 |
| `AuditAction` | `CREATE`, `UPDATE`, `SELL`, `LINK`, `UNLINK` | 同名 |

**逐列 Entity（列名 = V1，不多列）。** 全部 `@Table(name="...")`。`@Version` 用在有 `version` 的表。时间：`created_at`/`updated_at`/`linked_at` 用 `@CreationTimestamp`/`@UpdateTimestamp` 或 `Instant`；`added_on`/`sold_on` 用 `LocalDate`。金额 `BigDecimal`。`listing.last_check_id` **不要** `@ManyToOne`。

`DealerEntity` ↔ `dealer`：

| 列 | Java 字段 | 注解 |
|---|---|---|
| `id` | `Long id` | `@Id @GeneratedValue(IDENTITY)` |
| `legal_name` | `String legalName` | `@Column(name="legal_name", nullable=false, length=200)` |
| `contact_phone` | `String contactPhone` | `nullable=false, length=40` |
| `contact_email` | `String contactEmail` | `nullable=false, length=120` |
| `contact_address` | `String contactAddress` | `nullable=false, length=300` |
| `active` | `boolean active` | `nullable=false` 默认 true |
| `version` | `int version` | `@Version` |
| `created_at` | `Instant createdAt` | `nullable=false` |
| `updated_at` | `Instant updatedAt` | `nullable=false` |

`AppUserEntity` ↔ `app_user`：

| 列 | Java 字段 |
|---|---|
| `id` | `Long id` |
| `entra_tenant_id` | `String entraTenantId` length 64 NOT NULL |
| `entra_oid` | `String entraOid` length 64 NOT NULL |
| `display_name` | `String displayName` length 120 NOT NULL |
| `role` | `AppRole role` VARCHAR(32) NOT NULL |
| `dealer_id` | `Long dealerId` **可空**（Admin 必须 null；**不是**租户权威） |
| `active` | `boolean active` 默认 true |
| `created_at` | `Instant createdAt` |

无 `version` 列。UK：`(entraTenantId, entraOid)`。

`MembershipEntity` ↔ `membership`：

| 列 | Java 字段 |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` NOT NULL |
| `entra_oid` | `String entraOid` NOT NULL |
| `active` | `boolean active` 默认 true |
| `created_by` | `String createdBy` NOT NULL（绑人者 JWT `oid`） |
| `created_at` | `Instant createdAt` |

UK：`(dealerId, entraOid)`。

`VehicleEntity` ↔ `vehicle`：

| 列 | Java 字段 |
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
| `repair_cost` | `BigDecimal repairCost` 可空 |
| `carfax_url` | `String carfaxUrl` length 500 可空 |
| `sold_on` | `LocalDate soldOn` 可空 |
| `sold_price` | `BigDecimal soldPrice` 可空 |
| `status` | `VehicleStatus status` NOT NULL |
| `version` | `int version` `@Version` |
| `created_at` | `Instant createdAt` |
| `updated_at` | `Instant updatedAt` |

UK：`(dealerId, vin)`。

`CustomerEntity` ↔ `customer`：

| 列 | Java 字段 |
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

`CustomerVehicleEntity` ↔ `customer_vehicle`（**无 version**）：

| 列 | Java 字段 |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` NOT NULL |
| `customer_id` | `Long customerId` NOT NULL |
| `vehicle_id` | `Long vehicleId` NOT NULL |
| `linked_at` | `Instant linkedAt` NOT NULL |

UK：`vehicleId` 全局唯一。

`ListingEntity` ↔ `listing`：`title`/`body` Java 非空 `String`，默认 `""`，禁止 `Optional`。

| 列 | Java 字段 |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` NOT NULL |
| `vehicle_id` | `Long vehicleId` NOT NULL |
| `title` | `String title` length 200 NOT NULL 默认 `""` |
| `body` | `String body` `@Column(columnDefinition="TEXT")` NOT NULL 默认 `""` |
| `ad_kind` | `AdKind adKind` NOT NULL |
| `medium` | `AdMedium medium` NOT NULL |
| `status` | `ListingStatus status` NOT NULL |
| `content_version` | `int contentVersion` 默认 1 |
| `last_check_id` | `Long lastCheckId` 可空，无 FK 映射 |
| `version` | `int version` `@Version` |
| `created_at` | `Instant createdAt` |
| `updated_at` | `Instant updatedAt` |

UK：`vehicleId`。

`ComplianceCheckEntity` ↔ `compliance_check`：

| 列 | Java 字段 |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` NOT NULL |
| `listing_id` | `Long listingId` NOT NULL |
| `content_version` | `int contentVersion` NOT NULL |
| `rule_findings` | `String ruleFindingsJson` 或 `JsonNode`，`columnDefinition="JSON"` NOT NULL |
| `ai_status` | `AiStatus aiStatus` NOT NULL |
| `ai_notes` | JSON 可空 |
| `recommendation` | `Recommendation recommendation` NOT NULL |
| `created_at` | `Instant createdAt` |

`AuditEventEntity` ↔ `audit_event`：

| 列 | Java 字段 |
|---|---|
| `id` | `Long id` |
| `dealer_id` | `Long dealerId` **可空** |
| `actor_oid` | `String actorOid` NOT NULL |
| `entity_type` | `String entityType` NOT NULL |
| `entity_id` | `long entityId` NOT NULL |
| `action` | `String action` NOT NULL |
| `field_summary` | JSON 可空 |
| `created_at` | `Instant createdAt` |

Repository 接口：`JpaRepository<实体, Long>`，名字上表已列。必须方法：

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

`JacksonConfig`：`ObjectMapper` 默认 camelCase；`JavaTimeModule`；日期 `yyyy-MM-dd`；`WRITE_DATES_AS_TIMESTAMPS=false`。
`WebConfig`：空，或明确不注册 CORS。

- 禁止：多列（mileage/APR/password）；`ticket/` `lead/` `bus/` `password/`；`@ManyToOne` 到 `lastCheck`；改 SQL；`WHERE vehicle.dealer_id = app_user.dealer_id`。
- 验收：
  1. 空库 `mvn -f dealer-core/pom.xml spring-boot:run` 日志 `Successfully applied 1 migration` 且表 9 张。
  2. `rg "ddl-auto:\\s*update" dealer-core` 无。
  3. `rg "@Column\\(name" dealer-core/src/main/java/com/dealerops/core` 覆盖上表所有 snake 列名。
  4. `rg "class Ticket|class Lead|password_hash" dealer-core` 无。
  5. Flyway 文件仍只有 `V1__init.sql`（`ls dealer-core/src/main/resources/db/migration`）。

---

### BE-T07 异常映射
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/common/exception/ErrorCode.java`
  - `dealer-core/src/main/java/com/dealerops/core/common/exception/ApiException.java`
  - `dealer-core/src/main/java/com/dealerops/core/common/exception/ApiExceptionHandler.java`
- 必须包含：

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

`handleValid` → HTTP 400，`code=VALIDATION`，`fieldErrors` 为字段→消息。唯一键 `uk_vehicle_vin` → `VIN_DUP`；`uk_cv_vehicle` → `VEHICLE_ALREADY_LINKED`；`uk_membership` 已 active → `DUP_MEMBER`。禁止堆栈/SQL 出站。

- 禁止：发明新业务 `code`；把 `DataIntegrityViolation` 原文回浏览器。
- 验收：`rg "enum ErrorCode" -A20 dealer-core/src/main/java/com/dealerops/core/common/exception/ErrorCode.java` 含本文 14 个码且无第 15 个业务码。`rg "printStackTrace|e.getMessage\\(\\)" dealer-core/src/main/java/com/dealerops/core/common/exception/ApiExceptionHandler.java` 不把 SQL 写入 `ErrorBody.message`。

---

### BE-T08 TenantFilter / Security 链（JWT claim + membership）
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/config/SecurityConfig.java`
  - `dealer-core/src/main/java/com/dealerops/core/security/JwtRoleMapper.java`
  - `dealer-core/src/main/java/com/dealerops/core/security/CurrentUser.java`
  - `dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantContext.java`
  - `dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantFilter.java`
  - `dealer-core/src/main/java/com/dealerops/core/common/tenant/TenantGuard.java`
- 必须包含：

JWT claim 名（只认这些）：

| Claim | 用法 |
|---|---|
| `iss` | 必须 = `ENTRA_ISSUER` |
| `aud` | = `ENTRA_AUDIENCE`（`api://dealer-api` 或 API GUID） |
| `oid` | → `app_user.entra_oid` / `membership.entra_oid` |
| `tid` | → `app_user.entra_tenant_id` |
| `name` 或 `preferred_username` | 回写 `display_name`（有则更新） |
| `roles` | **RBAC 唯一来源**（数组） |
| `scp` / `scope` | 只证明 `access_as_user`，**不是**角色 |
| `groups` | **忽略** |

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

`SecurityConfig`：

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

`TenantFilter` 解析 membership（顺序写死）：

```
1. 无 Authentication 或非 Jwt → 交给 Security（401）
2. role = JwtRoleMapper.mapRole(jwt)；null 且 path 不是 GET /api/v1/me → 403 FORBIDDEN
3. upsert app_user by (tid, oid)；displayName 可更新；授权以当次 JWT 为准，库 role 不能抬权
4. 若 role == Platform.Admin：
     app_user.dealer_id 必须写成 NULL（若非空则自愈置空）
     TenantContext = (oid,tid,ADMIN,null)
     若 path 匹配 /api/v1/vehicles** /customers** /listings** /assistant** 或 GET /audit → 403 FORBIDDEN（body 仅 {code,message}）
     放行 /api/v1/admin/** 与 GET /api/v1/me
5. 若 role == Dealer.User：
     rows = membershipRepo.findByEntraOidAndActiveTrue(oid)
     rows.size>=2 → 500（配置错误，不继续业务）
     path 是 GET /api/v1/me：0 条也放行，tenantDealerId=null
     其他 /api/v1/**：0 条 → 403 FORBIDDEN
     1 条：tenantDealerId = row.dealerId；若 app_user.dealer_id 不一致则回写（自愈，不 500）
6. 忽略 req.getParameter("dealerId")、JSON 里的 dealerId、Header X-Dealer-Id
7. finally TenantContext.clear()
```

`TenantGuard.assertSameDealer`：`resourceDealerId == null || !resourceDealerId.equals(tenantDealerId)` → 抛 `NOT_FOUND`。不要 403。

- 禁止：用 `app_user.dealer_id` 做 `WHERE` 隔离；客户端 `dealerId` 覆盖租户；跨店 403；第五 auth 仓。
- 验收：
  1. `rg "getClaimAsStringList\\(\"roles\"\\)" dealer-core`。
  2. `rg "\"oid\"|getSubject|getClaimAsString\\(\"oid\"\\)" dealer-core/src/main/java/com/dealerops/core`。
  3. `rg "findByEntraOidAndActiveTrue" dealer-core`。
  4. `rg "groups" dealer-core/src/main/java/com/dealerops/core/security/JwtRoleMapper.java` 无用 groups 授权。
  5. 无 JWT：`curl -s http://127.0.0.1:8081/api/v1/vehicles` → JSON `{"code":"UNAUTHORIZED",...}` HTTP 401（经 Gateway 同样 401）。

---

### BE-T09 `GET /api/v1/me`
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/security/MeController.java`
  - `dealer-core/src/main/java/com/dealerops/core/security/MeService.java`
  - `dealer-core/src/main/java/com/dealerops/core/security/dto/MeResponse.java`
- 必须包含：

```java
@RestController
@RequestMapping("/api/v1")
public class MeController {
  @GetMapping("/me")
  public MeResponse me() { return meService.me(TenantContext.get()); }
}
public record MeResponse(String entraOid, String displayName, String role, Long dealerId, String dealerLegalName) {}
```

`role` JSON 必须是 `Platform.Admin` 或 `Dealer.User`。Admin：`dealerId=null`，`dealerLegalName=null`。店员无 membership：仍 200，后两项 null。有 membership：`dealerId` 来自 membership（与 `app_user` 不一致则以 membership 为准并回写），`dealerLegalName` = 该店 `legalName`。

| 方法 | HTTP | path | 错误码 |
|---|---|---|---|
| `me()` | GET | `/api/v1/me` | `UNAUTHORIZED` 401 |

- 禁止：要求 membership 才 200；Admin 填 dealerId。
- 验收：`rg "@GetMapping\\(\"/me\"\\)" dealer-core`。带店员 JWT 无 membership：`curl -H "Authorization: Bearer $T" http://localhost:8080/api/v1/me` → 200 且 `dealerId` JSON `null`。无 token → 401。

---

### BE-T10 Admin 店 CRUD
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/dealer/AdminDealerController.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/DealerAdminService.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/dto/DealerResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/dto/CreateDealerRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/dto/PatchDealerRequest.java`
- 必须包含：

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

`staffCount` = `membershipRepository.countByDealerIdAndActiveTrue(id)`。忽略 body.`id` / `dealerId`。无 DELETE 店。店员打这些 URL → Filter/方法上 `403 FORBIDDEN`。

| 方法 | HTTP | path | 错误码 |
|---|---|---|---|
| `list` | GET | `/api/v1/admin/dealers` | 401；403 FORBIDDEN |
| `create` | POST | `/api/v1/admin/dealers` | 400 VALIDATION；403 |
| `get` | GET | `/api/v1/admin/dealers/{id}` | 404 NOT_FOUND；403 |
| `patch` | PATCH | `/api/v1/admin/dealers/{id}` | 400；404；409 VERSION_CONFLICT；403 |

- 禁止：`DELETE /admin/dealers/{id}`；Admin 响应里带车辆。
- 验收：`rg "DeleteMapping" dealer-core/src/main/java/com/dealerops/core/dealer/AdminDealerController.java` 无删店。`curl` Admin POST 缺 `legalName` → 400 `VALIDATION`。店员 JWT GET `/api/v1/admin/dealers` → 403。

---

### BE-T11 Admin membership
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/dealer/AdminMemberController.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/MembershipService.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/dto/MemberResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/dealer/dto/CreateMemberRequest.java`
- 必须包含：

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

绑人：写/更新 `app_user`（`role=Dealer.User`，`dealer_id=该店`）+ `membership`。该店已有 **active** → `409 DUP_MEMBER`。该 oid **另一店**仍 active → `409 DUP_MEMBER`。已解绑同行再绑：`active=1` 复活，不 INSERT 第二行。不编造 email。不删 Entra。

解绑：`membership.active=0`；`app_user.dealer_id=NULL`；**不改** `app_user.role`；不删 `app_user`。审计 `entityType=MEMBERSHIP`。

| 方法 | HTTP | path | 错误码 |
|---|---|---|---|
| `list` | GET | `/api/v1/admin/dealers/{id}/members` | 404 店不存在；403 |
| `add` | POST | 同上 | 400 VALIDATION；404；409 DUP_MEMBER；403 |
| `remove` | DELETE | `/api/v1/admin/dealers/{id}/members/{entraOid}` | 404 无绑定；403；204 无 body |

- 禁止：删 Entra；解绑时改 `role`；切店器；一人两行 `active=1`。
- 验收：同一 oid 连续 POST 两次 → 第二次 409 `DUP_MEMBER`。DELETE → 204。该店员再 GET `/api/v1/vehicles` → 403。`GET /me` → 200 `dealerId=null`。

---

### BE-T12 车辆 Controller（DMS）
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleController.java`
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/VehicleService.java`
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/dto/VehicleResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/dto/CreateVehicleRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/dto/PatchVehicleRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/vehicle/dto/SellVehicleRequest.java`
- 必须包含：

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

服务端 POST：忽略 `dealerId`/`status`/`soldOn`/`soldPrice`；`status=IN_STOCK`；`sold*` 必须 NULL。`dealerId=tenantDealerId`。本店 VIN 重复 → `400 VIN_DUP`。列表默认 `createdAt` 倒序。`condition` query = `conditionCode`。

已售锁 / 出售（翻译成代码）：

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
    // 不清空 last_check_id
  audit VEHICLE/UPDATE
  return v

function sell(id, body):
  if body.soldOn==null or body.soldPrice==null: 400 SOLD_PAIR_REQUIRED
  if body.soldPrice <= 0: 400 SOLD_PAIR_REQUIRED
  v = load or 404; cross-tenant 404
  if body.version != v.version: 409 VERSION_CONFLICT
  if v.status == SOLD: 409 SOLD_LOCKED
  v.status=SOLD; v.soldOn=body.soldOn; v.soldPrice=body.soldPrice
  // 不删 customer_vehicle
  audit VEHICLE/SELL
```

| 方法 | HTTP | path | 错误码 |
|---|---|---|---|
| `list` | GET | `/api/v1/vehicles` | 401；403 |
| `create` | POST | `/api/v1/vehicles` | 400 VALIDATION / VIN_DUP；403 |
| `get` | GET | `/api/v1/vehicles/{id}` | 404；403 |
| `patch` | PATCH | `/api/v1/vehicles/{id}` | 404；409 SOLD_LOCKED / VERSION_CONFLICT；400 VIN_DUP / VALIDATION |
| `sell` | POST | `/api/v1/vehicles/{id}/sell` | 400 SOLD_PAIR_REQUIRED；409 SOLD_LOCKED / VERSION_CONFLICT；404 |

审计：`VEHICLE` + `CREATE`/`UPDATE`/`SELL`。`fieldSummary` 不含客户 PII。

- 禁止：PATCH 改 `status`/`sold*`；用采购成本当广告标价；Admin 200 带 vin。
- 验收：`rg "@PostMapping\\(\"/\\{id\\}/sell\"\\)" dealer-core`。同店双 POST 同 VIN → 400 `VIN_DUP`。已售 PATCH `make` → 409 `SOLD_LOCKED`。卖车后 CRM 关联仍在（DB `customer_vehicle` 行还在）。

---

### BE-T13 客户 Controller（CRM）
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/customer/CustomerController.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/CustomerService.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/CustomerListItem.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/CustomerDetail.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/CreateCustomerRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/PatchCustomerRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/LinkedVehicleBrief.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/LinkedVehicleItem.java`
- 必须包含：

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

列表 `linkedVehicle`：多车取最近 `linkedAt`；未挂 `null`。详情 `linkedVehicles` 全数组。忽略 `dealerId`。PATCH 审计 `CUSTOMER`/`UPDATE`，`fieldSummary` **不得**含电话/邮箱/住址全文（只 `{"contactFieldsChanged":true}` 或字段名布尔）。

| 方法 | HTTP | path | 错误码 |
|---|---|---|---|
| `list` | GET | `/api/v1/customers` | 401；403 |
| `create` | POST | `/api/v1/customers` | 400 VALIDATION；403 |
| `get` | GET | `/api/v1/customers/{id}` | 404；403 |
| `patch` | PATCH | `/api/v1/customers/{id}` | 404；409 VERSION_CONFLICT；400；403 |

- 禁止：`fieldSummary` 写号码/邮箱/地址全文。
- 验收：`rg "homeAddress|email|phone" dealer-core/src/main/java/com/dealerops/core/audit` 写入 JSON 时不得 `put("phone", customer.getPhone())`。跨店 GET 客户 → 404。

---

### BE-T14 挂车 PUT + 解绑 DELETE + SOLD 锁
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/customer/CustomerVehicleController.java`
  - `dealer-core/src/main/java/com/dealerops/core/customer/dto/LinkResponse.java`
- 必须包含：

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

无 body（有则忽略）。无乐观锁。

伪代码（必须按此翻译）：

```
function link(customerId, vehicleId):
  c = findCustomer(customerId)
  v = findVehicle(vehicleId)
  if c==null or v==null: 404
  if c.dealerId != tenantDealerId or v.dealerId != tenantDealerId: 404   // 跨店不走 400
  if c.dealerId != v.dealerId: 400 WRONG_DEALER_OR_SOLD
  if v.status != IN_STOCK: 400 WRONG_DEALER_OR_SOLD
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
  hardDelete(row)            // V1 无软删列
  // 不改 vehicle.status
  audit CUSTOMER_VEHICLE/UNLINK entityId=row.id fieldSummary={customerId,vehicleId}
  return 204
```

| 方法 | HTTP | path | 错误码 |
|---|---|---|---|
| `link` | PUT | `/api/v1/customers/{id}/vehicles/{vehicleId}` | 404；400 WRONG_DEALER_OR_SOLD；409 VEHICLE_ALREADY_LINKED；403 |
| `unlink` | DELETE | 同上 | 204；404；409 SOLD_LOCKED；403 |

- 禁止：用 PUT 当解绑；已售 DELETE 成功；软删列。
- 验收：`rg "@DeleteMapping" dealer-core/src/main/java/com/dealerops/core/customer/CustomerVehicleController.java`。已售车 PUT → 400 `WRONG_DEALER_OR_SOLD`。已售车 DELETE → 409 `SOLD_LOCKED`。在库 DELETE → 204 且 `SELECT * FROM customer_vehicle WHERE vehicle_id=?` 空。

---

### BE-T15 Listing 空草稿 GET/PATCH
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/listing/ListingController.java`
  - `dealer-core/src/main/java/com/dealerops/core/listing/ListingService.java`
  - `dealer-core/src/main/java/com/dealerops/core/listing/dto/ListingResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/listing/dto/PatchListingRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/CheckStatusMapper.java`
- 必须包含：

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

`CheckResponse` 见 T16。`checkStatus` 五态字符串：`BLOCKED|NEEDS_AI|PASSED|STALE|AI_UNAVAILABLE`。

空草稿伪代码：

```
function getListing(vehicleId):
  v = findVehicle(vehicleId) or 404; if v.dealerId!=tenant: 404
  row = listingRepo.findByVehicleIdAndDealerId(vehicleId, tenant)
  if row==null:
    return virtual { id:null, vehicleId, title:"", body:"", adKind:CASH, medium:ONLINE,
                     status:DRAFT, contentVersion:1, lastCheckId:null, lastCheck:null,
                     checkStatus:NEEDS_AI, version:0 }
    // 禁止 INSERT
  last = loadCheck(row.lastCheckId) // 缺失/listingId 或 dealerId 不匹配 → 当无检查
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
    INSERT title,body 用 '' 满足 NOT NULL；status=DRAFT; contentVersion=1; lastCheckId=null
  else:
    if body.version==null or body.version!=row.version: 409 VERSION_CONFLICT
    row.title=title; row.body=text; row.adKind=kind; row.medium=med
    row.contentVersion++; row.status=DRAFT
    // 不清空 last_check_id
  return getListing(vehicleId)
```

客户端 **不得** PATCH `lastCheckId`（记录里不要该字段）。

| 方法 | HTTP | path | 错误码 |
|---|---|---|---|
| `getByVehicle` | GET | `/api/v1/vehicles/{id}/listing` | 404；403 |
| `patchByVehicle` | PATCH | 同上 | 404；409 VERSION_CONFLICT；400 VALIDATION |
| `ready` | POST | `/api/v1/listings/{id}/ready` | 见 T17 |
| `export` | POST | `/api/v1/listings/{id}/exports` | 见 T17 |

- 禁止：GET 无行时 INSERT；JDBC `null` 进 `title`/`body`；改 V1 可空。
- 验收：对新车 GET listing → `id` JSON `null` 且 `SELECT COUNT(*) FROM listing WHERE vehicle_id=?` = 0。首次 PATCH 不带 title → DB `title=''`。`rg "lastCheckId" dealer-core/src/main/java/com/dealerops/core/listing/dto/PatchListingRequest.java` 无该字段。

---

### BE-T16 检查 + OMVIC + Blocked 不调 AI
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckController.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckService.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/OmvicRuleEngine.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/dto/CheckResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/dto/RuleFinding.java`
  - `dealer-core/src/main/java/com/dealerops/core/compliance/dto/AiNote.java`
  - `dealer-core/src/main/java/com/dealerops/core/listing/dto/VersionBody.java`（若 T15 未建）
- 必须包含：

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

`severity`：`BLOCK` | `REVIEW`。`OmvicRuleEngine` **原样实现 15 §6**（空草稿硬拦、PRICE、店名联系、车况、FINANCE APR、LEASE…）。不用采购成本当标价。无 APR 列：只扫正文。

Blocked / AI 失败伪代码：

```
function postCheck(listingId, version):
  listing = findByIdAndDealerId or 404
  if version != listing.version: 409 VERSION_CONFLICT
  vehicle = find(listing.vehicleId); dealer = find(listing.dealerId)
  omvic = OmvicRuleEngine.run(listing, vehicle, dealer)

  if omvic.hardBlocked:
    // 禁止调用 AiGatewayClient
    check = INSERT compliance_check(
      dealerId, listingId, listing.contentVersion,
      ruleFindings=omvic.findings, aiStatus=SKIPPED, aiNotes=null,
      recommendation=BLOCKED)
    listing.lastCheckId = check.id   // 同一事务
    return 200 toDto(check)          // Blocked 不是 4xx

  try:
    notes = AiGatewayClient.adCheck(toPublic(listing), toVehiclePublic(vehicle), toDealerPublic(dealer))
    // vehiclePublic 无 purchaseCost/repairCost/soldPrice
    check = INSERT(..., aiStatus=SUCCESS, aiNotes=notes, recommendation=PASSED)
    listing.lastCheckId = check.id
    return 200 toDto(check)
  catch AiCallFailed:   // 超时 / 5xx / 约定失败体
    check = INSERT(..., aiStatus=UNAVAILABLE, aiNotes=null, recommendation=UNAVAILABLE)
    listing.lastCheckId = check.id
    throw ApiException(AI_UNAVAILABLE, "AI check failed.")   // HTTP 502；行已写
```

`CheckStatusMapper.derive(listing, lastCheck)`：

```
if lastCheck==null: return NEEDS_AI
if lastCheck.contentVersion != listing.contentVersion:
  if lastCheck.recommendation == PASSED: return STALE
  return NEEDS_AI          // 曾 BLOCKED/UNAVAILABLE 后改稿：不是 Stale
if lastCheck.recommendation == BLOCKED: return BLOCKED
if lastCheck.recommendation == PASSED: return PASSED
if lastCheck.recommendation == UNAVAILABLE: return AI_UNAVAILABLE
return NEEDS_AI
```

| 方法 | HTTP | path | 错误码 |
|---|---|---|---|
| `check` | POST | `/api/v1/listings/{id}/checks` | 200（含 BLOCKED）；502 AI_UNAVAILABLE；409 VERSION_CONFLICT；404；403 |

- 禁止：硬缺时 HTTP 调 `/internal/v1/ad-check`；Blocked 用 4xx；AI 失败当 Pass；规则引擎放进 ai-service。
- 验收：
  1. 空 title+body 的 listing POST checks → 200，`recommendation=BLOCKED`，`aiStatus=SKIPPED`。
  2. 同时抓包 / WireMock：`/internal/v1/ad-check` **0 次**。
  3. `rg "adCheck\\(" dealer-core/src/main/java/com/dealerops/core/compliance/ComplianceCheckService.java` 仅在 `hardBlocked==false` 分支。
  4. 断 ai-service 后对无硬缺广告 POST checks → 502 `AI_UNAVAILABLE` 且 `SELECT recommendation FROM compliance_check ORDER BY id DESC LIMIT 1` = `UNAVAILABLE`。

---

### BE-T17 Ready + Export
- 仓：dealer-core
- 新建/改文件：`ListingController` / `ListingService`（T15 已列路径）
- 必须包含：

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
  // 无 purchaseCost/repairCost/soldPrice；无客户
  return 200 Content-Type: text/plain; charset=UTF-8
```

| 方法 | HTTP | path | 错误码 |
|---|---|---|---|
| `ready` | POST | `/api/v1/listings/{id}/ready` | 409 CHECK_STALE / NOT_PASSED / VERSION_CONFLICT；404；403 |
| `export` | POST | `/api/v1/listings/{id}/exports` | 同上 |

- 禁止：Blocked/Needs AI/UNAVAILABLE 变 READY；TXT 写成本或客户。
- 验收：`curl -D- -X POST .../exports` 响应头含 `text/plain`。无检查 POST ready → 409 `NOT_PASSED`。改 title 后再 ready → 409 `CHECK_STALE`。`rg "purchaseCost|soldPrice|homeAddress" dealer-core/src/main/java/com/dealerops/core/listing/ListingService.java` 的 export 方法无这些字段。

---

### BE-T18 审计 GET
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/audit/AuditController.java`
  - `dealer-core/src/main/java/com/dealerops/core/audit/AuditService.java`
  - `dealer-core/src/main/java/com/dealerops/core/audit/dto/AuditItem.java`
- 必须包含：

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

`entityType`+`entityId` **必填**，缺 → `400 VALIDATION`。店员只本店；实体不在本店 → 404。店员查 `DEALER`/`MEMBERSHIP` → 403。Admin 查 `VEHICLE`/`CUSTOMER`/`CUSTOMER_VEHICLE`/`LISTING` → 403，无 `fieldSummary` 业务内容。本课 Admin 无审计页：Admin 打本接口 **统一 403**。

写路径（被 Vehicle/Customer/Membership 调用）：

```java
public void record(String entityType, long entityId, String action, Long dealerId,
    String actorOid, java.util.Map<String, Object> fieldSummary) {}
```

| 方法 | HTTP | path | 错误码 |
|---|---|---|---|
| `list` | GET | `/api/v1/audit` | 400 VALIDATION；403；404 |

- 禁止：摘要写电话/邮箱/住址全文。
- 验收：`rg "@RequestParam String entityType" dealer-core/src/main/java/com/dealerops/core/audit/AuditController.java`。店员查他店 entityId → 404。`rg "put\\(\"phone\"" dealer-core` 无。

---

### BE-T19 助手 core `POST /assistant/ask`
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/assistant/AssistantController.java`
  - `dealer-core/src/main/java/com/dealerops/core/assistant/AssistantService.java`
  - `dealer-core/src/main/java/com/dealerops/core/assistant/AssistantResourceQuery.java`
  - `dealer-core/src/main/java/com/dealerops/core/assistant/dto/AskRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/assistant/dto/AskResponse.java`
  - `dealer-core/src/main/java/com/dealerops/core/assistant/dto/ResourceCard.java`
- 必须包含：

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

`kind`：`VEHICLE`|`CUSTOMER`|`LISTING`。卡上无电话/邮箱/住址。`AssistantResourceQuery.load(tenantDealerId, text)` 最多 5 条本店资源。Admin → 403。不写 `vehicle`/`customer`/`listing`/`compliance_check`。内存保留最多 3 句已过滤文本（`ConcurrentHashMap<oid, Deque<String>>`），**不落业务表**。

模型挂：仍 **200**，`summary=null`，`summaryAvailable=false`，`cards`=检索列表。不要 502（502 只给广告检查）。

| 方法 | HTTP | path | 错误码 |
|---|---|---|---|
| `ask` | POST | `/api/v1/assistant/ask` | 400 VALIDATION（空 text）；403；401 |

- 禁止：写业务表；卡上 PII；乱编 id 进 cards（必须落在本次检索集）。
- 验收：`rg "save\\(|persist\\(" dealer-core/src/main/java/com/dealerops/core/assistant` 无。空 `{"text":""}` → 400。Admin POST → 403。停 ai-service 后店员 POST → 200 且 `summaryAvailable=false`。

---

### BE-T20 core `AiGatewayClient`（经 Gateway，≤15s）
- 仓：dealer-core
- 新建/改文件：
  - `dealer-core/src/main/java/com/dealerops/core/integration/AiGatewayClient.java`
  - `dealer-core/src/main/java/com/dealerops/core/integration/InternalHeaders.java`
  - `dealer-core/src/main/java/com/dealerops/core/config/AiClientConfig.java`
  - `dealer-core/src/main/java/com/dealerops/core/integration/dto/AdCheckInternalRequest.java`
  - `dealer-core/src/main/java/com/dealerops/core/integration/dto/AssistantInternalRequest.java`
- 必须包含：

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

`adCheck`：`POST {base}/internal/v1/ad-check`，头 `X-Dealer-Internal: ${INTERNAL_TOKEN}`，**不要**转发用户 `Authorization`。4xx/5xx/超时 → 抛 `AiCallFailed`（检查路径由 T16 变 502）。
`assistant`：`POST {base}/internal/v1/assistant`，同样头；失败抛 `AiCallFailed`（T19 吞掉变 200）。

Base URL **必须是 Gateway**（默认 `http://localhost:8080`），禁止产品路径直连 `8082`。

- 禁止：core 持有 `AIMANAGER_API_KEY`；嵌 ai-manager JAR；把用户 JWT 带给 AI。
- 验收：`rg "8082" dealer-core/src/main/resources dealer-core/src/main/java/com/dealerops/core/integration` 无产品 base。`rg "X-Dealer-Internal" dealer-core`。`rg "AIMANAGER" dealer-core` 无。WireMock 断言出站 URL path=`/internal/v1/ad-check` 且有内部头、无 `Authorization`。

---

### BE-T21 Gateway JWT + InternalRouteFilter
- 仓：dealer-gateway
- 新建/改文件：
  - `dealer-gateway/src/main/java/ca/sait/dealerops/gateway/config/SecurityConfig.java`
  - `dealer-gateway/src/main/java/ca/sait/dealerops/gateway/filter/InternalRouteFilter.java`
- 必须包含：

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
        .pathMatchers("/internal/v1/**").permitAll()  // 由 Header 谓词 + 404 兜底，不要 401
        .anyExchange().denyAll());
    return http.build();
  }
}
```

`InternalRouteFilter`：若 path 以 `/internal/v1/` 开头且头不等于 `INTERNAL_TOKEN` → `setComplete` 状态 **404**（不要 401）。无头走不进 `ai-service-internal` 路由，yaml 已 404；此类再挡一层直连误配。

Gateway **转发** `/api/v1/**` 的 `Authorization`。无法映射角色：对 `/api/v1/**` → **401**（无 `roles` 含两枚之一）。映射函数与 T08 相同（Admin 赢）。Gateway 不签发令牌。

- 禁止：第五 auth 仓；cookie 会话；CORS 暴露内部头。
- 验收：
  1. `curl http://localhost:8080/api/v1/me` → 401。
  2. `curl http://localhost:8080/internal/v1/ad-check` → 404。
  3. `curl -H "X-Dealer-Internal: dealer-internal-dev-only" -H "Content-Type: application/json" -d "{}" http://localhost:8080/internal/v1/ad-check` 在 ai-service 已起时到达 8082（非 401）。
  4. 浏览器预检 OPTIONS `/api/v1/vehicles` 来自 `http://localhost:5173` → ACAO 含该 origin；`Access-Control-Allow-Headers` 不含 `X-Dealer-Internal`。

---

### BE-T22 ai-service 两个内部 POST + 失败体（让 core 变 502）
- 仓：ai-service
- 新建/改文件：
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/adapter/adcheck/AdCheckController.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/adapter/adcheck/AdCheckAdapter.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/adapter/assistant/AssistantController.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/adapter/assistant/AssistantAdapter.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/support/AiManagerFactory.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/support/ModelFailureException.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/support/AiFailureBody.java`
  - `ai-service/src/main/java/ca/sait/dealerops/aiservice/config/AiExceptionHandler.java`
- 必须包含：

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
public record AdCheckOkResponse(java.util.List<AiNote> aiNotes, boolean success) {}
public record AssistantOkResponse(String text, boolean success) {}
public record AiNote(String message) {}
public record AiFailureBody(boolean failed, String reason) {}
// reason 仅: TIMEOUT | NO_KEY | MODEL_ERROR
```

请求记录字段（与 14 §11 对齐，可与 core 同形状）：

```java
public record AdCheckInternalRequest(ListingIn listing, VehiclePublic vehiclePublic, DealerPublic dealerPublic) {}
public record ListingIn(String title, String body, String adKind, String medium) {}
public record VehiclePublic(int modelYear, String make, String model, String vin, String conditionCode, String source) {}
public record DealerPublic(String legalName, String contactPhone, String contactEmail, String contactAddress) {}
public record AssistantInternalRequest(String question, java.util.List<ResourceIn> resources) {}
public record ResourceIn(String kind, Long id, String label, String status) {}
```

`AdCheckAdapter.run(req)`：

```
if blank(AIMANAGER_API_KEY): throw ModelFailureException(NO_KEY)   // 立即，不满 15s
id = UUID
try:
  AiManager mgr = AiManagerFactory.create()
  mgr.startConversation(id, system)   // system=复核说明，不是 15 硬规则
  AIResponse r = 带 15s orTimeout 的 mgr.request(userJson)
  if !r.isSuccess(): throw MODEL_ERROR
  return notes from content   // 元素至少 {message}
finally:
  mgr.closeConversation(id)
```

只用 `com.manager.AiManager` 的 `request(String)`、`startConversation(id, systemMessage)`、`closeConversation`。

`AiExceptionHandler`：**统一失败合同**（core 按此映射）：

```
HTTP 503
Content-Type: application/json
{"failed":true,"reason":"TIMEOUT"|"NO_KEY"|"MODEL_ERROR"}
```

core `AiGatewayClient`：HTTP ≥500 或超时或 `failed==true` → `AiCallFailed`。检查路径 → 落库 UNAVAILABLE + 对外 **502 `AI_UNAVAILABLE`**。助手路径 → 对外仍 200。

ai-service **不要**自己写 `compliance_check`，不要对浏览器回五态，不要返回假 Passed。

| 方法 | HTTP | path | 成功体 | 失败 |
|---|---|---|---|---|
| `adCheck` | POST | `/internal/v1/ad-check` | 200 `{aiNotes,success:true}` | 503 `{failed,reason}`；无内部头 404 |
| `assistant` | POST | `/internal/v1/assistant` | 200 `{text,success:true}` | 同上 503 |

- 禁止：扫描 `com.gateway`；暴露 `/api/ai/**`；规则引擎；业务表；200 空 notes 冒充成功。
- 验收：
  1. `rg "com.gateway" ai-service/src/main/java` 无。
  2. `rg "@PostMapping\\(\"/ad-check\"\\)" ai-service` 与 `@PostMapping(\"/assistant\")`。
  3. `AIMANAGER_API_KEY=` 启动后：`curl -H "X-Dealer-Internal: dealer-internal-dev-only" -H "Content-Type: application/json" -d "{\"listing\":{\"title\":\"t\",\"body\":\"b\",\"adKind\":\"CASH\",\"medium\":\"ONLINE\"},\"vehiclePublic\":{\"modelYear\":2020,\"make\":\"T\",\"model\":\"C\",\"vin\":\"1\",\"conditionCode\":\"AS_IS\",\"source\":\"AUCTION\"},\"dealerPublic\":{\"legalName\":\"X\",\"contactPhone\":\"1\",\"contactEmail\":\"a@b.c\",\"contactAddress\":\"z\"}}" http://127.0.0.1:8082/internal/v1/ad-check` → **503** 且 body 含 `"failed":true` `"NO_KEY"`（1 秒内返回）。
  4. 无头同一 URL → 404。
  5. core 对无硬缺 listing POST `/api/v1/listings/{id}/checks` 此时 → **502** `AI_UNAVAILABLE` 且检查行已写。

---

### BE-T23 实现顺序（对齐 BRIEF §11，禁止跳步）
- 仓：dealer-core | dealer-gateway | ai-service | dealer-platform
- 新建/改文件：无新文件。编码 AI 按下列序号开 PR；未完成「完成标准」不得开始下一号。
- 必须包含：对照表（BRIEF # → 本文任务）：

| 序 | BRIEF | 仓 | 做哪些 BE-T | 完成标准（可判定） |
|---|---|---|---|---|
| 1 | BRIEF-1 | 本机 | （环境） | `java -version` 含 `21` |
| 2 | BRIEF-2 | 三 Java 仓 | T01 T02 T03 T04 | 三仓 `mvn -DskipTests compile` exit 0；core 8081 / gw 8080 / ai 8082 能起来（core 无库时允许 datasource 失败，先把主类编过） |
| 3 | BRIEF-3 | core | T06 T07 | Flyway 一库 9 表；`ddl-auto=validate` |
| 4 | BRIEF-4 | gateway | T03 T21 T05 | `curl :8080/internal/v1/ad-check` → 404；CORS 仅 5173 |
| 5 | BRIEF-5 | gateway+core | T08 T09 | 无 token 401；`GET /me` 200；body `dealerId` 不能改租户 |
| 6 | BRIEF-6 | core | T10 T11 | 两店两员可插库；店员打 admin → 403 |
| 7 | BRIEF-7 | core | T12 T18 | VIN 唯一；已售锁；出售成对；有 `audit_event` |
| 8 | BRIEF-8 | core | T13 T14 T18 | 跨店 404；一车一客 409；已售解绑 409；在库 204 |
| 9 | BRIEF-9 | core | T15 T16（仅 Omvic，Client 可 stub 抛失败） | 缺价 / FINANCE 缺 APR → 200 BLOCKED；**零**内部 AI 调用 |
| 10 | BRIEF-10 | ai-service | T04 T22 | 不暴露 `com.gateway`；缺 Key → 503；CI stub |
| 11 | BRIEF-11 | core+ai | T16 T20 T22 | 经 Gateway checks；失败 502+已落库；改车况 → STALE |
| 12 | BRIEF-12 | core | T17 | 非 Passed/Stale → 409；export `text/plain` |
| 13 | BRIEF-13 | core+ai | T19 T20 T22 | ≤5 卡；乱 id 丢弃；模型挂 200 `summaryAvailable=false` |
| — | BRIEF-14 | web | **不做**（本文不管前端） | — |
| — | BRIEF-15 | platform | T05 只读 env | **不要改** env.example / Bicep / SQL |

本地联调进程序：MySQL:3306 → core:8081 → ai-service:8082 → gateway:8080。产品 curl 一律打 `http://localhost:8080`。

- 禁止：先做 assistant 再做 `/me`；先写规则进 ai-service；先做云 Bicep 再空仓启动；做 BRIEF-14 前端。
- 验收：提交说明或 PR 标题含 `BE-Txx`。`rg "BRIEF-14|dealer-web" ` 若出现在本次后端提交中则失败。git diff 不含 `design/13`–`19`、`IMPLEMENTATION-BRIEF.md`、`V1__init.sql`、`README`。

---

## 不做清单（再钉一次）

工单、线索、密码表、CSRF cookie 会话、Service Bus/outbox、第五 `dealer-auth` 仓、买家 `/public/**`、KPI、APR/延保列、`ddl-auto=update`、改 V1、对外 8081/8082 CORS、把 `com.gateway` 当 API、core 直连 8082 当产品路径、Admin 读写车辆/客户/广告。
