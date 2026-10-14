package com.dealerops.core.dealer.dto;

public record DealerResponse(
    Long id,
    String legalName,
    String contactPhone,
    String contactEmail,
    String contactAddress,
    String logoDataUrl,
    boolean active,
    long staffCount,
    int version) {}
