package com.dealerops.core.dealer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** entraOid is the username the admin assigns; password is the temporary password issued with it. */
public record CreateMemberRequest(
    @NotBlank String entraOid, @NotBlank String displayName, @NotBlank @Size(min = 8) String password) {}
