package com.dealerops.core.dealer;

import com.dealerops.core.audit.AuditAction;
import com.dealerops.core.audit.AuditService;
import com.dealerops.core.audit.EntityType;
import com.dealerops.core.common.PageResponse;
import com.dealerops.core.common.Paging;
import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.dealer.dto.CreateMemberRequest;
import com.dealerops.core.dealer.dto.MemberResponse;
import com.dealerops.core.dealer.dto.PendingUserResponse;
import com.dealerops.core.security.CurrentUser;
import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MembershipService {

  private final DealerRepository dealerRepository;
  private final MembershipRepository membershipRepository;
  private final AppUserRepository appUserRepository;
  private final NewAccountRules accountRules;
  private final AuditService auditService;
  private final PasswordEncoder passwordEncoder;

  public MembershipService(
      DealerRepository dealerRepository,
      MembershipRepository membershipRepository,
      AppUserRepository appUserRepository,
      AuditService auditService,
      PasswordEncoder passwordEncoder,
      NewAccountRules accountRules) {
    this.dealerRepository = dealerRepository;
    this.membershipRepository = membershipRepository;
    this.appUserRepository = appUserRepository;
    this.accountRules = accountRules;
    this.auditService = auditService;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional(readOnly = true)
  public PageResponse<MemberResponse> list(Long dealerId, String q, int page, int size) {
    TenantGuard.requireAdmin();
    requireDealer(dealerId);
    List<MemberResponse> items =
        membershipRepository.findByDealerId(dealerId, Pageable.unpaged()).getContent().stream()
            .sorted(Comparator.comparing(MembershipEntity::getUsername))
            .map(row -> toResponse(row, appUserRepository.findByUsername(row.getUsername())))
            .filter(item -> matches(item, q))
            .toList();
    int p = Paging.page(page);
    int s = Paging.size(size);
    int from = Math.min(p * s, items.size());
    int to = Math.min(from + s, items.size());
    return new PageResponse<>(items.subList(from, to), p, s, items.size());
  }

  @Transactional
  public MemberResponse add(Long dealerId, CreateMemberRequest body) {
    TenantGuard.requireAdmin();
    requireDealer(dealerId);
    String username = body.username().trim();
    // Row lock serializes concurrent binds of the same existing account, so the
    // one-active-membership check below cannot be raced into two active rows.
    Optional<AppUserEntity> existing = appUserRepository.findWithLockByUsername(username);
    if (existing.filter(user -> user.getRole() == AppRole.PLATFORM_ADMIN).isPresent()) {
      throw new ApiException(ErrorCode.DUP_MEMBER, "Username belongs to a platform admin");
    }
    if (!membershipRepository.findByUsernameAndActiveTrue(username).isEmpty()) {
      throw new ApiException(ErrorCode.DUP_MEMBER, "Membership already exists");
    }
    NewAccountRules.Contact contact = null;
    if (existing.isEmpty()) {
      requireNewUserFields(body);
      contact = accountRules.contact(body.email(), body.phone());
      accountRules.requireAvailable(username, body.displayName().trim(), contact);
    }
    NewAccountRules.Contact newContact = contact;
    MembershipEntity membership =
        membershipRepository.findByDealerIdAndUsername(dealerId, username).orElseGet(MembershipEntity::new);
    membership.setDealerId(dealerId);
    membership.setUsername(username);
    membership.setActive(true);
    membership.setCreatedBy(actorUsername());
    membership = membershipRepository.save(membership);
    // An existing account keeps its own password and display name; only a new one takes them here.
    AppUserEntity user = existing.orElseGet(() -> newUser(username, body, newContact));
    user.setRole(AppRole.DEALER_USER);
    user.setDealerId(dealerId);
    user.setActive(true);
    try {
      user = existing.isEmpty() ? appUserRepository.saveAndFlush(user) : appUserRepository.save(user);
    } catch (DataIntegrityViolationException ex) {
      throw accountRules.conflict(ex);
    }
    auditService.record(
        EntityType.MEMBERSHIP.name(),
        membership.getId(),
        AuditAction.CREATE.name(),
        dealerId,
        actorUsername(),
        Map.of("username", username));
    return toResponse(membership, user);
  }

  @Transactional
  public void remove(Long dealerId, String username) {
    TenantGuard.requireAdmin();
    requireDealer(dealerId);
    MembershipEntity membership =
        membershipRepository
            .findByDealerIdAndUsername(dealerId, username)
            .filter(MembershipEntity::isActive)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    membership.setActive(false);
    membershipRepository.save(membership);
    appUserRepository
        .findByUsername(username)
        .ifPresent(
            user -> {
              user.setDealerId(null);
              appUserRepository.save(user);
            });
    auditService.record(
        EntityType.MEMBERSHIP.name(),
        membership.getId(),
        AuditAction.UPDATE.name(),
        dealerId,
        actorUsername(),
        Map.of("username", username, "unbound", true));
  }

  /** Dealer.User accounts with no active membership, newest first (self sign-ups and unbound staff). */
  @Transactional(readOnly = true)
  public PageResponse<PendingUserResponse> pending(String q, int page, int size) {
    TenantGuard.requireAdmin();
    String query = isBlank(q) ? null : q.trim();
    Page<AppUserEntity> result =
        appUserRepository.findPending(
            AppRole.DEALER_USER, query, Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    return new PageResponse<>(
        result.getContent().stream()
            .map(u -> new PendingUserResponse(u.getUsername(), u.getDisplayName(), u.getEmail(), u.getPhone(), u.getCreatedAt()))
            .toList(),
        result.getNumber(),
        result.getSize(),
        result.getTotalElements());
  }

  private static void requireNewUserFields(CreateMemberRequest body) {
    Map<String, String> missing = new LinkedHashMap<>();
    if (isBlank(body.displayName())) {
      missing.put("displayName", "Full name is required for a new user.");
    }
    if (isBlank(body.password())) {
      missing.put("password", "Password is required for a new user.");
    }
    if (!missing.isEmpty()) {
      throw new ApiException(ErrorCode.VALIDATION, missing.values().iterator().next(), missing);
    }
  }

  private AppUserEntity newUser(String username, CreateMemberRequest body, NewAccountRules.Contact contact) {
    AppUserEntity user = new AppUserEntity();
    user.setUsername(username);
    user.setPasswordHash(passwordEncoder.encode(body.password()));
    user.setDisplayName(body.displayName().trim());
    user.setEmail(contact.email());
    user.setPhone(contact.phone());
    return user;
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private void requireDealer(Long dealerId) {
    if (!dealerRepository.existsById(dealerId)) {
      throw new ApiException(ErrorCode.NOT_FOUND, "Not found");
    }
  }

  private static boolean matches(MemberResponse item, String q) {
    if (q == null || q.isBlank()) {
      return true;
    }
    String needle = q.trim().toLowerCase(Locale.ROOT);
    String name = item.displayName() == null ? "" : item.displayName().toLowerCase(Locale.ROOT);
    String username = item.username() == null ? "" : item.username().toLowerCase(Locale.ROOT);
    return name.contains(needle) || username.contains(needle);
  }

  private static MemberResponse toResponse(MembershipEntity row, Optional<AppUserEntity> user) {
    return toResponse(row, user.orElse(null));
  }

  private static MemberResponse toResponse(MembershipEntity row, AppUserEntity user) {
    String displayName = user == null ? "" : user.getDisplayName();
    return new MemberResponse(row.getUsername(), displayName, AppRole.DEALER_USER.getValue(), row.isActive());
  }

  private static String actorUsername() {
    CurrentUser user = TenantContext.get();
    return user == null ? "" : user.username();
  }
}
