package com.dealerops.core.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.dealerops.core.config.JwtDecoderConfig;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;

class EntraJwtSupportTest {

  @Test
  void placeholderIssuerDoesNotEnableJwks() {
    assertFalse(EntraJwtSupport.isUsableIssuer(EntraJwtSupport.DEFAULT_ISSUER));
    assertFalse(EntraJwtSupport.useEntraJwks("entra", EntraJwtSupport.DEFAULT_ISSUER));
    assertFalse(EntraJwtSupport.useEntraJwks("entra", ""));
    assertTrue(EntraJwtSupport.useEntraJwks("entra", "https://login.microsoftonline.com/abc/v2.0"));
    assertFalse(EntraJwtSupport.useEntraJwks("dev", "https://login.microsoftonline.com/abc/v2.0"));
  }

  @Test
  void jwksUriDerivesFromEntraV2Issuer() {
    assertEquals(
        "https://login.microsoftonline.com/abc/discovery/v2.0/keys",
        EntraJwtSupport.jwksUri("https://login.microsoftonline.com/abc/v2.0", ""));
    assertEquals(
        "https://example.test/keys",
        EntraJwtSupport.jwksUri("https://login.microsoftonline.com/abc/v2.0", "https://example.test/keys"));
  }

  @Test
  void entraPlaceholderDecoderDoesNotFetchJwks() {
    JwtDecoder decoder =
        new JwtDecoderConfig()
            .jwtDecoder(
                EntraJwtSupport.DEFAULT_ISSUER,
                EntraJwtSupport.DEFAULT_AUDIENCE,
                "entra",
                EntraJwtSupport.DEFAULT_DEV_SECRET,
                "");
    assertThrows(JwtException.class, () -> decoder.decode(TestTokens.admin()));
  }

  @Test
  void entraUsableIssuerBuildsWithoutNetwork() {
    JwtDecoder decoder =
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
  void devModeAcceptsHs256TestToken() {
    JwtDecoder decoder =
        new JwtDecoderConfig()
            .jwtDecoder(
                TestTokens.ISSUER,
                TestTokens.AUDIENCE,
                "dev",
                TestTokens.DEV_SECRET,
                "");
    Jwt jwt = decoder.decode(TestTokens.admin());
    assertEquals(TestTokens.ADMIN_OID, jwt.getClaimAsString("oid"));
    assertEquals("Platform.Admin", jwt.getClaimAsStringList("roles").get(0));
  }
}
