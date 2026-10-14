package ca.sait.dealerops.gateway.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/** LOCAL-AND-CLOUD §2.2: /actuator/health only; no JWT. */
class ActuatorHealthConfigTest {

  @Test
  void healthIsExposedAndSecurityPermitsIt() throws Exception {
    String yaml = Files.readString(Path.of("src/main/resources/application.yaml"));
    assertThat(yaml).contains("include: health");
    assertThat(yaml).doesNotContain("heapdump");

    String security =
        Files.readString(Path.of("src/main/java/ca/sait/dealerops/gateway/config/SecurityConfig.java"));
    assertThat(security).contains("/actuator/health");
  }
}
