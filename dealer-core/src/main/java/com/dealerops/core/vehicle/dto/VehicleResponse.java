package com.dealerops.core.vehicle.dto;

import com.dealerops.core.vehicle.ConditionCode;
import com.dealerops.core.vehicle.VehicleSource;
import com.dealerops.core.vehicle.VehicleStatus;
import java.math.BigDecimal;
import java.time.LocalDate;

public record VehicleResponse(
    Long id,
    String vin,
    String make,
    String model,
    int modelYear,
    VehicleSource source,
    BigDecimal purchaseCost,
    LocalDate addedOn,
    ConditionCode conditionCode,
    BigDecimal repairCost,
    String carfaxUrl,
    LocalDate soldOn,
    BigDecimal soldPrice,
    VehicleStatus status,
    int version) {}
