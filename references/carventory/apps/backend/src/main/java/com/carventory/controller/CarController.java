    package com.carventory.controller;

    import com.carventory.dto.AvailableCarSummaryDto;
    import com.carventory.dto.CarSellerDTO;
    import com.carventory.dto.GetCarSellerDTO;
    import com.carventory.entity.Car;
    import com.carventory.service.CarService;
    import jakarta.servlet.http.HttpServletResponse;
    import lombok.RequiredArgsConstructor;
    import org.springframework.http.ResponseEntity;
    import org.springframework.web.bind.annotation.*;

    import java.io.IOException;
    import java.util.List;
    import java.util.Map;
    import java.util.Optional;

    @RestController
    @RequestMapping("/api/cars")
    @RequiredArgsConstructor
    public class CarController {
        private final CarService carService;

        @PostMapping(consumes = "multipart/form-data")
        public ResponseEntity<?> createCarAndSeller(@ModelAttribute CarSellerDTO carSellerDTO) {
            return ResponseEntity.ok(carService.saveCarAndSeller(carSellerDTO));
        }

        @PutMapping(value = "/{carId}", consumes = "multipart/form-data")
        public ResponseEntity<?> updateCarAndSeller(@PathVariable Long carId, @ModelAttribute CarSellerDTO carSellerDTO) {
            return ResponseEntity.ok(carService.updateCarAndSeller(carId, carSellerDTO));
        }

        @DeleteMapping("/{carId}")
        public ResponseEntity<?> deleteCarAndSeller(@PathVariable Long carId) {
            carService.deleteCarAndSeller(carId);
            return ResponseEntity.ok("Car and associated seller deleted successfully.");
        }

        @GetMapping
        public ResponseEntity<List<Car>> getAllCars() {
            return ResponseEntity.ok(carService.getAllCars());
        }

        @GetMapping("/vin/{vin}")
        public ResponseEntity<Optional<Car>> findByVin(@PathVariable String vin) {
            return ResponseEntity.ok(carService.findByVin(vin));
        }

        @GetMapping("/{id}")
        public ResponseEntity<GetCarSellerDTO> findById(@PathVariable("id") Long id) {
            GetCarSellerDTO getCarSellerDTO = carService.findById(id);
            return ResponseEntity.ok(getCarSellerDTO);
        }

        @GetMapping("/search/{keyword}")
        public ResponseEntity<List<Car>> searchCarsByMakeOrModel(@PathVariable String keyword) {
            return ResponseEntity.ok(carService.searchByMakeOrModel(keyword));
        }

        @GetMapping("/details/{carId}")
        public void downloadCarDetailsPdf(@PathVariable Long carId, HttpServletResponse response) throws IOException {
            response.setContentType("application/pdf");
            String headerValue = "attachment; filename=car_details_" + carId + ".pdf";
            response.setHeader("Content-Disposition", headerValue);

            carService.generateCarDetailsPdf(carId, response.getOutputStream());
        }

        @GetMapping("/sold-count/{year}")
        public ResponseEntity<Map<String, String>> getMonthlySoldCarCount(@PathVariable int year) {
            return ResponseEntity.ok(carService.getMonthlySoldCarCount(year));
        }

        @GetMapping("/sold-count")
        public ResponseEntity<Map<String, String>> getMonthlySoldCarCountCurrentYear() {
            return ResponseEntity.ok(carService.getMonthlySoldCarCount(null));
        }

        @GetMapping("/sorted-by-purchase-date")
        public ResponseEntity<List<AvailableCarSummaryDto>> getAvailableCarSummaries() {
            return ResponseEntity.ok(carService.getAvailableCarSummaries());
        }
    }
