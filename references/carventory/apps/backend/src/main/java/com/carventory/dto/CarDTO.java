package com.carventory.dto;

import lombok.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CarDTO {
    private String make;
    private String model;
    private int year;
    private String vin; //Vehicle Identification Number
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
    private Long sellerId; // Reference to the seller

    private MultipartFile image; // Main photo
    private MultipartFile rcDocument; // Mandatory RC document
    private MultipartFile insuranceDocument; // Optional insurance document
    private MultipartFile pucDocument; // Optional PUC document
}
