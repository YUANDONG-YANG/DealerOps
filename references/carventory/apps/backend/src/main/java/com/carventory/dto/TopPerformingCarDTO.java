package com.carventory.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopPerformingCarDTO {
    private String carMakeModel;
    private String vin;
    private long salesCount;
    private double averageProfit;
}
