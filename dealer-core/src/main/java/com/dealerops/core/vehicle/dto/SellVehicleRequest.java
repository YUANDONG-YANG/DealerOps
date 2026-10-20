package com.dealerops.core.vehicle.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import java.math.BigDecimal;
import java.time.LocalDate;

public record SellVehicleRequest(
    @PastOrPresent LocalDate soldOn,
    @Digits(integer = 10, fraction = 2) BigDecimal soldPrice,
    @NotNull Integer version) {}
