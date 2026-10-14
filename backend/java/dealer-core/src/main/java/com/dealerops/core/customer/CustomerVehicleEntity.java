package com.dealerops.core.customer;

import com.dealerops.core.common.tenant.TenantDealerListener;
import com.dealerops.core.common.tenant.TenantFilters;
import com.dealerops.core.common.tenant.TenantOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

@Entity
@Table(
    name = "customer_vehicle",
    uniqueConstraints = @UniqueConstraint(name = "uk_cv_vehicle", columnNames = "vehicle_id"))
@Filter(name = TenantFilters.NAME, condition = TenantFilters.CONDITION)
@EntityListeners(TenantDealerListener.class)
public class CustomerVehicleEntity implements TenantOwned {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "dealer_id", nullable = false)
  private Long dealerId;

  @Column(name = "customer_id", nullable = false)
  private Long customerId;

  @Column(name = "vehicle_id", nullable = false)
  private Long vehicleId;

  @CreationTimestamp
  @Column(name = "linked_at", nullable = false, updatable = false)
  private Instant linkedAt;

  public Long getId() {
    return id;
  }

  public Long getDealerId() {
    return dealerId;
  }

  public void setDealerId(Long dealerId) {
    this.dealerId = dealerId;
  }

  public Long getCustomerId() {
    return customerId;
  }

  public void setCustomerId(Long customerId) {
    this.customerId = customerId;
  }

  public Long getVehicleId() {
    return vehicleId;
  }

  public void setVehicleId(Long vehicleId) {
    this.vehicleId = vehicleId;
  }

  public Instant getLinkedAt() {
    return linkedAt;
  }
}
