package com.dealerops.core.security.dto;

public record MeResponse(
    String entraOid, String displayName, String role, Long dealerId, String dealerLegalName) {}
