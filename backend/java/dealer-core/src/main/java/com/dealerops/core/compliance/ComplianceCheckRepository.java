package com.dealerops.core.compliance;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ComplianceCheckRepository extends JpaRepository<ComplianceCheckEntity, Long> {

  Optional<ComplianceCheckEntity> findByIdAndDealerId(Long id, Long dealerId);
}
