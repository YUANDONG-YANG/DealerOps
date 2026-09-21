package com.dealerops.core.customer;

import com.dealerops.core.audit.AuditAction;
import com.dealerops.core.audit.AuditService;
import com.dealerops.core.audit.EntityType;
import com.dealerops.core.common.PageResponse;
import com.dealerops.core.common.Paging;
import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.customer.dto.CreateCustomerRequest;
import com.dealerops.core.customer.dto.CustomerDetail;
import com.dealerops.core.customer.dto.CustomerListItem;
import com.dealerops.core.customer.dto.LinkResponse;
import com.dealerops.core.customer.dto.LinkedVehicleBrief;
import com.dealerops.core.customer.dto.LinkedVehicleItem;
import com.dealerops.core.customer.dto.PatchCustomerRequest;
import com.dealerops.core.security.CurrentUser;
import com.dealerops.core.vehicle.VehicleEntity;
import com.dealerops.core.vehicle.VehicleRepository;
import com.dealerops.core.vehicle.VehicleStatus;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerService {

  private final CustomerRepository customerRepository;
  private final CustomerVehicleRepository customerVehicleRepository;
  private final VehicleRepository vehicleRepository;
  private final AuditService auditService;

  public CustomerService(
      CustomerRepository customerRepository,
      CustomerVehicleRepository customerVehicleRepository,
      VehicleRepository vehicleRepository,
      AuditService auditService) {
    this.customerRepository = customerRepository;
    this.customerVehicleRepository = customerVehicleRepository;
    this.vehicleRepository = vehicleRepository;
    this.auditService = auditService;
  }

  @Transactional(readOnly = true)
  public PageResponse<CustomerListItem> list(String q, Boolean linked, int page, int size) {
    Long tenant = requireTenant();
    Specification<CustomerEntity> spec =
        (root, query, cb) -> {
          List<Predicate> parts = new ArrayList<>();
          parts.add(cb.equal(root.get("dealerId"), tenant));
          if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
            parts.add(
                cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("email")), like),
                    cb.like(cb.lower(root.get("phone")), like)));
          }
          if (linked != null) {
            Subquery<Long> sub = query.subquery(Long.class);
            Root<CustomerVehicleEntity> cv = sub.from(CustomerVehicleEntity.class);
            sub.select(cv.get("id")).where(cb.equal(cv.get("customerId"), root.get("id")));
            parts.add(linked ? cb.exists(sub) : cb.not(cb.exists(sub)));
          }
          return cb.and(parts.toArray(Predicate[]::new));
        };
    Page<CustomerEntity> result =
        customerRepository.findAll(
            spec, Paging.of(page, size, org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Direction.DESC, "createdAt")));
    List<Long> ids = result.getContent().stream().map(CustomerEntity::getId).toList();
    Map<Long, CustomerVehicleEntity> latestByCustomer =
        customerVehicleRepository.findByCustomerIdIn(ids).stream()
            .collect(
                Collectors.toMap(
                    CustomerVehicleEntity::getCustomerId,
                    Function.identity(),
                    (a, b) -> a.getLinkedAt().isAfter(b.getLinkedAt()) ? a : b));
    Map<Long, VehicleEntity> vehicles =
        vehicleRepository
            .findAllById(
                latestByCustomer.values().stream().map(CustomerVehicleEntity::getVehicleId).toList())
            .stream()
            .collect(Collectors.toMap(VehicleEntity::getId, Function.identity()));
    List<CustomerListItem> items =
        result.getContent().stream()
            .map(
                customer -> {
                  CustomerVehicleEntity link = latestByCustomer.get(customer.getId());
                  VehicleEntity vehicle = link == null ? null : vehicles.get(link.getVehicleId());
                  LinkedVehicleBrief brief =
                      vehicle == null
                          ? null
                          : new LinkedVehicleBrief(
                              vehicle.getId(), vehicle.getModelYear(), vehicle.getMake(), vehicle.getModel());
                  return new CustomerListItem(
                      customer.getId(),
                      customer.getName(),
                      customer.getEmail(),
                      customer.getPhone(),
                      customer.getHomeAddress(),
                      brief,
                      customer.getVersion());
                })
            .toList();
    return new PageResponse<>(items, result.getNumber(), result.getSize(), result.getTotalElements());
  }

  @Transactional
  public CustomerDetail create(CreateCustomerRequest body) {
    Long tenant = requireTenant();
    CustomerEntity customer = new CustomerEntity();
    customer.setDealerId(tenant);
    customer.setName(body.name());
    customer.setEmail(body.email());
    customer.setPhone(body.phone());
    customer.setHomeAddress(body.homeAddress());
    customer = customerRepository.save(customer);
    auditService.record(
        EntityType.CUSTOMER.name(),
        customer.getId(),
        AuditAction.CREATE.name(),
        tenant,
        actorOid(),
        Map.of("contactFieldsChanged", true));
    return toDetail(customer);
  }

  @Transactional(readOnly = true)
  public CustomerDetail get(Long id) {
    return toDetail(loadThisDealer(id));
  }

  @Transactional
  public CustomerDetail patch(Long id, PatchCustomerRequest body) {
    Long tenant = requireTenant();
    CustomerEntity customer = loadThisDealer(id);
    if (!body.version().equals(customer.getVersion())) {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }
    customer.setName(body.name());
    customer.setEmail(body.email());
    customer.setPhone(body.phone());
    customer.setHomeAddress(body.homeAddress());
    customer = customerRepository.save(customer);
    auditService.record(
        EntityType.CUSTOMER.name(),
        customer.getId(),
        AuditAction.UPDATE.name(),
        tenant,
        actorOid(),
        Map.of("contactFieldsChanged", true));
    return toDetail(customer);
  }

  @Transactional
  public LinkResponse link(Long customerId, Long vehicleId) {
    Long tenant = requireTenant();
    CustomerEntity customer =
        customerRepository
            .findByIdAndDealerId(customerId, tenant)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    VehicleEntity vehicle =
        vehicleRepository
            .findByIdAndDealerId(vehicleId, tenant)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    if (vehicle.getStatus() != VehicleStatus.IN_STOCK) {
      throw new ApiException(ErrorCode.WRONG_DEALER_OR_SOLD, "Vehicle is sold or not available to link.");
    }
    if (customerVehicleRepository.existsByVehicleId(vehicleId)) {
      throw new ApiException(ErrorCode.VEHICLE_ALREADY_LINKED, "Vehicle is already linked.");
    }
    CustomerVehicleEntity row = new CustomerVehicleEntity();
    row.setDealerId(tenant);
    row.setCustomerId(customer.getId());
    row.setVehicleId(vehicle.getId());
    row = customerVehicleRepository.saveAndFlush(row);
    auditService.record(
        EntityType.CUSTOMER_VEHICLE.name(),
        row.getId(),
        AuditAction.LINK.name(),
        tenant,
        actorOid(),
        Map.of("customerId", customer.getId(), "vehicleId", vehicle.getId()));
    return new LinkResponse(row.getId(), row.getCustomerId(), row.getVehicleId(), row.getLinkedAt());
  }

  @Transactional
  public void unlink(Long customerId, Long vehicleId) {
    Long tenant = requireTenant();
    if (customerRepository.findByIdAndDealerId(customerId, tenant).isEmpty()
        || vehicleRepository.findByIdAndDealerId(vehicleId, tenant).isEmpty()) {
      throw new ApiException(ErrorCode.NOT_FOUND, "Not found");
    }
    VehicleEntity vehicle = vehicleRepository.findByIdAndDealerId(vehicleId, tenant).orElseThrow();
    CustomerVehicleEntity row =
        customerVehicleRepository
            .findByCustomerIdAndVehicleId(customerId, vehicleId)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    if (vehicle.getStatus() == VehicleStatus.SOLD) {
      throw new ApiException(ErrorCode.SOLD_LOCKED, "Sold vehicle cannot be unlinked.");
    }
    long entityId = row.getId();
    customerVehicleRepository.delete(row);
    auditService.record(
        EntityType.CUSTOMER_VEHICLE.name(),
        entityId,
        AuditAction.UNLINK.name(),
        tenant,
        actorOid(),
        Map.of("customerId", customerId, "vehicleId", vehicleId));
  }

  private CustomerDetail toDetail(CustomerEntity customer) {
    List<CustomerVehicleEntity> links =
        customerVehicleRepository.findByCustomerIdOrderByLinkedAtDesc(customer.getId());
    Map<Long, VehicleEntity> vehicles =
        vehicleRepository
            .findAllById(links.stream().map(CustomerVehicleEntity::getVehicleId).toList())
            .stream()
            .collect(Collectors.toMap(VehicleEntity::getId, Function.identity()));
    List<LinkedVehicleItem> items =
        links.stream()
            .map(link -> vehicles.get(link.getVehicleId()))
            .filter(v -> v != null)
            .sorted(Comparator.comparing(VehicleEntity::getId))
            .map(
                v ->
                    new LinkedVehicleItem(
                        v.getId(), v.getVin(), v.getModelYear(), v.getMake(), v.getModel(), v.getStatus()))
            .toList();
    return new CustomerDetail(
        customer.getId(),
        customer.getName(),
        customer.getEmail(),
        customer.getPhone(),
        customer.getHomeAddress(),
        items,
        customer.getVersion());
  }

  private CustomerEntity loadThisDealer(Long id) {
    Long tenant = requireTenant();
    return customerRepository
        .findByIdAndDealerId(id, tenant)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
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
