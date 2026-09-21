package com.dealerops.core.dealer;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUserEntity, Long> {

  Optional<AppUserEntity> findByEntraTenantIdAndEntraOid(String tid, String oid);
}
