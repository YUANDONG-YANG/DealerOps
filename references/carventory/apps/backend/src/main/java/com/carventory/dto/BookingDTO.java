package com.carventory.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingDTO {
    private Long id;
    private String carVin;

    private String buyerName;
    private String buyerPhone;
    private String buyerEmail;

    private double advanceAmount;
    private double totalAmount;
    private LocalDate bookingDate;

    private LocalDate paymentCompletionDate;
}
