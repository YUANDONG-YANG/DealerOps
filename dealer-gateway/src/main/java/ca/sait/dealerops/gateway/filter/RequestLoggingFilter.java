package ca.sait.dealerops.gateway.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.Principal;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpRequestDecorator;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class RequestLoggingFilter implements GlobalFilter {

  private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);
  private static final String REQUEST_ID = "X-Request-ID";
  private static final Set<String> SENSITIVE_FIELDS =
      Set.of("authorization", "password", "token", "secret", "api_key", "apikey", "cookie");

  private final ObjectMapper objectMapper;

  public RequestLoggingFilter(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  @Override
  public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
    String requestId = exchange.getRequest().getHeaders().getFirst(REQUEST_ID);
    if (requestId == null || requestId.isBlank()) {
      requestId = UUID.randomUUID().toString();
    }
    String finalRequestId = requestId;
    HttpHeaders headers = new HttpHeaders();
    headers.putAll(exchange.getRequest().getHeaders());
    headers.set(REQUEST_ID, finalRequestId);
    ServerHttpRequest request =
        new ServerHttpRequestDecorator(exchange.getRequest()) {
          @Override
          public HttpHeaders getHeaders() {
            return headers;
          }
        };
    ServerWebExchange tracedExchange = exchange.mutate().request(request).build();
    tracedExchange.getResponse().getHeaders().set(REQUEST_ID, requestId);
    long started = System.nanoTime();

    return chain
        .filter(tracedExchange)
        .then(
            Mono.defer(
                () ->
                    tracedExchange
                        .getPrincipal()
                        .map(Principal::getName)
                        .defaultIfEmpty(userName(request))
                        .doOnNext(user -> logRequest(tracedExchange, request, finalRequestId, user, started))
                        .then()))
        .doOnError(
            error -> logRequest(tracedExchange, request, finalRequestId, userName(request), started));
  }

  private void logRequest(
      ServerWebExchange exchange,
      ServerHttpRequest request,
      String requestId,
      String user,
      long started) {
    Route route = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
    String routeId = route == null ? "unmatched" : route.getId();
    String downstreamService = serviceName(routeId);
    String downstreamUri = route == null ? "-" : route.getUri().toString();
    int status = exchange.getResponse().getStatusCode() == null
        ? 500
        : exchange.getResponse().getStatusCode().value();
    log.info(
        "requestId={} user={} service={} downstreamService={} downstreamUri={} api={} {} query={} params={} route={} status={} durationMs={}",
        requestId,
        user,
        downstreamService,
        downstreamService,
        downstreamUri,
        request.getMethod(),
        request.getURI().getRawPath(),
        writeSanitized(request.getQueryParams()),
        formatBody(exchange.getAttribute(ServerWebExchangeUtils.CACHED_REQUEST_BODY_ATTR)),
        routeId,
        status,
        (System.nanoTime() - started) / 1_000_000);
  }

  private static String serviceName(String routeId) {
    if (routeId.startsWith("dealer-core")) {
      return "dealer-core";
    }
    if (routeId.startsWith("ai-service")) {
      return "ai-service";
    }
    return "unmatched";
  }

  private static String userName(ServerHttpRequest request) {
    String user = request.getHeaders().getFirst("X-User-Name");
    if (user == null || user.isBlank()) {
      user = request.getHeaders().getFirst("X-User");
    }
    return user == null || user.isBlank() ? "anonymous" : user;
  }

  private String formatBody(Object body) {
    if (body == null) {
      return "{}";
    }
    try {
      JsonNode json = body instanceof String
          ? objectMapper.readTree((String) body)
          : objectMapper.valueToTree(body);
      if (json == null || json.isNull()) {
        return "{}";
      }
      redact(json);
      return truncate(objectMapper.writeValueAsString(json));
    } catch (Exception ex) {
      return "[non-json-body]";
    }
  }

  private String writeSanitized(Object value) {
    try {
      JsonNode json = objectMapper.valueToTree(value);
      redact(json);
      return truncate(objectMapper.writeValueAsString(json));
    } catch (Exception ex) {
      return "{}";
    }
  }

  private static void redact(JsonNode node) {
    if (node == null) {
      return;
    }
    if (node.isObject()) {
      Iterator<Map.Entry<String, JsonNode>> fields = node.fields();
      while (fields.hasNext()) {
        Map.Entry<String, JsonNode> field = fields.next();
        if (isSensitiveField(field.getKey())) {
          ((com.fasterxml.jackson.databind.node.ObjectNode) node).put(field.getKey(), "[REDACTED]");
        } else {
          redact(field.getValue());
        }
      }
    } else if (node.isArray()) {
      node.forEach(RequestLoggingFilter::redact);
    }
  }

  private static boolean isSensitiveField(String fieldName) {
    String normalized = fieldName.toLowerCase();
    return SENSITIVE_FIELDS.contains(normalized)
        || normalized.contains("token")
        || normalized.contains("password")
        || normalized.contains("secret")
        || normalized.contains("authorization")
        || normalized.contains("cookie");
  }

  private static String truncate(String value) {
    return value.length() <= 4000 ? value : value.substring(0, 4000) + "...[truncated]";
  }
}
