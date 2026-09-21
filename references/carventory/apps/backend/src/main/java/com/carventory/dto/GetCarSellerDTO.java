package com.carventory.dto;

import lombok.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GetCarSellerDTO {

    //This DTO is used for getting data from DB and show on UI.
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

    private String carImageUrl;
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
    private String carRcDocumentUrl; // RC document (PDF)
    private String carInsuranceDocumentUrl; // Insurance document (PDF)
    private String carPucDocumentUrl; // PUC document (PDF)


    private String sellerName;
    private String sellerPhone;
    private String sellerEmail;
    private String sellerAddress;
    private String sellerPhotoUrl; // Seller photo (image)
    private String sellerAadharCardUrl; // Seller Aadhar card (PDF)
    private String sellerPanCardUrl; // Seller PAN card (PDF)
    private String sellerAddressProofUrl; // Seller address proof (PDF)

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
