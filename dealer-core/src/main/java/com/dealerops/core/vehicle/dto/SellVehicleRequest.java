package com.dealerops.core.vehicle.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record SellVehicleRequest(LocalDate soldOn, BigDecimal soldPrice, @NotNull Integer version) {}
