package com.dealerops.core.workorder.dto;

import com.dealerops.core.workorder.WorkOrderStatus;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Full editable state of an open work order. {@code cost} and {@code completionNote} are read
 * only when {@code status} is DONE.
 */
public record PatchWorkOrderRequest(
    @NotNull WorkOrderStatus status,
    @NotBlank @Size(max = 200) String task,
    @Size(max = 64) String assigneeUsername,
    LocalDate dueOn,
    @PositiveOrZero @Digits(integer = 10, fraction = 2) BigDecimal cost,
    @Size(max = 500) String completionNote,
    @NotNull Integer version) {}
