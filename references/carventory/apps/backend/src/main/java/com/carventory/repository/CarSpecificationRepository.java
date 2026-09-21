package com.carventory.repository;

import com.carventory.entity.CarSpecification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CarSpecificationRepository extends JpaRepository<CarSpecification, Long> {
    Optional<CarSpecification> findByCarId(Long carId);
}
