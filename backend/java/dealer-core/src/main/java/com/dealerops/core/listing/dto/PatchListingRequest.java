package com.dealerops.core.listing.dto;

import com.dealerops.core.listing.AdKind;
import com.dealerops.core.listing.AdMedium;
import jakarta.validation.constraints.Size;

public record PatchListingRequest(
    Integer version, @Size(max = 200) String title, String body, AdKind adKind, AdMedium medium) {}
