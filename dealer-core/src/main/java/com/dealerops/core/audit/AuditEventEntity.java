package com.dealerops.core.audit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

/**
 * Platform and membership audits may store {@code dealer_id = null}. Do not apply {@code
 * tenantFilter} here — a {@code dealer_id = :id} filter would hide those rows.
 */
@Entity
@Table(name = "audit_event")
public class AuditEventEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "dealer_id")
  private Long dealerId;

  @Column(name = "actor_oid", nullable = false, length = 64)
  private String actorOid;

  @Column(name = "entity_type", nullable = false, length = 32)
  private String entityType;

  @Column(name = "entity_id", nullable = false)
  private long entityId;

  @Column(name = "action", nullable = false, length = 32)
  private String action;

  @Column(name = "field_summary", columnDefinition = "JSON")
  private String fieldSummary;

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

  public String getActorOid() {
    return actorOid;
  }

  public void setActorOid(String actorOid) {
    this.actorOid = actorOid;
  }

  public String getEntityType() {
    return entityType;
  }

  public void setEntityType(String entityType) {
    this.entityType = entityType;
  }

  public long getEntityId() {
    return entityId;
  }

  public void setEntityId(long entityId) {
    this.entityId = entityId;
  }

  public String getAction() {
    return action;
  }

  public void setAction(String action) {
    this.action = action;
  }

  public String getFieldSummary() {
    return fieldSummary;
  }

  public void setFieldSummary(String fieldSummary) {
    this.fieldSummary = fieldSummary;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
