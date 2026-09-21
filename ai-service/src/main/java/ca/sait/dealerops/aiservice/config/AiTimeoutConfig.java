package ca.sait.dealerops.aiservice.config;

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
  public WebClient aiWebClient(
      @Value("${dealerops.ai.connect-timeout-ms:2000}") int connectTimeoutMs,
      @Value("${dealerops.ai.response-timeout-ms:13000}") int responseTimeoutMs) {
    HttpClient http = HttpClient.create()
        .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
        .responseTimeout(Duration.ofMillis(responseTimeoutMs));
    return WebClient.builder()
        .clientConnector(new ReactorClientHttpConnector(http))
        .build();
  }
}
