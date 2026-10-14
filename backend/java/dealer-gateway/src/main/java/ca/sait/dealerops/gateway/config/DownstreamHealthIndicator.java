package ca.sait.dealerops.gateway.config;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.ReactiveHealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component("downstream")
public class DownstreamHealthIndicator implements ReactiveHealthIndicator {

  private final WebClient webClient;
  private final String coreUrl;
  private final String aiUrl;

  public DownstreamHealthIndicator(
      WebClient.Builder webClientBuilder,
      @Value("${CORE_URL:http://127.0.0.1:8081}") String coreUrl,
      @Value("${AI_URL:http://127.0.0.1:8082}") String aiUrl) {
    this.webClient = webClientBuilder.build();
    this.coreUrl = coreUrl;
    this.aiUrl = aiUrl;
  }

  @Override
  public Mono<Health> health() {
    return Mono.zip(check(coreUrl), check(aiUrl))
        .map(
            statuses ->
                statuses.getT1() && statuses.getT2()
                    ? Health.up().build()
                    : Health.down().build())
        .onErrorReturn(Health.down().build());
  }

  private Mono<Boolean> check(String baseUrl) {
    return webClient
        .get()
        .uri(baseUrl + "/actuator/health")
        .exchangeToMono(response -> Mono.just(response.statusCode().is2xxSuccessful()))
        .timeout(Duration.ofSeconds(2))
        .onErrorReturn(false);
  }
}
