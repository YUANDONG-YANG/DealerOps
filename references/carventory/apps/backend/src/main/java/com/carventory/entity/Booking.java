package com.carventory.entity;

import com.carventory.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "bookings")
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "car_id", nullable = false)
    private Car car;

    private String buyerName;
    private String buyerPhone;
    private String buyerEmail;

    private double advanceAmount;
    private double totalAmount;

    private LocalDate bookingDate;
    private LocalDate paymentCompletionDate;

    @Enumerated(EnumType.STRING)
    private BookingStatus status;

    private LocalDateTime createdAt = LocalDateTime.now();

    private boolean deleteFlag = false;

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;
}
