package ca.sait.dealerops.gateway.filter;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/** TEST-14 counterpart: /internal/v1/** without the internal header is 404, not 401. */
class InternalRouteFilterTest {

  @Test
  void missingInternalHeaderIs404() {
    InternalRouteFilter filter = new InternalRouteFilter();
    ReflectionTestUtils.setField(filter, "headerName", "X-Dealer-Internal");
    ReflectionTestUtils.setField(filter, "expectedToken", "dealer-internal");
    MockServerWebExchange exchange =
        MockServerWebExchange.from(MockServerHttpRequest.post("/internal/v1/ad-check").build());
    WebFilterChain chain = e -> Mono.error(new AssertionError("must not reach downstream"));
    filter.filter(exchange, chain).block();
    assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void healthDoesNotRequireInternalHeader() {
    InternalRouteFilter filter = new InternalRouteFilter();
    ReflectionTestUtils.setField(filter, "headerName", "X-Dealer-Internal");
    ReflectionTestUtils.setField(filter, "expectedToken", "dealer-internal");
    MockServerWebExchange exchange =
        MockServerWebExchange.from(MockServerHttpRequest.get("/actuator/health").build());
    boolean[] continued = {false};
    WebFilterChain chain =
        e -> {
          continued[0] = true;
          return Mono.empty();
        };
    filter.filter(exchange, chain).block();
    assertThat(continued[0]).isTrue();
  }

  @Test
  void wrongInternalHeaderIs404() {
    InternalRouteFilter filter = new InternalRouteFilter();
    ReflectionTestUtils.setField(filter, "headerName", "X-Dealer-Internal");
    ReflectionTestUtils.setField(filter, "expectedToken", "dealer-internal");
    MockServerWebExchange exchange =
        MockServerWebExchange.from(
            MockServerHttpRequest.post("/internal/v1/ad-check")
                .header("X-Dealer-Internal", "wrong-token")
                .build());
    WebFilterChain chain = e -> Mono.error(new AssertionError("must not reach downstream"));
    filter.filter(exchange, chain).block();
    assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
  }

  @Test
  void matchingInternalHeaderContinues() {
    InternalRouteFilter filter = new InternalRouteFilter();
    ReflectionTestUtils.setField(filter, "headerName", "X-Dealer-Internal");
    ReflectionTestUtils.setField(filter, "expectedToken", "dealer-internal");
    MockServerWebExchange exchange =
        MockServerWebExchange.from(
            MockServerHttpRequest.post("/internal/v1/ad-check").header("X-Dealer-Internal", "dealer-internal").build());
    boolean[] continued = {false};
    WebFilterChain chain =
        e -> {
          continued[0] = true;
          return Mono.empty();
        };
    filter.filter(exchange, chain).block();
    assertThat(continued[0]).isTrue();
  }
}
