package com.carventory.controller;

import com.carventory.dto.CustomerInquiryDTO;
import com.carventory.entity.CustomerInquiry;
import com.carventory.service.CustomerInquiryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
public class CustomerInquiryController {
    private final CustomerInquiryService customerInquiryService;

    @PostMapping
    public ResponseEntity<CustomerInquiry> createCustomerInquiry(@RequestBody CustomerInquiryDTO inquiryDTO) {
        CustomerInquiry inquiry = customerInquiryService.saveCustomerInquiry(inquiryDTO);
        return ResponseEntity.ok(inquiry);
    }

    @GetMapping
    public ResponseEntity<List<CustomerInquiry>> getAllCustomerInquiries() {
        return ResponseEntity.ok(customerInquiryService.getAllInquiries());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomerInquiry(@PathVariable Long id) {
        customerInquiryService.softDeleteCustomerInquiry(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<CustomerInquiry> getCustomerInquiry(@PathVariable Long id) {
        CustomerInquiry inquiry = customerInquiryService.getCustomerInquiryById(id);
        return ResponseEntity.ok(inquiry);
    }

    @GetMapping("/required-car/{model}")
    public ResponseEntity<List<CustomerInquiry>> getByCustomerRequiredCar(@PathVariable String model) {
        List<CustomerInquiry> inquiries = customerInquiryService.getInquiriesByCustomerRequiredCar(model);
        return ResponseEntity.ok(inquiries);
    }

    @GetMapping("/vin/{vin}")
    public ResponseEntity<List<CustomerInquiry>> getInquiriesByCarVin(@PathVariable String vin) {
        return ResponseEntity.ok(customerInquiryService.getInquiriesByCarVin(vin));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CustomerInquiry> updateCustomerInquiry(@PathVariable Long id, @RequestBody CustomerInquiryDTO inquiryDTO) {
        CustomerInquiry updatedInquiry = customerInquiryService.updateCustomerInquiry(id, inquiryDTO);
        return ResponseEntity.ok(updatedInquiry);
    }
}
