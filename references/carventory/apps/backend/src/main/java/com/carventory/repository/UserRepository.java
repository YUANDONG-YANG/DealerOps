package com.carventory.repository;

import com.carventory.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailAndDeleteFlagFalse(String email);

    Optional<User> findByEmailAndDeleteFlagFalseAndIsActiveTrue(String email);

    List<User> findAllByCompanyIdAndDeleteFlagFalse(Long companyId);

    Optional<User> findByIdAndDeleteFlagFalse(Long userId);

    Optional<User> findByEmail(String username);
}