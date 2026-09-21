package com.carventory.repository;

import com.carventory.entity.CarImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CarImageRepository extends JpaRepository<CarImage, Long> {
    Optional<CarImage> findByCarIdAndDeleteFlagFalse(Long carId);

    CarImage findCarImagesByCarId(Long carId);
}
