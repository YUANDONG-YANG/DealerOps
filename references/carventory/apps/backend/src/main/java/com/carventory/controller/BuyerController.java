package com.carventory.controller;

import com.carventory.dto.BuyerDTO;
import com.carventory.dto.CarBuyerDTO;
import com.carventory.entity.Buyer;
import com.carventory.service.BuyerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/buyers")
@RequiredArgsConstructor
public class BuyerController {
    private final BuyerService buyerService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<String> createBuyer(@ModelAttribute BuyerDTO buyerDTO) throws IOException {
        buyerService.saveBuyer(buyerDTO); // Save logic inside
        return ResponseEntity.ok("Buyer created successfully");
    }

    @PutMapping(value = "/{id}", consumes = "multipart/form-data")
    public ResponseEntity<Buyer> updateBuyer(@PathVariable Long id, @ModelAttribute BuyerDTO buyerDTO) throws IOException {
        Buyer updatedBuyer = buyerService.updateBuyer(id, buyerDTO);
        return ResponseEntity.ok(updatedBuyer);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteBuyer(@PathVariable Long id) {
        buyerService.deleteBuyer(id);
        return ResponseEntity.ok("Buyer deleted successfully");
    }

    @GetMapping
    public ResponseEntity<List<Buyer>> getAllBuyers() {
        return ResponseEntity.ok(buyerService.getAllBuyers());
    }

    @GetMapping("/phone/{phone}")
    public ResponseEntity<List<Buyer>> getBuyersByContact(@PathVariable String phone) {
        return ResponseEntity.ok(buyerService.getBuyersByContact(phone));
    }

    @GetMapping("/name/{name}")
    public ResponseEntity<List<Buyer>> getBuyersByName(@PathVariable String name) {
        return ResponseEntity.ok(buyerService.getBuyersByName(name));
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<List<Buyer>> getBuyersByEmail(@PathVariable String email) {
        return ResponseEntity.ok(buyerService.getBuyersByEmail(email));
    }

    @GetMapping("/vin/{vin}")
    public ResponseEntity<Buyer> getBuyerByVin(@PathVariable String vin) {
        return ResponseEntity.ok(buyerService.getBuyerByVin(vin.toUpperCase()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CarBuyerDTO> getBuyerById(@PathVariable Long id) {
        CarBuyerDTO carBuyerDTO = buyerService.getBuyerById(id);
        return ResponseEntity.ok(carBuyerDTO);
    }

    @GetMapping("/make-model/{searchTerm}")
    public ResponseEntity<List<Buyer>> findBuyersByCarMakeOrModel(@PathVariable String searchTerm) {
        return ResponseEntity.ok(buyerService.findBuyersByCarMakeOrModel(searchTerm));
    }
}
