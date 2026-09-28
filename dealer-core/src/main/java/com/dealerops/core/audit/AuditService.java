package com.dealerops.core.audit;

import com.dealerops.core.audit.dto.AuditItem;
import com.dealerops.core.common.PageResponse;
import com.dealerops.core.common.Paging;
import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.customer.CustomerRepository;
import com.dealerops.core.customer.CustomerVehicleRepository;
import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.security.CurrentUser;
import com.dealerops.core.vehicle.VehicleRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

  private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {};

  private final AuditEventRepository auditEventRepository;
  private final VehicleRepository vehicleRepository;
  private final CustomerRepository customerRepository;
  private final CustomerVehicleRepository customerVehicleRepository;
  private final ObjectMapper objectMapper;

  public AuditService(
      AuditEventRepository auditEventRepository,
      VehicleRepository vehicleRepository,
      CustomerRepository customerRepository,
      CustomerVehicleRepository customerVehicleRepository,
      ObjectMapper objectMapper) {
    this.auditEventRepository = auditEventRepository;
    this.vehicleRepository = vehicleRepository;
    this.customerRepository = customerRepository;
    this.customerVehicleRepository = customerVehicleRepository;
    this.objectMapper = objectMapper;
  }

  @Transactional
  public void record(
      String entityType,
      long entityId,
      String action,
      Long dealerId,
      String actorOid,
      Map<String, Object> fieldSummary) {
    AuditEventEntity event = new AuditEventEntity();
    event.setDealerId(dealerId);
    event.setActorOid(actorOid == null ? "" : actorOid);
    event.setEntityType(entityType);
    event.setEntityId(entityId);
    event.setAction(action);
    event.setFieldSummary(writeSummary(fieldSummary));
    auditEventRepository.save(event);
  }

  @Transactional(readOnly = true)
  public PageResponse<AuditItem> list(String entityType, Long entityId, int page, int size) {
    CurrentUser user = TenantContext.get();
    if (user == null || user.role() == AppRole.PLATFORM_ADMIN) {
      throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
    }
    TenantGuard.requireDealerUser();
    if (entityType == null || entityType.isBlank() || entityId == null) {
      throw new ApiException(ErrorCode.VALIDATION, "Request is invalid.");
    }
    String type = entityType.trim();
    if (EntityType.DEALER.name().equals(type) || EntityType.MEMBERSHIP.name().equals(type)) {
      throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
    }
    if (!isAllowedStaffType(type)) {
      throw new ApiException(ErrorCode.VALIDATION, "Request is invalid.");
    }
    Long tenant = user.tenantDealerId();
    assertEntityInDealer(type, entityId, tenant);
    if (EntityType.CUSTOMER.name().equals(type)) {
      return customerHistory(tenant, entityId, page, size);
    }
    // Staff query types are only VEHICLE / CUSTOMER / CUSTOMER_VEHICLE (14 §9).
    Pageable pageable = Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
    Page<AuditEventEntity> result =
        auditEventRepository.findByDealerIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
            tenant, type, entityId, pageable);
    return new PageResponse<>(
        result.map(this::toItem).getContent(), result.getNumber(), result.getSize(), result.getTotalElements());
  }

  // The classroom data set is small. Merge existing link events without a schema migration
  // or duplicate writes, so even an already-deleted link retains its customer history.
  private PageResponse<AuditItem> customerHistory(Long tenant, Long customerId, int page, int size) {
    List<AuditItem> events = auditEventRepository.findByDealerIdOrderByCreatedAtDescIdDesc(tenant).stream()
        .filter(event -> {
          if (EntityType.CUSTOMER.name().equals(event.getEntityType())) {
            return event.getEntityId() == customerId.longValue();
          }
          if (!EntityType.CUSTOMER_VEHICLE.name().equals(event.getEntityType())) return false;
          Map<String, Object> summary = readSummary(event.getFieldSummary());
          Object id = summary == null ? null : summary.get("customerId");
          return id instanceof Number number && number.longValue() == customerId.longValue();
        })
        .map(this::toItem).toList();
    int p = Paging.page(page);
    int s = Paging.size(size);
    int from = (int) Math.min((long) p * s, events.size());
    int to = (int) Math.min((long) from + s, events.size());
    return new PageResponse<>(events.subList(from, to), p, s, events.size());
  }

  private void assertEntityInDealer(String type, Long entityId, Long tenant) {
    boolean found =
        switch (type) {
          case "VEHICLE" -> vehicleRepository.findByIdAndDealerId(entityId, tenant).isPresent();
          case "CUSTOMER" -> customerRepository.findByIdAndDealerId(entityId, tenant).isPresent();
          case "CUSTOMER_VEHICLE" ->
              customerVehicleRepository.findByIdAndDealerId(entityId, tenant).isPresent()
                  || auditEventRepository.existsByDealerIdAndEntityTypeAndEntityId(tenant, type, entityId);
          default -> false;
        };
    if (!found) {
      throw new ApiException(ErrorCode.NOT_FOUND, "Not found");
    }
  }

  private static boolean isAllowedStaffType(String type) {
    return EntityType.VEHICLE.name().equals(type)
        || EntityType.CUSTOMER.name().equals(type)
        || EntityType.CUSTOMER_VEHICLE.name().equals(type);
  }

  private AuditItem toItem(AuditEventEntity event) {
    return new AuditItem(
        event.getId(),
        event.getEntityType(),
        event.getEntityId(),
        event.getAction(),
        readSummary(event.getFieldSummary()),
        event.getActorOid(),
        event.getCreatedAt());
  }

  private String writeSummary(Map<String, Object> fieldSummary) {
    if (fieldSummary == null || fieldSummary.isEmpty()) {
      return null;
    }
    try {
      return objectMapper.writeValueAsString(fieldSummary);
    } catch (Exception ex) {
      return null;
    }
  }

  private Map<String, Object> readSummary(String json) {
    if (json == null || json.isBlank()) {
      return null;
    }
    try {
      return objectMapper.readValue(json, MAP);
    } catch (Exception ex) {
      return null;
    }
  }
}
