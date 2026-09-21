package com.dealerops.core.customer;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerRepository extends JpaRepository<CustomerEntity, Long> {

  Optional<CustomerEntity> findByIdAndDealerId(Long id, Long dealerId);

  @Query(
      """
      select c from CustomerEntity c
      where c.dealerId = :dealerId
        and (:q is null or :q = ''
             or lower(c.name) like lower(concat('%', :q, '%'))
             or lower(c.email) like lower(concat('%', :q, '%'))
             or lower(c.phone) like lower(concat('%', :q, '%')))
        and (:linked is null
             or (:linked = true and exists (
                  select 1 from CustomerVehicleEntity cv where cv.customerId = c.id))
             or (:linked = false and not exists (
                  select 1 from CustomerVehicleEntity cv where cv.customerId = c.id)))
      """)
  Page<CustomerEntity> search(
      @Param("dealerId") Long dealerId,
      @Param("q") String q,
      @Param("linked") Boolean linked,
      Pageable pageable);
}
