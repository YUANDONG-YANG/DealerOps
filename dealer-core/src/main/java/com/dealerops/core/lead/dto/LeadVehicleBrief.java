package com.dealerops.core.lead.dto;

import com.dealerops.core.vehicle.VehicleStatus;

public record LeadVehicleBrief(
    Long id, String vin, int modelYear, String make, String model, VehicleStatus status) {}
