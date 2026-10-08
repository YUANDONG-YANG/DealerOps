package com.dealerops.core.workorder.dto;

import com.dealerops.core.workorder.WorkOrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record WorkOrderResponse(
    Long id,
    Long vehicleId,
    String task,
    String assigneeUsername,
    WorkOrderStatus status,
    LocalDate dueOn,
    BigDecimal cost,
    String completionNote,
    LocalDate completedOn,
    Instant createdAt,
    int version) {}
