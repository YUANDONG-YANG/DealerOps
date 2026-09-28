package com.dealerops.core.config;

import com.dealerops.core.security.EntraJwtSupport;
import java.util.Locale;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.EnumerablePropertySource;
import org.springframework.core.env.Environment;
import org.springframework.core.env.PropertySource;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@Configuration
public class JwtDecoderConfig {

  /**
   * {@code JWT_MODE=dev}: local HS256 (same secret as gateway).
   * {@code JWT_MODE=entra}: issuer + audience + JWKS. Placeholder issuer does not fetch JWKS.
   * An unset {@code JWT_MODE} does not select the local HMAC decoder.
   */
  @Bean
  public JwtDecoder jwtDecoder(Environment environment) {
    String mode = explicitJwtMode(environment);
    if (mode == null) {
      throw new IllegalStateException(
          "JWT_MODE is unset. Set JWT_MODE=entra to validate Entra tokens, or JWT_MODE=dev for local HS256. The local HMAC decoder is not the default.");
    }
    String issuer =
        firstNonBlank(
            environment.getProperty("ENTRA_ISSUER"),
            environment.getProperty("spring.security.oauth2.resourceserver.jwt.issuer-uri"),
            EntraJwtSupport.DEFAULT_ISSUER);
    String audience =
        firstNonBlank(
            environment.getProperty("ENTRA_AUDIENCE"),
            environment.getProperty("spring.security.oauth2.resourceserver.jwt.audiences"),
            EntraJwtSupport.DEFAULT_AUDIENCE);
    String jwksUriOverride =
        firstNonBlank(
            environment.getProperty("ENTRA_JWKS_URI"),
            environment.getProperty("dealerops.jwt.jwks-uri"),
            "");
    String devSecret = EntraJwtSupport.isDevMode(mode) ? devSecret(environment) : "";
    return jwtDecoder(issuer, audience, mode, devSecret, jwksUriOverride);
  }

  /**
   * Builds a decoder from an explicit mode. Values other than {@code dev} and {@code entra} are rejected.
   */
  public JwtDecoder jwtDecoder(
      String issuer,
      String audience,
      String mode,
      String devSecret,
      String jwksUriOverride) {
    if (EntraJwtSupport.useEntraJwks(mode, issuer)) {
      return entraDecoder(issuer.trim(), audience, jwksUriOverride);
    }
    if (EntraJwtSupport.isEntraMode(mode)) {
      return token -> {
        throw new JwtException(
            "JWT_MODE=entra but ENTRA_ISSUER is unset or still a placeholder; JWKS is not loaded");
      };
    }
    if (!EntraJwtSupport.isDevMode(mode)) {
      throw new IllegalStateException(
          "JWT_MODE must be 'dev' or 'entra'. Refusing the local HMAC decoder.");
    }
    return devDecoder(audience, devSecret);
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

  private static String devSecret(Environment environment) {
    String configured =
        firstNonBlank(
            environment.getProperty("DEV_JWT_SECRET"),
            environment.getProperty("dealerops.jwt.dev-secret"));
    if (configured == null || EntraJwtSupport.isWellKnownDevSecret(configured)) {
      if (!acceptsWellKnownDevSecret(environment)) {
        throw new IllegalStateException(
            "The built-in classroom HMAC secret is not accepted for a non-dev Spring profile. Set JWT_MODE=entra, or set DEV_JWT_SECRET to a secret of at least 32 bytes.");
      }
      return EntraJwtSupport.DEFAULT_DEV_SECRET;
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

  private static JwtDecoder entraDecoder(String issuer, String audience, String jwksOverride) {
    String jwks = EntraJwtSupport.jwksUri(issuer, jwksOverride);
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwks).build();
    OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(withIssuer, EntraJwtSupport.audienceValidator(audience)));
    return decoder;
  }

  private static JwtDecoder devDecoder(String audience, String devSecret) {
    NimbusJwtDecoder decoder =
        NimbusJwtDecoder.withSecretKey(EntraJwtSupport.hmacSecret(devSecret))
            .macAlgorithm(MacAlgorithm.HS256)
            .build();
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefault(), EntraJwtSupport.audienceValidator(audience)));
    return decoder;
  }
}
