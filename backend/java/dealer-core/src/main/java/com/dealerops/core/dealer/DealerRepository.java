package com.dealerops.core.dealer;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DealerRepository extends JpaRepository<DealerEntity, Long> {

  Page<DealerEntity> findByLegalNameContainingIgnoreCase(String q, Pageable pageable);
}
