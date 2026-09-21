package com.carventory.service;

import com.carventory.dto.CustomerInquiryDTO;
import com.carventory.dto.UserInfoResponse;
import com.carventory.entity.CustomerInquiry;
import com.carventory.entity.Car;
import com.carventory.helper.CustomerInquiryHelper;
import com.carventory.repository.CustomerInquiryRepository;
import com.carventory.repository.CarRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerInquiryService {
    private final CustomerInquiryRepository customerInquiryRepository;
    private final CarRepository carRepository;
    private final CustomerInquiryHelper customerInquiryHelper;

    @Transactional
    public CustomerInquiry saveCustomerInquiry(CustomerInquiryDTO dto) {
        Car car = customerInquiryHelper.findAndValidateCarIfPresent(dto);
        CustomerInquiry inquiry = customerInquiryHelper.buildInquiryEntity(dto, car);
        return customerInquiryRepository.save(inquiry);
    }

    @Transactional
    public CustomerInquiry updateCustomerInquiry(Long id, CustomerInquiryDTO dto) {
        CustomerInquiry inquiry = customerInquiryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Inquiry not found with ID: " + id));

        // Normalize empty string to null
        String carVin = (dto.getCarVin() != null && !dto.getCarVin().trim().isEmpty())
                ? dto.getCarVin().trim().toUpperCase()
                : null;

        Car car = null;
        if (carVin != null) {
            car = customerInquiryHelper.findAndValidateCarIfPresent(dto.getCarVin());
        }
        customerInquiryHelper.updateInquiryFromDTO(inquiry, dto, car);

        return customerInquiryRepository.save(inquiry);
    }

    @Transactional
    public List<CustomerInquiry> getAllInquiries() {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        return customerInquiryRepository.findAllByCompanyIdAndDeleteFlagFalse(companyId);
    }

    @Transactional
    public void softDeleteCustomerInquiry(Long id) {
        CustomerInquiry inquiry = customerInquiryRepository.findByIdAndDeleteFlagFalse(id)
                .orElseThrow(() -> new RuntimeException("Customer inquiry not found with ID: " + id));

        inquiry.setDeleteFlag(true);
        customerInquiryRepository.save(inquiry);
    }

    @Transactional
    public CustomerInquiry getCustomerInquiryById(Long id) {
        CustomerInquiry customerInquiry = customerInquiryRepository.findByIdAndDeleteFlagFalse(id)
                .orElseThrow(() -> new RuntimeException("Customer inquiry not found with ID: " + id));

        Car car = customerInquiry.getCar();
        if (car != null && !"Available".equalsIgnoreCase(car.getStatus())) {
            customerInquiry.setCar(null);
        }

        return customerInquiry;
    }

    @Transactional
    public List<CustomerInquiry> getInquiriesByCustomerRequiredCar(String requiredCar) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        return customerInquiryRepository.searchByCustomerRequiredCar(requiredCar, companyId);
    }

    @Transactional
    public List<CustomerInquiry> getInquiriesByCarVin(String vin) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        List<CustomerInquiry> inquiries = customerInquiryRepository.findByCarVinIgnoreCaseAvailableAndCompany(vin, companyId);
        if (inquiries.isEmpty()) {
            throw new RuntimeException("No customer inquiries found for car VIN: " + vin);
        }
        return inquiries;
    }

    @Scheduled(cron = "0 0 2 * * ?") // Runs daily at 2 AM
    @Transactional
    public void softDeleteOldInquiries() {
        LocalDateTime threeMonthsAgo = LocalDateTime.now().minusMonths(3);
        int updated = customerInquiryRepository.softDeleteOldInquiries(threeMonthsAgo);
        log.info("Soft deleted {} old inquiries", updated);
    }
}
