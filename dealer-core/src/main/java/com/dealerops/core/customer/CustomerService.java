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
import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.vehicle.VehicleEntity;
import com.dealerops.core.vehicle.VehicleRepository;
import com.dealerops.core.vehicle.VehicleStatus;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
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
    Long tenant = readTenant();
    String query = q == null ? null : q.trim();
    Page<CustomerEntity> result =
        tenant == null
            ? customerRepository.searchAll(
                query, linked, Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")))
            : customerRepository.search(
                tenant, query, linked, Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    List<CustomerListItem> items =
        result.getContent().stream().map(customer -> toListItem(customer, tenant)).toList();
    return new PageResponse<>(items, result.getNumber(), result.getSize(), result.getTotalElements());
  }

  @Transactional
  public CustomerDetail create(CreateCustomerRequest body) {
    Long tenant = requireTenant();
    String email = normalizeEmail(body.email());
    CustomerEntity customer = new CustomerEntity();
    customer.setDealerId(tenant);
    customer.setName(body.name());
    customer.setEmail(email);
    customer.setPhone(body.phone());
    customer.setHomeAddress(body.homeAddress());
    customer = customerRepository.save(customer);
    auditService.record(
        EntityType.CUSTOMER.name(),
        customer.getId(),
        AuditAction.CREATE.name(),
        tenant,
        actorUsername(),
        contactFieldChanges(
            null, null, null, null, body.name(), email, body.phone(), body.homeAddress()));
    return toDetail(customer);
  }

  @Transactional(readOnly = true)
  public CustomerDetail get(Long id) {
    TenantGuard.requireBusinessAccess();
    CustomerEntity customer = TenantContext.get().role() == AppRole.PLATFORM_ADMIN
        ? customerRepository.findById(id).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"))
        : loadThisDealer(id);
    return toDetail(customer);
  }

  @Transactional
  public CustomerDetail patch(Long id, PatchCustomerRequest body) {
    Long tenant = requireTenant();
    CustomerEntity customer = loadThisDealer(id);
    if (!body.version().equals(customer.getVersion())) {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }
    String email = normalizeEmail(body.email());
    Map<String, Object> fieldSummary =
        contactFieldChanges(
            customer.getName(),
            customer.getEmail(),
            customer.getPhone(),
            customer.getHomeAddress(),
            body.name(),
            email,
            body.phone(),
            body.homeAddress());
    customer.setName(body.name());
    customer.setEmail(email);
    customer.setPhone(body.phone());
    customer.setHomeAddress(body.homeAddress());
    customer = customerRepository.save(customer);
    auditService.record(
        EntityType.CUSTOMER.name(),
        customer.getId(),
        AuditAction.UPDATE.name(),
        tenant,
        actorUsername(),
        fieldSummary);
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
        actorUsername(),
        Map.of("customerId", customer.getId(), "vehicleId", vehicle.getId()));
    return new LinkResponse(row.getId(), row.getCustomerId(), row.getVehicleId(), row.getLinkedAt());
  }

  @Transactional
  public void unlink(Long customerId, Long vehicleId) {
    Long tenant = requireTenant();
    if (customerRepository.findByIdAndDealerId(customerId, tenant).isEmpty()) {
      throw new ApiException(ErrorCode.NOT_FOUND, "Not found");
    }
    VehicleEntity vehicle =
        vehicleRepository
            .findByIdAndDealerId(vehicleId, tenant)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
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
        actorUsername(),
        Map.of("customerId", customerId, "vehicleId", vehicleId));
  }

  private CustomerListItem toListItem(CustomerEntity customer, Long tenant) {
    List<CustomerVehicleEntity> links =
        customerVehicleRepository.findByCustomerIdOrderByLinkedAtDesc(customer.getId());
    LinkedVehicleBrief brief = null;
    if (!links.isEmpty()) {
      brief =
          vehicleRepository
              .findById(links.get(0).getVehicleId())
              .map(
                  vehicle ->
                      new LinkedVehicleBrief(
                          vehicle.getId(), vehicle.getModelYear(), vehicle.getMake(), vehicle.getModel()))
              .orElse(null);
    }
    return new CustomerListItem(
        customer.getId(),
        customer.getName(),
        customer.getEmail(),
        customer.getPhone(),
        customer.getHomeAddress(),
        brief,
        links.size(),
        customer.getVersion());
  }

  private CustomerDetail toDetail(CustomerEntity customer) {
    Long tenant = customer.getDealerId();
    List<LinkedVehicleItem> items =
        customerVehicleRepository.findByCustomerIdOrderByLinkedAtDesc(customer.getId()).stream()
            .map(link -> vehicleRepository.findByIdAndDealerId(link.getVehicleId(), tenant).orElse(null))
            .filter(v -> v != null)
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

  private static Map<String, Object> contactFieldChanges(
      String previousName,
      String previousEmail,
      String previousPhone,
      String previousHomeAddress,
      String name,
      String email,
      String phone,
      String homeAddress) {
    Map<String, Object> changed = new LinkedHashMap<>();
    if (!Objects.equals(previousName, name)) {
      changed.put("name", true);
    }
    if (!Objects.equals(previousEmail, email)) {
      changed.put("email", true);
    }
    if (!Objects.equals(previousPhone, phone)) {
      changed.put("phone", true);
    }
    if (!Objects.equals(previousHomeAddress, homeAddress)) {
      changed.put("homeAddress", true);
    }
    return changed;
  }

  private static String normalizeEmail(String email) {
    return email.trim().toLowerCase(Locale.ROOT);
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
