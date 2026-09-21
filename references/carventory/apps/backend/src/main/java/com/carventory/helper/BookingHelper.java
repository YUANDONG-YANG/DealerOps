package com.carventory.helper;

import com.carventory.dto.BookingDTO;
import com.carventory.dto.UserInfoResponse;
import com.carventory.entity.Booking;
import com.carventory.entity.Car;
import com.carventory.entity.Company;
import com.carventory.entity.CustomerInquiry;
import com.carventory.enums.BookingStatus;
import com.carventory.repository.CarRepository;
import com.carventory.repository.CustomerInquiryRepository;
import com.carventory.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class BookingHelper {

    private final CarRepository carRepository;
    private final CustomerInquiryRepository customerInquiryRepository;

    public Car findAndValidateCarForBooking(BookingDTO dto) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        Car car = carRepository.findByVinAndCompanyIdAndDeleteFlagFalse(dto.getCarVin(), companyId)
                .orElseThrow(() -> new RuntimeException("Car not found"));

        if ("Sold".equalsIgnoreCase(car.getStatus())) {
            throw new RuntimeException("Car is already sold and cannot be booked.");
        } else if ("Booked".equalsIgnoreCase(car.getStatus())) {
            throw new RuntimeException("Car is already booked by another buyer.");
        }

        car.setStatus("Booked");
        return carRepository.save(car);
    }

    public void markMatchingInquiriesAsCompleted(Long carId, String buyerPhone) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        List<CustomerInquiry> inquiries = customerInquiryRepository.findAllByCarIdAndCompanyIdAndDeleteFlagFalse(carId, companyId);

        if (inquiries != null && !inquiries.isEmpty()) {
            for (CustomerInquiry inquiry : inquiries) {
                if (inquiry.getPhone() != null && inquiry.getPhone().equals(buyerPhone)) {
                    inquiry.setInquiryStatus("Completed");
                }
            }
            customerInquiryRepository.saveAll(inquiries);
        }
    }

    public Booking createBookingEntity(BookingDTO dto, Car car) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Company company = userInfo.getCompany();

        return Booking.builder()
                .car(car)
                .company(company)
                .buyerName(dto.getBuyerName())
                .buyerPhone(dto.getBuyerPhone())
                .buyerEmail(dto.getBuyerEmail())
                .advanceAmount(dto.getAdvanceAmount())
                .totalAmount(dto.getTotalAmount())
                .bookingDate(dto.getBookingDate())
                .paymentCompletionDate(dto.getPaymentCompletionDate())
                .status(BookingStatus.Booked)
                .createdAt(LocalDateTime.now())
                .deleteFlag(false)
                .build();
    }

    public Car validateAndSwapBookedCar(Car oldCar, String newVin) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        Car newCar = carRepository.findByVinAndCompanyIdAndDeleteFlagFalse(newVin, companyId)
                .orElseThrow(() -> new RuntimeException("Car not found with VIN: " + newVin));

        if ("Sold".equalsIgnoreCase(newCar.getStatus())) {
            throw new RuntimeException("New car is already sold and cannot be booked.");
        } else if ("Booked".equalsIgnoreCase(newCar.getStatus())) {
            throw new RuntimeException("New car is already booked by another buyer.");
        }

        oldCar.setStatus("Available");
        newCar.setStatus("Booked");

        carRepository.save(oldCar);
        return carRepository.save(newCar);
    }

    public void updateBookingFields(Booking booking, BookingDTO dto) {
        booking.setBuyerName(dto.getBuyerName());
        booking.setBuyerPhone(dto.getBuyerPhone());
        booking.setBuyerEmail(dto.getBuyerEmail());
        booking.setAdvanceAmount(dto.getAdvanceAmount());
        booking.setTotalAmount(dto.getTotalAmount());
        booking.setBookingDate(dto.getBookingDate());
        booking.setPaymentCompletionDate(dto.getPaymentCompletionDate());
    }
}
