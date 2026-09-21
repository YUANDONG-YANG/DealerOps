package com.carventory.service;

import com.carventory.dto.DashboardStatsDTO;
import com.carventory.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    @Autowired
    private CarRepository carRepository;

    @Autowired
    private BuyerRepository buyerRepository;

    @Autowired
    private SellerRepository sellerRepository;

    @Autowired
    private CustomerInquiryRepository customerInquiryRepository;

    @Autowired
    private BookingRepository bookingRepository;

    public DashboardStatsDTO getDashboardStats() {
        Long companyId = UserService.getCurrentUserInfo().getCompany().getId();

        DashboardStatsDTO stats = new DashboardStatsDTO();
        stats.setTotalCars(carRepository.countByDeleteFlagFalseAndCompanyId(companyId));
        stats.setTotalBuyers(buyerRepository.countByDeleteFlagFalseAndCompanyId(companyId));
        stats.setTotalSellers(sellerRepository.countByDeleteFlagFalseAndCompanyId(companyId));
        stats.setPendingInquiries(customerInquiryRepository.countPendingInquiries(companyId));
        stats.setBookings(bookingRepository.countBookedAndNotDeleted(companyId));
        stats.setTotalAvailableCars(carRepository.countAvailableCars(companyId));
        stats.setSoldCars(carRepository.countSoldCars(companyId));
        stats.setCarOnMaintenance(carRepository.countMaintenanceCars(companyId));
        return stats;
    }
}
