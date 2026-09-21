package com.carventory.service;

import com.carventory.dto.CarForCustomerDto;
import com.carventory.dto.CarForFilterDataDTO;
import com.carventory.dto.CompanyPublicDto;
import com.carventory.entity.Car;
import com.carventory.entity.CarImage;
import com.carventory.entity.CarSpecification;
import com.carventory.repository.CarImageRepository;
import com.carventory.repository.CarRepository;
import com.carventory.helper.OpenHelper;
import com.carventory.repository.CarSpecificationRepository;
import com.carventory.repository.CompanyRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OpenService {

    private final CarImageRepository carImageRepository;
    private final CarRepository carRepository;
    private final OpenHelper openHelper;
    private final CompanyRepository companyRepository;
    private final CarSpecificationRepository carSpecificationRepository;

    @Transactional
    public List<CarForFilterDataDTO> getAvailableCarsForCustomer() {
        List<Car> cars = carRepository.findAvailableCarsForCustomer();

        return cars.stream()
                .filter(car -> "available".equalsIgnoreCase(car.getStatus()))
                .map(openHelper::mapToCarFilterData)
                .collect(Collectors.toList());
    }


    @Transactional
    public CarForCustomerDto getCarById(Long id) {
        Car car = carRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Car not found with ID: " + id));
        CarImage carImage = carImageRepository.findCarImagesByCarId(id);

        CarSpecification carSpec = carSpecificationRepository.findByCarId(id)
                .orElse(null);

        return openHelper.mapToGetCarForCustomerDto(car, carImage, carSpec);
    }

    @Transactional
    public List<CompanyPublicDto> getAllActiveCompanies() {
        return companyRepository.findByDeleteFlagFalse().stream()
                .map(openHelper::mapToCompanyPublicDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CarForCustomerDto> getCarsByCompanyId(Long companyId) {
        List<Car> cars = carRepository.findByCompanyIdAndDeleteFlagFalse(companyId);

        return cars.stream()
                .map(car -> {
                    CarImage carImage = carImageRepository.findCarImagesByCarId(car.getId());
                    return openHelper.mapToAvailableCarForCustomerDto(car, carImage);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CarForCustomerDto> getCarsByState(String state) {
        List<Car> cars = carRepository.findByCompanyStateAndDeleteFlagFalse(state);

        return cars.stream()
                .map(car -> {
                    CarImage carImage = carImageRepository.findCarImagesByCarId(car.getId());
                    return openHelper.mapToAvailableCarForCustomerDto(car, carImage);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CarForCustomerDto> getCarsByCity(String city) {
        List<Car> cars = carRepository.findByCompanyCityAndDeleteFlagFalse(city);

        return cars.stream()
                .map(car -> {
                    CarImage carImage = carImageRepository.findCarImagesByCarId(car.getId());
                    return openHelper.mapToAvailableCarForCustomerDto(car, carImage);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CarForCustomerDto> getCarsByMake(String make) {
        List<Car> cars = carRepository.findByMakeIgnoreCaseAndDeleteFlagFalse(make);

        return cars.stream()
                .map(car -> {
                    CarImage carImage = carImageRepository.findCarImagesByCarId(car.getId());
                    return openHelper.mapToAvailableCarForCustomerDto(car, carImage);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CarForCustomerDto> getCarsByFuelType(String fuelType) {
        List<Car> cars = carRepository.findByFuelTypeIgnoreCaseAndDeleteFlagFalse(fuelType);

        return cars.stream()
                .map(car -> {
                    CarImage carImage = carImageRepository.findCarImagesByCarId(car.getId());
                    return openHelper.mapToAvailableCarForCustomerDto(car, carImage);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CarForCustomerDto> getCarsByTransmission(String transmission) {
        List<Car> cars = carRepository.findByTransmissionIgnoreCaseAndDeleteFlagFalse(transmission);

        return cars.stream()
                .map(car -> {
                    CarImage carImage = carImageRepository.findCarImagesByCarId(car.getId());
                    return openHelper.mapToAvailableCarForCustomerDto(car, carImage);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CarForCustomerDto> getCarsByYear(int year) {
        List<Car> cars = carRepository.findByYearAndDeleteFlagFalse(year);

        return cars.stream()
                .map(car -> {
                    CarImage carImage = carImageRepository.findCarImagesByCarId(car.getId());
                    return openHelper.mapToAvailableCarForCustomerDto(car, carImage);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CarForCustomerDto> getCarsByMileage(double mileage) {
        List<Car> cars = carRepository.findByMileageAndDeleteFlagFalse(mileage);

        return cars.stream()
                .map(car -> {
                    CarImage carImage = carImageRepository.findCarImagesByCarId(car.getId());
                    return openHelper.mapToAvailableCarForCustomerDto(car, carImage);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CarForCustomerDto> getCarsByPrice(double price) {
        List<Car> cars = carRepository.findByPriceAndDeleteFlagFalse(price);

        return cars.stream()
                .map(car -> {
                    CarImage carImage = carImageRepository.findCarImagesByCarId(car.getId());
                    return openHelper.mapToAvailableCarForCustomerDto(car, carImage);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CarForFilterDataDTO> getCarsByFilters(
            String state,
            String city,
            String make,
            String model,
            String fuelType,
            String transmission,
            Integer minYear,
            Integer maxYear,
            List<List<Double>> mileageRanges,
            Double minPrice,
            Double maxPrice) {

        List<Car> cars = carRepository.findByFilters(
                state, city, make, model, fuelType, transmission,
                minYear, maxYear, minPrice, maxPrice
        );

        return cars.stream()
                .filter(car -> "available".equalsIgnoreCase(car.getStatus()))
                .filter(car -> {
                    if (mileageRanges == null || mileageRanges.isEmpty()) return true;
                    if (car.getOdometerReading() == null) return false;

                    int odo = car.getOdometerReading();
                    return mileageRanges.stream().anyMatch(range ->
                            range != null && range.size() == 2 &&
                                    odo >= range.get(0) && odo <= range.get(1)
                    );
                })
                .map(openHelper::mapToCarFilterData)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CompanyPublicDto> getDealersByName(String dealerName) {
        return companyRepository
                .findByCompanyNameContainingIgnoreCaseAndDeleteFlagFalse(dealerName)
                .stream()
                .map(openHelper::mapToCompanyPublicDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public List<CompanyPublicDto> getDealersByLocation(String location) {
        return companyRepository
                .findByCityContainingIgnoreCaseAndDeleteFlagFalse(location)
                .stream()
                .map(openHelper::mapToCompanyPublicDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public CompanyPublicDto getCompanyById(Long id) {
        return companyRepository.findById(id)
                .map(openHelper::mapToCompanyPublicDto)
                .orElseThrow(() -> new RuntimeException("Company not found with ID: " + id));
    }
}