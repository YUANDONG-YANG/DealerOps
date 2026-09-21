package com.carventory.helper;

import com.carventory.dto.ProfitLossDetailsDTO;
import com.carventory.entity.Buyer;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class ProfitLossHelper {

    public ProfitLossDetailsDTO buildProfitLossDTO(Buyer buyer) {
        if (buyer == null || buyer.getCar() == null) return null;

        Double purchase = buyer.getCar().getPurchasePrice();
        Double maintain = buyer.getCar().getCarMaintainAmount();
        Double sale = buyer.getSalePrice();

        if (purchase == null || maintain == null || sale == null) return null;

        BigDecimal purchasePrice = BigDecimal.valueOf(purchase);
        BigDecimal maintenancePrice = BigDecimal.valueOf(maintain);
        BigDecimal salePrice = BigDecimal.valueOf(sale);
        BigDecimal cost = purchasePrice.add(maintenancePrice);
        BigDecimal diff = salePrice.subtract(cost);

        double profit = 0;
        double loss = 0;
        if (diff.compareTo(BigDecimal.ZERO) > 0) {
            profit = diff.doubleValue();
        } else {
            loss = diff.abs().doubleValue();
        }

        return ProfitLossDetailsDTO.builder()
                .carMakeModel(buyer.getCar().getMake() + " " + buyer.getCar().getModel())
                .vin(buyer.getCar().getVin())
                .purchasePrice(purchase)
                .maintenancePrice(maintain)
                .maintenanceDetails(buyer.getCar().getCarMaintainDetails())
                .salePrice(sale)
                .profit(profit)
                .loss(loss)
                .build();
    }
}
