package ca.sait.dealerops.gateway.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/** TEST-14 counterpart: browser product entry is Gateway /api/v1; /internal/v1 is header-gated. */
class GatewayNotPublicTest {

  @Test
  void yamlRoutesInternalHeaderAndOmitsInternalFromCors() throws Exception {
    String yaml = Files.readString(Path.of("src/main/resources/application.yaml"));
    assertThat(yaml).contains("port: ${GATEWAY_PORT:8080}");
    assertThat(yaml).contains("Path=/api/v1/**");
    assertThat(yaml).contains("Path=/swagger-ui.html,/swagger-ui/**,/v3/api-docs,/v3/api-docs/**");
    assertThat(yaml).contains("id: dealer-core-swagger");
    assertThat(yaml).contains("CORE_URL");
    assertThat(yaml).contains("Path=/internal/v1/**");
    assertThat(yaml).contains("Header=X-Dealer-Internal");
    assertThat(yaml).contains("http://localhost:5173");
    String cors = Files.readString(Path.of("src/main/java/ca/sait/dealerops/gateway/config/CorsConfig.java"));
    assertThat(cors).contains("setAllowedHeaders(List.of(\"Authorization\", \"Content-Type\"))");
    assertThat(yaml).doesNotContain("X-Dealer-Internal]");
    assertThat(yaml).contains("INTERNAL_TOKEN:dealer-internal");
    assertThat(yaml).contains("include: health");
    assertThat(yaml).doesNotContain("heapdump");
    assertThat(yaml).doesNotContain("flyway");
    assertThat(yaml).doesNotContain("jdbc:mysql");
  }

  @Test
  void securityDoesNotExposeBusinessControllers() throws Exception {
    String security = Files.readString(Path.of("src/main/java/ca/sait/dealerops/gateway/config/SecurityConfig.java"));
    assertThat(security).contains("/actuator/health");
    assertThat(security).contains("/swagger-ui/**");
    assertThat(security).contains("/v3/api-docs/**");
    assertThat(security).doesNotContain("/vehicles");
    assertThat(security).doesNotContain("/assistant/ask");
  }
}
