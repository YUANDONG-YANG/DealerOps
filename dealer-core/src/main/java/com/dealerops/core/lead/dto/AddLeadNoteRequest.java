package com.dealerops.core.lead.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddLeadNoteRequest(@NotBlank @Size(max = 2000) String body) {}
