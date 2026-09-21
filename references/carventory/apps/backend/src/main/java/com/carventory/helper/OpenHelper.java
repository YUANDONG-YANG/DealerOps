package com.carventory.helper;

import com.carventory.dto.CarForCustomerDto;
import com.carventory.dto.CarForFilterDataDTO;
import com.carventory.dto.CompanyPublicDto;
import com.carventory.entity.Car;
import com.carventory.entity.CarImage;
import com.carventory.entity.CarSpecification;
import com.carventory.entity.Company;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.Collections;

@Component
public class OpenHelper {

    public CarForCustomerDto mapToAvailableCarForCustomerDto(Car car, CarImage carImage) {
        Company company = car.getCompany();

        String vin = car.getVin();
        String rtoCode = null;

        if (vin != null && vin.length() >= 4) {
            String stateCode = vin.substring(0, 2).toUpperCase();
            String districtCode = vin.substring(2, 4);
            rtoCode = stateCode + "-" + districtCode;
        }

        return CarForCustomerDto.builder()
                .id(car.getId())
                .make(car.getMake())
                .model(car.getModel())
                .year(car.getYear())
                .vin(vin)
                .rtoCode(rtoCode)
                .price(car.getPrice())
                .mileage(car.getMileage())
                .fuelType(car.getFuelType())
                .transmission(car.getTransmission())
                .condition(car.getCondition())
                .color(car.getColor())
                .odometerReading(car.getOdometerReading())
                .numberOfOwners(car.getNumberOfOwners())
                .imageUrl(car.getImageUrl())
                .carImage1Url(carImage != null ? carImage.getImage1Url() : null)
                .carImage2Url(carImage != null ? carImage.getImage2Url() : null)
                .carImage3Url(carImage != null ? carImage.getImage3Url() : null)
                .carImage4Url(carImage != null ? carImage.getImage4Url() : null)
                .carImage5Url(carImage != null ? carImage.getImage5Url() : null)
                .companyName(company.getCompanyName())
                .companyPhone(company.getCompanyPhone())
                .companyMobile(company.getCompanyMobile())
                .companyAddress(company.getCompanyAddress())
                .companyCity(company.getCity())
                .companyState(company.getState())
                .companyPostalCode(company.getPostalCode())
                .companyCountry(company.getCountry())
                .build();
    }

    public CarForCustomerDto mapToGetCarForCustomerDto(Car car, CarImage carImage, CarSpecification carSpec) {
        Company company = car.getCompany();

        return CarForCustomerDto.builder()
                .id(car.getId())
                .make(car.getMake())
                .model(car.getModel())
                .year(car.getYear())
                .vin(car.getVin())
                .price(car.getPrice())
                .mileage(car.getMileage())
                .fuelType(car.getFuelType())
                .transmission(car.getTransmission())
                .condition(car.getCondition())
                .color(car.getColor())
                .odometerReading(car.getOdometerReading())
                .numberOfOwners(car.getNumberOfOwners())
                .imageUrl(car.getImageUrl())
                // Car images
                .carImage1Url(carImage != null ? carImage.getImage1Url() : null)
                .carImage2Url(carImage != null ? carImage.getImage2Url() : null)
                .carImage3Url(carImage != null ? carImage.getImage3Url() : null)
                .carImage4Url(carImage != null ? carImage.getImage4Url() : null)
                .carImage5Url(carImage != null ? carImage.getImage5Url() : null)
                .carImage6Url(carImage != null ? carImage.getImage6Url() : null)
                .carImage7Url(carImage != null ? carImage.getImage7Url() : null)
                .carImage8Url(carImage != null ? carImage.getImage8Url() : null)
                .carImage9Url(carImage != null ? carImage.getImage9Url() : null)
                .carImage10Url(carImage != null ? carImage.getImage10Url() : null)
                .carImage11Url(carImage != null ? carImage.getImage11Url() : null)
                .carImage12Url(carImage != null ? carImage.getImage12Url() : null)
                .carImage13Url(carImage != null ? carImage.getImage13Url() : null)
                .carImage14Url(carImage != null ? carImage.getImage14Url() : null)
                .carImage15Url(carImage != null ? carImage.getImage15Url() : null)
                // Company details
                .companyName(company.getCompanyName())
                .companyPhone(company.getCompanyPhone())
                .companyMobile(company.getCompanyMobile())
                .companyAddress(company.getCompanyAddress())
                .companyCity(company.getCity())
                .companyState(company.getState())
                .companyPostalCode(company.getPostalCode())
                .companyCountry(company.getCountry())
                // Car specification fields
                .engineCapacity(carSpec != null ? carSpec.getEngineCapacity() : null)
                .drivetrain(carSpec != null ? carSpec.getDrivetrain() : null)
                .suspensionType(carSpec != null ? carSpec.getSuspensionType() : null)
                .fuelTankCapacity(carSpec != null ? carSpec.getFuelTankCapacity() : null)
                .cityMileage(carSpec != null ? carSpec.getCityMileage() : null)
                .highwayMileage(carSpec != null ? carSpec.getHighwayMileage() : null)
                .length(carSpec != null ? carSpec.getLength() : null)
                .width(carSpec != null ? carSpec.getWidth() : null)
                .height(carSpec != null ? carSpec.getHeight() : null)
                .groundClearance(carSpec != null ? carSpec.getGroundClearance() : null)
                .wheelbase(carSpec != null ? carSpec.getWheelbase() : null)
                .bootSpace(carSpec != null ? carSpec.getBootSpace() : null)
                .frontBrakeType(carSpec != null ? carSpec.getFrontBrakeType() : null)
                .rearBrakeType(carSpec != null ? carSpec.getRearBrakeType() : null)
                .tireType(carSpec != null ? carSpec.getTireType() : null)
                .wheelSize(carSpec != null ? carSpec.getWheelSize() : null)
                .airConditioning(carSpec != null ? carSpec.getAirConditioning() : null)
                .airConditioningType(carSpec != null ? carSpec.getAirConditioningType() : null)
                .powerSteering(carSpec != null ? carSpec.getPowerSteering() : null)
                .powerWindowsType(carSpec != null ? carSpec.getPowerWindowsType() : null)
                .cruiseControl(carSpec != null ? carSpec.getCruiseControl() : null)
                .centralLocking(carSpec != null ? carSpec.getCentralLocking() : null)
                .infotainmentSystem(carSpec != null ? carSpec.getInfotainmentSystem() : null)
                .navigationSystem(carSpec != null ? carSpec.getNavigationSystem() : null)
                .sunroof(carSpec != null ? carSpec.getSunroof() : null)
                .airbags(carSpec != null ? carSpec.getAirbags() : null)
                .abs(carSpec != null ? carSpec.getAbs() : null)
                .ebd(carSpec != null ? carSpec.getEbd() : null)
                .tractionControl(carSpec != null ? carSpec.getTractionControl() : null)
                .rearCamera(carSpec != null ? carSpec.getRearCamera() : null)
                .parkingSensors(carSpec != null ? carSpec.getParkingSensors() : null)
                .amFmRadio(carSpec != null ? carSpec.getAmFmRadio() : null)
                .auxCompatibility(carSpec != null ? carSpec.getAuxCompatibility() : null)
                .usbCompatibility(carSpec != null ? carSpec.getUsbCompatibility() : null)
                .bluetooth(carSpec != null ? carSpec.getBluetooth() : null)
                .antiTheftDevice(carSpec != null ? carSpec.getAntiTheftDevice() : null)
                .adjustableExternalMirror(carSpec != null ? carSpec.getAdjustableExternalMirror() : null)
                .adjustableSteering(carSpec != null ? carSpec.getAdjustableSteering() : null)
                .batteryCondition(carSpec != null ? carSpec.getBatteryCondition() : null)
                .insuranceType(carSpec != null ? carSpec.getInsuranceType() : null)
                .lockSystem(carSpec != null ? carSpec.getLockSystem() : null)
                .makeYear(carSpec != null ? carSpec.getMakeYear() : null)
                .registrationPlace(carSpec != null ? carSpec.getRegistrationPlace() : null)
                .exchangeAvailable(carSpec != null ? carSpec.getExchangeAvailable() : null)
                .financeAvailable(carSpec != null ? carSpec.getFinanceAvailable() : null)
                .serviceHistoryAvailable(carSpec != null ? carSpec.getServiceHistoryAvailable() : null)
                .tyreCondition(carSpec != null ? carSpec.getTyreCondition() : null)
                .build();
    }

