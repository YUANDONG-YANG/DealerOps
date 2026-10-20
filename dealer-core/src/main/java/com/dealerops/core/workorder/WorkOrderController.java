package com.dealerops.core.workorder;

import com.dealerops.core.workorder.dto.CreateWorkOrderRequest;
import com.dealerops.core.workorder.dto.PatchWorkOrderRequest;
import com.dealerops.core.workorder.dto.WorkOrderResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Reconditioning work orders (design/21-Feature-Extensions.md §4). */
@RestController
public class WorkOrderController {

  private final WorkOrderService workOrderService;

  public WorkOrderController(WorkOrderService workOrderService) {
    this.workOrderService = workOrderService;
  }

  @GetMapping("/api/v1/vehicles/{vehicleId}/work-orders")
  public List<WorkOrderResponse> list(@PathVariable Long vehicleId) {
    return workOrderService.list(vehicleId);
  }

  @PostMapping("/api/v1/vehicles/{vehicleId}/work-orders")
  @ResponseStatus(HttpStatus.CREATED)
  public WorkOrderResponse create(
      @PathVariable Long vehicleId, @Valid @RequestBody CreateWorkOrderRequest body) {
    return workOrderService.create(vehicleId, body);
  }

  @PatchMapping("/api/v1/work-orders/{id}")
  public WorkOrderResponse patch(@PathVariable Long id, @Valid @RequestBody PatchWorkOrderRequest body) {
    return workOrderService.patch(id, body);
  }
}
