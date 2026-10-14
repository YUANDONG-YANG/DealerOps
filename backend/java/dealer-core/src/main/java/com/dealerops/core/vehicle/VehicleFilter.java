package com.dealerops.core.vehicle;

/** DMS list filters; null or blank values are ignored. Make and model match exactly, ignoring case. */
public record VehicleFilter(
    String q,
    VehicleStatus status,
    ConditionCode condition,
    String make,
    String model,
    Integer modelYear) {}
