package com.dealerops.core.assistant;

import com.dealerops.core.assistant.dto.ResourceCard;
import com.dealerops.core.compliance.CheckStatusMapper;
import com.dealerops.core.compliance.ComplianceCheckEntity;
import com.dealerops.core.compliance.ComplianceCheckRepository;
import com.dealerops.core.customer.CustomerEntity;
import com.dealerops.core.customer.CustomerRepository;
import com.dealerops.core.listing.ListingEntity;
import com.dealerops.core.listing.ListingRepository;
import com.dealerops.core.vehicle.VehicleEntity;
import com.dealerops.core.vehicle.VehicleRepository;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

@Component
public class AssistantResourceQuery {

  private final VehicleRepository vehicleRepository;
  private final CustomerRepository customerRepository;
  private final ListingRepository listingRepository;
  private final ComplianceCheckRepository checkRepository;
  private final CheckStatusMapper checkStatusMapper;

  public AssistantResourceQuery(
      VehicleRepository vehicleRepository,
      CustomerRepository customerRepository,
      ListingRepository listingRepository,
      ComplianceCheckRepository checkRepository,
      CheckStatusMapper checkStatusMapper) {
    this.vehicleRepository = vehicleRepository;
    this.customerRepository = customerRepository;
    this.listingRepository = listingRepository;
    this.checkRepository = checkRepository;
    this.checkStatusMapper = checkStatusMapper;
  }

  public List<ResourceCard> load(Long tenantDealerId, String text) {
    String q = text == null ? "" : text.trim();
    List<ResourceCard> cards = new ArrayList<>();
    Set<Long> vehicleIds = new LinkedHashSet<>();
    for (VehicleEntity vehicle :
        vehicleRepository.search(tenantDealerId, q, null, null, PageRequest.of(0, 5))) {
      if (cards.size() >= 5) {
        break;
      }
      vehicleIds.add(vehicle.getId());
      cards.add(
          new ResourceCard(
              "VEHICLE",
              vehicle.getId(),
              vehicle.getModelYear() + " " + vehicle.getMake() + " " + vehicle.getModel(),
              vehicle.getStatus().name(),
              null,
              null));
    }
    for (CustomerEntity customer :
        customerRepository.search(tenantDealerId, q, null, PageRequest.of(0, 5))) {
      if (cards.size() >= 5) {
        break;
      }
      cards.add(new ResourceCard("CUSTOMER", customer.getId(), customer.getName(), null, null, null));
    }
    for (Long vehicleId : vehicleIds) {
      if (cards.size() >= 5) {
        break;
      }
      listingRepository
          .findByVehicleIdAndDealerId(vehicleId, tenantDealerId)
          .ifPresent(listing -> cards.add(toListingCard(listing, tenantDealerId)));
    }
    return cards.size() <= 5 ? cards : cards.subList(0, 5);
  }

  private ResourceCard toListingCard(ListingEntity listing, Long tenantDealerId) {
    ComplianceCheckEntity last =
        listing.getLastCheckId() == null
            ? null
            : checkRepository
                .findByIdAndDealerId(listing.getLastCheckId(), tenantDealerId)
                .filter(
                    check ->
                        listing.getId().equals(check.getListingId())
                            && listing.getDealerId().equals(check.getDealerId()))
                .orElse(null);
    return new ResourceCard(
        "LISTING",
        listing.getId(),
        listing.getTitle() == null || listing.getTitle().isBlank()
            ? "Listing " + listing.getId()
            : listing.getTitle(),
        listing.getStatus().name(),
        listing.getVehicleId(),
        checkStatusMapper.derive(listing, last));
  }
}
