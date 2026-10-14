package ca.sait.dealerops.gateway.config;

import java.util.List;
import java.util.function.Predicate;
import org.springframework.cloud.gateway.handler.predicate.AbstractRoutePredicateFactory;
import org.springframework.http.server.PathContainer;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

/**
 * Shortcut {@code Not=Path=/actuator/health}. Spring Cloud Gateway 4.1 has no built-in
 * {@code Not} predicate; without this bean the catch-all 404 route fails startup.
 */
@Component
public class NotRoutePredicateFactory extends AbstractRoutePredicateFactory<NotRoutePredicateFactory.Config> {

  public NotRoutePredicateFactory() {
    super(Config.class);
  }

  @Override
  public List<String> shortcutFieldOrder() {
    return List.of("expression");
  }

  @Override
  public Predicate<ServerWebExchange> apply(Config config) {
    String expression = config.getExpression() == null ? "" : config.getExpression().trim();
    if (!expression.startsWith("Path=")) {
      throw new IllegalArgumentException("Not predicate only supports Path=, got: " + expression);
    }
    PathPattern pattern = PathPatternParser.defaultInstance.parse(expression.substring("Path=".length()));
    return exchange -> {
      PathContainer path = exchange.getRequest().getPath().pathWithinApplication();
      return !pattern.matches(path);
    };
  }

  public static class Config {
    private String expression;

    public String getExpression() {
      return expression;
    }

    public void setExpression(String expression) {
      this.expression = expression;
    }
  }
}
