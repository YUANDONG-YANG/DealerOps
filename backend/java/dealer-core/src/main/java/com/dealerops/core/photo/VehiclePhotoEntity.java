package com.dealerops.core.photo;

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
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;

/** One Image Studio photo of a vehicle. The original bytes are never changed. */
@Entity
@Table(name = "vehicle_photo")
@Filter(name = TenantFilters.NAME, condition = TenantFilters.CONDITION)
@EntityListeners(TenantDealerListener.class)
public class VehiclePhotoEntity implements TenantOwned {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "dealer_id", nullable = false)
  private Long dealerId;

  @Column(name = "vehicle_id", nullable = false)
  private Long vehicleId;

  @Column(name = "content_type", nullable = false, length = 32)
  private String contentType;

  @Column(name = "original_data", nullable = false, columnDefinition = "MEDIUMBLOB")
  private byte[] originalData;

  @Column(name = "enhanced_data", columnDefinition = "MEDIUMBLOB")
  private byte[] enhancedData;

  @Enumerated(EnumType.STRING)
  @Column(name = "enhancement", length = 16)
  private PhotoPreset enhancement;

  @Column(name = "uploaded_by", nullable = false, length = 64)
  private String uploadedBy;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

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

  public String getContentType() {
    return contentType;
  }

  public void setContentType(String contentType) {
    this.contentType = contentType;
  }

  public byte[] getOriginalData() {
    return originalData;
  }

  public void setOriginalData(byte[] originalData) {
    this.originalData = originalData;
  }

  public byte[] getEnhancedData() {
    return enhancedData;
  }

  public void setEnhancedData(byte[] enhancedData) {
    this.enhancedData = enhancedData;
  }

  public PhotoPreset getEnhancement() {
    return enhancement;
  }

  public void setEnhancement(PhotoPreset enhancement) {
    this.enhancement = enhancement;
  }

  public String getUploadedBy() {
    return uploadedBy;
  }

  public void setUploadedBy(String uploadedBy) {
    this.uploadedBy = uploadedBy;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
