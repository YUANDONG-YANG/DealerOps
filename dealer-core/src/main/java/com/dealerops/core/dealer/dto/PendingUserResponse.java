package com.dealerops.core.dealer.dto;

import java.time.Instant;

/** A Dealer.User account that has no active dealership membership yet. */
public record PendingUserResponse(String username, String displayName, String email, String phone, Instant createdAt) {}
