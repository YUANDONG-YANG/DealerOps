package com.dealerops.core.vehicle;

import com.dealerops.core.common.PageResponse;
import com.dealerops.core.vehicle.dto.CreateVehicleRequest;
import com.dealerops.core.vehicle.dto.PatchVehicleRequest;
import com.dealerops.core.vehicle.dto.SellVehicleRequest;
import com.dealerops.core.vehicle.dto.VehicleResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/vehicles")
public class VehicleController {

  private final VehicleService vehicleService;

  public VehicleController(VehicleService vehicleService) {
    this.vehicleService = vehicleService;
  }

  @GetMapping
  public PageResponse<VehicleResponse> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) VehicleStatus status,
      @RequestParam(required = false) ConditionCode condition,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size) {
    return vehicleService.list(q, status, condition, page, size);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public VehicleResponse create(@Valid @RequestBody CreateVehicleRequest body) {
    return vehicleService.create(body);
  }

  @GetMapping("/{id}")
  public VehicleResponse get(@PathVariable Long id) {
    return vehicleService.get(id);
  }

  @PatchMapping("/{id}")
  public VehicleResponse patch(@PathVariable Long id, @Valid @RequestBody PatchVehicleRequest body) {
    return vehicleService.patch(id, body);
  }

  @PostMapping("/{id}/sell")
  public VehicleResponse sell(@PathVariable Long id, @Valid @RequestBody SellVehicleRequest body) {
    return vehicleService.sell(id, body);
  }
}
