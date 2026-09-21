package com.dealerops.core.dealer.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateDealerRequest(
    @NotBlank String legalName,
    @NotBlank String contactPhone,
    @NotBlank String contactEmail,
    @NotBlank String contactAddress) {}
