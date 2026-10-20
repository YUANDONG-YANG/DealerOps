package com.dealerops.core.lead.dto;

import com.dealerops.core.lead.LeadStage;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Full editable state of a lead; a null field clears it (stage and version are required). */
public record PatchLeadRequest(
    @NotNull LeadStage stage,
    @Size(max = 64) String ownerUsername,
    LocalDate nextFollowUpOn,
    Long vehicleId,
    @Size(max = 300) String lostReason,
    @NotNull Integer version) {}
