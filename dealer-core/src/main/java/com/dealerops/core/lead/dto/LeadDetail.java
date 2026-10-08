package com.dealerops.core.lead.dto;

import com.dealerops.core.lead.LeadStage;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record LeadDetail(
    Long id,
    Long customerId,
    String customerName,
    LeadVehicleBrief vehicle,
    LeadStage stage,
    String ownerUsername,
    LocalDate nextFollowUpOn,
    boolean overdue,
    String lostReason,
    List<LeadNoteItem> notes,
    Instant createdAt,
    int version) {}
