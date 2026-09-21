package com.carventory.controller;

import com.carventory.dto.UserDTO;
import com.carventory.entity.Company;
import com.carventory.repository.CompanyRepository;
import com.carventory.service.CompanyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/company")
public class CompanyController {

    @Autowired
    private CompanyService companyService;

    @PutMapping(value = "/update", consumes = "multipart/form-data")
    public ResponseEntity<String> updateCompany(@ModelAttribute UserDTO userDTO) {
        return companyService.updateCurrentCompany(userDTO);
    }

    @GetMapping("/company-details")
    public Company getCompanyDetails() {
        return companyService.getCompanyDetails();
    }
}
