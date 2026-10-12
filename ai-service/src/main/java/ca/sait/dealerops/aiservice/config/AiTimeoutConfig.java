package ca.sait.dealerops.aiservice.config;

import ca.sait.dealerops.aiservice.support.AiTimeouts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiTimeoutConfig {

  @Bean
  public AiTimeouts aiTimeouts(
      @Value("${dealerops.ai.connect-timeout-ms:2000}") int connectTimeoutMs,
      @Value("${dealerops.ai.response-timeout-ms:13000}") int responseTimeoutMs,
      @Value("${dealerops.ai.timeout-ms:15000}") long timeoutMs) {
    AiTimeouts timeouts = new AiTimeouts(connectTimeoutMs, responseTimeoutMs);
    if (timeouts.totalMs() != timeoutMs) {
      throw new IllegalStateException(
          "dealerops.ai.timeout-ms must equal connect-timeout-ms + response-timeout-ms (2s+13s)");
    }
    return timeouts;
  }
}
