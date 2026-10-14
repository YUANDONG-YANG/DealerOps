package com.dealerops.core.listing;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ListingRepository extends JpaRepository<ListingEntity, Long> {

  Optional<ListingEntity> findByVehicleIdAndDealerId(Long vehicleId, Long dealerId);

  Optional<ListingEntity> findByIdAndDealerId(Long id, Long dealerId);
}
