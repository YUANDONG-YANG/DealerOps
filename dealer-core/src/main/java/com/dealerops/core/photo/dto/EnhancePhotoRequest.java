package com.dealerops.core.photo.dto;

import com.dealerops.core.photo.PhotoPreset;
import jakarta.validation.constraints.NotNull;

public record EnhancePhotoRequest(@NotNull PhotoPreset preset) {}
