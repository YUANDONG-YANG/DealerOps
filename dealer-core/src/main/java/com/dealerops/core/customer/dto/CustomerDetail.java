package com.dealerops.core.customer.dto;

import java.util.List;

public record CustomerDetail(
    Long id,
    String name,
    String email,
    String phone,
    String homeAddress,
    List<LinkedVehicleItem> linkedVehicles,
    int version) {}
