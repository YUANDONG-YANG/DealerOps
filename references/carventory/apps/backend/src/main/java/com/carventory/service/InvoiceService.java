package com.carventory.service;

import com.carventory.entity.Buyer;
import com.carventory.entity.Car;
import com.carventory.repository.BuyerRepository;
import com.carventory.util.InvoicePdfGenerator;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final BuyerRepository buyerRepository;
    private final InvoicePdfGenerator invoicePdfGenerator;

    public void generateBuyerInvoice(Long buyerId, HttpServletResponse response) throws IOException {
        Buyer buyer = buyerRepository.findById(buyerId)
                .orElseThrow(() -> new RuntimeException("Buyer not found with ID: " + buyerId));

        if (buyer.getCar() == null) {
            throw new RuntimeException("Buyer is not associated with any car.");
        }

        Car car = buyer.getCar();

        // Set response headers
        response.setContentType("application/pdf");
        String headerValue = "attachment; filename=invoice_buyer_" + buyerId + ".pdf";
        response.setHeader("Content-Disposition", headerValue);

        invoicePdfGenerator.generateBuyerInvoice(response.getOutputStream(), buyer, car);
    }
}
