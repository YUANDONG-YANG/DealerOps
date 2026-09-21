package com.carventory.repository;

import com.carventory.entity.CustomerInquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CustomerInquiryRepository extends JpaRepository<CustomerInquiry, Long> {

    List<CustomerInquiry> findAllByCompanyIdAndDeleteFlagFalse(Long companyId);

    Optional<CustomerInquiry> findByIdAndDeleteFlagFalse(Long id);

    @Query("""
    SELECT ci FROM CustomerInquiry ci
    WHERE LOWER(ci.customerRequiredCar) LIKE LOWER(CONCAT('%', :customerRequiredCar, '%'))
    AND ci.company.id = :companyId
    AND ci.deleteFlag = false
""")
    List<CustomerInquiry> searchByCustomerRequiredCar(
            @Param("customerRequiredCar") String customerRequiredCar,
            @Param("companyId") Long companyId
    );

    @Query("SELECT COUNT(c) FROM CustomerInquiry c WHERE c.inquiryStatus = 'Pending' AND c.deleteFlag = false AND c.company.id = :companyId")
    long countPendingInquiries(@Param("companyId") Long companyId);

    List<CustomerInquiry> findAllByCarIdAndDeleteFlagFalse(Long carId);

    List<CustomerInquiry> findAllByCarIdAndCompanyIdAndDeleteFlagFalse(Long carId, Long companyId);

    @Query("""
    SELECT ci FROM CustomerInquiry ci
    JOIN ci.car c
    WHERE LOWER(c.vin) = LOWER(:vin)
    AND ci.company.id = :companyId
    AND ci.deleteFlag = false
    AND c.deleteFlag = false
    AND LOWER(c.status) = 'available'
""")
    List<CustomerInquiry> findByCarVinIgnoreCaseAvailableAndCompany(
            @Param("vin") String vin,
            @Param("companyId") Long companyId
    );

    @Modifying
    @Query("UPDATE CustomerInquiry ci SET ci.deleteFlag = true WHERE ci.createdAt < :cutoffDate AND ci.deleteFlag = false")
    int softDeleteOldInquiries(@Param("cutoffDate") LocalDateTime cutoffDate);
}
