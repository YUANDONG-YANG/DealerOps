package ca.sait.dealerops.gateway.filter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * Browser or any client hitting {@code /internal/**} without the correct
 * {@code X-Dealer-Internal} header → 404 (not 401).
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class InternalRouteFilter implements WebFilter {

  @Value("${dealerops.internal-header-name:X-Dealer-Internal}")
  private String headerName;

  @Value("${dealerops.internal-token:dealer-internal}")
  private String expectedToken;

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
    String path = exchange.getRequest().getPath().value();
    if (!isInternal(path)) {
      return chain.filter(exchange);
    }
    String header = exchange.getRequest().getHeaders().getFirst(headerName);
    if (expectedToken.equals(header)) {
      return chain.filter(exchange);
    }
    exchange.getResponse().setStatusCode(HttpStatus.NOT_FOUND);
    return exchange.getResponse().setComplete();
  }

  private static boolean isInternal(String path) {
    return "/internal".equals(path) || path.startsWith("/internal/");
  }
}
