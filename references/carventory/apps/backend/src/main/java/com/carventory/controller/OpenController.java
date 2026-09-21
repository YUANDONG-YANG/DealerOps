package com.carventory.controller;

import com.carventory.dto.*;
import com.carventory.entity.CarImage;
import com.carventory.service.OpenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/open-api")
@RequiredArgsConstructor
public class OpenController {

    private final OpenService openService;

    @GetMapping("/cars")
    public ResponseEntity<List<CarForFilterDataDTO>> getAvailableCarsForCustomer() {
        return ResponseEntity.ok(openService.getAvailableCarsForCustomer());
    }

    @GetMapping("cars/{id}")
    public ResponseEntity<CarForCustomerDto> getCarById(@PathVariable("id") Long id) {
        CarForCustomerDto carForCustomerDto = openService.getCarById(id);
        return ResponseEntity.ok(carForCustomerDto);
    }

    @GetMapping("/companies")
    public ResponseEntity<List<CompanyPublicDto>> getAllActiveCompanies() {
        return ResponseEntity.ok(openService.getAllActiveCompanies());
    }

    @GetMapping("/cars/company/{companyId}")
    public ResponseEntity<List<CarForCustomerDto>> getCarsByCompanyId(@PathVariable Long companyId) {
        return ResponseEntity.ok(openService.getCarsByCompanyId(companyId));
    }

    @GetMapping("/cars/state/{state}")
    public ResponseEntity<List<CarForCustomerDto>> getCarsByState(@PathVariable String state) {
        return ResponseEntity.ok(openService.getCarsByState(state));
    }

    @GetMapping("/cars/city/{city}")
    public ResponseEntity<List<CarForCustomerDto>> getCarsByCity(@PathVariable String city) {
        return ResponseEntity.ok(openService.getCarsByCity(city));
    }

    @GetMapping("/cars/make/{make}")
    public ResponseEntity<List<CarForCustomerDto>> getCarsByMake(@PathVariable String make) {
        return ResponseEntity.ok(openService.getCarsByMake(make));
    }

    @GetMapping("/cars/fuel-type/{fuelType}")
    public ResponseEntity<List<CarForCustomerDto>> getCarsByFuelType(@PathVariable String fuelType) {
        return ResponseEntity.ok(openService.getCarsByFuelType(fuelType));
    }

    @GetMapping("/cars/transmission/{transmission}")
    public ResponseEntity<List<CarForCustomerDto>> getCarsByTransmission(@PathVariable String transmission) {
        return ResponseEntity.ok(openService.getCarsByTransmission(transmission));
    }

    @GetMapping("/cars/year/{year}")
    public ResponseEntity<List<CarForCustomerDto>> getCarsByYear(@PathVariable int year) {
        return ResponseEntity.ok(openService.getCarsByYear(year));
    }

    @GetMapping("/cars/mileage/{mileage}")
    public ResponseEntity<List<CarForCustomerDto>> getCarsByMileage(@PathVariable double mileage) {
        return ResponseEntity.ok(openService.getCarsByMileage(mileage));
    }

    @GetMapping("/cars/price/{price}")
    public ResponseEntity<List<CarForCustomerDto>> getCarsByPrice(@PathVariable double price) {
        return ResponseEntity.ok(openService.getCarsByPrice(price));
    }

    @PostMapping("/cars/filter")
    public ResponseEntity<List<CarForFilterDataDTO>> getCarsByFilters(@RequestBody CarFilterDto filter) {
        return ResponseEntity.ok(openService.getCarsByFilters(
                filter.getState(),
                filter.getCity(),
                filter.getMake(),
                filter.getModel(),
                filter.getFuelType(),
                filter.getTransmission(),
                filter.getMinYear(),
                filter.getMaxYear(),
                filter.getMileageRanges(),
                filter.getMinPrice(),
                filter.getMaxPrice()));
    }

    @GetMapping("/dealers/name/{dealerName}")
    public ResponseEntity<List<CompanyPublicDto>> getDealersByName(@PathVariable String dealerName) {
        return ResponseEntity.ok(openService.getDealersByName(dealerName));
    }

    @GetMapping("/dealers/location/{location}")
    public ResponseEntity<List<CompanyPublicDto>> getDealersByLocation(@PathVariable String location) {
        return ResponseEntity.ok(openService.getDealersByLocation(location));
    }

    @GetMapping("/companies/{id}")
    public ResponseEntity<CompanyPublicDto> getCompanyById(@PathVariable Long id) {
        return ResponseEntity.ok(openService.getCompanyById(id));
    }
}