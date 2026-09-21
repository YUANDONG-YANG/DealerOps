package com.carventory.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CompanyPublicDto {
    private Long id;
    private String companyName;
    private String companyPhone;
    private String companyMobile;
    private String companyAddress;
    private String city;
    private String state;
    private String postalCode;
    private String country;
    private Integer yearEstablished;
    private String companyLogoUrl;
    private String companyImageUrl;
    private Double rating;
    private Integer reviewCount;
    private String description;
    private Integer carCount;
    private List<String> specialties;
    private String hours;
    private String website;
    private String email;
}
