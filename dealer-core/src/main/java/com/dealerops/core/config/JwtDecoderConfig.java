package com.dealerops.core.config;

import com.dealerops.core.security.EntraJwtSupport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
   * {@code JWT_MODE=dev}: local HS256 (no JWKS, no Entra tenant).
   * {@code JWT_MODE=entra}: issuer + audience + JWKS. Placeholder issuer does not fetch JWKS.
   */
  @Bean
  public JwtDecoder jwtDecoder(
      @Value("${ENTRA_ISSUER:https://login.microsoftonline.com/<tenant-id>/v2.0}") String issuer,
      @Value("${ENTRA_AUDIENCE:api://dealer-api}") String audience,
      @Value("${JWT_MODE:${dealerops.jwt.mode:dev}}") String mode,
      @Value("${DEV_JWT_SECRET:${dealerops.jwt.dev-secret:" + EntraJwtSupport.DEFAULT_DEV_SECRET + "}}")
          String devSecret,
      @Value("${ENTRA_JWKS_URI:${dealerops.jwt.jwks-uri:}}") String jwksUriOverride) {
    if (EntraJwtSupport.useEntraJwks(mode, issuer)) {
      return entraDecoder(issuer.trim(), audience, jwksUriOverride);
    }
    if (EntraJwtSupport.isEntraMode(mode)) {
      return token -> {
        throw new JwtException(
            "JWT_MODE=entra but ENTRA_ISSUER is unset or still a placeholder; JWKS is not loaded");
      };
    }
    return devDecoder(audience, devSecret);
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
