package com.dealerops.core.listing;

import com.dealerops.core.listing.dto.ListingResponse;
import com.dealerops.core.listing.dto.PatchListingRequest;
import com.dealerops.core.listing.dto.VersionBody;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ListingController {

  private final ListingService listingService;

  public ListingController(ListingService listingService) {
    this.listingService = listingService;
  }

  @GetMapping("/api/v1/vehicles/{id}/listing")
  public ListingResponse getByVehicle(@PathVariable Long id) {
    return listingService.getByVehicle(id);
  }

  @PatchMapping("/api/v1/vehicles/{id}/listing")
  public ListingResponse patchByVehicle(@PathVariable Long id, @RequestBody PatchListingRequest body) {
    return listingService.patchByVehicle(id, body);
  }

  @PostMapping("/api/v1/listings/{id}/ready")
  public ListingResponse ready(@PathVariable Long id, @Valid @RequestBody VersionBody body) {
    return listingService.ready(id, body);
  }

  @PostMapping("/api/v1/listings/{id}/exports")
  public ResponseEntity<String> export(@PathVariable Long id, @Valid @RequestBody VersionBody body) {
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("text/plain;charset=UTF-8"))
        .body(listingService.export(id, body));
  }
}
