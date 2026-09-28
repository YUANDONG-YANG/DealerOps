package ca.sait.dealerops.gateway.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/** TEST-14 / 15 §13: CORS origin is env-driven; internal header is not browser-allowed. */
class CorsHeadersTest {

  @Test
  void corsOriginIsEnvNotLocalhostOnly() throws Exception {
    String yaml = Files.readString(Path.of("src/main/resources/application.yaml"));
    assertThat(yaml).contains("CORS_ALLOWED_ORIGIN");
    assertThat(yaml).contains("http://localhost:5173");
    String config = Files.readString(Path.of("src/main/java/ca/sait/dealerops/gateway/config/CorsConfig.java"));
    assertThat(config).contains("setAllowedHeaders(List.of(\"Authorization\", \"Content-Type\"))");
    assertThat(config).contains("setExposedHeaders(List.of())");
    assertThat(config).doesNotContain("setAllowedHeaders(List.of(\"X-Dealer-Internal\"))");
  }

  @Test
  void corsConfigReadsEnvOrigin() throws Exception {
    String src = Files.readString(Path.of("src/main/java/ca/sait/dealerops/gateway/config/CorsConfig.java"));
    assertThat(src).contains("CORS_ALLOWED_ORIGIN");
    assertThat(src).contains("setAllowedHeaders(List.of(\"Authorization\", \"Content-Type\"))");
    assertThat(src).doesNotContain("setAllowedHeaders(List.of(\"Authorization\", \"Content-Type\", \"X-Dealer-Internal\"))");
  }
}
