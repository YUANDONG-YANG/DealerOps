package ca.sait.dealerops.gateway.config;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.endpoint.annotation.Endpoint;
import org.springframework.boot.actuate.endpoint.annotation.ReadOperation;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.info.BuildProperties;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * {@code GET /actuator/release}: release time of the gateway, dealer-core and ai-service for the
 * web footer (design/20-Observability.md). The gateway's own time is {@code PUBLISHED_AT} when the
 * deploy step stamped it, otherwise the Maven build time, otherwise "local". Core and ai-service
 * report theirs as {@code release.publishedAt} on /actuator/info; an unreachable service shows
 * "unavailable".
 */
@Component
@Endpoint(id = "release")
public class ReleaseEndpoint {

  private static final Logger log = LoggerFactory.getLogger(ReleaseEndpoint.class);
  private static final String UNAVAILABLE = "unavailable";

  private final String serviceName;
  private final String publishedAt;
  private final WebClient webClient;
  private final String coreUrl;
  private final String aiUrl;

  public ReleaseEndpoint(
      @Value("${spring.application.name}") String serviceName,
      @Value("${dealerops.published-at:}") String configured,
      ObjectProvider<BuildProperties> buildProperties,
      WebClient.Builder webClientBuilder,
      @Value("${CORE_URL:http://127.0.0.1:8081}") String coreUrl,
      @Value("${AI_URL:http://127.0.0.1:8082}") String aiUrl) {
    this.serviceName = serviceName;
    this.publishedAt = resolve(configured, buildProperties.getIfAvailable());
    this.webClient = webClientBuilder.build();
    this.coreUrl = coreUrl;
    this.aiUrl = aiUrl;
  }

  @ReadOperation
  public Mono<Map<String, String>> release() {
    return Mono.zip(downstream(coreUrl), downstream(aiUrl))
        .map(
            times -> {
              Map<String, String> body = new LinkedHashMap<>();
              body.put("gateway", publishedAt);
              body.put("core", times.getT1());
              body.put("ai", times.getT2());
              return body;
            });
  }

  @EventListener(ApplicationReadyEvent.class)
  void logRelease() {
    log.info("Release: {} published {}", serviceName, publishedAt);
  }

  private Mono<String> downstream(String baseUrl) {
    return webClient
        .get()
        .uri(baseUrl + "/actuator/info")
        .retrieve()
        .bodyToMono(JsonNode.class)
        .map(info -> info.path("release").path("publishedAt").asText(UNAVAILABLE))
        .timeout(Duration.ofSeconds(2))
        .onErrorReturn(UNAVAILABLE);
  }

  private static String resolve(String configured, BuildProperties build) {
    if (configured != null && !configured.isBlank()) {
      return configured.trim();
    }
    Instant builtAt = build == null ? null : build.getTime();
    return builtAt == null ? "local" : builtAt.truncatedTo(ChronoUnit.SECONDS).toString();
  }
}
