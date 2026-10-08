package com.dealerops.core.dealer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;

/**
 * A new user signs in with the username, email, or phone; it needs at least one of email or phone
 * (normalized by LoginIdentifiers). An existing account keeps its current credentials when an
 * administrator binds it to a dealership.
 */
public record CreateMemberRequest(
    @NotBlank @Size(max = 64) String username,
    @Size(max = 120) String displayName,
    @Size(min = 8) String password,
    @Email @Size(max = 254) String email,
    @Size(max = 40) String phone) {}
