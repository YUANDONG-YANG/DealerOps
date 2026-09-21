package com.carventory.helper;

import com.carventory.dto.CustomerInquiryDTO;
import com.carventory.dto.UserInfoResponse;
import com.carventory.entity.Car;
import com.carventory.entity.CustomerInquiry;
import com.carventory.repository.CarRepository;
import com.carventory.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@RequiredArgsConstructor
@Component
public class CustomerInquiryHelper {

    private final CarRepository carRepository;

    public Car findAndValidateCarIfPresent(CustomerInquiryDTO dto) {
        if (dto.getCarVin() == null) {
            return null;
        }

        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        Car car = carRepository.findByVinAndCompanyIdAndDeleteFlagFalse(dto.getCarVin(), companyId)
                .orElseThrow(() -> new RuntimeException("Car not found with VIN: " + dto.getCarVin()));

        if (!"Available".equalsIgnoreCase(car.getStatus())) {
            throw new RuntimeException("Car with VIN " + dto.getCarVin() + " is already sold");
        }

        return car;
    }

    public CustomerInquiry buildInquiryEntity(CustomerInquiryDTO dto, Car car) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();

        CustomerInquiry inquiry = CustomerInquiry.builder()
                .car(car)
                .company(userInfo.getCompany())
                .name(dto.getName())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .address(dto.getAddress())
                .customerRequiredCar(dto.getCustomerRequiredCar())
                .fuelType(dto.getFuelType())
                .budget(dto.getBudget())
                .message(dto.getMessage())
                .inquiryStatus("Pending")
                .inquiryDate(dto.getInquiryDate())
                .createdAt(LocalDateTime.now())
                .deleteFlag(false)
                .build();

        if (car != null && car.getMake() != null && car.getModel() != null) {
            inquiry.setCustomerRequiredCar(car.getMake() + " " + car.getModel());
            inquiry.setFuelType(car.getFuelType());
        }

        return inquiry;
    }

    public Car findAndValidateCarIfPresent(String vin) {
        if (vin == null) return null;

        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        Car car = carRepository.findByVinAndCompanyIdAndDeleteFlagFalse(vin, companyId)
                .orElseThrow(() -> new RuntimeException("Car not found with VIN: " + vin));

        if (!"Available".equalsIgnoreCase(car.getStatus())) {
            throw new RuntimeException("Car with VIN " + vin + " is already sold");
        }

        return car;
    }

    public void updateInquiryFromDTO(CustomerInquiry inquiry, CustomerInquiryDTO dto, Car car) {
        inquiry.setCar(car);

        if (car != null && car.getMake() != null && car.getModel() != null) {
            inquiry.setCustomerRequiredCar(car.getMake() + " " + car.getModel());
            inquiry.setFuelType(car.getFuelType());
        } else {
            inquiry.setCustomerRequiredCar(dto.getCustomerRequiredCar());
            inquiry.setFuelType(dto.getFuelType());
        }

        inquiry.setName(dto.getName());
        inquiry.setPhone(dto.getPhone());
        inquiry.setEmail(dto.getEmail());
        inquiry.setAddress(dto.getAddress());
        inquiry.setBudget(dto.getBudget());
        inquiry.setMessage(dto.getMessage());
        inquiry.setInquiryStatus(dto.getInquiryStatus());
        inquiry.setInquiryDate(dto.getInquiryDate());
    }
}
