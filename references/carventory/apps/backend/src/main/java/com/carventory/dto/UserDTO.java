package com.carventory.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Data
public class UserDTO {

    // Owner/User Information
    private String ownerName;
    private String email;
    private String password;
    private String reEnterPassword;
    private String role;
    private Boolean isActive;

    // Company Basic Information
    private String companyName;
    private int yearEstablished;
    private MultipartFile companyLogo;
    private MultipartFile companyImage;

    // Company Contact Information
    private String companyPhone;
    private String companyMobile;
    private String companyAddress;
    private String city;
    private String state;
    private String postalCode;
    private String country;

    private Double rating;
    private Integer reviewCount;
    private String description;
    private List<String> specialties;
    private String hours;
    private String website;
}