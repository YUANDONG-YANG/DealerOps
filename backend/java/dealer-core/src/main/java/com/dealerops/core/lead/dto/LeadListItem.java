package com.dealerops.core.lead.dto;

import com.dealerops.core.lead.LeadStage;
import java.time.LocalDate;

public record LeadListItem(
    Long id,
    Long customerId,
    String customerName,
    LeadVehicleBrief vehicle,
    LeadStage stage,
    String ownerUsername,
    LocalDate nextFollowUpOn,
    boolean overdue,
    int version) {}
