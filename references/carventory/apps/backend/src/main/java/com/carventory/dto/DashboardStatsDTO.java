package com.carventory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsDTO {
    private long totalCars;
    private long totalBuyers;
    private long totalSellers;
    private long pendingInquiries;
    private long bookings;
    private long totalAvailableCars;
    private long soldCars;
    private long carOnMaintenance;
} 