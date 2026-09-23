package com.dealerops.core.listing;

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
import jakarta.persistence.UniqueConstraint;
import jakarta.persistence.Version;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
    name = "listing",
    uniqueConstraints = @UniqueConstraint(name = "uk_listing_vehicle", columnNames = "vehicle_id"))
@Filter(name = TenantFilters.NAME, condition = TenantFilters.CONDITION)
@EntityListeners(TenantDealerListener.class)
public class ListingEntity implements TenantOwned {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "dealer_id", nullable = false)
  private Long dealerId;

  @Column(name = "vehicle_id", nullable = false)
  private Long vehicleId;

  @Column(name = "title", nullable = false, length = 200)
  private String title = "";

  @Column(name = "body", nullable = false, columnDefinition = "TEXT")
  private String body = "";

  @Enumerated(EnumType.STRING)
  @Column(name = "ad_kind", nullable = false, length = 16)
  private AdKind adKind;

  @Enumerated(EnumType.STRING)
  @Column(name = "medium", nullable = false, length = 32)
  private AdMedium medium;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 32)
  private ListingStatus status;

  @Column(name = "content_version", nullable = false)
  private int contentVersion = 1;

  @Column(name = "last_check_id")
  private Long lastCheckId;

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

  public Long getVehicleId() {
    return vehicleId;
  }

  public void setVehicleId(Long vehicleId) {
    this.vehicleId = vehicleId;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title == null ? "" : title;
  }

  public String getBody() {
    return body;
  }

  public void setBody(String body) {
    this.body = body == null ? "" : body;
  }

  public AdKind getAdKind() {
    return adKind;
  }

  public void setAdKind(AdKind adKind) {
    this.adKind = adKind;
  }

  public AdMedium getMedium() {
    return medium;
  }

  public void setMedium(AdMedium medium) {
    this.medium = medium;
  }

  public ListingStatus getStatus() {
    return status;
  }

  public void setStatus(ListingStatus status) {
    this.status = status;
  }

  public int getContentVersion() {
    return contentVersion;
  }

  public void setContentVersion(int contentVersion) {
    this.contentVersion = contentVersion;
  }

  public Long getLastCheckId() {
    return lastCheckId;
  }

  public void setLastCheckId(Long lastCheckId) {
    this.lastCheckId = lastCheckId;
  }

  public int getVersion() {
    return version;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }
}
