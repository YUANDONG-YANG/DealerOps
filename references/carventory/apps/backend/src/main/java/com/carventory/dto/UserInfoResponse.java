package com.carventory.dto;

import com.carventory.entity.Company;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserInfoResponse {
    private Long id;
    private String ownerName;
    private String email;
    private String role;
    private String userPhone;
    private String userMobile;
    private boolean isActive;
    private Company company;
}
