package com.dealerops.core.compliance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "compliance_check")
public class ComplianceCheckEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "dealer_id", nullable = false)
  private Long dealerId;

  @Column(name = "listing_id", nullable = false)
  private Long listingId;

  @Column(name = "content_version", nullable = false)
  private int contentVersion;

  @Column(name = "rule_findings", nullable = false, columnDefinition = "JSON")
  private String ruleFindings;

  @Enumerated(EnumType.STRING)
  @Column(name = "ai_status", nullable = false, length = 24)
  private AiStatus aiStatus;

  @Column(name = "ai_notes", columnDefinition = "JSON")
  private String aiNotes;

  @Enumerated(EnumType.STRING)
  @Column(name = "recommendation", nullable = false, length = 32)
  private Recommendation recommendation;

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

  public Long getListingId() {
    return listingId;
  }

  public void setListingId(Long listingId) {
    this.listingId = listingId;
  }

  public int getContentVersion() {
    return contentVersion;
  }

  public void setContentVersion(int contentVersion) {
    this.contentVersion = contentVersion;
  }

  public String getRuleFindings() {
    return ruleFindings;
  }

  public void setRuleFindings(String ruleFindings) {
    this.ruleFindings = ruleFindings;
  }

  public AiStatus getAiStatus() {
    return aiStatus;
  }

  public void setAiStatus(AiStatus aiStatus) {
    this.aiStatus = aiStatus;
  }

  public String getAiNotes() {
    return aiNotes;
  }

  public void setAiNotes(String aiNotes) {
    this.aiNotes = aiNotes;
  }

  public Recommendation getRecommendation() {
    return recommendation;
  }

  public void setRecommendation(Recommendation recommendation) {
    this.recommendation = recommendation;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
