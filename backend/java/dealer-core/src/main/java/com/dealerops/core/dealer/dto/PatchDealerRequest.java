package com.dealerops.core.dealer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** {@code logoDataUrl} is optional; null removes the logo (full replacement). */
public record PatchDealerRequest(
    @NotNull Integer version,
    @NotBlank String legalName,
    @NotBlank String contactPhone,
    @NotBlank String contactEmail,
    @NotBlank String contactAddress,
    @NotNull Boolean active,
    @Size(max = 200_000, message = "Logo is too large")
        @Pattern(
            regexp = "data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}",
            message = "Logo must be a PNG, JPEG, or WebP image")
        String logoDataUrl) {}
