package ca.sait.dealerops.gateway.filter;

import java.util.Locale;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

/**
 * Browser or any client hitting {@code /internal/**} without the correct
 * {@code X-Dealer-Internal} header → 404 (not 401). A request to any other path that carries
 * that header is also 404, so a client can never pass the internal credential on to core.
 * (Rejecting here instead of a {@code RemoveRequestHeader} route filter: that filter fails on
 * read-only headers in Spring Cloud Gateway 4.1.5 with Spring Framework 6.1.14.)
 *
 * <p>The well-known local default token is a credential only when the process
 * explicitly runs the {@code dev} or {@code local} Spring profile. Any other
 * profile, including no active profile, fails closed at startup.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class InternalRouteFilter implements WebFilter, InitializingBean {

  private static final Logger log = LoggerFactory.getLogger(InternalRouteFilter.class);

  static final String WELL_KNOWN_DEFAULT_TOKEN = "dealer-internal";

  @Value("${dealerops.internal-header-name:X-Dealer-Internal}")
  private String headerName;

  @Value("${dealerops.internal-token:dealer-internal}")
  private String expectedToken;

  @Autowired
  private Environment environment;

  @Override
  public void afterPropertiesSet() {
    if (WELL_KNOWN_DEFAULT_TOKEN.equals(expectedToken) && !devProfileExplicitlySelected()) {
      throw new IllegalStateException(
          "Refusing to start: INTERNAL_TOKEN is the well-known default and no dev or local"
              + " Spring profile is active. Set a non-default INTERNAL_TOKEN, or set"
              + " SPRING_PROFILES_ACTIVE to dev or local for classroom/local only.");
    }
  }

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
    String path = exchange.getRequest().getPath().value();
    String header = exchange.getRequest().getHeaders().getFirst(headerName);
    if (!isInternal(path)) {
      if (header == null) {
        return chain.filter(exchange);
      }
    } else if (!wellKnownDefaultBlocked() && expectedToken.equals(header)) {
      return chain.filter(exchange);
    }
    log.warn(
        "Rejecting {} {} (missing or invalid {})",
        exchange.getRequest().getMethod(),
        path,
        headerName);
    exchange.getResponse().setStatusCode(HttpStatus.NOT_FOUND);
    return exchange.getResponse().setComplete();
  }

  /**
   * Spring always injects {@link Environment}. A null environment is not a running
   * profile selection, so the startup check stays fail-closed for that case.
   */
  private boolean wellKnownDefaultBlocked() {
    return environment != null
        && WELL_KNOWN_DEFAULT_TOKEN.equals(expectedToken)
        && !devProfileExplicitlySelected();
  }

  private boolean devProfileExplicitlySelected() {
    if (environment == null) {
      return false;
    }
    for (String profile : environment.getActiveProfiles()) {
      if (profile == null) {
        continue;
      }
      String name = profile.trim().toLowerCase(Locale.ROOT);
      if ("dev".equals(name) || "local".equals(name)) {
        return true;
      }
    }
    return false;
  }

  private static boolean isInternal(String path) {
    return "/internal".equals(path) || path.startsWith("/internal/");
  }
}
