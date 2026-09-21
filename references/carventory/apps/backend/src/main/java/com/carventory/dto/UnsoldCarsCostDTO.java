package com.carventory.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UnsoldCarsCostDTO {
    private double totalStuckCapital;
    private int totalUnsoldCars;
}
