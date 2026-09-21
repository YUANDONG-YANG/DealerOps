package com.dealerops.core.integration.dto;

public record AdCheckInternalRequest(
    ListingPublic listing, VehiclePublic vehiclePublic, DealerPublic dealerPublic) {}
