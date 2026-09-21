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
import com.dealerops.core.dealer.dto.CreateDealerRequest;
import com.dealerops.core.dealer.dto.DealerResponse;
import com.dealerops.core.dealer.dto.PatchDealerRequest;
import com.dealerops.core.security.CurrentUser;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DealerAdminService {

  private final DealerRepository dealerRepository;
  private final MembershipRepository membershipRepository;
  private final AuditService auditService;

  public DealerAdminService(
      DealerRepository dealerRepository,
      MembershipRepository membershipRepository,
      AuditService auditService) {
    this.dealerRepository = dealerRepository;
    this.membershipRepository = membershipRepository;
    this.auditService = auditService;
  }

  @Transactional(readOnly = true)
  public PageResponse<DealerResponse> list(String q, int page, int size) {
    TenantGuard.requireAdmin();
    Pageable pageable = Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<DealerEntity> result =
        q == null || q.isBlank()
            ? dealerRepository.findAll(pageable)
            : dealerRepository.findByLegalNameContainingIgnoreCase(q.trim(), pageable);
    return new PageResponse<>(
        result.map(this::toResponse).getContent(),
        result.getNumber(),
        result.getSize(),
        result.getTotalElements());
  }

  @Transactional
  public DealerResponse create(CreateDealerRequest body) {
    TenantGuard.requireAdmin();
    DealerEntity dealer = new DealerEntity();
    dealer.setLegalName(body.legalName());
    dealer.setContactPhone(body.contactPhone());
    dealer.setContactEmail(body.contactEmail());
    dealer.setContactAddress(body.contactAddress());
    dealer.setActive(true);
    dealer = dealerRepository.save(dealer);
    auditService.record(
        EntityType.DEALER.name(),
        dealer.getId(),
        AuditAction.CREATE.name(),
        dealer.getId(),
        actorOid(),
        Map.of("legalNameChanged", true));
    return toResponse(dealer);
  }

  @Transactional(readOnly = true)
  public DealerResponse get(Long id) {
    TenantGuard.requireAdmin();
    return toResponse(load(id));
  }

  @Transactional
  public DealerResponse patch(Long id, PatchDealerRequest body) {
    TenantGuard.requireAdmin();
    DealerEntity dealer = load(id);
    if (!body.version().equals(dealer.getVersion())) {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }
    dealer.setLegalName(body.legalName());
    dealer.setContactPhone(body.contactPhone());
    dealer.setContactEmail(body.contactEmail());
    dealer.setContactAddress(body.contactAddress());
    dealer.setActive(body.active());
    dealer = dealerRepository.save(dealer);
    auditService.record(
        EntityType.DEALER.name(),
        dealer.getId(),
        AuditAction.UPDATE.name(),
        dealer.getId(),
        actorOid(),
        Map.of("contactFieldsChanged", true));
    return toResponse(dealer);
  }

  private DealerEntity load(Long id) {
    return dealerRepository
        .findById(id)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
  }

  private DealerResponse toResponse(DealerEntity dealer) {
    long staffCount = membershipRepository.countByDealerIdAndActiveTrue(dealer.getId());
    return new DealerResponse(
        dealer.getId(),
        dealer.getLegalName(),
        dealer.getContactPhone(),
        dealer.getContactEmail(),
        dealer.getContactAddress(),
        dealer.isActive(),
        staffCount,
        dealer.getVersion());
  }

  private static String actorOid() {
    CurrentUser user = TenantContext.get();
    return user == null ? "" : user.oid();
  }
}
