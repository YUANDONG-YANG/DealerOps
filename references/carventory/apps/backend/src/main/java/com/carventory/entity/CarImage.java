package com.carventory.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "car_images")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CarImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "image1_url")
    private String image1Url;

    @Column(name = "image2_url")
    private String image2Url;

    @Column(name = "image3_url")
    private String image3Url;

    @Column(name = "image4_url")
    private String image4Url;

    @Column(name = "image5_url")
    private String image5Url;

    @Column(name = "image6_url")
    private String image6Url;

    @Column(name = "image7_url")
    private String image7Url;

    @Column(name = "image8_url")
    private String image8Url;

    @Column(name = "image9_url")
    private String image9Url;

    @Column(name = "image10_url")
    private String image10Url;

    @Column(name = "image11_url")
    private String image11Url;

    @Column(name = "image12_url")
    private String image12Url;

    @Column(name = "image13_url")
    private String image13Url;

    @Column(name = "image14_url")
    private String image14Url;

    @Column(name = "image15_url")
    private String image15Url;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "delete_flag", nullable = false)
    private boolean deleteFlag = false;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "car_id", nullable = false)
    private Car car;
}
