package com.carventory.service;

import com.carventory.dto.BookingDTO;
import com.carventory.dto.UserInfoResponse;
import com.carventory.entity.Booking;
import com.carventory.entity.Car;
import com.carventory.enums.BookingStatus;
import com.carventory.helper.BookingHelper;
import com.carventory.repository.BookingRepository;
import com.carventory.repository.CarRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class BookingService {

    private final BookingRepository bookingRepository;
    private final CarRepository carRepository;
    private final BookingHelper bookingHelper;

    @Transactional
    public void bookCar(BookingDTO dto) {
        Car car = bookingHelper.findAndValidateCarForBooking(dto);
        bookingHelper.markMatchingInquiriesAsCompleted(car.getId(), dto.getBuyerPhone());

        Booking booking = bookingHelper.createBookingEntity(dto, car);
        bookingRepository.save(booking);
    }

    @Transactional
    public Booking updateBooking(Long bookingId, BookingDTO dto) {
        Booking existingBooking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + bookingId));

        Car oldCar = existingBooking.getCar();

        // If VIN is different, update car reference
        if (!oldCar.getVin().equals(dto.getCarVin().trim())) {
            Car newCar = bookingHelper.validateAndSwapBookedCar(oldCar, dto.getCarVin());
            existingBooking.setCar(newCar);
        }

        // Update booking fields
        bookingHelper.updateBookingFields(existingBooking, dto);

        return bookingRepository.save(existingBooking);
    }

    public Booking completeBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        Car car = booking.getCar();
        car.setStatus("Sold");
        carRepository.save(car);

        booking.setStatus(BookingStatus.Completed);
        booking.setPaymentCompletionDate(LocalDate.now());
        return bookingRepository.save(booking);
    }

    public Booking cancelBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        Car car = booking.getCar();
        car.setStatus("Available");
        carRepository.save(car);

        booking.setStatus(BookingStatus.Cancelled);
        return bookingRepository.save(booking);
    }

    public List<Booking> getAllBookings() {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();
        return bookingRepository.findAllByCompanyIdAndDeleteFlagFalse(companyId);
    }

    public Booking getBookingById(Long id) {
        return bookingRepository.findByIdAndDeleteFlagFalse(id);
    }

    public List<Booking> getAllBookingByStatusBooked() {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();
        return bookingRepository.findByStatusAndCompanyIdAndDeleteFlagFalse(BookingStatus.Booked, companyId);
    }

    public void deleteBookingById(Long id) {
        Booking booking = bookingRepository.findByIdAndDeleteFlagFalse(id);
        booking.setDeleteFlag(true);
        booking.getCar().setStatus("Available");
        bookingRepository.save(booking);
    }

    public List<Booking> getBookingsByBuyerName(String buyerName) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        List<Booking> bookings = bookingRepository
                .findAllByBuyerNameContainingIgnoreCaseAndCompanyIdAndDeleteFlagFalse(buyerName, companyId);
        if (bookings.isEmpty()) {
            throw new RuntimeException("No bookings found for buyer name: " + buyerName);
        }
        return bookings;
    }

    public List<Booking> getBookingsByBuyerPhone(String buyerPhone) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        List<Booking> bookings = bookingRepository
                .findAllByBuyerPhoneContainingIgnoreCaseAndCompanyIdAndDeleteFlagFalse(buyerPhone, companyId);
        if (bookings.isEmpty()) {
            throw new RuntimeException("No bookings found for buyer phone: " + buyerPhone);
        }
        return bookings;
    }

    public List<Booking> getBookingsByCarVin(String vin) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        List<Booking> bookings = bookingRepository
                .findAllByCarVinIgnoreCaseAndCompanyIdAndDeleteFlagFalse(vin, companyId);
        if (bookings.isEmpty()) {
            throw new RuntimeException("No bookings found for car VIN: " + vin);
        }
        return bookings;
    }
}
