package com.dealerops.core.dealer;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(
    name = "app_user",
    uniqueConstraints = @UniqueConstraint(name = "uk_user_oid", columnNames = {"entra_tenant_id", "entra_oid"}))
public class AppUserEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "entra_tenant_id", nullable = false, length = 64)
  private String entraTenantId;

  @Column(name = "entra_oid", nullable = false, length = 64)
  private String entraOid;

  @Column(name = "display_name", nullable = false, length = 120)
  private String displayName;

  @Convert(converter = AppRoleConverter.class)
  @Column(name = "role", nullable = false, length = 32)
  private AppRole role;

  @Column(name = "dealer_id")
  private Long dealerId;

  @Column(name = "active", nullable = false)
  private boolean active = true;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  public Long getId() {
    return id;
  }

  public String getEntraTenantId() {
    return entraTenantId;
  }

  public void setEntraTenantId(String entraTenantId) {
    this.entraTenantId = entraTenantId;
  }

  public String getEntraOid() {
    return entraOid;
  }

  public void setEntraOid(String entraOid) {
    this.entraOid = entraOid;
  }

  public String getDisplayName() {
    return displayName;
  }

  public void setDisplayName(String displayName) {
    this.displayName = displayName;
  }

  public AppRole getRole() {
    return role;
  }

  public void setRole(AppRole role) {
    this.role = role;
  }

  public Long getDealerId() {
    return dealerId;
  }

  public void setDealerId(Long dealerId) {
    this.dealerId = dealerId;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
