package com.dealerops.core.dealer;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.dealer.dto.LoginRequest;
import com.dealerops.core.dealer.dto.LoginResponse;
import com.dealerops.core.security.JwtIssuer;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Admin-issued username/password sign-in (design/15-Data-Auth-and-Gateway.md S8). */
@Service
public class AuthService {

  private final AppUserRepository appUserRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtIssuer jwtIssuer;

  public AuthService(
      AppUserRepository appUserRepository, PasswordEncoder passwordEncoder, JwtIssuer jwtIssuer) {
    this.appUserRepository = appUserRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtIssuer = jwtIssuer;
  }

  @Transactional(readOnly = true)
  public LoginResponse login(LoginRequest request) {
    AppUserEntity user =
        appUserRepository
            .findByEntraTenantIdAndEntraOid(AppUserEntity.LOCAL_TENANT_ID, request.username().trim())
            .filter(AppUserEntity::isActive)
            .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED, "Invalid username or password"));
    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new ApiException(ErrorCode.UNAUTHORIZED, "Invalid username or password");
    }
    String token = jwtIssuer.issue(user);
    return new LoginResponse(token, user.getRole().getValue(), user.getDisplayName());
  }
}
