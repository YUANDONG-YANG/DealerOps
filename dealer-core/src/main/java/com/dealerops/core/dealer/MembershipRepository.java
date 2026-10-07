package com.dealerops.core.dealer;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipRepository extends JpaRepository<MembershipEntity, Long> {

  List<MembershipEntity> findByUsernameAndActiveTrue(String username);

  Optional<MembershipEntity> findByDealerIdAndUsername(Long dealerId, String username);

  long countByDealerIdAndActiveTrue(Long dealerId);

  Page<MembershipEntity> findByDealerId(Long dealerId, Pageable pageable);
}
