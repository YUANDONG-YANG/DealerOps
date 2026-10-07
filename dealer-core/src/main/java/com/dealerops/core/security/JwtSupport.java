package com.dealerops.core.security;

import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Issuer / audience / HMAC-secret helpers shared by the JWT decoder and issuer.
 * Admin-issued username/password auth (design/15-Data-Auth-and-Gateway.md S8).
 */
public final class JwtSupport {

  public static final String ISSUER = "dealerops-core";
  public static final String DEFAULT_AUDIENCE = "api://dealer-api";
  public static final String DEFAULT_DEV_SECRET = "dealer-dev-jwt-secret-change-me";
  /** HS256 keys shorter than this are rejected, except the classroom default below. */
  public static final int MIN_HMAC_KEY_BYTES = 32;

  private JwtSupport() {}

  public static boolean isWellKnownDevSecret(String secret) {
    return DEFAULT_DEV_SECRET.equals(secret);
  }

  /**
   * HS256 key for token signing/validation.
   * A blank secret is rejected (it must not become the classroom default here).
   * The classroom default is shorter than {@link #MIN_HMAC_KEY_BYTES} and is zero-padded
   * only for that exact value so existing local tokens still verify. Any other short
   * secret is rejected so a custom {@code DEV_JWT_SECRET} is not silently weakened.
   */
  public static SecretKey hmacSecret(String secret) {
    if (secret == null || secret.isBlank()) {
      throw new IllegalArgumentException("DEV_JWT_SECRET is blank");
    }
    byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
    if (raw.length >= MIN_HMAC_KEY_BYTES) {
      return new SecretKeySpec(raw, "HmacSHA256");
    }
    if (DEFAULT_DEV_SECRET.equals(secret)) {
      return new SecretKeySpec(pad(raw), "HmacSHA256");
    }
    throw new IllegalArgumentException(
        "DEV_JWT_SECRET must be at least 32 UTF-8 bytes. Short custom secrets are not padded.");
  }

  public static OAuth2TokenValidator<Jwt> audienceValidator(String audience) {
    String required = audience == null || audience.isBlank() ? DEFAULT_AUDIENCE : audience.trim();
    return jwt -> {
      if (audienceMatches(jwt, required)) {
        return OAuth2TokenValidatorResult.success();
      }
      return OAuth2TokenValidatorResult.failure(
          new OAuth2Error("invalid_token", "Required audience is missing", null));
    };
  }

  static boolean audienceMatches(Jwt jwt, String required) {
    List<String> aud = jwt.getAudience();
    if (aud != null && aud.contains(required)) {
      return true;
    }
    Object raw = jwt.getClaim("aud");
    if (required.equals(raw)) {
      return true;
    }
    return raw instanceof List<?> list && list.contains(required);
  }

  private static byte[] pad(byte[] raw) {
    byte[] padded = new byte[32];
    System.arraycopy(raw, 0, padded, 0, raw.length);
    return padded;
  }
}
