package com.dealerops.core.dealer.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateMemberRequest(@NotBlank String entraOid, @NotBlank String displayName) {}
