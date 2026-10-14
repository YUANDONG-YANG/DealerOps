package com.dealerops.core.dealer;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.audit.AuditAction;
import com.dealerops.core.audit.AuditService;
import com.dealerops.core.audit.EntityType;
import com.dealerops.core.dealer.dto.LoginRequest;
import com.dealerops.core.dealer.dto.LoginResponse;
import com.dealerops.core.dealer.dto.RegisterRequest;
import com.dealerops.core.security.JwtIssuer;
import java.util.Map;
import java.util.UUID;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Password sign-in with email, username, or phone, and self sign-up (design/21-Feature-Extensions.md §5). */
@Service
public class AuthService {

  private final AppUserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final JwtIssuer jwtIssuer;
  private final AuditService auditService;
  private final NewAccountRules accountRules;
  private final String unknownUserHash;

  public AuthService(
      AppUserRepository users, PasswordEncoder passwordEncoder, JwtIssuer jwtIssuer, AuditService auditService,
      NewAccountRules accountRules) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.jwtIssuer = jwtIssuer;
    this.auditService = auditService;
    this.accountRules = accountRules;
    this.unknownUserHash = passwordEncoder.encode(UUID.randomUUID().toString());
  }

  @Transactional(readOnly = true)
  public LoginResponse login(LoginRequest request) {
    AppUserEntity user = findForSignIn(request.identifier().trim());
    boolean hasPassword = user != null && !user.getPasswordHash().isEmpty();
    String passwordHash = hasPassword ? user.getPasswordHash() : unknownUserHash;
    if (!passwordEncoder.matches(request.password(), passwordHash) || !hasPassword) {
      throw new ApiException(ErrorCode.UNAUTHORIZED, "Invalid sign-in name or password");
    }
    return new LoginResponse(jwtIssuer.issue(user), user.getRole().getValue(), user.getDisplayName());
  }

  @Transactional
  public LoginResponse register(RegisterRequest request) {
    NewAccountRules.Contact contact = accountRules.contact(request.email(), request.phone());
    String username = request.username().trim();
    String displayName = request.displayName().trim();
    accountRules.requireAvailable(username, displayName, contact);
    AppUserEntity user = new AppUserEntity();
    user.setUsername(username);
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setDisplayName(displayName);
    user.setEmail(contact.email());
    user.setPhone(contact.phone());
    user.setRole(AppRole.DEALER_USER);
    user.setDealerId(null);
    user.setActive(true);
    try {
      user = users.saveAndFlush(user);
    } catch (DataIntegrityViolationException ex) {
      throw accountRules.conflict(ex);
    }
    auditService.record(EntityType.APP_USER.name(), user.getId(), AuditAction.CREATE.name(), null,
        user.getUsername(), Map.of("registration", "password"));
    return new LoginResponse(jwtIssuer.issue(user), user.getRole().getValue(), user.getDisplayName());
  }

  /**
   * An identifier with "@" is an email. Otherwise the username wins; a phone lookup follows only
   * when no active account has that username and the value is a valid phone number (usernames
   * always contain a letter, so the two cannot clash for self sign-ups).
   */
  private AppUserEntity findForSignIn(String identifier) {
    if (identifier.contains("@")) {
      return users.findByEmailIgnoreCaseAndActiveTrue(identifier.toLowerCase(Locale.ROOT)).orElse(null);
    }
    AppUserEntity byUsername = users.findByUsername(identifier).filter(AppUserEntity::isActive).orElse(null);
    if (byUsername != null) {
      return byUsername;
    }
    String phone = LoginIdentifiers.phoneOrNull(identifier);
    return phone == null ? null : users.findByPhoneAndActiveTrue(phone).orElse(null);
  }
}
