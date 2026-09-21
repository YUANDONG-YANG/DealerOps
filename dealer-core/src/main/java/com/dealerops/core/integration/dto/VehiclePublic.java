package com.dealerops.core.integration.dto;

public record VehiclePublic(
    int modelYear, String make, String model, String vin, String conditionCode, String source) {}
