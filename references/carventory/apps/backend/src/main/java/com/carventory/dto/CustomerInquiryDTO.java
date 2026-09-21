package com.carventory.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerInquiryDTO {
    private Long carId; // Reference to the car
    private String carVin;
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
}
