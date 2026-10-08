package com.dealerops.core.integration;

import com.dealerops.core.compliance.dto.AiNote;
import com.dealerops.core.config.RequestLoggingFilter;
import com.dealerops.core.integration.dto.AdCheckInternalRequest;
import com.dealerops.core.integration.dto.AssistantInternalRequest;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Component
public class AiGatewayClient {

  private final WebClient webClient;
  private final long responseTimeoutMs;

  public AiGatewayClient(
      WebClient aiGatewayWebClient,
      @Value("${dealerops.ai.response-timeout-ms:13000}") long responseTimeoutMs) {
    this.webClient = aiGatewayWebClient;
    this.responseTimeoutMs = responseTimeoutMs;
  }

  public List<AiNote> adCheck(AdCheckInternalRequest body) {
    JsonNode node = post("/internal/v1/ad-check", body);
    if (node == null || !node.path("success").asBoolean(false)) {
      throw new AiCallFailed("AI check failed.");
    }
    return readNotes(node.get("notes"));
  }

  public String assistant(AssistantInternalRequest body) {
    JsonNode node = post("/internal/v1/assistant", body);
    if (node == null || !node.path("success").asBoolean(false) || !node.hasNonNull("summary")) {
      throw new AiCallFailed("AI assistant failed.");
    }
    String summary = node.get("summary").asText();
    if (summary.isBlank()) {
      throw new AiCallFailed("AI assistant failed.");
    }
    return summary;
  }

  private JsonNode post(String path, Object body) {
    try {
      return webClient
          .post()
          .uri(path)
          .headers(AiGatewayClient::forwardRequestId)
          .bodyValue(body)
          .retrieve()
          .onStatus(HttpStatusCode::isError, response -> response.createException())
          .bodyToMono(JsonNode.class)
          .timeout(Duration.ofMillis(responseTimeoutMs))
          .block();
    } catch (WebClientResponseException ex) {
      throw new AiCallFailed("AI call failed.", ex);
    } catch (RuntimeException ex) {
      throw new AiCallFailed("AI call failed.", ex);
    }
  }

  /** Carries the gateway request ID to ai-service so both log lines correlate (design/20 §2). */
  private static void forwardRequestId(HttpHeaders headers) {
    if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
      String requestId = attrs.getRequest().getHeader(RequestLoggingFilter.REQUEST_ID);
      if (requestId != null && !requestId.isBlank()) {
        headers.set(RequestLoggingFilter.REQUEST_ID, requestId);
      }
    }
  }

  private static List<AiNote> readNotes(JsonNode notes) {
    List<AiNote> out = new ArrayList<>();
    if (notes == null || !notes.isArray()) {
      return out;
    }
    for (JsonNode note : notes) {
      String message = note.path("message").asText(null);
      if (message != null && !message.isBlank()) {
        out.add(new AiNote(message));
      }
    }
    return out;
  }
}
