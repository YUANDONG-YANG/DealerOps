package com.dealerops.core.dealer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PatchDealerRequest(
    @NotNull Integer version,
    @NotBlank String legalName,
    @NotBlank String contactPhone,
    @NotBlank String contactEmail,
    @NotBlank String contactAddress,
    @NotNull Boolean active) {}
