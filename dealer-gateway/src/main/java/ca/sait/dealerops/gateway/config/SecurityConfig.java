package ca.sait.dealerops.gateway.config;

import ca.sait.dealerops.gateway.security.JwtRoleMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

  private static final String[] OPENAPI_PATHS = {
    "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs", "/v3/api-docs/**"
  };

  @Bean
  SecurityWebFilterChain chain(ServerHttpSecurity http, Environment environment) {
    boolean anonymousOpenApi = anonymousOpenApiEnabled(environment);
    http.csrf(ServerHttpSecurity.CsrfSpec::disable);
    http.oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
    http.authorizeExchange(
        a -> {
          a.pathMatchers(HttpMethod.OPTIONS, "/**").permitAll();
          a.pathMatchers("/actuator/health").permitAll();
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
   * non-local Spring profile). Entra and any non-local profile do not serve the schema.
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
      return exchange
          .getPrincipal()
          .flatMap(
              principal -> {
                if (principal instanceof JwtAuthenticationToken jwtAuth
                    && JwtRoleMapper.mapRole(jwtAuth.getToken()) == null) {
                  exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                  return exchange.getResponse().setComplete();
                }
                return chain.filter(exchange);
              })
          .switchIfEmpty(chain.filter(exchange));
    };
  }
}
