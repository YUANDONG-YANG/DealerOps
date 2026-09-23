package com.dealerops.core.common.tenant;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Re-binds {@code tenantFilter} on repository access. Needed when a transaction was opened before
 * {@link TenantContext} was set (for example {@code @Transactional} tests joining the outer TX).
 */
@Aspect
@Component
public class TenantHibernateFilterAspect {

  @PersistenceContext private EntityManager entityManager;

  @Before("execution(* com.dealerops.core..*Repository.*(..))")
  public void enableTenantFilter() {
    if (!TransactionSynchronizationManager.isActualTransactionActive()) {
      return;
    }
    TenantHibernateFilterBinder.bindIfDealerTenant(entityManager);
  }
}
