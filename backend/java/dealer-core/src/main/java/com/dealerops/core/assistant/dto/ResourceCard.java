package com.dealerops.core.assistant.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ResourceCard(
    String kind, Long id, String label, String status, Long vehicleId, String checkStatus) {}
