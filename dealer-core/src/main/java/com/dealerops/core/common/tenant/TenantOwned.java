package com.dealerops.core.common.tenant;

/** Marker for rows scoped by dealership {@code dealer_id}. */
public interface TenantOwned {

  Long getDealerId();

  void setDealerId(Long dealerId);
}
