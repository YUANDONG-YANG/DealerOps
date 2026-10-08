package com.dealerops.core.lead;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LeadRepository extends JpaRepository<LeadEntity, Long> {

  Optional<LeadEntity> findByIdAndDealerId(Long id, Long dealerId);

  List<LeadEntity> findByDealerIdAndCustomerIdOrderByCreatedAtDesc(Long dealerId, Long customerId);

  /** {@code today} is only used when {@code overdue} is true. */
  @Query(
      """
      select l from LeadEntity l, com.dealerops.core.customer.CustomerEntity c
      where c.id = l.customerId and l.dealerId = :dealerId
        and (:q is null or lower(c.name) like lower(concat('%', :q, '%')))
        and (:stage is null or l.stage = :stage)
        and (:owner is null or l.ownerUsername = :owner)
        and (:customerId is null or l.customerId = :customerId)
        and (:overdue is null or :overdue = false
             or (l.stage in (com.dealerops.core.lead.LeadStage.NEW,
                             com.dealerops.core.lead.LeadStage.CONTACTED,
                             com.dealerops.core.lead.LeadStage.QUALIFIED)
                 and l.nextFollowUpOn < :today))
      """)
  Page<LeadEntity> search(
      @Param("dealerId") Long dealerId,
      @Param("q") String q,
      @Param("stage") LeadStage stage,
      @Param("owner") String owner,
      @Param("customerId") Long customerId,
      @Param("overdue") Boolean overdue,
      @Param("today") LocalDate today,
      Pageable pageable);
}
