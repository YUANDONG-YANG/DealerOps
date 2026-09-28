package com.dealerops.core.customer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PatchCustomerRequest(
    @NotNull Integer version,
    @NotBlank @Size(max = 160) String name,
    @NotBlank @Size(max = 160) String email,
    @NotBlank @Size(max = 40) String phone,
    @NotBlank @Size(max = 300) String homeAddress) {}
