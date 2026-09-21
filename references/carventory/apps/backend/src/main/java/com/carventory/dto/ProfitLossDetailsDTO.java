package com.carventory.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfitLossDetailsDTO {
    private String carMakeModel;
    private String vin;

    private double purchasePrice;
    private double maintenancePrice;
    private String maintenanceDetails;

    private double salePrice;

    private double profit; // Will be > 0 only if sale > cost
    private double loss;   // Will be > 0 only if sale < cost
}
