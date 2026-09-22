package com.dealerops.core.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/** LOCAL-AND-CLOUD §2.2: /actuator/health only; no JWT; no extra ops endpoints. */
class ActuatorHealthConfigTest {

  @Test
  void healthIsExposedAndSecurityPermitsIt() throws Exception {
    String yaml = Files.readString(Path.of("src/main/resources/application.yml"));
    assertThat(yaml).contains("include: health");
    assertThat(yaml).doesNotContain("heapdump");
    assertThat(yaml).doesNotContain("prometheus");

    String security = Files.readString(Path.of("src/main/java/com/dealerops/core/config/SecurityConfig.java"));
    assertThat(security).contains("/actuator/health");
  }
}
