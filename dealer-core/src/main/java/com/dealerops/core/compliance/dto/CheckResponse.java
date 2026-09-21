package com.dealerops.core.compliance.dto;

import com.dealerops.core.compliance.AiStatus;
import com.dealerops.core.compliance.Recommendation;
import java.time.Instant;
import java.util.List;

public record CheckResponse(
    Long id,
    Long listingId,
    int contentVersion,
    List<RuleFinding> ruleFindings,
    AiStatus aiStatus,
    List<AiNote> aiNotes,
    Recommendation recommendation,
    String checkStatus,
    Instant createdAt) {}
