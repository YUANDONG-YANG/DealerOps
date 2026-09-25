package ca.sait.dealerops.gateway.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;

class NotRoutePredicateFactoryTest {

  @Test
  void pathShortcutExcludesOnlyTheGivenPath() {
    NotRoutePredicateFactory.Config config = new NotRoutePredicateFactory.Config();
    config.setExpression("Path=/actuator/health");
    var predicate = new NotRoutePredicateFactory().apply(config);

    assertThat(predicate.test(exchange("/actuator/health"))).isFalse();
    assertThat(predicate.test(exchange("/swagger-ui/index.html"))).isTrue();
  }

  private static MockServerWebExchange exchange(String path) {
    return MockServerWebExchange.from(MockServerHttpRequest.get(path).build());
  }
}
