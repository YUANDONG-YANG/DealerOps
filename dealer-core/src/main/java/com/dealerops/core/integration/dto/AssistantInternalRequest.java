package com.dealerops.core.integration.dto;

import java.util.List;

public record AssistantInternalRequest(String question, List<ResourceRef> resources) {}
