package com.dealerops.core.customer.dto;

import com.dealerops.core.vehicle.VehicleStatus;

public record LinkedVehicleItem(
    Long id, String vin, int modelYear, String make, String model, VehicleStatus status) {}
