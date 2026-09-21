package com.carventory.controller;

import com.carventory.dto.AnniversaryDTO;
import com.carventory.dto.BookingDTO;
import com.carventory.entity.Car;
import com.carventory.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/payment-due-today")
    public ResponseEntity<List<BookingDTO>> getTodayBookingNotification() {
        return ResponseEntity.ok(notificationService.fetchTodayBookingsNotification());
    }

    @GetMapping("/older-than-30-days")
    public ResponseEntity<List<Car>> getCarsOlderThan30Days() {
        List<Car> cars = notificationService.getCarsOlderThan30Days();
        return ResponseEntity.ok(cars);
    }

    @GetMapping("/anniversary/buyers")
    public ResponseEntity<List<AnniversaryDTO>> getAnniversaryBuyers() {
        List<AnniversaryDTO> result = notificationService.getAnniversaryBuyersForToday();
        return ResponseEntity.ok(result);
    }
}
