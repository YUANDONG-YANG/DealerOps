package com.dealerops.core.listing.dto;

import com.dealerops.core.compliance.dto.CheckResponse;
import com.dealerops.core.listing.AdKind;
import com.dealerops.core.listing.AdMedium;
import com.dealerops.core.listing.ListingStatus;

public record ListingResponse(
    Long id,
    Long vehicleId,
    String title,
    String body,
    AdKind adKind,
    AdMedium medium,
    ListingStatus status,
    int contentVersion,
    Long lastCheckId,
    CheckResponse lastCheck,
    String checkStatus,
    int version) {}
