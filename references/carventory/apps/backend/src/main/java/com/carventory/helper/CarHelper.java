package com.carventory.helper;

import com.carventory.dto.CarSellerDTO;
import com.carventory.dto.GetCarSellerDTO;
import com.carventory.dto.UserInfoResponse;
import com.carventory.entity.Car;
import com.carventory.entity.CarImage;
import com.carventory.entity.CarSpecification;
import com.carventory.entity.Seller;
import com.carventory.repository.CarImageRepository;
import com.carventory.repository.CarSpecificationRepository;
import com.carventory.util.CloudinaryUploader;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class CarHelper {

    private final CarImageRepository carImageRepository;
    private final CarSpecificationRepository carSpecificationRepository;
    private final CloudinaryUploader cloudinaryUploader;

    public Car buildCarEntity(CarSellerDTO dto, Seller seller, UserInfoResponse userInfo) {
        return Car.builder()
                .make(dto.getCarMake())
                .model(dto.getCarModel())
                .year(dto.getCarYear())
                .vin(dto.getCarVin())
                .engineNumber(dto.getCarEngineNumber())
                .chassisNumber(dto.getCarChassisNumber())
                .price(dto.getCarPrice())
                .mileage(dto.getCarMileage())
                .purchasePrice(dto.getCarPurchasePrice())
                .purchaseDate(dto.getCarPurchaseDate())
                .carMaintainAmount(dto.getCarMaintainAmount())
                .carMaintainDetails(dto.getCarMaintainDetails())
                .fuelType(dto.getCarFuelType())
                .transmission(dto.getCarTransmission())
                .condition(dto.getCarCondition())
                .color(dto.getCarColor())
                .status(dto.getCarStatus())
                .odometerReading(dto.getCarOdometerReading())
                .numberOfOwners(dto.getCarNumberOfOwners())
                .createdAt(LocalDateTime.now())
                .company(userInfo.getCompany())
                .seller(seller)
                .imageUrl(cloudinaryUploader.uploadFile(dto.getCarImage(), "cars/main"))
                .rcDocumentUrl(cloudinaryUploader.uploadFile(dto.getCarRcDocument(), "cars/rc"))
                .insuranceDocumentUrl(cloudinaryUploader.uploadFile(dto.getCarInsuranceDocument(), "cars/insurance"))
                .pucDocumentUrl(cloudinaryUploader.uploadFile(dto.getCarPucDocument(), "cars/puc"))
                .build();
    }

    public CarImage buildCarImageEntity(Car car, CarSellerDTO dto) {
        return CarImage.builder()
                .car(car)
                .createdAt(LocalDateTime.now())
                .deleteFlag(false)
                .image1Url(cloudinaryUploader.uploadFile(dto.getCarImage1(), "cars/images"))
                .image2Url(cloudinaryUploader.uploadFile(dto.getCarImage2(), "cars/images"))
                .image3Url(cloudinaryUploader.uploadFile(dto.getCarImage3(), "cars/images"))
                .image4Url(cloudinaryUploader.uploadFile(dto.getCarImage4(), "cars/images"))
                .image5Url(cloudinaryUploader.uploadFile(dto.getCarImage5(), "cars/images"))
                .image6Url(cloudinaryUploader.uploadFile(dto.getCarImage6(), "cars/images"))
                .image7Url(cloudinaryUploader.uploadFile(dto.getCarImage7(), "cars/images"))
                .image8Url(cloudinaryUploader.uploadFile(dto.getCarImage8(), "cars/images"))
                .image9Url(cloudinaryUploader.uploadFile(dto.getCarImage9(), "cars/images"))
                .image10Url(cloudinaryUploader.uploadFile(dto.getCarImage10(), "cars/images"))
                .image11Url(cloudinaryUploader.uploadFile(dto.getCarImage11(), "cars/images"))
                .image12Url(cloudinaryUploader.uploadFile(dto.getCarImage12(), "cars/images"))
                .image13Url(cloudinaryUploader.uploadFile(dto.getCarImage13(), "cars/images"))
                .image14Url(cloudinaryUploader.uploadFile(dto.getCarImage14(), "cars/images"))
                .image15Url(cloudinaryUploader.uploadFile(dto.getCarImage15(), "cars/images"))
                .build();
    }

    public CarSpecification buildCarSpecification(Car car, CarSellerDTO dto) {
        return CarSpecification.builder()
                .car(car)
                .engineCapacity(dto.getEngineCapacity())
                .drivetrain(dto.getDrivetrain())
                .suspensionType(dto.getSuspensionType())
                .fuelTankCapacity(dto.getFuelTankCapacity())
                .cityMileage(dto.getCityMileage())
                .highwayMileage(dto.getHighwayMileage())
                .length(dto.getLength())
                .width(dto.getWidth())
                .height(dto.getHeight())
                .groundClearance(dto.getGroundClearance())
                .wheelbase(dto.getWheelbase())
                .bootSpace(dto.getBootSpace())
                .frontBrakeType(dto.getFrontBrakeType())
                .rearBrakeType(dto.getRearBrakeType())
                .tireType(dto.getTireType())
                .wheelSize(dto.getWheelSize())
                .airConditioning(dto.getAirConditioning())
                .airConditioningType(dto.getAirConditioningType())
                .powerSteering(dto.getPowerSteering())
                .powerWindowsType(dto.getPowerWindowsType())
                .cruiseControl(dto.getCruiseControl())
                .centralLocking(dto.getCentralLocking())
                .infotainmentSystem(dto.getInfotainmentSystem())
                .navigationSystem(dto.getNavigationSystem())
                .sunroof(dto.getSunroof())
                .airbags(dto.getAirbags())
                .abs(dto.getAbs())
                .ebd(dto.getEbd())
                .tractionControl(dto.getTractionControl())
                .rearCamera(dto.getRearCamera())
                .parkingSensors(dto.getParkingSensors())
                .amFmRadio(dto.getAmFmRadio())
                .auxCompatibility(dto.getAuxCompatibility())
                .usbCompatibility(dto.getUsbCompatibility())
                .bluetooth(dto.getBluetooth())
                .antiTheftDevice(dto.getAntiTheftDevice())
                .adjustableExternalMirror(dto.getAdjustableExternalMirror())
                .adjustableSteering(dto.getAdjustableSteering())
                .batteryCondition(dto.getBatteryCondition())
                .insuranceType(dto.getInsuranceType())
                .lockSystem(dto.getLockSystem())
                .makeYear(dto.getMakeYear())
                .registrationPlace(dto.getRegistrationPlace())
                .exchangeAvailable(dto.getExchangeAvailable())
                .financeAvailable(dto.getFinanceAvailable())
                .serviceHistoryAvailable(dto.getServiceHistoryAvailable())
                .tyreCondition(dto.getTyreCondition())
                .createdAt(LocalDateTime.now())
                .build();
    }

    public void updateCarSpecification(CarSpecification spec, CarSellerDTO dto) {
        spec.setEngineCapacity(dto.getEngineCapacity());
        spec.setDrivetrain(dto.getDrivetrain());
        spec.setSuspensionType(dto.getSuspensionType());
        spec.setFuelTankCapacity(dto.getFuelTankCapacity());
        spec.setCityMileage(dto.getCityMileage());
        spec.setHighwayMileage(dto.getHighwayMileage());
        spec.setLength(dto.getLength());
        spec.setWidth(dto.getWidth());
        spec.setHeight(dto.getHeight());
        spec.setGroundClearance(dto.getGroundClearance());
        spec.setWheelbase(dto.getWheelbase());
        spec.setBootSpace(dto.getBootSpace());
        spec.setFrontBrakeType(dto.getFrontBrakeType());
        spec.setRearBrakeType(dto.getRearBrakeType());
        spec.setTireType(dto.getTireType());
        spec.setWheelSize(dto.getWheelSize());
        spec.setAirConditioning(dto.getAirConditioning());
        spec.setAirConditioningType(dto.getAirConditioningType());
        spec.setPowerSteering(dto.getPowerSteering());
        spec.setPowerWindowsType(dto.getPowerWindowsType());
        spec.setCruiseControl(dto.getCruiseControl());
        spec.setCentralLocking(dto.getCentralLocking());
        spec.setInfotainmentSystem(dto.getInfotainmentSystem());
        spec.setNavigationSystem(dto.getNavigationSystem());
        spec.setSunroof(dto.getSunroof());
        spec.setAirbags(dto.getAirbags());
        spec.setAbs(dto.getAbs());
        spec.setEbd(dto.getEbd());
        spec.setTractionControl(dto.getTractionControl());
        spec.setRearCamera(dto.getRearCamera());
        spec.setParkingSensors(dto.getParkingSensors());
        spec.setAmFmRadio(dto.getAmFmRadio());
        spec.setAuxCompatibility(dto.getAuxCompatibility());
        spec.setUsbCompatibility(dto.getUsbCompatibility());
        spec.setBluetooth(dto.getBluetooth());
        spec.setAntiTheftDevice(dto.getAntiTheftDevice());
        spec.setAdjustableExternalMirror(dto.getAdjustableExternalMirror());
        spec.setAdjustableSteering(dto.getAdjustableSteering());
        spec.setBatteryCondition(dto.getBatteryCondition());
        spec.setInsuranceType(dto.getInsuranceType());
        spec.setLockSystem(dto.getLockSystem());
        spec.setMakeYear(dto.getMakeYear());
        spec.setRegistrationPlace(dto.getRegistrationPlace());
        spec.setExchangeAvailable(dto.getExchangeAvailable());
        spec.setFinanceAvailable(dto.getFinanceAvailable());
        spec.setServiceHistoryAvailable(dto.getServiceHistoryAvailable());
        spec.setTyreCondition(dto.getTyreCondition());
    }

    public void updateCarFromDTO(Car car, CarSellerDTO dto) {
        car.setMake(dto.getCarMake());
        car.setModel(dto.getCarModel());
        car.setYear(dto.getCarYear());
        car.setVin(dto.getCarVin());
        car.setEngineNumber(dto.getCarEngineNumber());
        car.setChassisNumber(dto.getCarChassisNumber());
        car.setPrice(dto.getCarPrice());
        car.setMileage(dto.getCarMileage());
        car.setPurchasePrice(dto.getCarPurchasePrice());
        car.setPurchaseDate(dto.getCarPurchaseDate());
        car.setCarMaintainAmount(dto.getCarMaintainAmount());
        car.setCarMaintainDetails(dto.getCarMaintainDetails());
        car.setFuelType(dto.getCarFuelType());
        car.setTransmission(dto.getCarTransmission());
        car.setCondition(dto.getCarCondition());
        car.setColor(dto.getCarColor());
        car.setStatus(dto.getCarStatus());
        car.setOdometerReading(dto.getCarOdometerReading());
        car.setNumberOfOwners(dto.getCarNumberOfOwners());
        if (dto.getCarImage() != null && !dto.getCarImage().isEmpty()) {
            car.setImageUrl(cloudinaryUploader.uploadFile(dto.getCarImage(), "cars/main"));
        }
        if (dto.getCarRcDocument() != null && !dto.getCarRcDocument().isEmpty()) {
            car.setRcDocumentUrl(cloudinaryUploader.uploadFile(dto.getCarRcDocument(), "cars/rc"));
        }
        if (dto.getCarInsuranceDocument() != null && !dto.getCarInsuranceDocument().isEmpty()) {
            car.setInsuranceDocumentUrl(cloudinaryUploader.uploadFile(dto.getCarInsuranceDocument(), "cars/insurance"));
        }
        if (dto.getCarPucDocument() != null && !dto.getCarPucDocument().isEmpty()) {
            car.setPucDocumentUrl(cloudinaryUploader.uploadFile(dto.getCarPucDocument(), "cars/puc"));
        }
    }

    public void updateCarImageFromDTO(CarImage carImage, CarSellerDTO dto) {
        if (dto.getCarImage1() != null && !dto.getCarImage1().isEmpty()) {
            carImage.setImage1Url(cloudinaryUploader.uploadFile(dto.getCarImage1(), "cars/images"));
        }
        if (dto.getCarImage2() != null && !dto.getCarImage2().isEmpty()) {
            carImage.setImage2Url(cloudinaryUploader.uploadFile(dto.getCarImage2(), "cars/images"));
        }
        if (dto.getCarImage3() != null && !dto.getCarImage3().isEmpty()) {
            carImage.setImage3Url(cloudinaryUploader.uploadFile(dto.getCarImage3(), "cars/images"));
        }
        if (dto.getCarImage4() != null && !dto.getCarImage4().isEmpty()) {
            carImage.setImage4Url(cloudinaryUploader.uploadFile(dto.getCarImage4(), "cars/images"));
        }
        if (dto.getCarImage5() != null && !dto.getCarImage5().isEmpty()) {
            carImage.setImage5Url(cloudinaryUploader.uploadFile(dto.getCarImage5(), "cars/images"));
        }
        if (dto.getCarImage6() != null && !dto.getCarImage6().isEmpty()) {
            carImage.setImage6Url(cloudinaryUploader.uploadFile(dto.getCarImage6(), "cars/images"));
        }
        if (dto.getCarImage7() != null && !dto.getCarImage7().isEmpty()) {
            carImage.setImage7Url(cloudinaryUploader.uploadFile(dto.getCarImage7(), "cars/images"));
        }
        if (dto.getCarImage8() != null && !dto.getCarImage8().isEmpty()) {
            carImage.setImage8Url(cloudinaryUploader.uploadFile(dto.getCarImage8(), "cars/images"));
        }
        if (dto.getCarImage9() != null && !dto.getCarImage9().isEmpty()) {
            carImage.setImage9Url(cloudinaryUploader.uploadFile(dto.getCarImage9(), "cars/images"));
        }
        if (dto.getCarImage10() != null && !dto.getCarImage10().isEmpty()) {
            carImage.setImage10Url(cloudinaryUploader.uploadFile(dto.getCarImage10(), "cars/images"));
        }
        if (dto.getCarImage11() != null && !dto.getCarImage11().isEmpty()) {
            carImage.setImage11Url(cloudinaryUploader.uploadFile(dto.getCarImage11(), "cars/images"));
        }
        if (dto.getCarImage12() != null && !dto.getCarImage12().isEmpty()) {
            carImage.setImage12Url(cloudinaryUploader.uploadFile(dto.getCarImage12(), "cars/images"));
        }
        if (dto.getCarImage13() != null && !dto.getCarImage13().isEmpty()) {
            carImage.setImage13Url(cloudinaryUploader.uploadFile(dto.getCarImage13(), "cars/images"));
        }
        if (dto.getCarImage14() != null && !dto.getCarImage14().isEmpty()) {
            carImage.setImage14Url(cloudinaryUploader.uploadFile(dto.getCarImage14(), "cars/images"));
        }
        if (dto.getCarImage15() != null && !dto.getCarImage15().isEmpty()) {
            carImage.setImage15Url(cloudinaryUploader.uploadFile(dto.getCarImage15(), "cars/images"));
        }
    }

    public GetCarSellerDTO mapToGetCarSellerDTO(Car car) {
        Seller seller = car.getSeller();

        // Fetch car images
        CarImage carImageEntity = carImageRepository.findByCarIdAndDeleteFlagFalse(car.getId()).orElse(null);

        // Fetch car specification (NEW)
        CarSpecification carSpec = carSpecificationRepository.findByCarId(car.getId()).orElse(null);

        return GetCarSellerDTO.builder()
                .carMake(car.getMake())
                .carModel(car.getModel())
                .carYear(car.getYear())
                .carVin(car.getVin())
                .carEngineNumber(car.getEngineNumber())
                .carChassisNumber(car.getChassisNumber())
                .carPrice(car.getPrice())
                .carMileage(car.getMileage())
                .carPurchasePrice(car.getPurchasePrice())
                .carPurchaseDate(car.getPurchaseDate())
                .carMaintainAmount(car.getCarMaintainAmount())
                .carMaintainDetails(car.getCarMaintainDetails())
                .carFuelType(car.getFuelType())
                .carTransmission(car.getTransmission())
                .carCondition(car.getCondition())
                .carColor(car.getColor())
                .carStatus(car.getStatus())
                .carOdometerReading(car.getOdometerReading())
                .carNumberOfOwners(car.getNumberOfOwners())
                .carSellerId(seller.getId())
                .sellerName(seller.getName())
                .sellerPhone(seller.getPhone())
                .sellerEmail(seller.getEmail())
                .sellerAddress(seller.getAddress())
                .sellerPhotoUrl(seller.getPhotoUrl())
                .sellerAadharCardUrl(seller.getAadharCardUrl())
                .sellerPanCardUrl(seller.getPanCardUrl())
                .sellerAddressProofUrl(seller.getAddressProofUrl())
                // Car images
                .carImageUrl(car.getImageUrl())
                .carRcDocumentUrl(car.getRcDocumentUrl())
                .carInsuranceDocumentUrl(car.getInsuranceDocumentUrl())
                .carPucDocumentUrl(car.getPucDocumentUrl())
                .carImage1Url(carImageEntity != null ? carImageEntity.getImage1Url() : null)
                .carImage2Url(carImageEntity != null ? carImageEntity.getImage2Url() : null)
                .carImage3Url(carImageEntity != null ? carImageEntity.getImage3Url() : null)
                .carImage4Url(carImageEntity != null ? carImageEntity.getImage4Url() : null)
                .carImage5Url(carImageEntity != null ? carImageEntity.getImage5Url() : null)
                .carImage6Url(carImageEntity != null ? carImageEntity.getImage6Url() : null)
                .carImage7Url(carImageEntity != null ? carImageEntity.getImage7Url() : null)
                .carImage8Url(carImageEntity != null ? carImageEntity.getImage8Url() : null)
                .carImage9Url(carImageEntity != null ? carImageEntity.getImage9Url() : null)
                .carImage10Url(carImageEntity != null ? carImageEntity.getImage10Url() : null)
                .carImage11Url(carImageEntity != null ? carImageEntity.getImage11Url() : null)
                .carImage12Url(carImageEntity != null ? carImageEntity.getImage12Url() : null)
                .carImage13Url(carImageEntity != null ? carImageEntity.getImage13Url() : null)
                .carImage14Url(carImageEntity != null ? carImageEntity.getImage14Url() : null)
                .carImage15Url(carImageEntity != null ? carImageEntity.getImage15Url() : null)
                // Car specification (NEW)
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
}
