package com.dealerops.core.vehicle;

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
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Filter;
import org.hibernate.annotations.FilterDef;
import org.hibernate.annotations.ParamDef;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
    name = "vehicle",
    uniqueConstraints = @UniqueConstraint(name = "uk_vehicle_vin", columnNames = {"dealer_id", "vin"}))
@FilterDef(
    name = TenantFilters.NAME,
    parameters = @ParamDef(name = TenantFilters.PARAM, type = Long.class))
@Filter(name = TenantFilters.NAME, condition = TenantFilters.CONDITION)
@EntityListeners(TenantDealerListener.class)
public class VehicleEntity implements TenantOwned {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "dealer_id", nullable = false)
  private Long dealerId;

  @Column(name = "vin", nullable = false, length = 32)
  private String vin;

  @Column(name = "make", nullable = false, length = 80)
  private String make;

  @Column(name = "model", nullable = false, length = 80)
  private String model;

  @Column(name = "model_year", nullable = false)
  private int modelYear;

  @Enumerated(EnumType.STRING)
  @Column(name = "source", nullable = false, length = 32)
  private VehicleSource source;

  @Column(name = "purchase_cost", nullable = false, precision = 12, scale = 2)
  private BigDecimal purchaseCost;

  @Column(name = "added_on", nullable = false)
  private LocalDate addedOn;

  @Enumerated(EnumType.STRING)
  @Column(name = "condition_code", nullable = false, length = 24)
  private ConditionCode conditionCode;

  @Column(name = "repair_cost", precision = 12, scale = 2)
  private BigDecimal repairCost;

  @Column(name = "carfax_url", length = 500)
  private String carfaxUrl;

  @Column(name = "sold_on")
  private LocalDate soldOn;

  @Column(name = "sold_price", precision = 12, scale = 2)
  private BigDecimal soldPrice;

  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false, length = 16)
  private VehicleStatus status;

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

  public String getVin() {
    return vin;
  }

  public void setVin(String vin) {
    this.vin = vin;
  }

  public String getMake() {
    return make;
  }

  public void setMake(String make) {
    this.make = make;
  }

  public String getModel() {
    return model;
  }

  public void setModel(String model) {
    this.model = model;
  }

  public int getModelYear() {
    return modelYear;
  }

  public void setModelYear(int modelYear) {
    this.modelYear = modelYear;
  }

  public VehicleSource getSource() {
    return source;
  }

  public void setSource(VehicleSource source) {
    this.source = source;
  }

  public BigDecimal getPurchaseCost() {
    return purchaseCost;
  }

  public void setPurchaseCost(BigDecimal purchaseCost) {
    this.purchaseCost = purchaseCost;
  }

  public LocalDate getAddedOn() {
    return addedOn;
  }

  public void setAddedOn(LocalDate addedOn) {
    this.addedOn = addedOn;
  }

  public ConditionCode getConditionCode() {
    return conditionCode;
  }

  public void setConditionCode(ConditionCode conditionCode) {
    this.conditionCode = conditionCode;
  }

  public BigDecimal getRepairCost() {
    return repairCost;
  }

  public void setRepairCost(BigDecimal repairCost) {
    this.repairCost = repairCost;
  }

  public String getCarfaxUrl() {
    return carfaxUrl;
  }

  public void setCarfaxUrl(String carfaxUrl) {
    this.carfaxUrl = carfaxUrl;
  }

  public LocalDate getSoldOn() {
    return soldOn;
  }

  public void setSoldOn(LocalDate soldOn) {
    this.soldOn = soldOn;
  }

  public BigDecimal getSoldPrice() {
    return soldPrice;
  }

  public void setSoldPrice(BigDecimal soldPrice) {
    this.soldPrice = soldPrice;
  }

  public VehicleStatus getStatus() {
    return status;
  }

  public void setStatus(VehicleStatus status) {
    this.status = status;
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
