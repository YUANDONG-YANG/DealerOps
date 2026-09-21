package com.carventory.helper;

import com.carventory.dto.BuyerDTO;
import com.carventory.dto.CarBuyerDTO;
import com.carventory.dto.UserInfoResponse;
import com.carventory.entity.*;
import com.carventory.enums.BookingStatus;
import com.carventory.repository.BookingRepository;
import com.carventory.repository.CarRepository;
import com.carventory.repository.CustomerInquiryRepository;
import com.carventory.util.CloudinaryUploader;

import com.carventory.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class BuyerHelper {

    private final CarRepository carRepository;
    private final BookingRepository bookingRepository;
    private final CustomerInquiryRepository customerInquiryRepository;
    private final CloudinaryUploader cloudinaryUploader;

    public Car findAndValidateCar(BuyerDTO dto) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        Car car = carRepository.findByVinAndCompanyIdAndDeleteFlagFalse(dto.getCarVin(), companyId)
                .orElseThrow(() -> new RuntimeException("Car not found with VIN: " + dto.getCarVin()));

        if ("Sold".equalsIgnoreCase(car.getStatus())) {
            throw new RuntimeException("Car with VIN " + dto.getCarVin() + " has already been sold.");
        }
        return car;
    }


    public void handleBookingIfApplicable(Car car, BuyerDTO dto) {
        if ("Booked".equalsIgnoreCase(car.getStatus())) {
            Booking booking = bookingRepository.findByCarIdAndDeleteFlagFalse(car.getId());
            if (booking.getBuyerPhone().equals(dto.getPhone()) &&
                    booking.getCar().getVin().equals(dto.getCarVin())) {
                booking.setStatus(BookingStatus.Completed);
                bookingRepository.save(booking);
            } else {
                throw new RuntimeException("Car with VIN " + dto.getCarVin() + " has already been booked by another buyer.");
            }
        }
    }

    public void updateCustomerInquiries(Long carId, String phone) {
        List<CustomerInquiry> inquiries = customerInquiryRepository.findAllByCarIdAndDeleteFlagFalse(carId);
        if (inquiries != null && !inquiries.isEmpty()) {
            for (CustomerInquiry inquiry : inquiries) {
                if (phone.equals(inquiry.getPhone())) {
                    inquiry.setInquiryStatus("Completed");
                }
            }
            customerInquiryRepository.saveAll(inquiries);
        }
    }

    public Buyer createBuyerEntity(BuyerDTO dto, Car car, User user) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        return Buyer.builder()
                .car(car)
                .company(userInfo.getCompany())
                .name(dto.getName())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .salePrice(dto.getSalePrice())
                .saleDate(dto.getSaleDate())
                .notes(dto.getNotes())
                .address(dto.getAddress())
                .soldBy(user)
                .photoUrl(cloudinaryUploader.uploadFile(dto.getPhoto(), "buyers/photo"))
                .aadharCardUrl(cloudinaryUploader.uploadFile(dto.getAadharCard(), "buyers/aadhar"))
                .panCardUrl(cloudinaryUploader.uploadFile(dto.getPanCard(), "buyers/pan"))
                .addressProofUrl(cloudinaryUploader.uploadFile(dto.getAddressProof(), "buyers/address-proof"))
                .createdAt(LocalDateTime.now())
                .deleteFlag(false)
                .build();
    }

    public void handleCarUpdateForBuyer(Buyer existingBuyer, BuyerDTO dto, Long companyId) {
        if (dto.getCarVin() == null || dto.getCarVin().trim().isEmpty()) return;

        Optional<Car> optionalNewCar = carRepository.findByVinAndCompanyIdAndDeleteFlagFalse(dto.getCarVin(), companyId);
        if (optionalNewCar.isEmpty()) {
            throw new RuntimeException("Car not found or deleted with VIN: " + dto.getCarVin());
        }

        Car newCar = optionalNewCar.get();

        boolean isSameCar = existingBuyer.getCar() != null &&
                newCar.getId().equals(existingBuyer.getCar().getId());

        if ("Sold".equalsIgnoreCase(newCar.getStatus()) && !isSameCar) {
            throw new RuntimeException("Car with VIN " + dto.getCarVin() + " is already sold.");
        }

        if (!isSameCar && existingBuyer.getCar() != null) {
            Car oldCar = existingBuyer.getCar();
            oldCar.setStatus("Available");
            oldCar.setBuyer(null);
            carRepository.save(oldCar);
        }

        newCar.setStatus("Sold");
        newCar.setBuyer(existingBuyer);
        existingBuyer.setCar(newCar);
        carRepository.save(newCar);
    }

    public void updateBuyerFields(Buyer buyer, BuyerDTO dto) {
        buyer.setName(dto.getName());
        buyer.setPhone(dto.getPhone());
        buyer.setEmail(dto.getEmail());
        buyer.setSalePrice(dto.getSalePrice());
        buyer.setSaleDate(dto.getSaleDate());
        buyer.setNotes(dto.getNotes());
        buyer.setAddress(dto.getAddress());
        if (dto.getPhoto() != null && !dto.getPhoto().isEmpty()) {
            buyer.setPhotoUrl(cloudinaryUploader.uploadFile(dto.getPhoto(), "buyers/photo"));
        }
        if (dto.getAadharCard() != null && !dto.getAadharCard().isEmpty()) {
            buyer.setAadharCardUrl(cloudinaryUploader.uploadFile(dto.getAadharCard(), "buyers/aadhar"));
        }
        if (dto.getPanCard() != null && !dto.getPanCard().isEmpty()) {
            buyer.setPanCardUrl(cloudinaryUploader.uploadFile(dto.getPanCard(), "buyers/pan"));
        }
        if (dto.getAddressProof() != null && !dto.getAddressProof().isEmpty()) {
            buyer.setAddressProofUrl(cloudinaryUploader.uploadFile(dto.getAddressProof(), "buyers/address-proof"));
        }
    }

    public static CarBuyerDTO mapToCarBuyerDTO(Buyer buyer) {
        if (buyer == null || buyer.getCar() == null) {
            throw new IllegalArgumentException("Buyer or Buyer.car is null");
        }
        Car car = buyer.getCar();
        User user = buyer.getSoldBy();
        return CarBuyerDTO.builder()
                // Car-related fields
                .carId(car.getId())
                .make(car.getMake())
                .model(car.getModel())
                .year(car.getYear())
                .vin(car.getVin())
                .engineNumber(car.getEngineNumber())
                .chassisNumber(car.getChassisNumber())
                .price(car.getPrice())
                .mileage(car.getMileage())
                .purchasePrice(car.getPurchasePrice())
                .purchaseDate(car.getPurchaseDate())
                .fuelType(car.getFuelType())
                .transmission(car.getTransmission())
                .condition(car.getCondition())
                .color(car.getColor())
                .status(car.getStatus())
                .imageUrl(car.getImageUrl())
                .rcDocumentUrl(car.getRcDocumentUrl())
                .insuranceDocumentUrl(car.getInsuranceDocumentUrl())
                .pucDocumentUrl(car.getPucDocumentUrl())
                .carCreatedAt(car.getCreatedAt())
                .carDeleteFlag(car.isDeleteFlag())
                // Buyer-related fields
                .buyerId(buyer.getId())
                .name(buyer.getName())
                .phone(buyer.getPhone())
                .email(buyer.getEmail())
                .salePrice(buyer.getSalePrice())
                .saleDate(buyer.getSaleDate())
                .notes(buyer.getNotes())
                .address(buyer.getAddress())
                .photoUrl(buyer.getPhotoUrl())
                .aadharCardUrl(buyer.getAadharCardUrl())
                .panCardUrl(buyer.getPanCardUrl())
                .addressProofUrl(buyer.getAddressProofUrl())
                .buyerCreatedAt(buyer.getCreatedAt())
                .buyerDeleteFlag(buyer.isDeleteFlag())
                //Employee fields
                .soldBy(user != null ? user.getId() : null)
                .soldByName(user != null ? user.getOwnerName() : null)
                .build();
    }
}
