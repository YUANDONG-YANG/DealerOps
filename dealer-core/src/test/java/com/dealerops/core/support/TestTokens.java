package com.dealerops.core.support;

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

/** HS256 tokens for the local JWT_MODE=dev decoder. Not Entra-issued. */
public final class TestTokens {

  public static final String TID = "test-tenant";
  public static final String AUDIENCE = "api://dealer-api";
  public static final String ISSUER = "https://login.microsoftonline.com/test-tenant/v2.0";
  public static final String DEV_SECRET = "dealer-dev-jwt-secret-change-me";

  public static final String ADMIN_OID = "00000000-0000-0000-0000-000000000001";
  public static final String STAFF_A_OID = "11111111-1111-1111-1111-111111111111";
  public static final String STAFF_B_OID = "22222222-2222-2222-2222-222222222222";
  public static final String UNBOUND_OID = "33333333-3333-3333-3333-333333333333";

  private TestTokens() {}

  public static String admin() {
    return bearer(ADMIN_OID, "Platform Admin", List.of("Platform.Admin"));
  }

  public static String staffA() {
    return bearer(STAFF_A_OID, "Staff A", List.of("Dealer.User"));
  }

  public static String staffB() {
    return bearer(STAFF_B_OID, "Staff B", List.of("Dealer.User"));
  }

  public static String unboundStaff() {
    return bearer(UNBOUND_OID, "Unbound Staff", List.of("Dealer.User"));
  }

  public static String adminAndStaff() {
    return bearer(ADMIN_OID, "Platform Admin", List.of("Platform.Admin", "Dealer.User"));
  }

  public static String noRoles() {
    return bearer(STAFF_A_OID, "No Role", List.of());
  }

  public static String bearer(String oid, String name, List<String> roles) {
    try {
      Instant now = Instant.now();
      JWTClaimsSet claims =
          new JWTClaimsSet.Builder()
              .issuer(ISSUER)
              .audience(AUDIENCE)
              .subject(oid)
              .issueTime(Date.from(now))
              .expirationTime(Date.from(now.plusSeconds(3600)))
              .claim("oid", oid)
              .claim("tid", TID)
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
