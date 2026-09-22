package ca.sait.dealerops.gateway.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import ca.sait.dealerops.gateway.config.JwtDecoderConfig;
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
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;

class EntraJwtSupportTest {

  @Test
  void placeholderIssuerDoesNotEnableJwks() {
    assertFalse(EntraJwtSupport.isUsableIssuer(EntraJwtSupport.DEFAULT_ISSUER));
    assertFalse(EntraJwtSupport.useEntraJwks("entra", EntraJwtSupport.DEFAULT_ISSUER));
    assertTrue(EntraJwtSupport.useEntraJwks("entra", "https://login.microsoftonline.com/abc/v2.0"));
  }

  @Test
  void jwksUriDerivesFromEntraV2Issuer() {
    assertEquals(
        "https://login.microsoftonline.com/abc/discovery/v2.0/keys",
        EntraJwtSupport.jwksUri("https://login.microsoftonline.com/abc/v2.0", ""));
  }

  @Test
  void entraPlaceholderDecoderDoesNotFetchJwks() {
    ReactiveJwtDecoder decoder =
        new JwtDecoderConfig()
            .jwtDecoder(
                EntraJwtSupport.DEFAULT_ISSUER,
                EntraJwtSupport.DEFAULT_AUDIENCE,
                "entra",
                EntraJwtSupport.DEFAULT_DEV_SECRET,
                "");
    assertThrows(JwtException.class, () -> decoder.decode(hs256()).block());
  }

  @Test
  void entraUsableIssuerBuildsWithoutNetwork() {
    ReactiveJwtDecoder decoder =
        new JwtDecoderConfig()
            .jwtDecoder(
                "https://login.microsoftonline.com/11111111-1111-1111-1111-111111111111/v2.0",
                EntraJwtSupport.DEFAULT_AUDIENCE,
                "entra",
                EntraJwtSupport.DEFAULT_DEV_SECRET,
                "");
    assertTrue(decoder != null);
  }

  @Test
  void devModeAcceptsHs256Token() {
    ReactiveJwtDecoder decoder =
        new JwtDecoderConfig()
            .jwtDecoder(
                "https://login.microsoftonline.com/test-tenant/v2.0",
                EntraJwtSupport.DEFAULT_AUDIENCE,
                "dev",
                EntraJwtSupport.DEFAULT_DEV_SECRET,
                "");
    Jwt jwt = decoder.decode(hs256()).block();
    assertEquals("00000000-0000-0000-0000-000000000001", jwt.getClaimAsString("oid"));
    assertEquals("Platform.Admin", JwtRoleMapper.mapRole(jwt));
  }

  private static String hs256() {
    try {
      Instant now = Instant.now();
      JWTClaimsSet claims =
          new JWTClaimsSet.Builder()
              .issuer("https://login.microsoftonline.com/test-tenant/v2.0")
              .audience(EntraJwtSupport.DEFAULT_AUDIENCE)
              .subject("00000000-0000-0000-0000-000000000001")
              .issueTime(Date.from(now))
              .expirationTime(Date.from(now.plusSeconds(3600)))
              .claim("oid", "00000000-0000-0000-0000-000000000001")
              .claim("tid", "test-tenant")
              .claim("roles", List.of("Platform.Admin"))
              .build();
      byte[] raw = EntraJwtSupport.DEFAULT_DEV_SECRET.getBytes(StandardCharsets.UTF_8);
      byte[] key = raw.length >= 32 ? raw : java.util.Arrays.copyOf(raw, 32);
      SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
      jwt.sign(new MACSigner(key));
      return jwt.serialize();
    } catch (JOSEException ex) {
      throw new IllegalStateException(ex);
    }
  }
}
