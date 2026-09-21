package com.carventory.controller;

import com.carventory.dto.BookingDTO;
import com.carventory.dto.CarSellerDTO;
import com.carventory.entity.Booking;
import com.carventory.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping("/book")
    public ResponseEntity<String> bookCar(@RequestBody BookingDTO dto) {
        bookingService.bookCar(dto);
        return ResponseEntity.ok("Buyer created successfully");
    }

    @PutMapping("/complete/{bookingId}")
    public Booking completeBooking(@PathVariable Long bookingId) {
        return bookingService.completeBooking(bookingId);
    }

    @PutMapping("/cancel/{bookingId}")
    public Booking cancelBooking(@PathVariable Long bookingId) {
        return bookingService.cancelBooking(bookingId);
    }

    @GetMapping("/all")
    public List<Booking> getAllBookings() {
        return bookingService.getAllBookings();
    }

    @GetMapping("/{id}")
    public Booking getBookingById(@PathVariable Long id) {
        return bookingService.getBookingById(id);
    }

    @GetMapping("/booked")
    public List<Booking> getAllBookedBookings() {
        return bookingService.getAllBookingByStatusBooked();
    }

    @PutMapping("/{bookingId}")
    public ResponseEntity<?> updateBooking(@PathVariable Long bookingId, @RequestBody BookingDTO bookingDTO) {
        return ResponseEntity.ok(bookingService.updateBooking(bookingId, bookingDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteBookingById(@PathVariable Long id) {
        bookingService.deleteBookingById(id);
        return ResponseEntity.ok("Deleted successfully");
    }

    @GetMapping("/buyer/{name}")
    public ResponseEntity<List<Booking>> getBookingsByBuyerName(@PathVariable String name) {
        return ResponseEntity.ok(bookingService.getBookingsByBuyerName(name));
    }

    @GetMapping("/phone/{phone}")
    public ResponseEntity<List<Booking>> getBookingsByBuyerPhone(@PathVariable String phone) {
        return ResponseEntity.ok(bookingService.getBookingsByBuyerPhone(phone));
    }

    @GetMapping("/vin/{vin}")
    public ResponseEntity<List<Booking>> getBookingsByCarVin(@PathVariable String vin) {
        return ResponseEntity.ok(bookingService.getBookingsByCarVin(vin));
    }

}
