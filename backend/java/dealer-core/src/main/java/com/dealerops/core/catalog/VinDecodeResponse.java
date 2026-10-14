package com.dealerops.core.catalog;

/** Basic vehicle facts decoded from a VIN by NHTSA vPIC. Blank vPIC values become null. */
public record VinDecodeResponse(
    String vin,
    String make,
    String model,
    Integer modelYear,
    String bodyClass,
    String engine,
    String country,
    String manufacturer) {}
