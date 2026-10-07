package com.dealerops.core.dealer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** username is the login the admin assigns; password is the temporary password issued with it. */
public record CreateMemberRequest(
    @NotBlank @Size(max = 64) String username,
    @NotBlank @Size(max = 120) String displayName,
    @NotBlank @Size(min = 8) String password) {}
