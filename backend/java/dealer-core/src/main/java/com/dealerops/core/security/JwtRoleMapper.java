package com.dealerops.core.security;

import com.dealerops.core.dealer.AppRole;
import java.util.Collection;
import java.util.List;
import org.springframework.security.oauth2.jwt.Jwt;

public final class JwtRoleMapper {

  private JwtRoleMapper() {}

  public static AppRole mapRole(Jwt jwt) {
    Collection<String> roles = jwt.getClaimAsStringList("roles");
    if (roles == null) {
      roles = List.of();
    }
    if (roles.contains("Platform.Admin")) {
      return AppRole.PLATFORM_ADMIN;
    }
    if (roles.contains("Dealer.User")) {
      return AppRole.DEALER_USER;
    }
    return null;
  }
}
