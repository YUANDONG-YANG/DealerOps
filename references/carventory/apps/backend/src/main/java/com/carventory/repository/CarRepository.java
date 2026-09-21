package com.carventory.repository;

import com.carventory.entity.Car;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CarRepository extends JpaRepository<Car, Long> {

    List<Car> findByCompanyIdAndDeleteFlagFalse(Long companyId);

    Optional<Car> findByVinAndDeleteFlagFalse(String vin);

    Optional<Car> findByVinAndCompanyIdAndDeleteFlagFalse(String vin, Long companyId);

    @Query("SELECT COUNT(c) FROM Car c WHERE c.deleteFlag = false AND c.company.id = :companyId")
    long countByDeleteFlagFalseAndCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(c) FROM Car c WHERE c.status = 'Available' AND c.deleteFlag = false AND c.company.id = :companyId")
    long countAvailableCars(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(c) FROM Car c WHERE c.status = 'Sold' AND c.deleteFlag = false AND c.company.id = :companyId")
    long countSoldCars(@Param("companyId") Long companyId);

    @Query("SELECT COUNT(c) FROM Car c WHERE c.status = 'Maintenance' AND c.deleteFlag = false AND c.company.id = :companyId")
    long countMaintenanceCars(@Param("companyId") Long companyId);

    @Query("SELECT c FROM Car c " +
            "WHERE (LOWER(c.make) LIKE LOWER(CONCAT('%', :make, '%')) " +
            "OR LOWER(c.model) LIKE LOWER(CONCAT('%', :model, '%'))) " +
            "AND c.company.id = :companyId " +
            "AND c.deleteFlag = false")
    List<Car> findByMakeOrModelLikeIgnoreCaseAndCompanyId(String make, String model, Long companyId);

    List<Car> findAllByBuyerIsNotNullAndCompanyIdAndDeleteFlagFalse(Long companyId);

    List<Car> findAllByBuyerIsNotNullAndDeleteFlagFalse();

    @Query("SELECT c FROM Car c WHERE c.purchaseDate < :cutoffDate AND c.status = 'Available' AND c.deleteFlag = false AND c.company.id = :companyId")
    List<Car> findCarsOlderThan(@Param("cutoffDate") LocalDate cutoffDate, @Param("companyId") Long companyId);

    @Query("SELECT SUM(c.purchasePrice) FROM Car c WHERE c.company.id = :companyId AND c.deleteFlag = false")
    Double getTotalPurchasePriceByCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT c FROM Car c " +
            "WHERE c.status = 'Available' " +
            "AND c.deleteFlag = false " +
            "AND c.company.id = :companyId " +
            "ORDER BY c.purchaseDate ASC")
    List<Car> findCarsOrderByPurchaseDateAsc(@Param("companyId") Long companyId);

    @Query("SELECT c FROM Car c WHERE c.status = 'Available' AND c.deleteFlag = false")
    List<Car> findAvailableCarsForCustomer();

    @Query("SELECT c FROM Car c WHERE LOWER(c.company.state) = LOWER(:state) AND c.deleteFlag = false")
    List<Car> findByCompanyStateAndDeleteFlagFalse(@Param("state") String state);

    @Query("SELECT c FROM Car c WHERE LOWER(c.company.city) = LOWER(:city) AND c.deleteFlag = false")
    List<Car> findByCompanyCityAndDeleteFlagFalse(@Param("city") String city);

    @Query("SELECT c FROM Car c WHERE LOWER(c.make) = LOWER(:make) AND c.deleteFlag = false")
    List<Car> findByMakeIgnoreCaseAndDeleteFlagFalse(@Param("make") String make);

    @Query("SELECT c FROM Car c WHERE LOWER(c.fuelType) = LOWER(:fuelType) AND c.deleteFlag = false")
    List<Car> findByFuelTypeIgnoreCaseAndDeleteFlagFalse(@Param("fuelType") String fuelType);

    @Query("SELECT c FROM Car c WHERE LOWER(c.transmission) = LOWER(:transmission) AND c.deleteFlag = false")
    List<Car> findByTransmissionIgnoreCaseAndDeleteFlagFalse(@Param("transmission") String transmission);

    @Query("SELECT c FROM Car c WHERE c.year = :year AND c.deleteFlag = false")
    List<Car> findByYearAndDeleteFlagFalse(@Param("year") int year);

    @Query("SELECT c FROM Car c WHERE c.mileage = :mileage AND c.deleteFlag = false")
    List<Car> findByMileageAndDeleteFlagFalse(@Param("mileage") double mileage);

    @Query("SELECT c FROM Car c WHERE c.price = :price AND c.deleteFlag = false")
    List<Car> findByPriceAndDeleteFlagFalse(@Param("price") double price);

    @Query("SELECT c FROM Car c JOIN c.company comp WHERE " +
            "(:state IS NULL OR LOWER(CAST(comp.state AS string)) = LOWER(CAST(:state AS string))) AND " +
            "(:city IS NULL OR LOWER(CAST(comp.city AS string)) = LOWER(CAST(:city AS string))) AND " +
            "(:make IS NULL OR LOWER(CAST(c.make AS string)) = LOWER(CAST(:make AS string))) AND " +
            "(:model IS NULL OR LOWER(CAST(c.model AS string)) = LOWER(CAST(:model AS string))) AND " +
            "(:fuelType IS NULL OR LOWER(CAST(c.fuelType AS string)) = LOWER(CAST(:fuelType AS string))) AND " +
            "(:transmission IS NULL OR LOWER(CAST(c.transmission AS string)) = LOWER(CAST(:transmission AS string))) AND " +
            "(:minYear IS NULL OR c.year >= :minYear) AND " +
            "(:maxYear IS NULL OR c.year <= :maxYear) AND " +
            "(:minPrice IS NULL OR c.price >= :minPrice) AND " +
            "(:maxPrice IS NULL OR c.price <= :maxPrice) AND " +
            "c.deleteFlag = false")
    List<Car> findByFilters(
            @Param("state") String state,
            @Param("city") String city,
            @Param("make") String make,
            @Param("model") String model,
            @Param("fuelType") String fuelType,
            @Param("transmission") String transmission,
            @Param("minYear") Integer minYear,
            @Param("maxYear") Integer maxYear,
            @Param("minPrice") Double minPrice,
            @Param("maxPrice") Double maxPrice
    );

}
