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
import com.dealerops.core.customer.CustomerRepository;
import com.dealerops.core.listing.ListingRepository;
import com.dealerops.core.listing.ListingStatus;
import com.dealerops.core.security.CurrentUser;
import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.vehicle.dto.CreateVehicleRequest;
import com.dealerops.core.vehicle.dto.LinkedCustomerBrief;
import com.dealerops.core.vehicle.dto.PatchVehicleRequest;
import com.dealerops.core.vehicle.dto.SellVehicleRequest;
import com.dealerops.core.vehicle.dto.VehicleResponse;
import java.math.BigDecimal;
import java.time.Year;
import java.util.LinkedHashMap;
import java.util.Locale;
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
  private final CustomerRepository customerRepository;
  private final AuditService auditService;

  public VehicleService(
      VehicleRepository vehicleRepository,
      ListingRepository listingRepository,
      CustomerRepository customerRepository,
      AuditService auditService) {
    this.vehicleRepository = vehicleRepository;
    this.listingRepository = listingRepository;
    this.customerRepository = customerRepository;
    this.auditService = auditService;
  }

  @Transactional(readOnly = true)
  public PageResponse<VehicleResponse> list(String q, VehicleStatus status, ConditionCode condition, int page, int size) {
    Long tenant = readTenant();
    String query = q == null ? null : q.trim();
    Page<VehicleEntity> result =
        tenant == null
            ? vehicleRepository.searchAll(
                query, status, condition, Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
            : vehicleRepository.search(
                tenant, query, status, condition, Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    return new PageResponse<>(
        result.map(this::toResponse).getContent(), result.getNumber(), result.getSize(), result.getTotalElements());
  }

  @Transactional
  public VehicleResponse create(CreateVehicleRequest body) {
    Long tenant = requireTenant();
    requireModelYearInRange(body.modelYear());
    String vin = normalizeVin(body.vin());
    if (vehicleRepository.existsByDealerIdAndVin(tenant, vin)) {
      throw new ApiException(ErrorCode.VIN_DUP, "VIN already exists in this dealership.");
    }
    VehicleEntity vehicle = new VehicleEntity();
    vehicle.setDealerId(tenant);
    vehicle.setMake(body.make().trim());
    vehicle.setModel(body.model().trim());
    vehicle.setModelYear(body.modelYear());
    vehicle.setVin(vin);
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
        actorUsername(),
        createdVehicleFields(body));
    return toResponse(vehicle);
  }

  @Transactional(readOnly = true)
  public VehicleResponse get(Long id) {
    TenantGuard.requireBusinessAccess();
    VehicleEntity vehicle = TenantContext.get().role() == AppRole.PLATFORM_ADMIN
        ? vehicleRepository.findById(id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"))
        : loadThisDealer(id);
    return toResponse(vehicle);
  }

  @Transactional
  public VehicleResponse patch(Long id, PatchVehicleRequest body) {
    Long tenant = requireTenant();
    VehicleEntity vehicle = loadThisDealer(id);
    if (!body.version().equals(vehicle.getVersion())) {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }
    requireModelYearInRange(body.modelYear());
    String make = body.make().trim();
    String model = body.model().trim();
    String vin = normalizeVin(body.vin());
    Map<String, Object> changed = changedVehicleFields(vehicle, body, make, model, vin);
    if (vehicle.getStatus() == VehicleStatus.SOLD && purchaseFieldsChanged(changed)) {
      throw new ApiException(ErrorCode.SOLD_LOCKED, "Sold vehicle is locked.");
    }
    if (changed.containsKey("vin") && vehicleRepository.existsByDealerIdAndVin(tenant, vin)) {
      throw new ApiException(ErrorCode.VIN_DUP, "VIN already exists in this dealership.");
    }
    vehicle.setMake(make);
    vehicle.setModel(model);
    vehicle.setModelYear(body.modelYear());
    vehicle.setVin(vin);
    vehicle.setSource(body.source());
    vehicle.setPurchaseCost(body.purchaseCost());
    vehicle.setAddedOn(body.addedOn());
    vehicle.setConditionCode(body.conditionCode());
    vehicle.setRepairCost(body.repairCost());
    vehicle.setCarfaxUrl(body.carfaxUrl());
    if (changed.containsKey("conditionCode")) {
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
        actorUsername(),
        changed);
    return toResponse(vehicle);
  }

  @Transactional
  public VehicleResponse sell(Long id, SellVehicleRequest body) {
    Long tenant = requireTenant();
    if (body.soldOn() == null || body.soldPrice() == null) {
      throw new ApiException(ErrorCode.SOLD_PAIR_REQUIRED, "Sold date and sold price are both required.");
    }
    VehicleEntity vehicle = loadThisDealer(id);
    if (!body.version().equals(vehicle.getVersion())) {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }
    if (vehicle.getStatus() == VehicleStatus.SOLD) {
      throw new ApiException(ErrorCode.SOLD_LOCKED, "Sold vehicle is locked.");
    }
    if (body.soldOn().isBefore(vehicle.getAddedOn())) {
      throw new ApiException(ErrorCode.VALIDATION, "Sold date must not be before the date added.");
    }
    Map<String, Object> changed = changedSellFields(vehicle, body);
    vehicle.setStatus(VehicleStatus.SOLD);
    vehicle.setSoldOn(body.soldOn());
    vehicle.setSoldPrice(body.soldPrice());
    vehicle = vehicleRepository.save(vehicle);
    auditService.record(
        EntityType.VEHICLE.name(),
        vehicle.getId(),
        AuditAction.SELL.name(),
        tenant,
        actorUsername(),
        changed);
    return toResponse(vehicle);
  }

  private VehicleEntity loadThisDealer(Long id) {
    Long tenant = requireTenant();
    return vehicleRepository
        .findByIdAndDealerId(id, tenant)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
  }

  private static Map<String, Object> createdVehicleFields(CreateVehicleRequest body) {
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("make", true);
    fields.put("model", true);
    fields.put("modelYear", true);
    fields.put("vin", true);
    fields.put("source", true);
    fields.put("purchaseCost", true);
    fields.put("addedOn", true);
    fields.put("conditionCode", true);
    fields.put("status", true);
    if (body.repairCost() != null) {
      fields.put("repairCost", true);
    }
    if (body.carfaxUrl() != null) {
      fields.put("carfaxUrl", true);
    }
    return fields;
  }

  private static Map<String, Object> changedVehicleFields(
      VehicleEntity vehicle, PatchVehicleRequest body, String make, String model, String vin) {
    Map<String, Object> changed = new LinkedHashMap<>();
    if (!Objects.equals(vehicle.getMake(), make)) {
      changed.put("make", true);
    }
    if (!Objects.equals(vehicle.getModel(), model)) {
      changed.put("model", true);
    }
    if (vehicle.getModelYear() != body.modelYear()) {
      changed.put("modelYear", true);
    }
    if (!Objects.equals(vehicle.getVin(), vin)) {
      changed.put("vin", true);
    }
    if (vehicle.getSource() != body.source()) {
      changed.put("source", true);
    }
    if (vehicle.getPurchaseCost().compareTo(body.purchaseCost()) != 0) {
      changed.put("purchaseCost", true);
    }
    if (!Objects.equals(vehicle.getAddedOn(), body.addedOn())) {
      changed.put("addedOn", true);
    }
    if (vehicle.getConditionCode() != body.conditionCode()) {
      changed.put("conditionCode", true);
    }
    if (moneyChanged(vehicle.getRepairCost(), body.repairCost())) {
      changed.put("repairCost", true);
    }
    if (!Objects.equals(vehicle.getCarfaxUrl(), body.carfaxUrl())) {
      changed.put("carfaxUrl", true);
    }
    return changed;
  }

  private static Map<String, Object> changedSellFields(VehicleEntity vehicle, SellVehicleRequest body) {
    Map<String, Object> changed = new LinkedHashMap<>();
    if (vehicle.getStatus() != VehicleStatus.SOLD) {
      changed.put("status", true);
    }
    if (!Objects.equals(vehicle.getSoldOn(), body.soldOn())) {
      changed.put("soldOn", true);
    }
    if (moneyChanged(vehicle.getSoldPrice(), body.soldPrice())) {
      changed.put("soldPrice", true);
    }
    return changed;
  }

  private static boolean purchaseFieldsChanged(Map<String, Object> changed) {
    return changed.containsKey("make")
        || changed.containsKey("model")
        || changed.containsKey("modelYear")
        || changed.containsKey("vin")
        || changed.containsKey("source")
        || changed.containsKey("purchaseCost")
        || changed.containsKey("addedOn")
        || changed.containsKey("repairCost")
        || changed.containsKey("carfaxUrl");
  }

  private static boolean moneyChanged(BigDecimal current, BigDecimal next) {
    if (current == null || next == null) {
      return current != next;
    }
    return current.compareTo(next) != 0;
  }

  private static void requireModelYearInRange(int modelYear) {
    if (modelYear > Year.now().getValue() + 1) {
      throw new ApiException(ErrorCode.VALIDATION, "Model year must not be later than next year.");
    }
  }

  private static String normalizeVin(String vin) {
    return vin.toUpperCase(Locale.ROOT);
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
        customerRepository
            .findLinkedToVehicle(vehicle.getDealerId(), vehicle.getId())
            .map(customer -> new LinkedCustomerBrief(customer.getId(), customer.getName()))
            .orElse(null),
        vehicle.getVersion());
  }

  private static Long requireTenant() {
    TenantGuard.requireDealerUser();
    return TenantContext.get().tenantDealerId();
  }

  private static Long readTenant() {
    TenantGuard.requireBusinessAccess();
    return TenantContext.get().role() == AppRole.PLATFORM_ADMIN
        ? null
        : TenantContext.get().tenantDealerId();
  }

  private static String actorUsername() {
    CurrentUser user = TenantContext.get();
    return user == null ? "" : user.username();
  }
}
