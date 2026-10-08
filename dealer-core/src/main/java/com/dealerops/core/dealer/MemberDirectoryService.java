package com.dealerops.core.dealer;

import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.dealer.dto.MemberOption;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Staff-readable list of the caller dealership's active members (lead owners, work-order assignees). */
@Service
public class MemberDirectoryService {

  private final MembershipRepository membershipRepository;
  private final AppUserRepository appUserRepository;

  public MemberDirectoryService(
      MembershipRepository membershipRepository, AppUserRepository appUserRepository) {
    this.membershipRepository = membershipRepository;
    this.appUserRepository = appUserRepository;
  }

  @Transactional(readOnly = true)
  public List<MemberOption> activeMembers() {
    TenantGuard.requireDealerUser();
    Long tenant = TenantContext.get().tenantDealerId();
    return membershipRepository.findByDealerIdAndActiveTrueOrderByUsernameAsc(tenant).stream()
        .map(
            m ->
                new MemberOption(
                    m.getUsername(),
                    appUserRepository
                        .findByUsername(m.getUsername())
                        .map(AppUserEntity::getDisplayName)
                        .orElse(m.getUsername())))
        .toList();
  }
}
