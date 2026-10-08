package com.dealerops.core.lead.dto;

import com.dealerops.core.customer.dto.CreateCustomerRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Exactly one of {@code customerId} or {@code newCustomer}. */
public record CreateLeadRequest(
    Long customerId,
    @Valid CreateCustomerRequest newCustomer,
    Long vehicleId,
    @Size(max = 64) String ownerUsername,
    LocalDate nextFollowUpOn,
    @Size(max = 2000) String note) {}
