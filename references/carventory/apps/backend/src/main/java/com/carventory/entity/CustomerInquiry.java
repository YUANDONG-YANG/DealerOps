package com.carventory.entity;

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
@Table(name = "customer_inquiries")
public class CustomerInquiry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "car_id")
    private Car car; // Associated car

    private String name;
    private String phone;
    private String email;
    private String address;
    private String customerRequiredCar;
    private String fuelType;
    private Long budget;
    private LocalDate inquiryDate;
    private String message;
    private String inquiryStatus; // Pending Or Completed
    private LocalDateTime createdAt = LocalDateTime.now();
    private boolean deleteFlag = false; // Flag for soft delete

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;
}
