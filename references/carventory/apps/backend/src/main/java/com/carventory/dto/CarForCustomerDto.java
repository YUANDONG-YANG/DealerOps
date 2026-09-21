package com.carventory.dto;

import lombok.*;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CarForCustomerDto {
    private Long id;
    private String make;
    private String model;
    private int year;
    private String vin;
    private double price;
    private double mileage;
    private String fuelType;
    private String transmission;
    private String condition;
    private String color;
    private int odometerReading;
    private int numberOfOwners;
    private String imageUrl;
    private String carImage1Url;
    private String carImage2Url;
    private String carImage3Url;
    private String carImage4Url;
    private String carImage5Url;
    private String carImage6Url;
    private String carImage7Url;
    private String carImage8Url;
    private String carImage9Url;
    private String carImage10Url;
    private String carImage11Url;
    private String carImage12Url;
    private String carImage13Url;
    private String carImage14Url;
    private String carImage15Url;
    private String companyName;
    private String companyPhone;
    private String companyMobile;
    private String companyAddress;
    private String companyCity;
    private String companyState;
    private String companyPostalCode;
    private String companyCountry;
    private String rtoCode;
    // === New Car Specification fields ===
    private Integer engineCapacity;
    private String drivetrain;
    private String suspensionType;
    private Double fuelTankCapacity;
    private Double cityMileage;
    private Double highwayMileage;
    private Double length;
    private Double width;
    private Double height;
    private Double groundClearance;
    private Double wheelbase;
    private Double bootSpace;
    private String frontBrakeType;
    private String rearBrakeType;
    private String tireType;
    private String wheelSize;
    private Boolean airConditioning;
    private String airConditioningType;
    private Boolean powerSteering;
    private String powerWindowsType;
    private Boolean cruiseControl;
    private Boolean centralLocking;
    private Boolean infotainmentSystem;
    private Boolean navigationSystem;
    private Boolean sunroof;
    private Integer airbags;
    private Boolean abs;
    private Boolean ebd;
    private Boolean tractionControl;
    private Boolean rearCamera;
    private Boolean parkingSensors;
    private Boolean amFmRadio;
    private Boolean auxCompatibility;
    private Boolean usbCompatibility;
    private Boolean bluetooth;
    private Boolean antiTheftDevice;
    private String adjustableExternalMirror;
    private Boolean adjustableSteering;
    private String batteryCondition;
    private String insuranceType;
    private String lockSystem;
    private String makeYear;
    private String registrationPlace;
    private Boolean exchangeAvailable;
    private Boolean financeAvailable;
    private Boolean serviceHistoryAvailable;
    private String tyreCondition;
}