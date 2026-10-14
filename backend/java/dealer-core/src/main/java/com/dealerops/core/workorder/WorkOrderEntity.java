package com.dealerops.core.workorder;

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
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "work_order")
@Filter(name = TenantFilters.NAME, condition = TenantFilters.CONDITION)
@EntityListeners(TenantDealerListener.class)
public class WorkOrderEntity implements TenantOwned {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "dealer_id", nullable = false)
  private Long dealerId;

  @Column(name = "vehicle_id", nullable = false)
  private Long vehicleId;

  @Column(name = "task", nullable = false, length = 200)
  private String task;

  @Column(name = "assignee_username", length = 64)
  private String assigneeUsername;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 16)
  private WorkOrderStatus status;

  @Column(name = "due_on")
  private LocalDate dueOn;

  @Column(name = "cost", precision = 12, scale = 2)
  private BigDecimal cost;

  @Column(name = "completion_note", length = 500)
  private String completionNote;

  @Column(name = "completed_on")
  private LocalDate completedOn;

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

  public String getTask() {
    return task;
  }

  public void setTask(String task) {
    this.task = task;
  }

  public String getAssigneeUsername() {
    return assigneeUsername;
  }

  public void setAssigneeUsername(String assigneeUsername) {
    this.assigneeUsername = assigneeUsername;
  }

  public WorkOrderStatus getStatus() {
    return status;
  }

  public void setStatus(WorkOrderStatus status) {
    this.status = status;
  }

  public LocalDate getDueOn() {
    return dueOn;
  }

  public void setDueOn(LocalDate dueOn) {
    this.dueOn = dueOn;
  }

  public BigDecimal getCost() {
    return cost;
  }

  public void setCost(BigDecimal cost) {
    this.cost = cost;
  }

  public String getCompletionNote() {
    return completionNote;
  }

  public void setCompletionNote(String completionNote) {
    this.completionNote = completionNote;
  }

  public LocalDate getCompletedOn() {
    return completedOn;
  }

  public void setCompletedOn(LocalDate completedOn) {
    this.completedOn = completedOn;
  }

  public int getVersion() {
    return version;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
