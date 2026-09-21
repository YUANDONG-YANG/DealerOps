package com.carventory.repository;

import com.carventory.entity.Buyer;
import com.carventory.entity.Car;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BuyerRepository extends JpaRepository<Buyer, Long> {

    Optional<Buyer> findByIdAndCompanyId(Long id, Long companyId);

    List<Buyer> findAllByCompanyIdAndDeleteFlagFalse(Long companyId);

    @Query("""
    SELECT b FROM Buyer b
    WHERE b.phone LIKE %:phone%
    AND b.company.id = :companyId
    AND b.deleteFlag = false
""")
    List<Buyer> searchByPhoneLike(@Param("phone") String phone, @Param("companyId") Long companyId);

    @Query("""
    SELECT b FROM Buyer b
    WHERE LOWER(b.name) LIKE LOWER(CONCAT('%', :name, '%'))
    AND b.company.id = :companyId
    AND b.deleteFlag = false
""")
    List<Buyer> searchByNameLike(@Param("name") String name, @Param("companyId") Long companyId);


    List<Buyer> findAllByEmailAndCompanyIdAndDeleteFlagFalse(String email, Long companyId);

    @Query("""
    SELECT b FROM Buyer b
    WHERE b.car = :car
    AND b.company.id = :companyId
    AND b.deleteFlag = false
""")
    Buyer getBuyerByCarAndCompanyIdAndDeleteFlagFalse(@Param("car") Car car, @Param("companyId") Long companyId);

    Buyer findByIdAndDeleteFlagFalse(Long id);

    @Query("SELECT COUNT(b) FROM Buyer b WHERE b.deleteFlag = false AND b.company.id = :companyId")
    long countByDeleteFlagFalseAndCompanyId(@Param("companyId") Long companyId);

    @Query("""
    SELECT b FROM Buyer b
    WHERE b.deleteFlag = false
    AND b.company.id = :companyId
    AND (
        LOWER(b.car.make) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
        OR LOWER(b.car.model) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
    )
""")
    List<Buyer> findByCarMakeOrModel(@Param("searchTerm") String searchTerm, @Param("companyId") Long companyId);

    @Query("SELECT SUM(b.salePrice) FROM Buyer b WHERE b.company.id = :companyId AND b.deleteFlag = false")
    Double getTotalSalePriceByCompanyId(@Param("companyId") Long companyId);

    @Query(value = """
    SELECT b.sold_by_user_id, u.owner_name, COUNT(b.id)
    FROM buyers b
    JOIN users u ON u.id = b.sold_by_user_id
    WHERE b.delete_flag = false
      AND b.sold_by_user_id IS NOT NULL
      AND EXTRACT(MONTH FROM b.sale_date) = :month
      AND EXTRACT(YEAR FROM b.sale_date) = :year
      AND b.company_id = :companyId
    GROUP BY b.sold_by_user_id, u.owner_name
""", nativeQuery = true)
    List<Object[]> getUserSalesCountsByMonthAndYear(
            @Param("month") int month,
            @Param("year") int year,
            @Param("companyId") Long companyId
    );

    @Query("SELECT b FROM Buyer b WHERE b.deleteFlag = false AND EXTRACT(MONTH FROM b.saleDate) = :month AND EXTRACT(DAY FROM b.saleDate) = :day AND b.car.company.id = :companyId")
    List<Buyer> findBuyersBySaleMonthAndDay(@Param("month") int month, @Param("day") int day, @Param("companyId") Long companyId);
}
