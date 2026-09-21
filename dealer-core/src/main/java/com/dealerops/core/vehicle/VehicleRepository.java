package com.dealerops.core.vehicle;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<VehicleEntity, Long> {
  boolean existsByDealerIdAndVin(Long dealerId, String vin);

  Optional<VehicleEntity> findByIdAndDealerId(Long id, Long dealerId);
}
