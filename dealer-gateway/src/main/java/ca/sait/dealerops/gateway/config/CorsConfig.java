package ca.sait.dealerops.gateway.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

/**
 * Sole CORS policy (15 §13 / LOCAL-AND-CLOUD §4). One SPA origin from {@code
 * CORS_ALLOWED_ORIGIN}. Local default is Vite {@code http://localhost:5173}. Azure is the web
 * HTTPS origin, set by Terraform from {@code cors_allowed_origin} or the Static Web App origin
 * (deploy/terraform/main.tf).
 *
 * <p>Do not also set {@code spring.cloud.gateway.globalcors}. A second writer was only kept in
 * sync by {@code DedupeResponseHeader} and could drift. Do not list {@code X-Dealer-Internal}.
 */
@Configuration
public class CorsConfig {

  /**
   * Runs before the Spring Security filter chain (order -100). Otherwise a 401/403 written by
   * security carries no Access-Control-Allow-Origin, and the SPA (a different origin) sees a
   * network error instead of the 401 it uses to clear the session and redirect to sign-in.
   */
  @Bean
  @Order(Ordered.HIGHEST_PRECEDENCE + 1)
  public CorsWebFilter corsWebFilter(
      @Value("${CORS_ALLOWED_ORIGIN:${dealerops.cors-allowed-origin:http://localhost:5173}}")
          String allowedOrigin) {
    CorsConfiguration cors = new CorsConfiguration();
    cors.setAllowedOrigins(List.of(allowedOrigin.trim()));
    cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    cors.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    cors.setExposedHeaders(List.of());
    cors.setAllowCredentials(false);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", cors);
    return new CorsWebFilter(source);
  }
}
