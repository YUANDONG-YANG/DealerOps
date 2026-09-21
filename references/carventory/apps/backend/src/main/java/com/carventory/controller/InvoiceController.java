package com.carventory.controller;

import com.carventory.service.InvoiceService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping("/buyer/{buyerId}")
    public void downloadBuyerInvoice(@PathVariable Long buyerId, HttpServletResponse response) throws IOException {
        invoiceService.generateBuyerInvoice(buyerId, response);
    }
}
