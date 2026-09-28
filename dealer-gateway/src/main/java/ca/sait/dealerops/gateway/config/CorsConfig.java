package ca.sait.dealerops.gateway.config;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

/**
 * Sole CORS policy (15 §13 / LOCAL-AND-CLOUD §4). One SPA origin from {@code
 * CORS_ALLOWED_ORIGIN}. Local default is Vite {@code http://localhost:5173}. Azure is the web
 * HTTPS origin (Bicep {@code corsAllowedOrigin} / {@code webPublicOrigin}).
 *
 * <p>Do not also set {@code spring.cloud.gateway.globalcors}. A second writer was only kept in
 * sync by {@code DedupeResponseHeader} and could drift. Do not list {@code X-Dealer-Internal}.
 */
@Configuration
public class CorsConfig {

  @Bean
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
