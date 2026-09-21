package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/** BE-14 / TEST-14: core has no browser CORS; product entry is not 8081. */
@SpringBootTest
@ActiveProfiles("test")
class CoreNotPublicIT {

  @Value("${server.port}")
  int port;

  @Test
  void corePortIs8081ByDefault() {
    assertThat(port).isEqualTo(8081);
  }

  @Test
  void applicationYmlHasNoBrowserCors() throws Exception {
    String yaml = Files.readString(Path.of("src/main/resources/application.yml"));
    assertThat(yaml).doesNotContain("localhost:5173");
    assertThat(yaml).doesNotContain("allowedOrigins");
    assertThat(yaml).doesNotContain("spring.web.cors");
  }

  @Test
  void coreDoesNotExposeInternalAiPaths() throws Exception {
    String javaTree = Files.readString(Path.of("src/main/java/com/dealerops/core/config/SecurityConfig.java"));
    assertThat(javaTree).doesNotContain("/internal/v1");
  }
}
