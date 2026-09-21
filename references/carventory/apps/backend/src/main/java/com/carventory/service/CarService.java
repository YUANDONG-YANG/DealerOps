package com.carventory.service;

import com.carventory.dto.AvailableCarSummaryDto;
import com.carventory.dto.CarSellerDTO;
import com.carventory.dto.GetCarSellerDTO;
import com.carventory.dto.UserInfoResponse;
import com.carventory.entity.*;
import com.carventory.helper.CarHelper;
import com.carventory.repository.*;
import com.carventory.util.CarDetailsPdfGenerator;
import com.carventory.util.CloudinaryUploader;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.OutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CarService {

    private final CarRepository carRepository;
    private final SellerRepository sellerRepository;
    private final BuyerRepository buyerRepository;
    private final CarDetailsPdfGenerator carDetailsPdfGenerator;
    private final SellerService sellerService;
    private final CarHelper carHelper;
    private final CarImageRepository carImageRepository;
    private final CarSpecificationRepository carSpecificationRepository;
    private final com.carventory.util.CloudinaryUploader cloudinaryUploader;

    @Transactional
    public Car saveCarAndSeller(CarSellerDTO carSellerDTO) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Optional<Car> existingCar = carRepository.findByVinAndDeleteFlagFalse(carSellerDTO.getCarVin());
        if (existingCar.isPresent()) {
            throw new IllegalArgumentException("Car VIN already exists");
        }

        Seller seller = sellerService.saveSellerFromCarSellerDTO(carSellerDTO,userInfo);

        Car car = carHelper.buildCarEntity(carSellerDTO, seller,userInfo);

        Car savedCar = carRepository.save(car);

        // Save specification
        CarSpecification spec = carHelper.buildCarSpecification(savedCar, carSellerDTO);
        carSpecificationRepository.save(spec);

        // Save car images
        CarImage carImage = carHelper.buildCarImageEntity(savedCar, carSellerDTO);
        carImageRepository.save(carImage);

        return savedCar;
    }

    @Transactional
    public Car updateCarAndSeller(Long carId, CarSellerDTO dto) {
        Car existingCar = carRepository.findById(carId)
                .orElseThrow(() -> new RuntimeException("Car not found with id: " + carId));

        // Delegate seller update
        Seller updatedSeller = sellerService.updateSellerFromCarDTO(existingCar.getSeller(), dto);
        existingCar.setSeller(updatedSeller); // optional if already set

        // Delegate car update to helper
        carHelper.updateCarFromDTO(existingCar, dto);

        Car savedCar = carRepository.save(existingCar);

        Optional<CarSpecification> specOpt = carSpecificationRepository.findByCarId(savedCar.getId());
        if (specOpt.isPresent()) {
            carHelper.updateCarSpecification(specOpt.get(), dto);
            carSpecificationRepository.save(specOpt.get());
        } else {
            CarSpecification newSpec = carHelper.buildCarSpecification(savedCar, dto);
            carSpecificationRepository.save(newSpec);
        }

        // Update or create car images
        Optional<CarImage> existingCarImageOpt = carImageRepository.findByCarIdAndDeleteFlagFalse(savedCar.getId());
        if (existingCarImageOpt.isPresent()) {
            CarImage existingCarImage = existingCarImageOpt.get();
            carHelper.updateCarImageFromDTO(existingCarImage, dto);
            carImageRepository.save(existingCarImage);
        } else {
            CarImage newCarImage = carHelper.buildCarImageEntity(savedCar, dto);
            carImageRepository.save(newCarImage);
        }

        return savedCar;
    }

    @Transactional
    public void deleteCarAndSeller(Long carId) {
        Car car = carRepository.findById(carId)
                .orElseThrow(() -> new RuntimeException("Car not found with id: " + carId));

        // Soft delete the car
        car.setDeleteFlag(true);
        car.setStatus("Not Exists");
        carRepository.save(car);

        // Hard delete car images from Cloudinary and database
        carImageRepository.findByCarIdAndDeleteFlagFalse(carId)
                .ifPresent(carImage -> {
                    for (String url : new String[]{
                            carImage.getImage1Url(), carImage.getImage2Url(), carImage.getImage3Url(),
                            carImage.getImage4Url(), carImage.getImage5Url(), carImage.getImage6Url(),
                            carImage.getImage7Url(), carImage.getImage8Url(), carImage.getImage9Url(),
                            carImage.getImage10Url(), carImage.getImage11Url(), carImage.getImage12Url(),
                            carImage.getImage13Url(), carImage.getImage14Url(), carImage.getImage15Url()
                    }) {
                        if (url != null && !url.isEmpty()) {
                            cloudinaryUploader.deleteFileByUrl(url);
                        }
                    }
                    carImageRepository.delete(carImage);
                });

        // Hard delete car's main documents from Cloudinary
        for (String url : new String[]{
                car.getImageUrl(), car.getRcDocumentUrl(),
                car.getInsuranceDocumentUrl(), car.getPucDocumentUrl()
        }) {
            if (url != null && !url.isEmpty()) {
                cloudinaryUploader.deleteFileByUrl(url);
            }
        }

        // Hard delete car specifications
        carSpecificationRepository.findByCarId(carId)
                .ifPresent(carSpecificationRepository::delete);

        // Soft delete the associated seller and hard delete their documents
        Seller seller = car.getSeller();
        if (seller != null) {
            seller.setDeleteFlag(true);
            sellerRepository.save(seller);

            // Hard delete seller's documents from Cloudinary
            for (String url : new String[]{
                    seller.getPhotoUrl(), seller.getAadharCardUrl(),
                    seller.getPanCardUrl(), seller.getAddressProofUrl()
            }) {
                if (url != null && !url.isEmpty()) {
                    cloudinaryUploader.deleteFileByUrl(url);
                }
            }
        }

        // Soft delete the associated buyer if needed
        Buyer buyer = car.getBuyer();
        if (buyer != null) {
            buyer.setDeleteFlag(true);
            buyerRepository.save(buyer);
        }
    }


    @Transactional
    public List<Car> getAllCars() {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();
        return carRepository.findByCompanyIdAndDeleteFlagFalse(companyId);
    }

    @Transactional
    public Optional<Car> findByVin(String vin) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        Optional<Car> car = carRepository.findByVinAndCompanyIdAndDeleteFlagFalse(vin.toUpperCase(), companyId);
        if (car.isEmpty()) {
            throw new RuntimeException("Car not found with VIN Number: " + vin);
        }
        return car;
    }

    @Transactional
    public GetCarSellerDTO findById(Long id) {
        Car car = carRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Car not found with ID: " + id));

        return carHelper.mapToGetCarSellerDTO(car);
    }

    @Transactional
    public List<Car> searchByMakeOrModel(String keyword) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();
        return carRepository.findByMakeOrModelLikeIgnoreCaseAndCompanyId(keyword, keyword, companyId);
    }

    public void generateCarDetailsPdf(Long carId, OutputStream outputStream) throws IOException {
        // Fetch the car details from the database (you can replace this with your actual repository)
        Car car = carRepository.findById(carId)
                .orElseThrow(() -> new RuntimeException("Car not found with ID: " + carId));

        carDetailsPdfGenerator.generateCarDetailsPdf(outputStream, car);
    }

    @Transactional
    public Map<String, String> getMonthlySoldCarCount(Integer year) {
        if (year == null) {
            year = LocalDateTime.now().getYear();
        }

        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        List<Car> soldCars = carRepository.findAllByBuyerIsNotNullAndCompanyIdAndDeleteFlagFalse(companyId);

        Map<String, String> monthCountMap = new LinkedHashMap<>();

        // Initialize map with 0 for all months
        for (Month month : Month.values()) {
            monthCountMap.put(month.name().substring(0, 3).toLowerCase(), "0");
        }

        for (Car car : soldCars) {
            LocalDate soldDate = car.getBuyer().getSaleDate();
            if (soldDate != null && soldDate.getYear() == year) {
                String monthKey = soldDate.getMonth().name().substring(0, 3).toLowerCase();
                int currentCount = Integer.parseInt(monthCountMap.get(monthKey));
                monthCountMap.put(monthKey, String.valueOf(currentCount + 1));
            }
        }

        return monthCountMap;
    }

    @Transactional
    public List<AvailableCarSummaryDto> getAvailableCarSummaries() {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        List<Car> availableCars = carRepository.findCarsOrderByPurchaseDateAsc(companyId);

        return availableCars.stream().map(car -> {
            String carName = car.getMake() + " " + car.getModel();
            long daysInInventory = ChronoUnit.DAYS.between(car.getPurchaseDate(), LocalDate.now());
            return new AvailableCarSummaryDto(
                    car.getId(),
                    carName,
                    car.getYear(),
                    car.getVin(),
                    car.getPrice(),
                    daysInInventory
            );
        }).toList();
    }

    @Transactional
    public void deleteOldSoldCarImagesAndSpecifications() {

        // Fetch all sold cars (with buyer not null)
        List<Car> soldCars = carRepository.findAllByBuyerIsNotNullAndDeleteFlagFalse();

        LocalDate threeDaysAgo = LocalDate.now().minusDays(3);

        for (Car car : soldCars) {
            if (car.getBuyer() != null && car.getBuyer().getSaleDate() != null &&
                    car.getBuyer().getSaleDate().isBefore(threeDaysAgo)) {

                // Hard delete car images
                //carImageRepository.findByCarIdAndDeleteFlagFalse(car.getId())
                  //      .ifPresent(carImageRepository::delete);

                // Hard delete car images (and remove from Cloudinary)
                carImageRepository.findByCarIdAndDeleteFlagFalse(car.getId())
                        .ifPresent(carImage -> {
                            // Delete all image URLs from Cloudinary
                            for (String url : new String[]{
                                    carImage.getImage1Url(), carImage.getImage2Url(), carImage.getImage3Url(),
                                    carImage.getImage4Url(), carImage.getImage5Url(), carImage.getImage6Url(),
                                    carImage.getImage7Url(), carImage.getImage8Url(), carImage.getImage9Url(),
                                    carImage.getImage10Url(), carImage.getImage11Url(), carImage.getImage12Url(),
                                    carImage.getImage13Url(), carImage.getImage14Url(), carImage.getImage15Url()
                            }) {
                                if (url != null && !url.isEmpty()) {
                                    cloudinaryUploader.deleteFileByUrl(url);
                                }
                            }
                            carImageRepository.delete(carImage);
                        });

                // Hard delete car specification
                carSpecificationRepository.findByCarId(car.getId())
                        .ifPresent(carSpecificationRepository::delete);
            }
        }
    }
}