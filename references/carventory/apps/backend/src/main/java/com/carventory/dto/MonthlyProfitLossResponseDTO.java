package com.carventory.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyProfitLossResponseDTO {
    private String message;
    private String profitMessage;
    private String lossMessage;
    private String netMessage;
    private List<ProfitLossDetailsDTO> details;
    private List<MonthlyBreakdownDTO> monthly;
}
