package ca.sait.dealerops.gateway.config;

import ca.sait.dealerops.gateway.security.JwtRoleMapper;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

  /**
   * 占位 issuer（含 {@code <tenant-id>} 或空白）不在启动时拉 JWKS，避免本机未配 Entra 时硬崩。
   * 设置真实 {@code ENTRA_ISSUER} 后，首次验签再解析 OIDC 元数据。
   */
  @Bean
  ReactiveJwtDecoder jwtDecoder(
      @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:}") String issuer,
      @Value("${spring.security.oauth2.resourceserver.jwt.audiences:api://dealer-api}") String audience) {
    return new LazyEntraJwtDecoder(issuer, audience);
  }

  @Bean
  SecurityWebFilterChain chain(ServerHttpSecurity http) {
    http.csrf(ServerHttpSecurity.CsrfSpec::disable);
    http.oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
    http.authorizeExchange(a -> a
        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        .pathMatchers("/api/v1/**").authenticated()
        .pathMatchers("/internal/**").permitAll()
        .anyExchange().denyAll());
    http.addFilterAfter(apiRoleFilter(), SecurityWebFiltersOrder.AUTHENTICATION);
    return http.build();
  }

  /**
   * JWT 有效但 roles[] 对不上 Platform.Admin / Dealer.User → 401（不要 403）。
   */
  private static WebFilter apiRoleFilter() {
    return (ServerWebExchange exchange, WebFilterChain chain) -> {
      String path = exchange.getRequest().getPath().value();
      if (!path.startsWith("/api/v1")) {
        return chain.filter(exchange);
      }
      return exchange.getPrincipal()
          .flatMap(principal -> {
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

  static final class LazyEntraJwtDecoder implements ReactiveJwtDecoder {

    private final String issuer;
    private final String audience;
    private final AtomicReference<ReactiveJwtDecoder> delegate = new AtomicReference<>();

    LazyEntraJwtDecoder(String issuer, String audience) {
      this.issuer = issuer == null ? "" : issuer.trim();
      this.audience = audience == null ? "" : audience.trim();
    }

    @Override
    public Mono<Jwt> decode(String token) {
      if (!isUsableIssuer(issuer)) {
        return Mono.error(new JwtException(
            "ENTRA_ISSUER is unset or still a placeholder; JWT validation is disabled until configured"));
      }
      try {
        return resolved().decode(token);
      } catch (RuntimeException ex) {
        return Mono.error(new JwtException("Failed to initialize Entra JWT decoder", ex));
      }
    }

    private ReactiveJwtDecoder resolved() {
      ReactiveJwtDecoder existing = delegate.get();
      if (existing != null) {
        return existing;
      }
      NimbusReactiveJwtDecoder built = NimbusReactiveJwtDecoder.withIssuerLocation(issuer).build();
      OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);
      OAuth2TokenValidator<Jwt> audienceCheck = jwt -> {
        List<String> aud = jwt.getAudience();
        if (audience.isEmpty() || (aud != null && aud.contains(audience))) {
          return OAuth2TokenValidatorResult.success();
        }
        return OAuth2TokenValidatorResult.failure(
            new OAuth2Error("invalid_token", "Required audience is missing", null));
      };
      built.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuer, audienceCheck));
      if (delegate.compareAndSet(null, built)) {
        return built;
      }
      return delegate.get();
    }

    static boolean isUsableIssuer(String issuer) {
      return !issuer.isEmpty()
          && !issuer.contains("<")
          && !issuer.contains("tenant-id");
    }
  }
}
