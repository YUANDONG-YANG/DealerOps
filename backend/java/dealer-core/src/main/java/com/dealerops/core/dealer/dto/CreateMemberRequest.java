package com.dealerops.core.dealer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Email;

/**
 * A new user signs in with the username, email, or phone; it needs at least one of email or phone
 * (normalized by LoginIdentifiers). An existing account keeps its current credentials when an
 * administrator binds it to a dealership.
 */
public record CreateMemberRequest(
    // Same rule as RegisterRequest: a letter is required so a username never reads as a phone.
    @NotBlank @Pattern(regexp = "(?=.*[A-Za-z])[A-Za-z0-9._-]{3,64}") String username,
    @Size(max = 120) String displayName,
    @Size(min = 8, max = 72) String password,
    @Email @Size(max = 254) String email,
    @Size(max = 40) String phone) {}
