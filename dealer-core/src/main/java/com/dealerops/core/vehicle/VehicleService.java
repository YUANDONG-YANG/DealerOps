package com.dealerops.core.vehicle;

import com.dealerops.core.audit.AuditAction;
import com.dealerops.core.audit.AuditService;
import com.dealerops.core.audit.EntityType;
import com.dealerops.core.common.PageResponse;
import com.dealerops.core.common.Paging;
import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.listing.ListingRepository;
import com.dealerops.core.listing.ListingStatus;
import com.dealerops.core.security.CurrentUser;
import com.dealerops.core.vehicle.dto.CreateVehicleRequest;
import com.dealerops.core.vehicle.dto.PatchVehicleRequest;
import com.dealerops.core.vehicle.dto.SellVehicleRequest;
import com.dealerops.core.vehicle.dto.VehicleResponse;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VehicleService {

  private final VehicleRepository vehicleRepository;
  private final ListingRepository listingRepository;
  private final AuditService auditService;

  public VehicleService(
      VehicleRepository vehicleRepository, ListingRepository listingRepository, AuditService auditService) {
    this.vehicleRepository = vehicleRepository;
    this.listingRepository = listingRepository;
    this.auditService = auditService;
  }

  @Transactional(readOnly = true)
  public PageResponse<VehicleResponse> list(String q, VehicleStatus status, ConditionCode condition, int page, int size) {
    Long tenant = requireTenant();
    String query = q == null ? null : q.trim();
    Page<VehicleEntity> result =
        vehicleRepository.search(
            tenant, query, status, condition, Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    return new PageResponse<>(
        result.map(this::toResponse).getContent(), result.getNumber(), result.getSize(), result.getTotalElements());
  }

  @Transactional
  public VehicleResponse create(CreateVehicleRequest body) {
    Long tenant = requireTenant();
    if (vehicleRepository.existsByDealerIdAndVin(tenant, body.vin())) {
      throw new ApiException(ErrorCode.VIN_DUP, "VIN already exists in this dealership.");
    }
    VehicleEntity vehicle = new VehicleEntity();
    vehicle.setDealerId(tenant);
    vehicle.setMake(body.make());
    vehicle.setModel(body.model());
    vehicle.setModelYear(body.modelYear());
    vehicle.setVin(body.vin());
    vehicle.setSource(body.source());
    vehicle.setPurchaseCost(body.purchaseCost());
    vehicle.setAddedOn(body.addedOn());
    vehicle.setConditionCode(body.conditionCode());
    vehicle.setRepairCost(body.repairCost());
    vehicle.setCarfaxUrl(body.carfaxUrl());
    vehicle.setStatus(VehicleStatus.IN_STOCK);
    vehicle.setSoldOn(null);
    vehicle.setSoldPrice(null);
    vehicle = vehicleRepository.save(vehicle);
    auditService.record(
        EntityType.VEHICLE.name(),
        vehicle.getId(),
        AuditAction.CREATE.name(),
        tenant,
        actorOid(),
        Map.of("vinChanged", true));
    return toResponse(vehicle);
  }

  @Transactional(readOnly = true)
  public VehicleResponse get(Long id) {
    return toResponse(loadThisDealer(id));
  }

  @Transactional
  public VehicleResponse patch(Long id, PatchVehicleRequest body) {
    Long tenant = requireTenant();
    VehicleEntity vehicle = loadThisDealer(id);
    if (!body.version().equals(vehicle.getVersion())) {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }
    if (vehicle.getStatus() == VehicleStatus.SOLD && purchaseFieldsChanged(vehicle, body)) {
      throw new ApiException(ErrorCode.SOLD_LOCKED, "Sold vehicle is locked.");
    }
    if (!vehicle.getVin().equals(body.vin()) && vehicleRepository.existsByDealerIdAndVin(tenant, body.vin())) {
      throw new ApiException(ErrorCode.VIN_DUP, "VIN already exists in this dealership.");
    }
    ConditionCode oldCondition = vehicle.getConditionCode();
    vehicle.setMake(body.make());
    vehicle.setModel(body.model());
    vehicle.setModelYear(body.modelYear());
    vehicle.setVin(body.vin());
    vehicle.setSource(body.source());
    vehicle.setPurchaseCost(body.purchaseCost());
    vehicle.setAddedOn(body.addedOn());
    vehicle.setConditionCode(body.conditionCode());
    vehicle.setRepairCost(body.repairCost());
    vehicle.setCarfaxUrl(body.carfaxUrl());
    if (oldCondition != vehicle.getConditionCode()) {
      listingRepository
          .findByVehicleIdAndDealerId(vehicle.getId(), tenant)
          .ifPresent(
              listing -> {
                listing.setContentVersion(listing.getContentVersion() + 1);
                listing.setStatus(ListingStatus.DRAFT);
              });
    }
    vehicle = vehicleRepository.save(vehicle);
    auditService.record(
        EntityType.VEHICLE.name(),
        vehicle.getId(),
        AuditAction.UPDATE.name(),
        tenant,
        actorOid(),
        Map.of("identityFieldsChanged", true));
    return toResponse(vehicle);
  }

  @Transactional
  public VehicleResponse sell(Long id, SellVehicleRequest body) {
    Long tenant = requireTenant();
    if (body.soldOn() == null || body.soldPrice() == null || body.soldPrice().compareTo(BigDecimal.ZERO) <= 0) {
      throw new ApiException(ErrorCode.SOLD_PAIR_REQUIRED, "Sold date and a positive sold price are required.");
    }
    VehicleEntity vehicle = loadThisDealer(id);
    if (!body.version().equals(vehicle.getVersion())) {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }
    if (vehicle.getStatus() == VehicleStatus.SOLD) {
      throw new ApiException(ErrorCode.SOLD_LOCKED, "Sold vehicle is locked.");
    }
    vehicle.setStatus(VehicleStatus.SOLD);
    vehicle.setSoldOn(body.soldOn());
    vehicle.setSoldPrice(body.soldPrice());
    vehicle = vehicleRepository.save(vehicle);
    auditService.record(
        EntityType.VEHICLE.name(),
        vehicle.getId(),
        AuditAction.SELL.name(),
        tenant,
        actorOid(),
        Map.of("sold", true));
    return toResponse(vehicle);
  }

  private VehicleEntity loadThisDealer(Long id) {
    Long tenant = requireTenant();
    return vehicleRepository
        .findByIdAndDealerId(id, tenant)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
  }

  private static boolean purchaseFieldsChanged(VehicleEntity vehicle, PatchVehicleRequest body) {
    return !Objects.equals(vehicle.getMake(), body.make())
        || !Objects.equals(vehicle.getModel(), body.model())
        || vehicle.getModelYear() != body.modelYear()
        || !Objects.equals(vehicle.getVin(), body.vin())
        || vehicle.getSource() != body.source()
        || vehicle.getPurchaseCost().compareTo(body.purchaseCost()) != 0
        || !Objects.equals(vehicle.getAddedOn(), body.addedOn())
        || !Objects.equals(vehicle.getRepairCost(), body.repairCost())
        || !Objects.equals(vehicle.getCarfaxUrl(), body.carfaxUrl());
  }

  private VehicleResponse toResponse(VehicleEntity vehicle) {
    return new VehicleResponse(
        vehicle.getId(),
        vehicle.getVin(),
        vehicle.getMake(),
        vehicle.getModel(),
        vehicle.getModelYear(),
        vehicle.getSource(),
        vehicle.getPurchaseCost(),
        vehicle.getAddedOn(),
        vehicle.getConditionCode(),
        vehicle.getRepairCost(),
        vehicle.getCarfaxUrl(),
        vehicle.getSoldOn(),
        vehicle.getSoldPrice(),
        vehicle.getStatus(),
        vehicle.getVersion());
  }

  private static Long requireTenant() {
    TenantGuard.requireDealerUser();
    return TenantContext.get().tenantDealerId();
  }

  private static String actorOid() {
    CurrentUser user = TenantContext.get();
    return user == null ? "" : user.oid();
  }
}
