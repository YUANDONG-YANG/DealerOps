package com.carventory.dto;

import lombok.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CarSellerDTO {

    private String carMake;
    private String carModel;
    private int carYear;
    private String carVin;  //Vehicle Identification Number
    private String carEngineNumber; // Added: Engine Number
    private String carChassisNumber; // Added: Chassis Number
    private double carPrice;
    private double carMileage;
    private double carPurchasePrice;
    private LocalDate carPurchaseDate;
    private double carMaintainAmount;
    private String carMaintainDetails;
    private String carFuelType;
    private String carTransmission;
    private String carCondition;
    private String carColor;
    private String carStatus;
    private int carOdometerReading;
    private int carNumberOfOwners;
    private Long carSellerId; // Reference to the seller

    private MultipartFile carImage; // Main photo
    private MultipartFile carRcDocument; // Mandatory RC document
    private MultipartFile carInsuranceDocument; // Optional insurance document
    private MultipartFile carPucDocument; // Optional PUC document

    //Car Additional Images
    private MultipartFile carImage1;
    private MultipartFile carImage2;
    private MultipartFile carImage3;
    private MultipartFile carImage4;
    private MultipartFile carImage5;
    private MultipartFile carImage6;
    private MultipartFile carImage7;
    private MultipartFile carImage8;
    private MultipartFile carImage9;
    private MultipartFile carImage10;
    private MultipartFile carImage11;
    private MultipartFile carImage12;
    private MultipartFile carImage13;
    private MultipartFile carImage14;
    private MultipartFile carImage15;

    private String sellerName;
    private String sellerPhone;
    private String sellerEmail;
    private String sellerAddress;
    private MultipartFile sellerPhoto;
    private MultipartFile sellerAadharCard;
    private MultipartFile sellerPanCard;
    private MultipartFile sellerAddressProof;

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