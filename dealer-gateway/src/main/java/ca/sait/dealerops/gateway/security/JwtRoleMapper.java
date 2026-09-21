package ca.sait.dealerops.gateway.security;

import java.util.Collection;
import java.util.List;
import org.springframework.security.oauth2.jwt.Jwt;

public final class JwtRoleMapper {

  private JwtRoleMapper() {}

  /** Admin 赢。无法映射时返回 null（/api/v1 须 401）。 */
  public static String mapRole(Jwt jwt) {
    Collection<String> roles = jwt.getClaimAsStringList("roles");
    if (roles == null) {
      roles = List.of();
    }
    if (roles.contains("Platform.Admin")) {
      return "Platform.Admin";
    }
    if (roles.contains("Dealer.User")) {
      return "Dealer.User";
    }
    return null;
  }
}
