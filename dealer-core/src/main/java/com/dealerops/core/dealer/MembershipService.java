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
import com.dealerops.core.security.CurrentUser;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MembershipService {

  private final DealerRepository dealerRepository;
  private final MembershipRepository membershipRepository;
  private final AppUserRepository appUserRepository;
  private final AuditService auditService;
  private final PasswordEncoder passwordEncoder;

  public MembershipService(
      DealerRepository dealerRepository,
      MembershipRepository membershipRepository,
      AppUserRepository appUserRepository,
      AuditService auditService,
      PasswordEncoder passwordEncoder) {
    this.dealerRepository = dealerRepository;
    this.membershipRepository = membershipRepository;
    this.appUserRepository = appUserRepository;
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
    MembershipEntity membership =
        membershipRepository.findByDealerIdAndUsername(dealerId, username).orElseGet(MembershipEntity::new);
    membership.setDealerId(dealerId);
    membership.setUsername(username);
    membership.setActive(true);
    membership.setCreatedBy(actorUsername());
    membership = membershipRepository.save(membership);
    AppUserEntity user = existing.orElseGet(AppUserEntity::new);
    user.setUsername(username);
    user.setPasswordHash(passwordEncoder.encode(body.password()));
    user.setDisplayName(body.displayName().trim());
    user.setRole(AppRole.DEALER_USER);
    user.setDealerId(dealerId);
    user.setActive(true);
    user = appUserRepository.save(user);
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
