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

  private EntraJwtSupport() {}

  public static boolean isEntraMode(String mode) {
    return ENTRA_MODE.equalsIgnoreCase(mode == null ? "" : mode.trim());
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

  public static SecretKey hmacSecret(String secret) {
    String value = secret == null || secret.isBlank() ? DEFAULT_DEV_SECRET : secret;
    byte[] raw = value.getBytes(StandardCharsets.UTF_8);
    byte[] bytes = raw.length >= 32 ? raw : pad(raw);
    return new SecretKeySpec(bytes, "HmacSHA256");
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
