package com.dealerops.core.customer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PatchCustomerRequest(
    @NotNull Integer version,
    @NotBlank String name,
    @NotBlank String email,
    @NotBlank String phone,
    @NotBlank String homeAddress) {}
