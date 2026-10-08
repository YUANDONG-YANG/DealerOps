package com.dealerops.core.lead;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LeadNoteRepository extends JpaRepository<LeadNoteEntity, Long> {

  List<LeadNoteEntity> findByLeadIdAndDealerIdOrderByCreatedAtDescIdDesc(Long leadId, Long dealerId);
}
