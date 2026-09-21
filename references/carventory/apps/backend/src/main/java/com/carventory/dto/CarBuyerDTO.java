package com.carventory.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CarBuyerDTO {
    //This DTO is used for getting data from DB and show on UI.
    // Car-related fields
    private Long carId;
    private String make;
    private String model;
    private int year;
    private String vin;
    private String engineNumber;
    private String chassisNumber;
    private double price;
    private double mileage;
    private double purchasePrice;
    private LocalDate purchaseDate;
    private String fuelType;
    private String transmission;
    private String condition;
    private String color;
    private String status;
    private String imageUrl;
    private String rcDocumentUrl;
    private String insuranceDocumentUrl;
    private String pucDocumentUrl;
    private LocalDateTime carCreatedAt;
    private boolean carDeleteFlag;

    // Buyer-related fields
    private Long buyerId;
    private String name;
    private String phone;
    private String email;
    private double salePrice;
    private LocalDate saleDate;
    private String notes;
    private String address;
    private String photoUrl;
    private String aadharCardUrl;
    private String panCardUrl;
    private String addressProofUrl;
    private LocalDateTime buyerCreatedAt;
    private boolean buyerDeleteFlag;

    //Employee fields
    private Long soldBy;
    private String soldByName;
}