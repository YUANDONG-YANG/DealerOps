package com.dealerops.core.vehicle.dto;

import com.dealerops.core.vehicle.ConditionCode;
import com.dealerops.core.vehicle.VehicleSource;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

public record PatchVehicleRequest(
    @NotNull Integer version,
    @NotBlank @Size(max = 50) String make,
    @NotBlank @Size(max = 50) String model,
    @NotNull @Min(1900) Integer modelYear,
    @NotBlank
        @Pattern(regexp = "^[A-HJ-NPR-Za-hj-npr-z0-9]{17}$", message = "must be 17 characters without I, O, or Q")
        String vin,
    @NotNull VehicleSource source,
    @NotNull @PositiveOrZero @Digits(integer = 10, fraction = 2) BigDecimal purchaseCost,
    @NotNull @PastOrPresent LocalDate addedOn,
    @NotNull ConditionCode conditionCode,
    @PositiveOrZero @Digits(integer = 10, fraction = 2) BigDecimal repairCost,
    @Size(max = 500) @Pattern(regexp = "(?i)^https?://\\S+$", message = "must be an http(s) URL")
        String carfaxUrl) {}
