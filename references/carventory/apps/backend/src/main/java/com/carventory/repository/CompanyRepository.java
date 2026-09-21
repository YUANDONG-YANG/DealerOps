package com.carventory.repository;

import com.carventory.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    List<Company> findByDeleteFlagFalse();

    List<Company> findByCompanyNameContainingIgnoreCaseAndDeleteFlagFalse(String companyName);

    List<Company> findByCityContainingIgnoreCaseAndDeleteFlagFalse(String city);
}