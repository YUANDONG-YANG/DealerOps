package com.carventory.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuarterlyProfitLossDTO {
    private String quarter; // Q1, Q2, Q3, or Q4
    private double totalProfit; // Total profit for the quarter
    private double totalLoss;   // Total loss for the quarter
}
