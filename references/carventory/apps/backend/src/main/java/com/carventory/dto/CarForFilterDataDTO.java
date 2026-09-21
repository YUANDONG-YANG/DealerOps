package com.carventory.dto;

import lombok.*;
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CarForFilterDataDTO {
        private Long carId;
        private String carMake;
        private String carModel;
        private int carYear;
        private double carPrice;
        private double carMileage;
        private String carFuelType;
        private String carTransmission;
        private int carOdometerReading;
        private int carNumberOfOwners;
        private String carImageUrl; // Main photo URL
        private String rtoCode;
        private String location;
        private String companyName;
}
