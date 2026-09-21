package com.dealerops.core.security;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.dealer.AppUserEntity;
import com.dealerops.core.dealer.AppUserRepository;
import com.dealerops.core.dealer.DealerEntity;
import com.dealerops.core.dealer.DealerRepository;
import com.dealerops.core.security.dto.MeResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MeService {

  private final AppUserRepository appUserRepository;
  private final DealerRepository dealerRepository;

  public MeService(AppUserRepository appUserRepository, DealerRepository dealerRepository) {
    this.appUserRepository = appUserRepository;
    this.dealerRepository = dealerRepository;
  }

  @Transactional
  public MeResponse me(CurrentUser user) {
    if (user == null || user.oid() == null) {
      throw new ApiException(ErrorCode.UNAUTHORIZED, "Unauthorized");
    }
    AppUserEntity appUser =
        appUserRepository.findByEntraTenantIdAndEntraOid(user.tid(), user.oid()).orElse(null);
    String displayName = appUser != null ? appUser.getDisplayName() : "";
    if (user.role() == AppRole.PLATFORM_ADMIN) {
      return new MeResponse(user.oid(), displayName, AppRole.PLATFORM_ADMIN.getValue(), null, null);
    }
    String roleJson = user.role() == AppRole.DEALER_USER ? AppRole.DEALER_USER.getValue() : null;
    Long dealerId = user.tenantDealerId();
    String legalName = null;
    if (dealerId != null) {
      legalName = dealerRepository.findById(dealerId).map(DealerEntity::getLegalName).orElse(null);
      if (appUser != null && !dealerId.equals(appUser.getDealerId())) {
        appUser.setDealerId(dealerId);
        appUserRepository.save(appUser);
      }
    }
    return new MeResponse(user.oid(), displayName, roleJson, dealerId, legalName);
  }
}
