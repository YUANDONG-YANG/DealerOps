package com.dealerops.core.customer.dto;

import java.time.Instant;

public record LinkResponse(Long id, Long customerId, Long vehicleId, Instant linkedAt) {}
