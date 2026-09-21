package com.carventory.entity;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "buyers")
public class Buyer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "car_id", nullable = false)
    @JsonManagedReference // forward part of the reference
    private Car car;

    private String name;
    private String phone;
    private String email;
    private double salePrice;
    private LocalDate saleDate;
    private String notes;
    private String address;

    private String photoUrl; // Profile photo URL
    private String aadharCardUrl; // Aadhar Card URL
    private String panCardUrl; // PAN Card URL
    private String addressProofUrl; // Address Proof URL

    @ManyToOne
    @JoinColumn(name = "sold_by_user_id")
    @JsonBackReference
    private User soldBy;

    private LocalDateTime createdAt = LocalDateTime.now();
    private boolean deleteFlag = false; // Flag for soft delete

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;
}
