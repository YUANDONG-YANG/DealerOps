package com.dealerops.core.config;

import com.dealerops.core.integration.InternalHeaders;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class AiClientConfig {

  @Bean
  WebClient aiGatewayWebClient(
      @Value("${dealerops.gateway-base-url}") String gatewayBaseUrl,
      @Value("${dealerops.internal-token}") String internalToken) {
    return WebClient.builder()
        .baseUrl(gatewayBaseUrl)
        .defaultHeader(InternalHeaders.NAME, internalToken)
        .build();
  }
}
