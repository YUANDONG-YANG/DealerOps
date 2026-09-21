package com.carventory.service;

import com.carventory.dto.BuyerDTO;
import com.carventory.dto.CarBuyerDTO;
import com.carventory.dto.UserInfoResponse;
import com.carventory.entity.Buyer;
import com.carventory.entity.Car;
import com.carventory.entity.User;
import com.carventory.helper.BuyerHelper;
import com.carventory.repository.BookingRepository;
import com.carventory.repository.BuyerRepository;
import com.carventory.repository.CarRepository;
import com.carventory.repository.CustomerInquiryRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class BuyerService {

    private final BuyerRepository buyerRepository;
    private final CarRepository carRepository;
    private final BuyerHelper buyerHelper;
    private final UserService userService;
    private final com.carventory.util.CloudinaryUploader cloudinaryUploader;

    @Transactional
    public void saveBuyer(BuyerDTO dto) throws IOException {
        Car car = buyerHelper.findAndValidateCar(dto);
        User user = userService.getUserById(dto.getSoldByUserId());
        buyerHelper.handleBookingIfApplicable(car, dto);
        buyerHelper.updateCustomerInquiries(car.getId(), dto.getPhone());

        Buyer buyer = buyerHelper.createBuyerEntity(dto, car, user);

        car.setSoldBy(user);
        car.setStatus("Sold");
        car.setBuyer(buyer);

        buyerRepository.save(buyer);
    }

    @Transactional
    public Buyer updateBuyer(Long buyerId, BuyerDTO dto) throws IOException {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        Buyer existingBuyer = buyerRepository.findByIdAndCompanyId(buyerId, companyId)
                .orElseThrow(() -> new RuntimeException("Buyer not found with ID: " + buyerId));

        buyerHelper.handleCarUpdateForBuyer(existingBuyer, dto, companyId);
        buyerHelper.updateBuyerFields(existingBuyer, dto);

        return buyerRepository.save(existingBuyer);
    }

    @Transactional
    public void deleteBuyer(Long id) {
        Buyer buyer = buyerRepository.findByIdAndDeleteFlagFalse(id);
        buyer.setDeleteFlag(true);

        // Delete all buyer images from Cloudinary
        for (String url : new String[]{
                buyer.getPhotoUrl(), buyer.getAadharCardUrl(), buyer.getPanCardUrl(), buyer.getAddressProofUrl()
        }) {
            if (url != null && !url.isEmpty()) {
                cloudinaryUploader.deleteFileByUrl(url);
            }
        }

        // Optional: Also mark the car as available again
        Car car = buyer.getCar();
        if (car != null) {
            car.setStatus("Available");
            car.setBuyer(null);
        }
        buyerRepository.save(buyer);
    }

    @Transactional
    public List<Buyer> getAllBuyers() {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();
        return buyerRepository.findAllByCompanyIdAndDeleteFlagFalse(companyId);
    }

    @Transactional
    public List<Buyer> getBuyersByContact(String phone) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        return buyerRepository.searchByPhoneLike(phone, companyId);
    }

    @Transactional
    public List<Buyer> getBuyersByName(String name) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        return buyerRepository.searchByNameLike(name, companyId);
    }

    @Transactional
    public List<Buyer> getBuyersByEmail(String email) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        return buyerRepository.findAllByEmailAndCompanyIdAndDeleteFlagFalse(email, companyId);
    }

    @Transactional
    public Buyer getBuyerByVin(String vin) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        Optional<Car> car = carRepository.findByVinAndCompanyIdAndDeleteFlagFalse(vin, companyId);
        if (car.isEmpty()) {
            throw new RuntimeException("Car not found for VIN: " + vin);
        }

        Buyer buyer = buyerRepository.getBuyerByCarAndCompanyIdAndDeleteFlagFalse(car.get(), companyId);
        if (buyer == null) {
            throw new RuntimeException("Buyer not found for car with VIN: " + vin);
        }

        return buyer;
    }

    @Transactional
    public CarBuyerDTO getBuyerById(Long id) {
        Buyer buyer = buyerRepository.findByIdAndDeleteFlagFalse(id);

        if (buyer == null) {
            throw new RuntimeException("Buyer not found with ID: " + id);
        }

        return BuyerHelper.mapToCarBuyerDTO(buyer);
    }

    @Transactional
    public List<Buyer> findBuyersByCarMakeOrModel(String searchTerm) {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        Long companyId = userInfo.getCompany().getId();

        return buyerRepository.findByCarMakeOrModel(searchTerm, companyId);
    }
}
