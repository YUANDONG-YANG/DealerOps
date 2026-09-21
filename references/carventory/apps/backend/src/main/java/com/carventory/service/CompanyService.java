package com.carventory.service;

import com.carventory.dto.UserDTO;
import com.carventory.dto.UserInfoResponse;
import com.carventory.entity.Company;
import com.carventory.repository.CompanyRepository;
import com.carventory.util.CloudinaryUploader;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final CloudinaryUploader cloudinaryUploader;

    public Company saveCompany(UserDTO userDTO) {
        Company company = Company.builder()
                // Company Info
                .companyName(userDTO.getCompanyName())
                .yearEstablished(userDTO.getYearEstablished())
                .companyPhone(userDTO.getCompanyPhone())
                .companyMobile(userDTO.getCompanyMobile())

                // Address Info
                .companyAddress(userDTO.getCompanyAddress())
                .city(userDTO.getCity())
                .state(userDTO.getState())
                .postalCode(userDTO.getPostalCode())
                .country(userDTO.getCountry())
                .createdAt(LocalDateTime.now())
                .companyLogoUrl(cloudinaryUploader.uploadFile(userDTO.getCompanyLogo(), "company/logo"))
                .companyImageUrl(cloudinaryUploader.uploadFile(userDTO.getCompanyImage(), "company/image"))
                .rating(userDTO.getRating())
                .reviewCount(userDTO.getReviewCount())
                .description(userDTO.getDescription())
                .specialties(userDTO.getSpecialties() != null
                        ? userDTO.getSpecialties().toArray(new String[0])
                        : null)
                .hours(userDTO.getHours())
                .website(userDTO.getWebsite())
                .email(userDTO.getEmail())
                .build();
        return companyRepository.save(company);
    }

    public ResponseEntity<String> updateCurrentCompany(UserDTO userDTO) {
        // Get current company of logged-in user
        Company currentCompany = UserService.getCurrentUserInfo().getCompany();

        // Defensive: Double-check from DB if required
        Optional<Company> optionalCompany = companyRepository.findById(currentCompany.getId());
        if (optionalCompany.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Company not found");
        }

        Company company = optionalCompany.get();

        // Update only non-null fields (same as your logic)
        if (userDTO.getCompanyName() != null) {
            company.setCompanyName(userDTO.getCompanyName());
        }
        if (userDTO.getYearEstablished() != 0) {
            company.setYearEstablished(userDTO.getYearEstablished());
        }
        if (userDTO.getCompanyPhone() != null) {
            company.setCompanyPhone(userDTO.getCompanyPhone());
        }
        if (userDTO.getCompanyMobile() != null) {
            company.setCompanyMobile(userDTO.getCompanyMobile());
        }
        if (userDTO.getCompanyAddress() != null) {
            company.setCompanyAddress(userDTO.getCompanyAddress());
        }
        if (userDTO.getCity() != null) {
            company.setCity(userDTO.getCity());
        }
        if (userDTO.getState() != null) {
            company.setState(userDTO.getState());
        }
        if (userDTO.getPostalCode() != null) {
            company.setPostalCode(userDTO.getPostalCode());
        }
        if (userDTO.getCountry() != null) {
            company.setCountry(userDTO.getCountry());
        }
        if (userDTO.getCompanyLogo() != null && !userDTO.getCompanyLogo().isEmpty()) {
            company.setCompanyLogoUrl(cloudinaryUploader.uploadFile(userDTO.getCompanyLogo(), "company/logo"));
        }
        if (userDTO.getCompanyImage() != null && !userDTO.getCompanyImage().isEmpty()) {
            company.setCompanyImageUrl(cloudinaryUploader.uploadFile(userDTO.getCompanyImage(), "company/image"));
        }
        if (userDTO.getRating() != null) {
            company.setRating(userDTO.getRating());
        }
        if (userDTO.getReviewCount() != null) {
            company.setReviewCount(userDTO.getReviewCount());
        }
        if (userDTO.getDescription() != null) {
            company.setDescription(userDTO.getDescription());
        }
        if (userDTO.getSpecialties() != null && !userDTO.getSpecialties().isEmpty()) {
            company.setSpecialties(userDTO.getSpecialties().toArray(new String[0]));
        }
        if (userDTO.getHours() != null) {
            company.setHours(userDTO.getHours());
        }
        if (userDTO.getWebsite() != null) {
            company.setWebsite(userDTO.getWebsite());
        }
        companyRepository.save(company);
        return ResponseEntity.ok("Company updated successfully");
    }

    public Company getCompanyDetails() {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long id = userInfo.getCompany().getId();
        return companyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Company not found with id: " + id));
    }
}
