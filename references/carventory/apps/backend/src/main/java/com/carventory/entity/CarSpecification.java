package com.carventory.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "car_specifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CarSpecification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "car_id", nullable = false, unique = true)
    private Car car;

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

    private LocalDateTime createdAt = LocalDateTime.now();
}
