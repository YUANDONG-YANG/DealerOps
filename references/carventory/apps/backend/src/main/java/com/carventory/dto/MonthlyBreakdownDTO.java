package com.carventory.dto;

import lombok.*;

@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class MonthlyBreakdownDTO {
    private String month;
    private double profit;
    private double loss;
    private double net;
}
