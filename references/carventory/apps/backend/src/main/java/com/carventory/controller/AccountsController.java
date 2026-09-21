package com.carventory.controller;

import com.carventory.dto.*;
import com.carventory.service.AccountsService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountsController {

    @Autowired
    private AccountsService accountsService;

    @GetMapping("total-profit")
    public BigDecimal calculateProfitOrLoss() {
        return accountsService.calculateProfitOrLoss();
    }

    @GetMapping("/vin/{vin}")
    public ResponseEntity<ProfitLossDetailsDTO> getProfitLossByVin(@PathVariable String vin) {
        return ResponseEntity.ok(accountsService.getProfitLossByVin(vin));
    }

    @GetMapping("/on/{date}")
    public ResponseEntity<MonthlyProfitLossResponseDTO> getProfitLossOnDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(accountsService.getProfitLossOnDate(date));
    }

    @GetMapping("/from/{startDate}/to/{endDate}")
    public ResponseEntity<MonthlyProfitLossResponseDTO> getProfitLossBetweenDates(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(accountsService.getProfitLossBetweenDates(startDate, endDate));
    }

    @GetMapping("/monthly/{month}/{year}")
    public ResponseEntity<MonthlyProfitLossResponseDTO> getMonthlyProfitLoss(
            @PathVariable int month,
            @PathVariable int year) {
        return ResponseEntity.ok(accountsService.getMonthlyProfitLoss(month, year));
    }

    @GetMapping("/yearly/{year}")
    public ResponseEntity<MonthlySummaryDTO> getYearlyProfitLossSummary(@PathVariable int year) {
        return ResponseEntity.ok(accountsService.getYearlyProfitLossSummary(year));
    }

    @GetMapping("/top-performing")
    public ResponseEntity<List<TopPerformingCarDTO>> getTopPerformingCars() {
        return ResponseEntity.ok(accountsService.getTopPerformingCars());
    }

    @GetMapping("/worst-performing")
    public ResponseEntity<List<TopPerformingCarDTO>> getWorstPerformingCars() {
        return ResponseEntity.ok(accountsService.getWorstPerformingCars());
    }

    @GetMapping("/quarterly/{year}")
    public ResponseEntity<List<QuarterlyProfitLossDTO>> getQuarterlyProfitLoss(
            @PathVariable int year) {
        return ResponseEntity.ok(accountsService.getQuarterlyProfitLoss(year));
    }

    @GetMapping("/roi/total")
    public ResponseEntity<RoiDTO> getROIForAllSales() {
        return ResponseEntity.ok(accountsService.getReturnOnInvestment());
    }

    @GetMapping("/roi/year/{year}")
    public ResponseEntity<RoiDTO> getROIByYear(@PathVariable int year) {
        return ResponseEntity.ok(accountsService.calculateROIForYear(year));
    }

    @GetMapping("/roi/monthly/{month}/{year}")
    public ResponseEntity<RoiDTO> getROIByMonth(
            @PathVariable int month,
            @PathVariable int year) {
        return ResponseEntity.ok(accountsService.calculateROIForMonth(month, year));
    }

    @GetMapping("/unsold-cost")
    public ResponseEntity<UnsoldCarsCostDTO> getUnsoldCarsCost() {
        return ResponseEntity.ok(accountsService.getUnsoldCarsCostProjection());
    }

    @GetMapping("/yearly/pdf/{year}")
    public void exportYearlyProfitLossPdf(@PathVariable int year, HttpServletResponse response) throws IOException {
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=yearly_profit_loss_" + year + ".pdf");
        accountsService.generateYearlyProfitLossPdf(year, response.getOutputStream());
    }

    @GetMapping("/monthly/pdf/{year}/{month}")
    public void exportMonthlyProfitLossPdf(@PathVariable int year, @PathVariable int month, HttpServletResponse response) throws IOException {
        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition", "attachment; filename=monthly_profit_loss_" + year + "_" + month + ".pdf");
        accountsService.generateMonthlyProfitLossPdf(year, month, response.getOutputStream());
    }

    @GetMapping("/from-to/pdf/from/{fromDate}/to/{toDate}")
    public void exportProfitLossBetweenDates(
            @PathVariable("fromDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @PathVariable("toDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            HttpServletResponse response) throws IOException {

        response.setContentType("application/pdf");
        response.setHeader("Content-Disposition",
                "attachment; filename=profit_loss_" + fromDate + "_to_" + toDate + ".pdf");

        accountsService.generateProfitLossBetweenDates(fromDate, toDate, response.getOutputStream());
    }

    @GetMapping("/total-purchase-price")
    public ResponseEntity<Double> getTotalPurchasePrice() {
        return ResponseEntity.ok(accountsService.getTotalPurchasePrice());
    }

    @GetMapping("/total-sale-price")
    public ResponseEntity<Double> getTotalSalePrice() {
        return ResponseEntity.ok(accountsService.getTotalSalePrice());
    }

    @GetMapping("/user-sales-count")
    public ResponseEntity<List<UserSalesCountDTO>> getUserSalesThisMonth() {
        return ResponseEntity.ok(accountsService.getCurrentMonthUserSalesCounts());
    }
}
