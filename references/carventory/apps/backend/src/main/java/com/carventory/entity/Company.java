package com.carventory.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "company")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Company {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    private Integer yearEstablished;
    private String companyPhone;
    private String companyMobile;
    private String companyAddress;
    private String city;
    private String state;
    private String postalCode;
    private String country;
    private String email;

    private boolean deleteFlag = false;

    private String companyLogoUrl;
    private String companyImageUrl;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    private Double rating;          // Normal double (DOUBLE PRECISION in DB)
    private Integer reviewCount;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "text[]")
    private String[] specialties;

    private String hours;
    private String website;
}
