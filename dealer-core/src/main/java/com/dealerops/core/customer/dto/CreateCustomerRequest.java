package com.dealerops.core.customer.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateCustomerRequest(
    @NotBlank String name, @NotBlank String email, @NotBlank String phone, @NotBlank String homeAddress) {}