    public CompanyPublicDto mapToCompanyPublicDto(Company company) {
        return CompanyPublicDto.builder()
                .id(company.getId())
                .companyName(company.getCompanyName())
                .companyPhone(company.getCompanyPhone())
                .companyMobile(company.getCompanyMobile())
                .companyAddress(company.getCompanyAddress())
                .city(company.getCity())
                .state(company.getState())
                .postalCode(company.getPostalCode())
                .country(company.getCountry())
                .yearEstablished(company.getYearEstablished())
                .companyLogoUrl(company.getCompanyLogoUrl())
                .companyImageUrl(company.getCompanyImageUrl())
                .rating(company.getRating())
                .reviewCount(company.getReviewCount())
                .description(company.getDescription())
                .carCount(null)
                .specialties(company.getSpecialties() != null
                        ? Arrays.asList(company.getSpecialties())
                        : Collections.emptyList())
                .hours(company.getHours())
                .website(company.getWebsite())
                .email(company.getEmail())
                .build();
    }


    public CarForFilterDataDTO mapToCarFilterData(Car car) {
        if (car == null) {
            throw new IllegalArgumentException("Car cannot be null");
        }

        Company company = car.getCompany();
        String vin = car.getVin();
        String rtoCode = null;

        if (vin != null && vin.length() >= 4) {
            String stateCode = vin.substring(0, 2).toUpperCase();
            String districtCode = vin.substring(2, 4);
            rtoCode = stateCode + "-" + districtCode;
        }

        String location = "";
        if (company != null) {
            String city = company.getCity() != null ? company.getCity() : "";
            String address = company.getCompanyAddress() != null ? company.getCompanyAddress() : "";
            location = city + " " + address;
        }

        return CarForFilterDataDTO.builder()
                .carId(car.getId())
                .carMake(car.getMake())
                .carModel(car.getModel())
                .carYear(car.getYear())
                .carPrice(car.getPrice())
                .carMileage(car.getMileage())
                .carFuelType(car.getFuelType())
                .carTransmission(car.getTransmission())
                .carOdometerReading(car.getOdometerReading())
                .carNumberOfOwners(car.getNumberOfOwners())
                .carImageUrl(car.getImageUrl())
                .rtoCode(rtoCode)
                .location(location.trim())
                .companyName(company != null ? company.getCompanyName() : null)
                .build();
    }

}