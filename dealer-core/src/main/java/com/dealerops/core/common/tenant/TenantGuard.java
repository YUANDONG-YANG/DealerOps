package com.dealerops.core.common.tenant;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.security.CurrentUser;

public final class TenantGuard {

  private TenantGuard() {}

  public static void requireDealerUser() {
    CurrentUser user = TenantContext.get();
    if (user == null || user.role() != AppRole.DEALER_USER || user.tenantDealerId() == null) {
      throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
    }
  }

  public static void requireBusinessAccess() {
    CurrentUser user = TenantContext.get();
    if (user == null
        || (user.role() != AppRole.PLATFORM_ADMIN
            && (user.role() != AppRole.DEALER_USER || user.tenantDealerId() == null))) {
      throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
    }
  }

  public static void requireAdmin() {
    CurrentUser user = TenantContext.get();
    if (user == null || user.role() != AppRole.PLATFORM_ADMIN) {
      throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
    }
  }

  public static void assertSameDealer(Long resourceDealerId) {
    CurrentUser user = TenantContext.get();
    Long tenantDealerId = user == null ? null : user.tenantDealerId();
    if (resourceDealerId == null || !resourceDealerId.equals(tenantDealerId)) {
      throw new ApiException(ErrorCode.NOT_FOUND, "Not found");
    }
  }
}
