package com.dealerops.core.vehicle.dto;

/** The customer a vehicle is linked to (DMS-08); name only, never contact fields (CRM-12). */
public record LinkedCustomerBrief(Long id, String name) {}
