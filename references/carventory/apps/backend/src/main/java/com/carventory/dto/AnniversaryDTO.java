package com.carventory.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnniversaryDTO {
    private Long buyerId;
    private String buyerName;
    private String phone;
    private String email;
    private String address;
    private String carMake;
    private String carModel;
    private String carVin;
    private int anniversaryYear;
}
