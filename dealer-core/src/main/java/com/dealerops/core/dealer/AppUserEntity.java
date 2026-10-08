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
    uniqueConstraints = {
      @UniqueConstraint(name = "uk_user_username", columnNames = "username"),
      @UniqueConstraint(name = "uk_app_user_email", columnNames = "email"),
      @UniqueConstraint(name = "uk_app_user_phone", columnNames = "phone"),
      @UniqueConstraint(name = "uk_app_user_display_name", columnNames = "display_name")
    })
public class AppUserEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "username", nullable = false, length = 64)
  private String username;

  @Column(name = "password_hash", nullable = false, length = 100)
  private String passwordHash;

  @Column(name = "display_name", nullable = false, length = 120)
  private String displayName;

  @Convert(converter = AppRoleConverter.class)
  @Column(name = "role", nullable = false, length = 32)
  private AppRole role;

  @Column(name = "dealer_id")
  private Long dealerId;

  @Column(name = "active", nullable = false)
  private boolean active = true;

  /** Normalized login email, when email was chosen as the login identifier. */
  @Column(name = "email", length = 254)
  private String email;

  @Column(name = "phone", length = 40)
  private String phone;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  public Long getId() {
    return id;
  }

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
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

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

}
