package ca.sait.dealerops.aiservice.config;

import ca.sait.dealerops.aiservice.support.AiTimeouts;
import io.netty.channel.ChannelOption;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

@Configuration
public class AiTimeoutConfig {

  @Bean
  public AiTimeouts aiTimeouts(
      @Value("${dealerops.ai.connect-timeout-ms:2000}") int connectTimeoutMs,
      @Value("${dealerops.ai.response-timeout-ms:13000}") int responseTimeoutMs,
      @Value("${dealerops.ai.timeout-ms:15000}") long timeoutMs) {
    if (connectTimeoutMs + (long) responseTimeoutMs != timeoutMs) {
      throw new IllegalStateException(
          "dealerops.ai.timeout-ms must equal connect-timeout-ms + response-timeout-ms (2s+13s)");
    }
    return new AiTimeouts(connectTimeoutMs, responseTimeoutMs);
  }

  @Bean
  public WebClient aiWebClient(AiTimeouts timeouts) {
    HttpClient http =
        HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, timeouts.connectTimeoutMs())
            .responseTimeout(Duration.ofMillis(timeouts.responseTimeoutMs()));
    return WebClient.builder().clientConnector(new ReactorClientHttpConnector(http)).build();
  }
}
