package ca.sait.dealerops.gateway.config;

import ca.sait.dealerops.gateway.security.JwtSupport;
import java.util.Locale;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.EnumerablePropertySource;
import org.springframework.core.env.Environment;
import org.springframework.core.env.PropertySource;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;

/**
 * Local HS256 decoder for tokens {@code dealer-core} issues itself at {@code /api/v1/auth/login}
 * (design/15-Data-Auth-and-Gateway.md S8, admin-issued username/password).
 */
@Configuration
public class JwtDecoderConfig {

  @Bean
  public ReactiveJwtDecoder jwtDecoder(Environment environment) {
    String mode = explicitJwtMode(environment);
    if (mode == null || !"dev".equalsIgnoreCase(mode)) {
      throw new IllegalStateException(
          "JWT_MODE must be 'dev'. The local HS256 decoder is the only JWT mode.");
    }
    String audience =
        firstNonBlank(
            environment.getProperty("spring.security.oauth2.resourceserver.jwt.audiences"),
            JwtSupport.DEFAULT_AUDIENCE);
    return devDecoder(audience, devSecret(environment));
  }

  /**
   * Process environment, JVM system property, or command line only.
   * {@code dealerops.jwt.mode} is {@code ${JWT_MODE:dev}} in application config, so that
   * placeholder is not a mode source: an unset {@code JWT_MODE} must not become {@code dev}.
   */
  static String explicitJwtMode(Environment environment) {
    String fromProcess = firstNonBlank(System.getenv("JWT_MODE"), System.getProperty("JWT_MODE"));
    if (fromProcess != null) {
      return fromProcess.trim();
    }
    if (!(environment instanceof ConfigurableEnvironment configurable)) {
      return null;
    }
    for (PropertySource<?> source : configurable.getPropertySources()) {
      if (!isExplicitJwtModeSource(source.getName())
          || !(source instanceof EnumerablePropertySource<?> enumerable)
          || !enumerable.containsProperty("JWT_MODE")) {
        continue;
      }
      Object raw = enumerable.getProperty("JWT_MODE");
      if (raw != null && !raw.toString().isBlank()) {
        return raw.toString().trim();
      }
    }
    return null;
  }

  private static boolean isExplicitJwtModeSource(String name) {
    if (name == null) {
      return false;
    }
    String lower = name.toLowerCase(Locale.ROOT);
    if (lower.contains("application") || lower.contains("configresource")) {
      return false;
    }
    return lower.contains("commandlineargs")
        || lower.contains("systemenvironment")
        || lower.contains("systemproperties");
  }

  static String devSecret(Environment environment) {
    String configured =
        firstNonBlank(
            environment.getProperty("DEV_JWT_SECRET"),
            environment.getProperty("dealerops.jwt.dev-secret"));
    if (configured == null || JwtSupport.isWellKnownDevSecret(configured)) {
      if (!acceptsWellKnownDevSecret(environment)) {
        throw new IllegalStateException(
            "The built-in classroom HMAC secret is not accepted for a non-dev Spring profile. Set DEV_JWT_SECRET to a secret of at least 32 bytes.");
      }
      return JwtSupport.DEFAULT_DEV_SECRET;
    }
    return configured;
  }

  /**
   * No active profile, or only local profiles, may use the committed classroom secret.
   * Any other active profile (including production) must not.
   */
  static boolean acceptsWellKnownDevSecret(Environment environment) {
    for (String profile : environment.getActiveProfiles()) {
      if (!isLocalProfile(profile)) {
        return false;
      }
    }
    return true;
  }

  private static boolean isLocalProfile(String profile) {
    String value = profile == null ? "" : profile.trim().toLowerCase(Locale.ROOT);
    return value.equals("dev")
        || value.equals("local")
        || value.equals("test")
        || value.equals("default")
        || value.equals("classroom");
  }

  private static String firstNonBlank(String... values) {
    if (values == null) {
      return null;
    }
    for (String value : values) {
      if (value != null && !value.isBlank()) {
        return value;
      }
    }
    return null;
  }

  private static ReactiveJwtDecoder devDecoder(String audience, String devSecret) {
    NimbusReactiveJwtDecoder decoder =
        NimbusReactiveJwtDecoder.withSecretKey(JwtSupport.hmacSecret(devSecret))
            .macAlgorithm(MacAlgorithm.HS256)
            .build();
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(JwtSupport.ISSUER),
            JwtSupport.audienceValidator(audience)));
    return decoder;
  }
}
