package com.dealerops.core.dealer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Self sign-up. The username is the account's own sign-in name; at least one of email or phone is
 * required. A username needs a letter so it can never be mistaken for a phone number at sign-in.
 */
public record RegisterRequest(
    @NotBlank(message = "Enter a username.")
        @Pattern(
            regexp = "(?=.*[A-Za-z])[A-Za-z0-9._-]{3,64}",
            message = "Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter.")
        String username,
    @NotBlank(message = "Enter your full name.") @Size(max = 120, message = "Use at most 120 characters.")
        String displayName,
    @Size(max = 254, message = "Use at most 254 characters.") String email,
    @Size(max = 40, message = "Use at most 40 characters.") String phone,
    @NotBlank(message = "Enter a password.")
        @Size(min = 8, max = 72, message = "Use 8-72 characters.")
        String password) {}
