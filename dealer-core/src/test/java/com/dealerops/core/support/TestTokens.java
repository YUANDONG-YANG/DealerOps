package com.dealerops.core.support;

import com.dealerops.core.security.JwtSupport;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

/** HS256 tokens shaped like the ones dealer-core issues at /api/v1/auth/login (sub = username). */
public final class TestTokens {

  public static final String AUDIENCE = JwtSupport.DEFAULT_AUDIENCE;
  public static final String ISSUER = JwtSupport.ISSUER;
  public static final String DEV_SECRET = JwtSupport.DEFAULT_DEV_SECRET;

  public static final String ADMIN_USERNAME = "test-admin";
  public static final String STAFF_A_USERNAME = "staff-a";
  public static final String STAFF_B_USERNAME = "staff-b";
  public static final String UNBOUND_USERNAME = "unbound-staff";

  private TestTokens() {}

  public static String admin() {
    return bearer(ADMIN_USERNAME, "Platform Admin", List.of("Platform.Admin"));
  }

  public static String staffA() {
    return bearer(STAFF_A_USERNAME, "Staff A", List.of("Dealer.User"));
  }

  public static String staffB() {
    return bearer(STAFF_B_USERNAME, "Staff B", List.of("Dealer.User"));
  }

  public static String unboundStaff() {
    return bearer(UNBOUND_USERNAME, "Unbound Staff", List.of("Dealer.User"));
  }

  public static String adminAndStaff() {
    return bearer(ADMIN_USERNAME, "Platform Admin", List.of("Platform.Admin", "Dealer.User"));
  }

  public static String noRoles() {
    return bearer(STAFF_A_USERNAME, "No Role", List.of());
  }

  public static String bearer(String username, String name, List<String> roles) {
    try {
      Instant now = Instant.now();
      JWTClaimsSet claims =
          new JWTClaimsSet.Builder()
              .issuer(ISSUER)
              .audience(AUDIENCE)
              .subject(username)
              .issueTime(Date.from(now))
              .expirationTime(Date.from(now.plusSeconds(3600)))
              .claim("name", name)
              .claim("roles", roles)
              .build();
      SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
      jwt.sign(new MACSigner(padSecret(DEV_SECRET)));
      return jwt.serialize();
    } catch (JOSEException ex) {
      throw new IllegalStateException(ex);
    }
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
