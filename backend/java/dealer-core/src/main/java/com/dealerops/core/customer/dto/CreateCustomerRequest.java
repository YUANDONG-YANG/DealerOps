package com.dealerops.core.customer.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateCustomerRequest(
    @NotBlank @Size(max = CustomerFieldRules.NAME_MAX) String name,
    @NotBlank @Email @Size(max = CustomerFieldRules.EMAIL_MAX) String email,
    @NotBlank
        @Pattern(regexp = CustomerFieldRules.PHONE_PATTERN)
        @Size(max = CustomerFieldRules.PHONE_MAX)
        String phone,
    @NotBlank @Size(max = CustomerFieldRules.HOME_ADDRESS_MAX) String homeAddress) {}
