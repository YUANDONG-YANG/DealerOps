package ca.sait.dealerops.aiservice.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/** LOCAL-AND-CLOUD §2.2: /actuator/health only; no internal header. */
class ActuatorHealthConfigTest {

  @Test
  void healthIsTheOnlyExposedActuator() throws Exception {
    String yaml = Files.readString(Path.of("src/main/resources/application.yaml"));
    assertThat(yaml).contains("include: health");
    assertThat(yaml).doesNotContain("heapdump");
    assertThat(yaml).contains("connect-timeout-ms: 2000");
    assertThat(yaml).contains("response-timeout-ms: 13000");
  }
}
