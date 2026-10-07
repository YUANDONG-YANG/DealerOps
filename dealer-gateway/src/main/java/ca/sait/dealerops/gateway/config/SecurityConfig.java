package ca.sait.dealerops.gateway.config;

import ca.sait.dealerops.gateway.security.JwtRoleMapper;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.ServerAuthenticationEntryPoint;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

  private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

  private static final String[] OPENAPI_PATHS = {
    "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs", "/v3/api-docs/**"
  };

  @Bean
  SecurityWebFilterChain chain(ServerHttpSecurity http, Environment environment) {
    boolean anonymousOpenApi = anonymousOpenApiEnabled(environment);
    http.csrf(ServerHttpSecurity.CsrfSpec::disable);
    ServerAuthenticationEntryPoint unauthorized = (exchange, ex) -> unauthorized(exchange);
    // The resource server keeps its own entry point for a bad, expired, or wrong-audience token;
    // without this it answers 401 with an empty body instead of {code, message} (ARC-06).
    http.oauth2ResourceServer(
        o -> o.jwt(Customizer.withDefaults()).authenticationEntryPoint(unauthorized));
    http.exceptionHandling(
        e ->
            e.authenticationEntryPoint(unauthorized)
                .accessDeniedHandler(
                    (exchange, ex) ->
                        writeError(exchange, HttpStatus.FORBIDDEN, "FORBIDDEN", "Forbidden")));
    http.authorizeExchange(
        a -> {
          a.pathMatchers(HttpMethod.OPTIONS, "/**").permitAll();
          a.pathMatchers("/actuator/health", "/actuator/health/**").permitAll();
          a.pathMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll();
          // Local/dev classroom only. Any other mode or a non-local profile denies the schema.
          if (anonymousOpenApi) {
            a.pathMatchers(OPENAPI_PATHS).permitAll();
          } else {
            a.pathMatchers(OPENAPI_PATHS).denyAll();
          }
          a.pathMatchers("/api/v1/**").authenticated();
          a.pathMatchers("/internal/**").permitAll();
          a.anyExchange().denyAll();
        });
    http.addFilterAfter(apiRoleFilter(), SecurityWebFiltersOrder.AUTHENTICATION);
    return http.build();
  }

  /**
   * Anonymous Swagger/OpenAPI is the local classroom default ({@code JWT_MODE=dev}, no
   * non-local Spring profile). Any other JWT mode or non-local profile does not serve the schema.
   */
  static boolean anonymousOpenApiEnabled(Environment environment) {
    String mode = environment.getProperty("dealerops.jwt.mode", "dev");
    if (mode == null || !"dev".equalsIgnoreCase(mode.trim())) {
      return false;
    }
    for (String profile : environment.getActiveProfiles()) {
      if (!isLocalProfile(profile)) {
        return false;
      }
    }
    return true;
  }

  private static boolean isLocalProfile(String profile) {
    if (profile == null) {
      return true;
    }
    String normalized = profile.trim();
    if (normalized.isEmpty()) {
      return true;
    }
    return normalized.equalsIgnoreCase("dev")
        || normalized.equalsIgnoreCase("local")
        || normalized.equalsIgnoreCase("test")
        || normalized.equalsIgnoreCase("default");
  }

  /**
   * Valid JWT whose {@code roles[]} maps to neither Platform.Admin nor Dealer.User → 401 (not 403).
   */
  private static WebFilter apiRoleFilter() {
    return (ServerWebExchange exchange, WebFilterChain chain) -> {
      String path = exchange.getRequest().getPath().value();
      if (!path.startsWith("/api/v1")) {
        return chain.filter(exchange);
      }
      // Decide first, then run the chain once. A switchIfEmpty after chain.filter would re-run
      // the chain, because Mono<Void> always completes empty (also after the 401 setComplete).
      return exchange
          .getPrincipal()
          .filter(
              principal ->
                  principal instanceof JwtAuthenticationToken jwtAuth
                      && JwtRoleMapper.mapRole(jwtAuth.getToken()) == null)
          .hasElement()
          .flatMap(
              unmappedRole -> {
                if (unmappedRole) {
                  return unauthorized(exchange);
                }
                return chain.filter(exchange);
              });
    };
  }

  private static Mono<Void> unauthorized(ServerWebExchange exchange) {
    return writeError(exchange, HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
  }

  /** Same {@code {code, message}} error body as dealer-core (ARC-06). Arguments are constants. */
  private static Mono<Void> writeError(
      ServerWebExchange exchange, HttpStatus status, String code, String message) {
    log.warn(
        "Rejecting {} {} -> {} {}",
        exchange.getRequest().getMethod(),
        exchange.getRequest().getPath().value(),
        status.value(),
        code);
    ServerHttpResponse response = exchange.getResponse();
    response.setStatusCode(status);
    response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
    byte[] body =
        ("{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}")
            .getBytes(StandardCharsets.UTF_8);
    return response.writeWith(Mono.just(response.bufferFactory().wrap(body)));
  }
}
