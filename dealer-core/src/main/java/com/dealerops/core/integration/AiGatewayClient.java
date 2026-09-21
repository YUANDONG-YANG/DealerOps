package com.dealerops.core.integration;

import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

/** 出站经 Gateway 调 ai-service；本轮不实现广告检查调用。 */
@Component
public class AiGatewayClient {

  private final WebClient webClient;

  public AiGatewayClient(WebClient aiGatewayWebClient) {
    this.webClient = aiGatewayWebClient;
  }
}
