package com.dealerops.core.common.tenant;

/** Hibernate filter name/params for tenant-owned business tables. */
public final class TenantFilters {

  public static final String NAME = "tenantFilter";
  public static final String PARAM = "tenantDealerId";
  public static final String CONDITION = "dealer_id = :tenantDealerId";

  private TenantFilters() {}
}
