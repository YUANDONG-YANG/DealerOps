package com.carventory.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "cars")
public class Car {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String make;
    private String model;
    private int year;
    private String vin; // Vehicle Identification Number
    private String engineNumber; // Added: Engine Number
    private String chassisNumber; // Added: Chassis Number
    private double price;
    private double mileage;
    private double purchasePrice;
    private LocalDate purchaseDate;
    private double carMaintainAmount;
    private String carMaintainDetails;
    private String fuelType;
    private String transmission;
    private String condition;
    private String color;
    private String status;
    private Integer odometerReading;
    private int numberOfOwners;

    private String imageUrl; // Main photo URL
    private String rcDocumentUrl; // RC document URL
    private String insuranceDocumentUrl; // Insurance document URL
    private String pucDocumentUrl; // PUC document URL

    @ManyToOne
    @JoinColumn(name = "seller_id", nullable = false)
    @JsonBackReference
    private Seller seller;

    @ManyToOne
    @JoinColumn(name = "buyer_id") // optional: can be null for unsold cars
    @JsonBackReference
    private Buyer buyer;

    @ManyToOne
    @JoinColumn(name = "sold_by_user_id") // Nullable for unsold cars
    @JsonBackReference
    private User soldBy;

    private LocalDateTime createdAt = LocalDateTime.now();

    private boolean deleteFlag = false; // Flag for soft delete

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

}
