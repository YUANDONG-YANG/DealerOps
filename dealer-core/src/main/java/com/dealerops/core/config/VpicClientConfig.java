package com.dealerops.core.config;

import io.netty.channel.ChannelOption;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

/** Client for the free NHTSA vPIC vehicle catalog (no API key). */
@Configuration
public class VpicClientConfig {

  @Bean
  WebClient vpicWebClient(
      @Value("${dealerops.vpic.base-url}") String baseUrl,
      @Value("${dealerops.vpic.connect-timeout-ms:3000}") int connectTimeoutMs,
      @Value("${dealerops.vpic.response-timeout-ms:10000}") long responseTimeoutMs) {
    HttpClient http =
        HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, connectTimeoutMs)
            .responseTimeout(Duration.ofMillis(responseTimeoutMs));
    // Make lists are larger than the 256 KB default buffer.
    ExchangeStrategies strategies =
        ExchangeStrategies.builder()
            .codecs(c -> c.defaultCodecs().maxInMemorySize(4 * 1024 * 1024))
            .build();
    return WebClient.builder()
        .baseUrl(baseUrl)
        .exchangeStrategies(strategies)
        .clientConnector(new ReactorClientHttpConnector(http))
        .build();
  }
}
