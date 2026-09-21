package com.carventory.dto;

import com.carventory.entity.Car;
import lombok.*;
import org.springframework.web.multipart.MultipartFile;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SellerDTO {
    private String name;
    private String phone;
    private String email;
    private String address;
    private MultipartFile photo;
    private MultipartFile aadharCard;
    private MultipartFile panCard;
    private MultipartFile addressProof;
    private String photoUrl;
    private String aadharCardUrl;
    private String panCardUrl;
    private String addressProofUrl;
    private Long carId; // Reference to the car
}
