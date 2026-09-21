package com.dealerops.core.vehicle.dto;

import com.dealerops.core.vehicle.ConditionCode;
import com.dealerops.core.vehicle.VehicleSource;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateVehicleRequest(
    @NotBlank String make,
    @NotBlank String model,
    @NotNull Integer modelYear,
    @NotBlank String vin,
    @NotNull VehicleSource source,
    @NotNull BigDecimal purchaseCost,
    @NotNull LocalDate addedOn,
    @NotNull ConditionCode conditionCode,
    BigDecimal repairCost,
    String carfaxUrl) {}
