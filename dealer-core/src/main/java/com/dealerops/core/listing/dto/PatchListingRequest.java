package com.dealerops.core.listing.dto;

import com.dealerops.core.listing.AdKind;
import com.dealerops.core.listing.AdMedium;

public record PatchListingRequest(Integer version, String title, String body, AdKind adKind, AdMedium medium) {}
