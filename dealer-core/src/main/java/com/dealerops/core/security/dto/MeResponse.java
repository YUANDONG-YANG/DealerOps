package com.dealerops.core.security.dto;

/** Dealer contact fields are the dealership's public data (ad compliance shows them, UI-41). */
public record MeResponse(
    String username,
    String displayName,
    String role,
    Long dealerId,
    String dealerLegalName,
    String dealerContactPhone,
    String dealerContactEmail,
    String dealerContactAddress) {}
