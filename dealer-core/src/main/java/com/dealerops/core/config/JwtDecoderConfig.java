package com.dealerops.core.config;

import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtDecoders;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

@Configuration
public class JwtDecoderConfig {

  @Bean
  JwtDecoder jwtDecoder(
      @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuer,
      @Value("${ENTRA_AUDIENCE:api://dealer-api}") String audience,
      @Value("${dealerops.jwt.mode:dev}") String mode,
      @Value("${dealerops.jwt.dev-secret}") String devSecret) {
    boolean useEntra =
        "entra".equalsIgnoreCase(mode) && issuer != null && !issuer.contains("<tenant-id>");
    NimbusJwtDecoder decoder;
    if (useEntra) {
      decoder = JwtDecoders.fromIssuerLocation(issuer);
      OAuth2TokenValidator<Jwt> withIssuer = JwtValidators.createDefaultWithIssuer(issuer);
      decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(withIssuer, audienceValidator(audience)));
      return decoder;
    }
    byte[] secretBytes = padSecret(devSecret);
    SecretKey key = new SecretKeySpec(secretBytes, "HmacSHA256");
    decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256).build();
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefault(), audienceValidator(audience)));
    return decoder;
  }

  private static OAuth2TokenValidator<Jwt> audienceValidator(String audience) {
    return new JwtClaimValidator<Object>(
        "aud",
        aud -> aud == null || audience.equals(aud) || (aud instanceof List<?> list && list.contains(audience)));
  }

  private static byte[] padSecret(String secret) {
    byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
    if (raw.length >= 32) {
      return raw;
    }
    byte[] padded = new byte[32];
    System.arraycopy(raw, 0, padded, 0, raw.length);
    return padded;
  }
}
