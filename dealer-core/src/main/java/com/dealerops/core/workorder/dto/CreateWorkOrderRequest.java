package com.dealerops.core.workorder.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record CreateWorkOrderRequest(
    @NotBlank @Size(max = 200) String task, @Size(max = 64) String assigneeUsername, LocalDate dueOn) {}
