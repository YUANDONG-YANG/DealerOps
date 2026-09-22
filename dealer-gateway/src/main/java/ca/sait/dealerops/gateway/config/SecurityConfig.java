package ca.sait.dealerops.gateway.config;

import ca.sait.dealerops.gateway.security.JwtRoleMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

  @Bean
  SecurityWebFilterChain chain(ServerHttpSecurity http) {
    http.csrf(ServerHttpSecurity.CsrfSpec::disable);
    http.oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
    http.authorizeExchange(
        a ->
            a.pathMatchers(HttpMethod.OPTIONS, "/**")
                .permitAll()
                .pathMatchers("/actuator/health")
                .permitAll()
                .pathMatchers("/api/v1/**")
                .authenticated()
                .pathMatchers("/internal/**")
                .permitAll()
                .anyExchange()
                .denyAll());
    http.addFilterAfter(apiRoleFilter(), SecurityWebFiltersOrder.AUTHENTICATION);
    return http.build();
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
