package com.carventory.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoiDTO {
    private double totalInvestment;
    private double totalProfit;
    private String roiPercentage;
}
