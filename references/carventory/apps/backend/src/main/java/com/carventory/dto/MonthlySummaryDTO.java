package com.carventory.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlySummaryDTO {
    private int year;
    private String message;
    private String profitMessage;
    private String lossMessage;
    private String netMessage;
    private Map<String, Double> monthly;
    private List<ProfitLossDetailsDTO> details;
}
