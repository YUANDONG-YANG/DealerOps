package com.carventory.entity;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "sellers")
public class Seller {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String phone;
    private String email;
    private String address;

    private String photoUrl; // Profile photo URL
    private String aadharCardUrl; // Aadhar Card URL
    private String panCardUrl; // PAN Card URL
    private String addressProofUrl; // Address Proof URL

    @OneToOne(mappedBy = "seller", cascade = CascadeType.ALL)
    @JsonManagedReference
    private Car cars;

    private LocalDateTime createdAt = LocalDateTime.now();

    private boolean deleteFlag = false; // Flag for soft delete

    @ManyToOne
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;
}
