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
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MembershipService {

  private final DealerRepository dealerRepository;
  private final MembershipRepository membershipRepository;
  private final AppUserRepository appUserRepository;
  private final AuditService auditService;

  public MembershipService(
      DealerRepository dealerRepository,
      MembershipRepository membershipRepository,
      AppUserRepository appUserRepository,
      AuditService auditService) {
    this.dealerRepository = dealerRepository;
    this.membershipRepository = membershipRepository;
    this.appUserRepository = appUserRepository;
    this.auditService = auditService;
  }

  @Transactional(readOnly = true)
  public PageResponse<MemberResponse> list(Long dealerId, String q, int page, int size) {
    TenantGuard.requireAdmin();
    requireDealer(dealerId);
    String tid = currentTid();
    List<MemberResponse> items =
        membershipRepository.findByDealerId(dealerId, Pageable.unpaged()).getContent().stream()
            .sorted(Comparator.comparing(MembershipEntity::getEntraOid))
            .map(row -> toResponse(row, lookupUser(tid, row.getEntraOid())))
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
    String oid = body.entraOid().trim();
    List<MembershipEntity> active = membershipRepository.findByEntraOidAndActiveTrue(oid);
    if (active.stream().anyMatch(row -> dealerId.equals(row.getDealerId()))) {
      throw new ApiException(ErrorCode.DUP_MEMBER, "Membership already exists");
    }
    if (active.stream().anyMatch(row -> !dealerId.equals(row.getDealerId()))) {
      throw new ApiException(ErrorCode.DUP_MEMBER, "Membership already exists");
    }
    MembershipEntity membership =
        membershipRepository.findByDealerIdAndEntraOid(dealerId, oid).orElseGet(MembershipEntity::new);
    membership.setDealerId(dealerId);
    membership.setEntraOid(oid);
    membership.setActive(true);
    membership.setCreatedBy(actorOid());
    membership = membershipRepository.save(membership);
    AppUserEntity user = upsertStaffUser(oid, body.displayName().trim(), dealerId);
    auditService.record(
        EntityType.MEMBERSHIP.name(),
        membership.getId(),
        AuditAction.CREATE.name(),
        dealerId,
        actorOid(),
        Map.of("entraOid", oid));
    return toResponse(membership, user);
  }

  @Transactional
  public void remove(Long dealerId, String entraOid) {
    TenantGuard.requireAdmin();
    requireDealer(dealerId);
    MembershipEntity membership =
        membershipRepository
            .findByDealerIdAndEntraOid(dealerId, entraOid)
            .filter(MembershipEntity::isActive)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    membership.setActive(false);
    membershipRepository.save(membership);
    lookupUser(currentTid(), entraOid)
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
        actorOid(),
        Map.of("entraOid", entraOid, "unbound", true));
  }

  private AppUserEntity upsertStaffUser(String oid, String displayName, Long dealerId) {
    String tid = currentTid();
    AppUserEntity user =
        appUserRepository.findByEntraTenantIdAndEntraOid(tid, oid).orElseGet(AppUserEntity::new);
    user.setEntraTenantId(tid);
    user.setEntraOid(oid);
    user.setDisplayName(displayName);
    user.setRole(AppRole.DEALER_USER);
    user.setDealerId(dealerId);
    user.setActive(true);
    return appUserRepository.save(user);
  }

  private java.util.Optional<AppUserEntity> lookupUser(String tid, String oid) {
    return appUserRepository.findByEntraTenantIdAndEntraOid(tid, oid);
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
    String oid = item.entraOid() == null ? "" : item.entraOid().toLowerCase(Locale.ROOT);
    return name.contains(needle) || oid.contains(needle);
  }

  private static MemberResponse toResponse(MembershipEntity row, java.util.Optional<AppUserEntity> user) {
    return toResponse(row, user.orElse(null));
  }

  private static MemberResponse toResponse(MembershipEntity row, AppUserEntity user) {
    String displayName = user == null ? "" : user.getDisplayName();
    return new MemberResponse(row.getEntraOid(), displayName, AppRole.DEALER_USER.getValue(), row.isActive());
  }

  private static String currentTid() {
    CurrentUser user = TenantContext.get();
    return user == null || user.tid() == null ? "" : user.tid();
  }

  private static String actorOid() {
    CurrentUser user = TenantContext.get();
    return user == null ? "" : user.oid();
  }
}
