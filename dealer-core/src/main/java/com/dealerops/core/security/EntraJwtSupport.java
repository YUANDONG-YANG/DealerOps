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
 * Issuer / audience / JWKS helpers shared by the resource-server decoder. Does not invent roles.
 */
public final class EntraJwtSupport {

  public static final String DEV_MODE = "dev";
  public static final String ENTRA_MODE = "entra";
  public static final String DEFAULT_ISSUER = "https://login.microsoftonline.com/<tenant-id>/v2.0";
  public static final String DEFAULT_AUDIENCE = "api://dealer-api";
  public static final String DEFAULT_DEV_SECRET = "dealer-dev-jwt-secret-change-me";
  /** HS256 keys shorter than this are rejected, except the classroom default below. */
  public static final int MIN_HMAC_KEY_BYTES = 32;

  private EntraJwtSupport() {}

  public static boolean isEntraMode(String mode) {
    return ENTRA_MODE.equalsIgnoreCase(mode == null ? "" : mode.trim());
  }

  public static boolean isDevMode(String mode) {
    return DEV_MODE.equalsIgnoreCase(mode == null ? "" : mode.trim());
  }

  public static boolean isWellKnownDevSecret(String secret) {
    return DEFAULT_DEV_SECRET.equals(secret);
  }

  /** Placeholder {@code <tenant-id>} (or blank) must not trigger a JWKS fetch. */
  public static boolean isUsableIssuer(String issuer) {
    if (issuer == null) {
      return false;
    }
    String trimmed = issuer.trim();
    return !trimmed.isEmpty() && !trimmed.contains("<") && !trimmed.contains("tenant-id");
  }

  public static boolean useEntraJwks(String mode, String issuer) {
    return isEntraMode(mode) && isUsableIssuer(issuer);
  }

  /**
   * Entra v2 JWKS: {@code https://login.microsoftonline.com/{tid}/discovery/v2.0/keys}.
   * Optional override is {@code ENTRA_JWKS_URI}.
   */
  public static String jwksUri(String issuer, String override) {
    if (override != null && !override.isBlank()) {
      return override.trim();
    }
    String iss = issuer == null ? "" : issuer.trim();
    if (iss.endsWith("/")) {
      iss = iss.substring(0, iss.length() - 1);
    }
    if (iss.endsWith("/v2.0")) {
      return iss.substring(0, iss.length() - "/v2.0".length()) + "/discovery/v2.0/keys";
    }
    return iss + "/discovery/v2.0/keys";
  }

  /**
   * HS256 key for an explicit {@code JWT_MODE=dev} decoder.
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
