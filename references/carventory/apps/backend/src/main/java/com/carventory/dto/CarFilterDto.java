package com.carventory.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CarFilterDto {
    private String state;
    private String city;
    private String make;
    private String model;
    private String fuelType;
    private String transmission;
    private Integer minYear;
    private Integer maxYear;
    private List<List<Double>> mileageRanges;
    private Double minPrice;
    private Double maxPrice;
}