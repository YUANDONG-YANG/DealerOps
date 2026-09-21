package com.carventory.dto;

import lombok.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuyerDTO {
    private Long carId; // Reference to the car
    private String carVin; // Vehicle Identification Number
    private String name;
    private String phone;
    private String email;
    private double salePrice;
    private LocalDate saleDate;
    private String notes;
    private String address;
    private Long soldByUserId;

    private MultipartFile photo;
    private MultipartFile aadharCard;
    private MultipartFile panCard;
    private MultipartFile addressProof;
}
