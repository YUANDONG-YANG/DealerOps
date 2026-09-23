package com.dealerops.core.common.tenant;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.security.CurrentUser;
import jakarta.persistence.EntityManager;
import org.hibernate.Filter;
import org.hibernate.Session;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class TenantHibernateFilterBinderTest {

  @AfterEach
  void clearTenant() {
    TenantContext.clear();
  }

  @Test
  void dealerUserEnablesFilterWithTenantDealerId() {
    TenantContext.set(new CurrentUser("oid", "tid", AppRole.DEALER_USER, 11L));
    EntityManager em = mock(EntityManager.class);
    Session session = mock(Session.class);
    Filter filter = mock(Filter.class);
    when(em.unwrap(Session.class)).thenReturn(session);
    when(session.enableFilter(TenantFilters.NAME)).thenReturn(filter);
    when(filter.setParameter(eq(TenantFilters.PARAM), eq(11L))).thenReturn(filter);

    TenantHibernateFilterBinder.bindIfDealerTenant(em);

    verify(session).enableFilter(TenantFilters.NAME);
    verify(filter).setParameter(TenantFilters.PARAM, 11L);
    verify(session, never()).disableFilter(TenantFilters.NAME);
  }

  @Test
  void adminDisablesFilter() {
    TenantContext.set(new CurrentUser("oid", "tid", AppRole.PLATFORM_ADMIN, null));
    EntityManager em = mock(EntityManager.class);
    Session session = mock(Session.class);
    when(em.unwrap(Session.class)).thenReturn(session);

    TenantHibernateFilterBinder.bindIfDealerTenant(em);

    verify(session).disableFilter(TenantFilters.NAME);
    verify(session, never()).enableFilter(TenantFilters.NAME);
  }

  @Test
  void nullTenantDisablesFilter() {
    EntityManager em = mock(EntityManager.class);
    Session session = mock(Session.class);
    when(em.unwrap(Session.class)).thenReturn(session);

    TenantHibernateFilterBinder.bindIfDealerTenant(em);

    verify(session).disableFilter(TenantFilters.NAME);
    verify(session, never()).enableFilter(TenantFilters.NAME);
  }
}
