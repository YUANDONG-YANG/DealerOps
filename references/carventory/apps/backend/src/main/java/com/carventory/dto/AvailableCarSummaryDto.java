package com.carventory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AvailableCarSummaryDto {
    private Long id;
    private String carName;
    private int year;
    private String vin;
    private double salePrice;
    private long daysInInventory;
}
