package com.dealerops.core.common.tenant;

import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.security.CurrentUser;
import jakarta.persistence.PrePersist;

/**
 * On insert, dealer users always get {@code dealer_id} from {@link TenantContext}. Client-supplied
 * values are overwritten. Admin / no-tenant requests are left unchanged.
 */
public class TenantDealerListener {

  @PrePersist
  public void assignDealerId(Object entity) {
    if (!(entity instanceof TenantOwned owned)) {
      return;
    }
    CurrentUser user = TenantContext.get();
    if (user == null || user.role() != AppRole.DEALER_USER || user.tenantDealerId() == null) {
      return;
    }
    owned.setDealerId(user.tenantDealerId());
  }
}
