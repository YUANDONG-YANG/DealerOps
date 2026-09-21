package com.dealerops.core.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventRepository extends JpaRepository<AuditEventEntity, Long> {

  Page<AuditEventEntity> findByDealerIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
      Long dealerId, String entityType, long entityId, Pageable pageable);
}
