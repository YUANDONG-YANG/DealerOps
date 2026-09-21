package com.carventory.service;

import com.carventory.dto.AnniversaryDTO;
import com.carventory.dto.BookingDTO;
import com.carventory.entity.Buyer;
import com.carventory.entity.Car;
import com.carventory.repository.BookingRepository;
import com.carventory.entity.Booking;
import com.carventory.repository.BuyerRepository;
import com.carventory.repository.CarRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final BookingRepository bookingRepository;
    private final CarRepository carRepository;
    private final BuyerRepository buyerRepository;

    @Transactional
    public List<BookingDTO> fetchTodayBookingsNotification() {
        Long companyId = UserService.getCurrentUserInfo().getCompany().getId();
        List<Booking> bookings = bookingRepository.findBookingsDueToday(LocalDate.now(), companyId);

        return bookings.stream()
                .map(b -> BookingDTO.builder()
                        .id(b.getId())
                        .carVin(b.getCar().getVin())
                        .buyerName(b.getBuyerName())
                        .buyerPhone(b.getBuyerPhone())
                        .buyerEmail(b.getBuyerEmail())
                        .advanceAmount(b.getAdvanceAmount())
                        .totalAmount(b.getTotalAmount())
                        .bookingDate(b.getBookingDate())
                        .paymentCompletionDate(b.getPaymentCompletionDate())
                        .build())
                .toList();
    }

    public List<Car> getCarsOlderThan30Days() {
        Long companyId = UserService.getCurrentUserInfo().getCompany().getId();
        LocalDate cutoffDate = LocalDate.now().minusDays(30);
        return carRepository.findCarsOlderThan(cutoffDate, companyId);
    }

    @Transactional
    public List<AnniversaryDTO> getAnniversaryBuyersForToday() {
        Long companyId = UserService.getCurrentUserInfo().getCompany().getId();

        LocalDate today = LocalDate.now();
        int month = today.getMonthValue();
        int day = today.getDayOfMonth();

        List<Buyer> buyers = buyerRepository.findBuyersBySaleMonthAndDay(month, day, companyId);

        return buyers.stream()
                .filter(buyer -> {
                    long years = ChronoUnit.YEARS.between(buyer.getSaleDate(), today);
                    return years >= 1 && buyer.getSaleDate().plusYears(years).isEqual(today);
                })
                .map(buyer -> {
                    int years = (int) ChronoUnit.YEARS.between(buyer.getSaleDate(), today);
                    return AnniversaryDTO.builder()
                            .buyerId(buyer.getId())
                            .buyerName(buyer.getName())
                            .phone(buyer.getPhone())
                            .email(buyer.getEmail())
                            .address(buyer.getAddress())
                            .carMake(buyer.getCar().getMake())
                            .carModel(buyer.getCar().getModel())
                            .carVin(buyer.getCar().getVin())
                            .anniversaryYear(years)
                            .build();
                })
                .toList();
    }
}
