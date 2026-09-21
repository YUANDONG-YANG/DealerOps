package com.carventory.repository;

import com.carventory.entity.Booking;
import com.carventory.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    Booking findByCarIdAndDeleteFlagFalse(Long carId);

    List<Booking> findAllByCompanyIdAndDeleteFlagFalse(Long companyId);

    Booking findByIdAndDeleteFlagFalse(Long id);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.deleteFlag = false AND b.status = 'Booked' AND b.company.id = :companyId")
    long countBookedAndNotDeleted(@Param("companyId") Long companyId);

    List<Booking> findByStatusAndCompanyIdAndDeleteFlagFalse(BookingStatus status, Long companyId);

    @Query("""
    SELECT b FROM Booking b 
    WHERE LOWER(b.buyerName) LIKE LOWER(CONCAT('%', :buyerName, '%'))
    AND b.deleteFlag = false
    AND b.company.id = :companyId
""")
    List<Booking> findAllByBuyerNameContainingIgnoreCaseAndCompanyIdAndDeleteFlagFalse(
            @Param("buyerName") String buyerName,
            @Param("companyId") Long companyId
    );

    @Query("""
    SELECT b FROM Booking b 
    WHERE LOWER(b.buyerPhone) LIKE LOWER(CONCAT('%', :buyerPhone, '%'))
    AND b.deleteFlag = false
    AND b.company.id = :companyId
""")
    List<Booking> findAllByBuyerPhoneContainingIgnoreCaseAndCompanyIdAndDeleteFlagFalse(
            @Param("buyerPhone") String buyerPhone,
            @Param("companyId") Long companyId
    );

    @Query("""
    SELECT b FROM Booking b 
    JOIN b.car c 
    WHERE LOWER(c.vin) = LOWER(:vin)
    AND b.deleteFlag = false
    AND b.company.id = :companyId
    AND c.deleteFlag = false
""")
    List<Booking> findAllByCarVinIgnoreCaseAndCompanyIdAndDeleteFlagFalse(
            @Param("vin") String vin,
            @Param("companyId") Long companyId
    );

    @Query("SELECT b FROM Booking b WHERE b.paymentCompletionDate = :date AND b.deleteFlag = false AND b.status = 'Booked' AND b.car.company.id = :companyId")
    List<Booking> findBookingsDueToday(@Param("date") LocalDate date, @Param("companyId") Long companyId);
}
