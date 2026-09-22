package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;

/** BE-14 / TEST-14: config assertion only; no browser CORS; product entry is not 8081. */
class CoreNotPublicIT {

  @Test
  void applicationYmlHasNoBrowserCorsAndUsesValidate() throws Exception {
    String yaml = Files.readString(Path.of("src/main/resources/application.yml"));
    assertThat(yaml).contains("port: ${CORE_PORT:8081}");
    assertThat(yaml).doesNotContain("localhost:5173");
    assertThat(yaml).doesNotContain("allowedOrigins");
    assertThat(yaml).doesNotContain("spring.web.cors");
    assertThat(yaml).contains("ddl-auto: validate");
    assertThat(yaml).doesNotContain("ddl-auto: update");
    assertThat(yaml).doesNotContain("ddl-auto: create");
    assertThat(yaml).contains("include: health");
    assertThat(yaml).doesNotContain("heapdump");
    assertThat(yaml).doesNotContain("prometheus");
  }

  @Test
  void securityDoesNotExposeInternalAiPaths() throws Exception {
    String security = Files.readString(Path.of("src/main/java/com/dealerops/core/config/SecurityConfig.java"));
    assertThat(security).doesNotContain("/internal/v1");
    assertThat(security).contains("/actuator/health");
  }

  @Test
  void testProfileKeepsFlywayV1AndDoesNotCreateSchema() throws Exception {
    String testYaml = Files.readString(Path.of("src/test/resources/application-test.yml"));
    assertThat(testYaml).contains("ddl-auto: validate");
    assertThat(testYaml).contains("locations: classpath:db/migration");
    assertThat(testYaml).doesNotContain("jdbc:h2");
    assertThat(testYaml).doesNotContain("org.h2");
    assertThat(testYaml).doesNotContain("create-drop");
  }
}
