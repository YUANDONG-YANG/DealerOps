package com.dealerops.core.lead.dto;

import java.time.Instant;

public record LeadNoteItem(Long id, String authorUsername, String body, Instant createdAt) {}
