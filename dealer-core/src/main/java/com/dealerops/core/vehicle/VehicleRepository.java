package com.dealerops.core.vehicle;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VehicleRepository extends JpaRepository<VehicleEntity, Long> {

  boolean existsByDealerIdAndVin(Long dealerId, String vin);

  Optional<VehicleEntity> findByIdAndDealerId(Long id, Long dealerId);

  @Query(
      """
      select v from VehicleEntity v
      where v.dealerId = :dealerId
        and (:status is null or v.status = :status)
        and (:condition is null or v.conditionCode = :condition)
        and (:q is null or :q = ''
             or lower(v.vin) like lower(concat('%', :q, '%'))
             or lower(v.make) like lower(concat('%', :q, '%'))
             or lower(v.model) like lower(concat('%', :q, '%')))
      """)
  Page<VehicleEntity> search(
      @Param("dealerId") Long dealerId,
      @Param("q") String q,
      @Param("status") VehicleStatus status,
      @Param("condition") ConditionCode condition,
      Pageable pageable);
}
