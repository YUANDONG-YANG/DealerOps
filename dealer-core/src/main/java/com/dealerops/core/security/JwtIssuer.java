package com.dealerops.core.security;

import com.dealerops.core.dealer.AppUserEntity;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Issues the HS256 access token at {@code POST /api/v1/auth/login} (design/15-Data-Auth-and-Gateway.md S8).
 * Same claim shape, audience, and secret the gateway/core JWT decoder already validates.
 */
@Component
public class JwtIssuer {

  private static final long EXPIRY_SECONDS = 3600;

  private final Environment environment;

  public JwtIssuer(Environment environment) {
    this.environment = environment;
  }

  public String issue(AppUserEntity user) {
    try {
      Instant now = Instant.now();
      JWTClaimsSet claims =
          new JWTClaimsSet.Builder()
              .issuer(JwtSupport.ISSUER)
              .audience(JwtSupport.DEFAULT_AUDIENCE)
              .subject(user.getUsername())
              .issueTime(Date.from(now))
              .expirationTime(Date.from(now.plusSeconds(EXPIRY_SECONDS)))
              .claim("name", user.getDisplayName())
              .claim("roles", List.of(user.getRole().getValue()))
              .build();
      SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
      jwt.sign(new MACSigner(JwtSupport.hmacSecret(devSecret())));
      return jwt.serialize();
    } catch (JOSEException ex) {
      throw new IllegalStateException("Failed to sign access token", ex);
    }
  }

  private String devSecret() {
    String fromEnvVar = environment.getProperty("DEV_JWT_SECRET");
    String configured =
        fromEnvVar != null && !fromEnvVar.isBlank()
            ? fromEnvVar
            : environment.getProperty("dealerops.jwt.dev-secret");
    return configured == null || configured.isBlank() ? JwtSupport.DEFAULT_DEV_SECRET : configured;
  }
}
