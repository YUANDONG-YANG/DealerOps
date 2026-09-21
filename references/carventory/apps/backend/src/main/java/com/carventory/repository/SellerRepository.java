package com.carventory.repository;

import com.carventory.entity.Seller;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SellerRepository extends JpaRepository<Seller, Long> {

    @Query("SELECT COUNT(s) FROM Seller s WHERE s.deleteFlag = false AND s.company.id = :companyId")
    long countByDeleteFlagFalseAndCompanyId(@Param("companyId") Long companyId);

    @Query("""
            SELECT s FROM Seller s
            JOIN Car c ON c.seller.id = s.id
            WHERE LOWER(c.vin) = LOWER(:vin)
            AND s.deleteFlag = false
            AND c.deleteFlag = false
            AND s.company.id = :companyId
            """)
    Seller findSellerByCarVin(@Param("vin") String vin, @Param("companyId") Long companyId);

    @Query("""
            SELECT s FROM Seller s
            WHERE LOWER(s.phone) LIKE LOWER(CONCAT('%', :phone, '%'))
            AND s.deleteFlag = false
            AND s.company.id = :companyId
            """)
    List<Seller> findByPhoneLike(@Param("phone") String phone, @Param("companyId") Long companyId);

    @Query("""
            SELECT s FROM Seller s
            WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', :name, '%'))
            AND s.deleteFlag = false
            AND s.company.id = :companyId
            """)
    List<Seller> findByNameLike(@Param("name") String name, @Param("companyId") Long companyId);

    @Query("""
            SELECT DISTINCT s FROM Seller s
            JOIN Car c ON c.seller.id = s.id
            WHERE (LOWER(c.make) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(c.model) LIKE LOWER(CONCAT('%', :keyword, '%')))
            AND s.deleteFlag = false
            AND c.deleteFlag = false
            AND s.company.id = :companyId
            """)
    List<Seller> findByCarMakeOrModel(@Param("keyword") String keyword, @Param("companyId") Long companyId);

    @Query("""
            SELECT s FROM Seller s
            WHERE s.deleteFlag = false
            AND s.company.id = :companyId
            """)
    List<Seller> findAllByCompanyId(@Param("companyId") Long companyId);
}
