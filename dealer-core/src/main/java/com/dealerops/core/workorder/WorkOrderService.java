package com.dealerops.core.workorder;

import com.dealerops.core.audit.AuditAction;
import com.dealerops.core.audit.AuditService;
import com.dealerops.core.audit.EntityType;
import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.dealer.MembershipRepository;
import com.dealerops.core.security.CurrentUser;
import com.dealerops.core.vehicle.VehicleEntity;
import com.dealerops.core.vehicle.VehicleRepository;
import com.dealerops.core.vehicle.VehicleService;
import com.dealerops.core.vehicle.VehicleStatus;
import com.dealerops.core.workorder.dto.CreateWorkOrderRequest;
import com.dealerops.core.workorder.dto.PatchWorkOrderRequest;
import com.dealerops.core.workorder.dto.WorkOrderResponse;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Reconditioning work orders on in-stock vehicles (design/21-Feature-Extensions.md §4). */
@Service
public class WorkOrderService {

  private final WorkOrderRepository workOrderRepository;
  private final VehicleRepository vehicleRepository;
  private final VehicleService vehicleService;
  private final MembershipRepository membershipRepository;
  private final AuditService auditService;

  public WorkOrderService(
      WorkOrderRepository workOrderRepository,
      VehicleRepository vehicleRepository,
      VehicleService vehicleService,
      MembershipRepository membershipRepository,
      AuditService auditService) {
    this.workOrderRepository = workOrderRepository;
    this.vehicleRepository = vehicleRepository;
    this.vehicleService = vehicleService;
    this.membershipRepository = membershipRepository;
    this.auditService = auditService;
  }

  /** Open work orders first, then newest first. */
  @Transactional(readOnly = true)
  public List<WorkOrderResponse> list(Long vehicleId) {
    Long tenant = requireTenant();
    loadVehicle(vehicleId, tenant);
    return workOrderRepository.findByVehicleIdAndDealerIdOrderByCreatedAtDescIdDesc(vehicleId, tenant).stream()
        .sorted(Comparator.comparing(order -> order.getStatus().isClosed()))
        .map(WorkOrderService::toResponse)
        .toList();
  }

  @Transactional
  public WorkOrderResponse create(Long vehicleId, CreateWorkOrderRequest body) {
    Long tenant = requireTenant();
    requireInStock(loadVehicle(vehicleId, tenant));
    String assignee = trimToNull(body.assigneeUsername());
    requireMember(tenant, assignee);
    WorkOrderEntity order = new WorkOrderEntity();
    order.setDealerId(tenant);
    order.setVehicleId(vehicleId);
    order.setTask(body.task().trim());
    order.setAssigneeUsername(assignee);
    order.setStatus(WorkOrderStatus.OPEN);
    order.setDueOn(body.dueOn());
    order = workOrderRepository.save(order);
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("vehicleId", vehicleId);
    fields.put("status", WorkOrderStatus.OPEN.name());
    audit(order.getId(), AuditAction.CREATE, tenant, fields);
    return toResponse(order);
  }

  @Transactional
  public WorkOrderResponse patch(Long id, PatchWorkOrderRequest body) {
    Long tenant = requireTenant();
    WorkOrderEntity order =
        workOrderRepository
            .findByIdAndDealerId(id, tenant)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    if (!body.version().equals(order.getVersion())) {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }
    if (order.getStatus().isClosed()) {
      throw new ApiException(ErrorCode.WORK_ORDER_CLOSED, "Done and cancelled work orders cannot be changed.");
    }
    requireInStock(loadVehicle(order.getVehicleId(), tenant));
    WorkOrderStatus next = body.status();
    if (next != order.getStatus() && !order.getStatus().canMoveTo(next)) {
      throw new ApiException(ErrorCode.VALIDATION, "This status change is not allowed.");
    }
    String task = body.task().trim();
    String assignee = trimToNull(body.assigneeUsername());
    Map<String, Object> changed = new LinkedHashMap<>();
    if (next != order.getStatus()) {
      changed.put("status", next.name());
    }
    if (!Objects.equals(order.getTask(), task)) {
      changed.put("task", true);
    }
    if (!Objects.equals(order.getAssigneeUsername(), assignee)) {
      requireMember(tenant, assignee);
      changed.put("assigneeUsername", assignee == null ? "" : assignee);
    }
    if (!Objects.equals(order.getDueOn(), body.dueOn())) {
      changed.put("dueOn", true);
    }
    if (next == WorkOrderStatus.DONE) {
      String note = trimToNull(body.completionNote());
      if (note == null || body.cost() == null) {
        throw new ApiException(ErrorCode.VALIDATION, "A finished work order needs a completion note and a cost.");
      }
      order.setCompletionNote(note);
      order.setCost(body.cost());
      order.setCompletedOn(LocalDate.now());
      changed.put("cost", true);
      changed.put("completionNote", true);
      vehicleService.addRepairCost(order.getVehicleId(), body.cost());
    }
    order.setStatus(next);
    order.setTask(task);
    order.setAssigneeUsername(assignee);
    order.setDueOn(body.dueOn());
    order = workOrderRepository.saveAndFlush(order);
    if (!changed.isEmpty()) {
      audit(order.getId(), AuditAction.UPDATE, tenant, changed);
    }
    return toResponse(order);
  }

  private VehicleEntity loadVehicle(Long vehicleId, Long tenant) {
    return vehicleRepository
        .findByIdAndDealerId(vehicleId, tenant)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
  }

  private static void requireInStock(VehicleEntity vehicle) {
    if (vehicle.getStatus() == VehicleStatus.SOLD) {
      throw new ApiException(ErrorCode.SOLD_LOCKED, "Sold vehicle is locked.");
    }
  }

  private void requireMember(Long tenant, String username) {
    if (username != null && !membershipRepository.existsByDealerIdAndUsernameAndActiveTrue(tenant, username)) {
      throw new ApiException(ErrorCode.VALIDATION, "Assignee must be a member of this dealership.");
    }
  }

  private void audit(Long orderId, AuditAction action, Long tenant, Map<String, Object> fields) {
    auditService.record(EntityType.WORK_ORDER.name(), orderId, action.name(), tenant, actorUsername(), fields);
  }

  private static WorkOrderResponse toResponse(WorkOrderEntity order) {
    return new WorkOrderResponse(
        order.getId(),
        order.getVehicleId(),
        order.getTask(),
        order.getAssigneeUsername(),
        order.getStatus(),
        order.getDueOn(),
        order.getCost(),
        order.getCompletionNote(),
        order.getCompletedOn(),
        order.getCreatedAt(),
        order.getVersion());
  }

  private static String trimToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private static Long requireTenant() {
    TenantGuard.requireDealerUser();
    return TenantContext.get().tenantDealerId();
  }

  private static String actorUsername() {
    CurrentUser user = TenantContext.get();
    return user == null ? "" : user.username();
  }
}
