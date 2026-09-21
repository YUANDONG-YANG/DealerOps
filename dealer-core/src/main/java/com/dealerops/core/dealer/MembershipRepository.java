package com.dealerops.core.dealer;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipRepository extends JpaRepository<MembershipEntity, Long> {

  List<MembershipEntity> findByEntraOidAndActiveTrue(String entraOid);

  Optional<MembershipEntity> findByDealerIdAndEntraOid(Long dealerId, String entraOid);

  long countByDealerIdAndActiveTrue(Long dealerId);

  Page<MembershipEntity> findByDealerId(Long dealerId, Pageable pageable);

  Page<MembershipEntity> findByDealerIdAndEntraOidContainingIgnoreCase(
      Long dealerId, String entraOid, Pageable pageable);
}
