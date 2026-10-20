package com.dealerops.core.lead;

import com.dealerops.core.common.tenant.TenantDealerListener;
import com.dealerops.core.common.tenant.TenantFilters;
import com.dealerops.core.common.tenant.TenantOwned;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "sales_lead")
@Filter(name = TenantFilters.NAME, condition = TenantFilters.CONDITION)
@EntityListeners(TenantDealerListener.class)
public class LeadEntity implements TenantOwned {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "dealer_id", nullable = false)
  private Long dealerId;

  @Column(name = "customer_id", nullable = false)
  private Long customerId;

  @Column(name = "vehicle_id")
  private Long vehicleId;

  @Column(name = "owner_username", length = 64)
  private String ownerUsername;

  @Enumerated(EnumType.STRING)
  @Column(name = "stage", nullable = false, length = 16)
  private LeadStage stage;

  @Column(name = "next_follow_up_on")
  private LocalDate nextFollowUpOn;

  @Column(name = "lost_reason", length = 300)
  private String lostReason;

  @Version
  @Column(name = "version", nullable = false)
  private int version;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt;

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

  public String getOwnerUsername() {
    return ownerUsername;
  }

  public void setOwnerUsername(String ownerUsername) {
    this.ownerUsername = ownerUsername;
  }

  public LeadStage getStage() {
    return stage;
  }

  public void setStage(LeadStage stage) {
    this.stage = stage;
  }

  public LocalDate getNextFollowUpOn() {
    return nextFollowUpOn;
  }

  public void setNextFollowUpOn(LocalDate nextFollowUpOn) {
    this.nextFollowUpOn = nextFollowUpOn;
  }

  public String getLostReason() {
    return lostReason;
  }

  public void setLostReason(String lostReason) {
    this.lostReason = lostReason;
  }

  public int getVersion() {
    return version;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
