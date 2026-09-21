package com.dealerops.core.dealer;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipRepository extends JpaRepository<MembershipEntity, Long> {
  List<MembershipEntity> findByEntraOidAndActiveTrue(String entraOid);

  Optional<MembershipEntity> findByDealerIdAndEntraOid(Long dealerId, String entraOid);

  long countByDealerIdAndActiveTrue(Long dealerId);
}
