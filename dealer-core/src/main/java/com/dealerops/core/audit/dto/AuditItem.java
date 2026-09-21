package com.dealerops.core.audit.dto;

import java.time.Instant;
import java.util.Map;

public record AuditItem(
    Long id,
    String entityType,
    Long entityId,
    String action,
    Map<String, Object> fieldSummary,
    String actorOid,
    Instant createdAt) {}
