package com.dealerops.core.dealer;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface AppUserRepository extends JpaRepository<AppUserEntity, Long> {

  Optional<AppUserEntity> findByUsername(String username);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<AppUserEntity> findWithLockByUsername(String username);
}
