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
        and (:make is null or lower(v.make) = lower(:make))
        and (:model is null or lower(v.model) = lower(:model))
        and (:modelYear is null or v.modelYear = :modelYear)
      """)
  Page<VehicleEntity> search(
      @Param("dealerId") Long dealerId,
      @Param("q") String q,
      @Param("status") VehicleStatus status,
      @Param("condition") ConditionCode condition,
      @Param("make") String make,
      @Param("model") String model,
      @Param("modelYear") Integer modelYear,
      Pageable pageable);

  @Query(
      """
      select v from VehicleEntity v
      where (:status is null or v.status = :status)
        and (:condition is null or v.conditionCode = :condition)
        and (:q is null or :q = ''
             or lower(v.vin) like lower(concat('%', :q, '%'))
             or lower(v.make) like lower(concat('%', :q, '%'))
             or lower(v.model) like lower(concat('%', :q, '%')))
        and (:make is null or lower(v.make) = lower(:make))
        and (:model is null or lower(v.model) = lower(:model))
        and (:modelYear is null or v.modelYear = :modelYear)
      """)
  Page<VehicleEntity> searchAll(
      @Param("q") String q,
      @Param("status") VehicleStatus status,
      @Param("condition") ConditionCode condition,
      @Param("make") String make,
      @Param("model") String model,
      @Param("modelYear") Integer modelYear,
      Pageable pageable);
}
