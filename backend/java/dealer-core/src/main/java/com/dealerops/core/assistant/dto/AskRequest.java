package com.dealerops.core.assistant.dto;

import jakarta.validation.constraints.NotBlank;

public record AskRequest(@NotBlank String text) {}
