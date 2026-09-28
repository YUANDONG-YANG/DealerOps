package com.dealerops.core.vehicle.dto;

import com.dealerops.core.vehicle.ConditionCode;
import com.dealerops.core.vehicle.VehicleSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateVehicleRequest(
    @NotBlank @Size(max = 80) String make,
    @NotBlank @Size(max = 80) String model,
    @NotNull Integer modelYear,
    @NotBlank @Size(max = 32) String vin,
    @NotNull VehicleSource source,
    @NotNull BigDecimal purchaseCost,
    @NotNull LocalDate addedOn,
    @NotNull ConditionCode conditionCode,
    BigDecimal repairCost,
    @Size(max = 500) String carfaxUrl) {}
