package com.dealerops.core.common.tenant;

import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.security.CurrentUser;
import jakarta.persistence.EntityManager;
import org.hibernate.Session;

/**
 * Enables Hibernate {@code tenantFilter} for dealer-user sessions. Admin and null-tenant requests
 * leave the filter off (business APIs must still 403 before repository access).
 */
public final class TenantHibernateFilterBinder {

  private TenantHibernateFilterBinder() {}

  public static void bindIfDealerTenant(EntityManager entityManager) {
    if (entityManager == null) {
      return;
    }
    Session session = entityManager.unwrap(Session.class);
    CurrentUser user = TenantContext.get();
    if (user == null || user.role() != AppRole.DEALER_USER || user.tenantDealerId() == null) {
      // Joined/test transactions may have enabled the filter earlier; turn it off for admin/identity.
      session.disableFilter(TenantFilters.NAME);
      return;
    }
    session
        .enableFilter(TenantFilters.NAME)
        .setParameter(TenantFilters.PARAM, user.tenantDealerId());
  }
}
