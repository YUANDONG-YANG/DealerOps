package com.dealerops.core.assistant.dto;

import java.util.List;

public record AskResponse(String summary, boolean summaryAvailable, List<ResourceCard> cards) {}
