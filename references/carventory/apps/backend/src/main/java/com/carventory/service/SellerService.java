package com.carventory.service;

import com.carventory.dto.CarSellerDTO;
import com.carventory.dto.UserInfoResponse;
import com.carventory.entity.Seller;
import com.carventory.repository.SellerRepository;
import com.carventory.util.CloudinaryUploader;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SellerService {

    private final SellerRepository sellerRepository;
    private final CloudinaryUploader cloudinaryUploader;

    private Long getCurrentCompanyId() {
        UserInfoResponse userInfo = UserService.getCurrentUserInfo();
        return userInfo.getCompany().getId();
    }

    @Transactional
    public Seller saveSellerFromCarSellerDTO(CarSellerDTO dto, UserInfoResponse userInfo) {
        Seller seller = Seller.builder()
                .name(dto.getSellerName())
                .phone(dto.getSellerPhone())
                .email(dto.getSellerEmail())
                .address(dto.getSellerAddress())
                .company(userInfo.getCompany())
                .createdAt(LocalDateTime.now())
                .photoUrl(cloudinaryUploader.uploadFile(dto.getSellerPhoto(), "sellers/photo"))
                .aadharCardUrl(cloudinaryUploader.uploadFile(dto.getSellerAadharCard(), "sellers/aadhar"))
                .panCardUrl(cloudinaryUploader.uploadFile(dto.getSellerPanCard(), "sellers/pan"))
                .addressProofUrl(cloudinaryUploader.uploadFile(dto.getSellerAddressProof(), "sellers/address-proof"))
                .build();
        return sellerRepository.save(seller);
    }

    public Seller updateSellerFromCarDTO(Seller seller, CarSellerDTO dto) {
        seller.setName(dto.getSellerName());
        seller.setPhone(dto.getSellerPhone());
        seller.setEmail(dto.getSellerEmail());
        seller.setAddress(dto.getSellerAddress());
        if (dto.getSellerPhoto() != null && !dto.getSellerPhoto().isEmpty()) {
            seller.setPhotoUrl(cloudinaryUploader.uploadFile(dto.getSellerPhoto(), "sellers/photo"));
        }
        if (dto.getSellerAadharCard() != null && !dto.getSellerAadharCard().isEmpty()) {
            seller.setAadharCardUrl(cloudinaryUploader.uploadFile(dto.getSellerAadharCard(), "sellers/aadhar"));
        }
        if (dto.getSellerPanCard() != null && !dto.getSellerPanCard().isEmpty()) {
            seller.setPanCardUrl(cloudinaryUploader.uploadFile(dto.getSellerPanCard(), "sellers/pan"));
        }
        if (dto.getSellerAddressProof() != null && !dto.getSellerAddressProof().isEmpty()) {
            seller.setAddressProofUrl(cloudinaryUploader.uploadFile(dto.getSellerAddressProof(), "sellers/address-proof"));
        }
        return sellerRepository.save(seller);
    }

    @Transactional
    public List<Seller> getAllSellers() {
        Long companyId = getCurrentCompanyId();
        return sellerRepository.findAllByCompanyId(companyId);
    }

    public Seller getSellerById(Long id) {
        Long companyId = getCurrentCompanyId();
        Seller seller = sellerRepository.findById(id)
                .filter(s -> !s.isDeleteFlag() && s.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Seller not found with ID: " + id));
        return seller;
    }

    @Transactional
    public Seller getSellerByVin(String vin) {
        Long companyId = getCurrentCompanyId();
        Seller seller = sellerRepository.findSellerByCarVin(vin, companyId);
        if (seller == null) {
            throw new RuntimeException("Seller not found for VIN: " + vin);
        }
        return seller;
    }

    @Transactional
    public List<Seller> getSellersByPhone(String phone) {
        Long companyId = getCurrentCompanyId();
        List<Seller> sellers = sellerRepository.findByPhoneLike(phone, companyId);
        if (sellers.isEmpty()) {
            throw new RuntimeException("Seller not found with phone number: " + phone);
        }
        return sellers;
    }

    @Transactional
    public List<Seller> getSellersByName(String name) {
        Long companyId = getCurrentCompanyId();
        List<Seller> sellers = sellerRepository.findByNameLike(name, companyId);
        if (sellers.isEmpty()) {
            throw new RuntimeException("Seller not found with name: " + name);
        }
        return sellers;
    }

    @Transactional
    public List<Seller> getSellersByCarMakeOrModel(String keyword) {
        Long companyId = getCurrentCompanyId();
        List<Seller> sellers = sellerRepository.findByCarMakeOrModel(keyword, companyId);
        if (sellers.isEmpty()) {
            throw new RuntimeException("Seller not found with car company or model: " + keyword);
        }
        return sellers;
    }

    @Transactional
    public void deleteSeller(Long sellerId) {
        Seller seller = sellerRepository.findById(sellerId)
                .orElseThrow(() -> new RuntimeException("Seller not found with id: " + sellerId));
        seller.setDeleteFlag(true);
        sellerRepository.save(seller);
        for (String url : new String[]{
                seller.getPhotoUrl(), seller.getAadharCardUrl(), seller.getPanCardUrl(), seller.getAddressProofUrl()
        }) {
            if (url != null && !url.isEmpty()) {
                cloudinaryUploader.deleteFileByUrl(url);
            }
        }
    }
}
