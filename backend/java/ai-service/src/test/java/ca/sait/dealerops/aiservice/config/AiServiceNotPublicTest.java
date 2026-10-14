package ca.sait.dealerops.aiservice.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/** BE-14 / PROTOCOL D: ai-service is internal-only; timeouts are 2s + 13s = 15s. */
class AiServiceNotPublicTest {

  @Test
  void yamlHasPinnedTimeoutsAndNoBrowserCors() throws Exception {
    String yaml = Files.readString(Path.of("src/main/resources/application.yaml"));
    assertThat(yaml).contains("port: ${AI_PORT:8082}");
    assertThat(yaml).contains("connect-timeout-ms: 2000");
    assertThat(yaml).contains("response-timeout-ms: 13000");
    assertThat(yaml).contains("timeout-ms: 15000");
    assertThat(yaml).contains("INTERNAL_TOKEN:dealer-internal");
    assertThat(yaml).doesNotContain("localhost:5173");
    assertThat(yaml).doesNotContain("allowedOrigins");
    assertThat(yaml).doesNotContain("flyway");
    assertThat(yaml).doesNotContain("oauth2");
    assertThat(yaml).contains("include: health");
  }

  @Test
  void applicationDoesNotScanLibraryGateway() throws Exception {
    String app = Files.readString(Path.of("src/main/java/ca/sait/dealerops/aiservice/AiServiceApplication.java"));
    assertThat(app).doesNotContain("com.gateway");
    assertThat(app).doesNotContain("com.AIApplication");
  }
}
