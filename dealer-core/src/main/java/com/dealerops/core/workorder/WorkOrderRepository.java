package com.dealerops.core.workorder;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkOrderRepository extends JpaRepository<WorkOrderEntity, Long> {

  Optional<WorkOrderEntity> findByIdAndDealerId(Long id, Long dealerId);

  List<WorkOrderEntity> findByVehicleIdAndDealerIdOrderByCreatedAtDescIdDesc(Long vehicleId, Long dealerId);

  long countByVehicleIdAndDealerIdAndStatusIn(
      Long vehicleId, Long dealerId, Collection<WorkOrderStatus> statuses);
}
