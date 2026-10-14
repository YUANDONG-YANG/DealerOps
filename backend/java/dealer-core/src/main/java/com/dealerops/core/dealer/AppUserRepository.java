package com.dealerops.core.dealer;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUserEntity, Long> {

  Optional<AppUserEntity> findByUsername(String username);

  Optional<AppUserEntity> findByEmailIgnoreCaseAndActiveTrue(String email);

  Optional<AppUserEntity> findByPhoneAndActiveTrue(String phone);

  boolean existsByUsername(String username);

  boolean existsByDisplayNameIgnoreCase(String displayName);

  boolean existsByEmailIgnoreCase(String email);

  boolean existsByPhone(String phone);

  /** Accounts of {@code role} with no active membership: self sign-ups and unbound staff. */
  @Query(
      """
      select u from AppUserEntity u
      where u.role = :role
        and u.active = true
        and not exists (
          select 1 from MembershipEntity m where m.username = u.username and m.active = true)
        and (:q is null
             or lower(u.username) like lower(concat('%', :q, '%'))
             or lower(u.displayName) like lower(concat('%', :q, '%'))
             or lower(coalesce(u.email, '')) like lower(concat('%', :q, '%'))
             or lower(coalesce(u.phone, '')) like lower(concat('%', :q, '%')))
      """)
  Page<AppUserEntity> findPending(
      @Param("role") AppRole role, @Param("q") String q, Pageable pageable);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<AppUserEntity> findWithLockByUsername(String username);
}
