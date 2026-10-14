package com.dealerops.core.common.tenant;

import jakarta.persistence.EntityManagerFactory;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Binds {@code tenantFilter} when a JPA session begins. Servlet filters run before any session
 * exists ({@code spring.jpa.open-in-view=false}), so this hook is the reliable enable point.
 */
public class TenantAwareJpaTransactionManager extends JpaTransactionManager {

  public TenantAwareJpaTransactionManager(EntityManagerFactory emf) {
    super(emf);
  }

  @Override
  protected void doBegin(Object transaction, TransactionDefinition definition) {
    super.doBegin(transaction, definition);
    EntityManagerHolder holder =
        (EntityManagerHolder) TransactionSynchronizationManager.getResource(obtainEntityManagerFactory());
    if (holder != null) {
      TenantHibernateFilterBinder.bindIfDealerTenant(holder.getEntityManager());
    }
  }
}
