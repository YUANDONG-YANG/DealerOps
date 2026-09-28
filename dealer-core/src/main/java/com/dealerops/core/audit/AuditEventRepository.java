package com.dealerops.core.audit;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventRepository extends JpaRepository<AuditEventEntity, Long> {

  List<AuditEventEntity> findByDealerIdOrderByCreatedAtDescIdDesc(Long dealerId);

  boolean existsByDealerIdAndEntityTypeAndEntityId(Long dealerId, String entityType, long entityId);

  Page<AuditEventEntity> findByDealerIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(
      Long dealerId, String entityType, long entityId, Pageable pageable);
}
