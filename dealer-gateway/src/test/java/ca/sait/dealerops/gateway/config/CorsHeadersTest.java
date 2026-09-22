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
    int allowedHeaders = yaml.indexOf("allowedHeaders:");
    int exposed = yaml.indexOf("exposedHeaders:", allowedHeaders);
    assertThat(allowedHeaders).isGreaterThan(0);
    String headers = yaml.substring(allowedHeaders, exposed);
    assertThat(headers).contains("Authorization");
    assertThat(headers).contains("Content-Type");
    assertThat(headers).doesNotContain("X-Dealer-Internal");
  }

  @Test
  void corsConfigReadsEnvOrigin() throws Exception {
    String src = Files.readString(Path.of("src/main/java/ca/sait/dealerops/gateway/config/CorsConfig.java"));
    assertThat(src).contains("CORS_ALLOWED_ORIGIN");
    assertThat(src).contains("setAllowedHeaders(List.of(\"Authorization\", \"Content-Type\"))");
    assertThat(src).doesNotContain("setAllowedHeaders(List.of(\"Authorization\", \"Content-Type\", \"X-Dealer-Internal\"))");
  }
}
