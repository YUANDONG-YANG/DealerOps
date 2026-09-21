package com.carventory.controller;

import com.carventory.entity.Seller;
import com.carventory.service.SellerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sellers")
@RequiredArgsConstructor
public class SellerController {

    private final SellerService sellerService;

    @GetMapping
    public ResponseEntity<List<Seller>> getAllSellers() {
        return ResponseEntity.ok(sellerService.getAllSellers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Seller> getSellerById(@PathVariable Long id) {
        return ResponseEntity.ok(sellerService.getSellerById(id));
    }

    @GetMapping("/vin/{vin}")
    public ResponseEntity<Seller> getSellerByVin(@PathVariable String vin) {
        return ResponseEntity.ok(sellerService.getSellerByVin(vin));
    }

    @GetMapping("/phone/{phone}")
    public ResponseEntity<List<Seller>> getSellersByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(sellerService.getSellersByPhone(phone));
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<List<Seller>> getSellersByName(@PathVariable String name) {
        return ResponseEntity.ok(sellerService.getSellersByName(name));
    }

    @GetMapping("/make-model/{keyword}")
    public ResponseEntity<List<Seller>> getSellersByCarMakeOrModel(@PathVariable String keyword) {
        return ResponseEntity.ok(sellerService.getSellersByCarMakeOrModel(keyword));
    }
}
