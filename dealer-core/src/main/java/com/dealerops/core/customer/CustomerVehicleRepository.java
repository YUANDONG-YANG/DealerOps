package com.dealerops.core.customer;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerVehicleRepository extends JpaRepository<CustomerVehicleEntity, Long> {

  boolean existsByVehicleId(Long vehicleId);

  Optional<CustomerVehicleEntity> findByCustomerIdAndVehicleId(Long customerId, Long vehicleId);

  List<CustomerVehicleEntity> findByCustomerIdOrderByLinkedAtDesc(Long customerId);
}
