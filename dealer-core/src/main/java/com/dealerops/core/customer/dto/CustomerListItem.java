package com.dealerops.core.customer.dto;

public record CustomerListItem(
    Long id,
    String name,
    String email,
    String phone,
    String homeAddress,
    LinkedVehicleBrief linkedVehicle,
    int version) {}
