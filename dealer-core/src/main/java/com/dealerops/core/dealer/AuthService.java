package com.dealerops.core.dealer;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.dealer.dto.LoginRequest;
import com.dealerops.core.dealer.dto.LoginResponse;
import com.dealerops.core.security.JwtIssuer;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Admin-issued username/password sign-in (design/15-Data-Auth-and-Gateway.md S8). */
@Service
public class AuthService {

  private static final Logger log = LoggerFactory.getLogger(AuthService.class);

  private final AppUserRepository appUserRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtIssuer jwtIssuer;
  /** Checked when the username is unknown so both failure paths cost one BCrypt comparison. */
  private final String unknownUserHash;

  public AuthService(
      AppUserRepository appUserRepository, PasswordEncoder passwordEncoder, JwtIssuer jwtIssuer) {
    this.appUserRepository = appUserRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtIssuer = jwtIssuer;
    this.unknownUserHash = passwordEncoder.encode(UUID.randomUUID().toString());
  }

  @Transactional(readOnly = true)
  public LoginResponse login(LoginRequest request) {
    AppUserEntity user =
        appUserRepository
            .findByUsername(request.username().trim())
            .filter(AppUserEntity::isActive)
            .orElse(null);
    String hash = user != null ? user.getPasswordHash() : unknownUserHash;
    if (!passwordEncoder.matches(request.password(), hash) || user == null) {
      log.warn("Login failed for username '{}'", request.username().trim());
      throw new ApiException(ErrorCode.UNAUTHORIZED, "Invalid username or password");
    }
    log.info("Login succeeded for username '{}' (role={})", user.getUsername(), user.getRole());
    String token = jwtIssuer.issue(user);
    return new LoginResponse(token, user.getRole().getValue(), user.getDisplayName());
  }
}
