package com.dealerops.core.photo.dto;

import com.dealerops.core.photo.PhotoPreset;
import java.time.Instant;

/** Photo metadata; {@code enhancement} is null until a preset has been applied. */
public record PhotoItem(
    Long id,
    Long vehicleId,
    String contentType,
    PhotoPreset enhancement,
    String uploadedBy,
    Instant createdAt) {}
