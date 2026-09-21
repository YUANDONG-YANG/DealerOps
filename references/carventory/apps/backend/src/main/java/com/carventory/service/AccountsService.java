package com.carventory.service;

import com.carventory.dto.*;
import com.carventory.entity.Buyer;
import com.carventory.entity.Car;
import com.carventory.entity.Company;
import com.carventory.helper.ProfitLossHelper;
import com.carventory.repository.BuyerRepository;
import com.carventory.repository.CarRepository;
import com.carventory.util.ProfitLossPdfGenerator;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AccountsService {

    @Autowired
    private BuyerService buyerService;

    @Autowired
    private CarRepository carRepository;

    @Autowired
    private ProfitLossHelper profitLossHelper;

    @Autowired
    private CarService carService;

    @Autowired
    private ProfitLossPdfGenerator profitLossPdfGenerator;

    @Autowired
    private BuyerRepository buyerRepository;

    @Autowired
    private CompanyService companyService;

    @Transactional
    public BigDecimal calculateProfitOrLoss() {
        List<Buyer> buyers = buyerService.getAllBuyers();
        BigDecimal totalProfitLoss = BigDecimal.ZERO;

        for (Buyer buyer : buyers) {
            Double purchasePriceDouble = buyer.getCar().getPurchasePrice();
            Double maintenancePriceDouble = buyer.getCar().getCarMaintainAmount();
            Double salePriceDouble = buyer.getSalePrice();

            if (purchasePriceDouble != null && maintenancePriceDouble != null && salePriceDouble != null) {
                BigDecimal purchasePrice = BigDecimal.valueOf(purchasePriceDouble);
                BigDecimal maintenancePrice = BigDecimal.valueOf(maintenancePriceDouble);
                BigDecimal salePrice = BigDecimal.valueOf(salePriceDouble);

                BigDecimal totalCost = purchasePrice.add(maintenancePrice);
                BigDecimal profitLoss = salePrice.subtract(totalCost);
                totalProfitLoss = totalProfitLoss.add(profitLoss);
            }
        }
        return totalProfitLoss;
    }

    @Transactional
    public ProfitLossDetailsDTO getProfitLossByVin(String vin) {
        Long companyId = UserService.getCurrentUserInfo().getCompany().getId(); // Get current tenant

        Car car = carRepository.findByVinAndCompanyIdAndDeleteFlagFalse(vin, companyId)
                .orElseThrow(() -> new IllegalArgumentException("Car with VIN not found for current company"));

        Buyer buyer = car.getBuyer();
        if (buyer == null) {
            throw new IllegalStateException("Car is not yet sold");
        }

        double purchasePrice = car.getPurchasePrice();
        double maintenancePrice = car.getCarMaintainAmount();
        double totalCost = purchasePrice + maintenancePrice;
        String maintenanceDetails = car.getCarMaintainDetails();
        double salePrice = buyer.getSalePrice();

        double profit = 0;
        double loss = 0;

        if (salePrice > totalCost) {
            profit = salePrice - totalCost;
        } else if (salePrice < totalCost) {
            loss = totalCost - salePrice;
        }

        return ProfitLossDetailsDTO.builder()
                .carMakeModel(car.getMake() + " " + car.getModel())
                .vin(car.getVin())
                .purchasePrice(purchasePrice)
                .maintenancePrice(maintenancePrice)
                .maintenanceDetails(maintenanceDetails)
                .salePrice(salePrice)
                .profit(profit)
                .loss(loss)
                .build();
    }

    @Transactional
    public MonthlyProfitLossResponseDTO getProfitLossOnDate(LocalDate date) {
        List<Buyer> allBuyers = buyerService.getAllBuyers();

        List<ProfitLossDetailsDTO> details = allBuyers.stream()
                .filter(buyer -> date.equals(buyer.getSaleDate()))
                .map(profitLossHelper::buildProfitLossDTO)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        BigDecimal totalProfit = details.stream()
                .map(dto -> BigDecimal.valueOf(dto.getProfit()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalLoss = details.stream()
                .map(dto -> BigDecimal.valueOf(dto.getLoss()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal net = totalProfit.subtract(totalLoss);

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH);
        String formattedDate = date.format(formatter);

        String message;
        if (net.compareTo(BigDecimal.ZERO) > 0) {
            message = "Net Profit on " + formattedDate + " is ₹" + net;
        } else if (net.compareTo(BigDecimal.ZERO) < 0) {
            message = "Net Loss on " + formattedDate + " is ₹" + net.abs();
        } else {
            message = "No profit or loss on " + formattedDate;
        }

        String profitMessage = "Total Profit on " + formattedDate + " is ₹" + totalProfit;
        String lossMessage = "Total Loss on " + formattedDate + " is ₹" + totalLoss;

        return MonthlyProfitLossResponseDTO.builder()
                .message(message)
                .profitMessage(profitMessage)
                .lossMessage(lossMessage)
                .details(details)
                .build();
    }

    @Transactional
    public MonthlyProfitLossResponseDTO getProfitLossBetweenDates(LocalDate startDate, LocalDate endDate) {
        List<Buyer> allBuyers = buyerService.getAllBuyers();

        Map<String, MonthlyBreakdownDTO> monthlyMap = new LinkedHashMap<>();
        List<ProfitLossDetailsDTO> details = new ArrayList<>();

        BigDecimal totalProfit = BigDecimal.ZERO;
        BigDecimal totalLoss = BigDecimal.ZERO;

        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MMMM yyyy", Locale.ENGLISH); // e.g., May 2025
        DateTimeFormatter fullFormatter = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.ENGLISH); // 8 May 2025

        for (Buyer buyer : allBuyers) {
            if (buyer.getSaleDate() != null &&
                    !buyer.getSaleDate().isBefore(startDate) &&
                    !buyer.getSaleDate().isAfter(endDate)) {

                ProfitLossDetailsDTO dto = profitLossHelper.buildProfitLossDTO(buyer);
                if (dto != null) {
                    details.add(dto);

                    String monthKey = buyer.getSaleDate().format(monthFormatter);
                    MonthlyBreakdownDTO breakdown = monthlyMap.getOrDefault(monthKey,
                            MonthlyBreakdownDTO.builder()
                                    .month(monthKey)
                                    .profit(0.0)
                                    .loss(0.0)
                                    .net(0.0)
                                    .build()
                    );

                    breakdown.setProfit(breakdown.getProfit() + dto.getProfit());
                    breakdown.setLoss(breakdown.getLoss() + dto.getLoss());
                    breakdown.setNet(breakdown.getNet() + (dto.getProfit() - dto.getLoss()));

                    monthlyMap.put(monthKey, breakdown);

                    totalProfit = totalProfit.add(BigDecimal.valueOf(dto.getProfit()));
                    totalLoss = totalLoss.add(BigDecimal.valueOf(dto.getLoss()));
                }
            }
        }

        BigDecimal net = totalProfit.subtract(totalLoss);

        String start = startDate.format(fullFormatter);
        String end = endDate.format(fullFormatter);

        String message;
        if (net.compareTo(BigDecimal.ZERO) > 0) {
            message = "Net Profit from " + start + " to " + end + " is ₹" + net;
        } else if (net.compareTo(BigDecimal.ZERO) < 0) {
            message = "Net Loss from " + start + " to " + end + " is ₹" + net.abs();
        } else {
            message = "No profit or loss between " + start + " and " + end;
        }

        String profitMessage = "Total Profit from " + start + " to " + end + " is ₹" + totalProfit;
        String lossMessage = "Total Loss from " + start + " to " + end + " is ₹" + totalLoss;

        return MonthlyProfitLossResponseDTO.builder()
                .message(message)
                .profitMessage(profitMessage)
                .lossMessage(lossMessage)
                .monthly(new ArrayList<>(monthlyMap.values()))
                .details(details)
                .build();
    }

    @Transactional
    public MonthlyProfitLossResponseDTO getMonthlyProfitLoss(int month, int year) {
        List<Buyer> allBuyers = buyerService.getAllBuyers();

        List<ProfitLossDetailsDTO> details = allBuyers.stream()
                .filter(buyer -> buyer.getSaleDate() != null &&
                        buyer.getSaleDate().getMonthValue() == month &&
                        buyer.getSaleDate().getYear() == year)
                .map(profitLossHelper::buildProfitLossDTO)
                .filter(Objects::nonNull)
                .toList();

        BigDecimal totalProfit = details.stream()
                .map(ProfitLossDetailsDTO::getProfit)
                .map(BigDecimal::valueOf)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalLoss = details.stream()
                .map(ProfitLossDetailsDTO::getLoss)
                .map(BigDecimal::valueOf)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal net = totalProfit.subtract(totalLoss);

        String monthName = Month.of(month).name().substring(0, 1).toUpperCase() +
                Month.of(month).name().substring(1).toLowerCase();

        String profitMsg = totalProfit.compareTo(BigDecimal.ZERO) > 0 ?
                "Profit for " + monthName + " " + year + " is ₹" + totalProfit : null;

        String lossMsg = totalLoss.compareTo(BigDecimal.ZERO) > 0 ?
                "Loss for " + monthName + " " + year + " is ₹" + totalLoss : null;

        String netMsg;
        if (net.compareTo(BigDecimal.ZERO) > 0) {
            netMsg = "Net Profit for " + monthName + " " + year + " is ₹" + net;
        } else if (net.compareTo(BigDecimal.ZERO) < 0) {
            netMsg = "Net Loss for " + monthName + " " + year + " is ₹" + net.abs();
        } else {
            netMsg = "No profit or loss for " + monthName + " " + year;
        }

        return MonthlyProfitLossResponseDTO.builder()
                .profitMessage(profitMsg)
                .lossMessage(lossMsg)
                .netMessage(netMsg)
                .details(details)
                .build();
    }

    @Transactional
    public MonthlySummaryDTO getYearlyProfitLossSummary(int year) {
        List<Buyer> allBuyers = buyerService.getAllBuyers();

        Map<String, Double> monthlyMap = Arrays.stream(Month.values())
                .collect(Collectors.toMap(
                        m -> m.getDisplayName(TextStyle.FULL, Locale.ENGLISH),
                        m -> 0.0,
                        (a, b) -> b,
                        LinkedHashMap::new
                ));

        List<ProfitLossDetailsDTO> details = new ArrayList<>();
        BigDecimal totalProfit = BigDecimal.ZERO;
        BigDecimal totalLoss = BigDecimal.ZERO;

        for (Buyer buyer : allBuyers) {
            if (buyer.getSaleDate() != null && buyer.getSaleDate().getYear() == year) {
                ProfitLossDetailsDTO dto = profitLossHelper.buildProfitLossDTO(buyer);
                if (dto != null) {
                    details.add(dto);

                    int monthValue = buyer.getSaleDate().getMonthValue();
                    String monthName = Month.of(monthValue).getDisplayName(TextStyle.FULL, Locale.ENGLISH);
                    double profitLoss = dto.getProfit() - dto.getLoss(); // net value

                    monthlyMap.put(monthName, monthlyMap.get(monthName) + profitLoss);

                    totalProfit = totalProfit.add(BigDecimal.valueOf(dto.getProfit()));
                    totalLoss = totalLoss.add(BigDecimal.valueOf(dto.getLoss()));
                }
            }
        }

        BigDecimal net = totalProfit.subtract(totalLoss);

        String profitMsg = totalProfit.compareTo(BigDecimal.ZERO) > 0
                ? "Profit for year " + year + " is ₹" + totalProfit : null;

        String lossMsg = totalLoss.compareTo(BigDecimal.ZERO) > 0
                ? "Loss for year " + year + " is ₹" + totalLoss : null;

        String netMsg;
        if (net.compareTo(BigDecimal.ZERO) > 0) {
            netMsg = "Net Profit for year " + year + " is ₹" + net;
        } else if (net.compareTo(BigDecimal.ZERO) < 0) {
            netMsg = "Net Loss for year " + year + " is ₹" + net.abs();
        } else {
            netMsg = "No profit or loss for year " + year;
        }

        return MonthlySummaryDTO.builder()
                .year(year)
                .profitMessage(profitMsg)
                .lossMessage(lossMsg)
                .netMessage(netMsg)
                .monthly(monthlyMap)
                .details(details)
                .build();
    }

    @Transactional
    public List<TopPerformingCarDTO> getTopPerformingCars() {
        List<Buyer> allBuyers = buyerService.getAllBuyers();

        Map<String, List<Buyer>> grouped = allBuyers.stream()
                .filter(b -> b.getSaleDate() != null)
                .collect(Collectors.groupingBy(b -> b.getCar().getMake() + " " + b.getCar().getModel()));

        List<TopPerformingCarDTO> topCars = new ArrayList<>();

        for (Map.Entry<String, List<Buyer>> entry : grouped.entrySet()) {
            String makeModel = entry.getKey();
            List<Buyer> buyers = entry.getValue();

            long count = buyers.size();
            double totalProfit = 0.0;
            String vin = buyers.get(0).getCar().getVin(); // Get VIN from first record (optional)

            for (Buyer b : buyers) {
                double profit = b.getSalePrice() - (b.getCar().getPurchasePrice() + b.getCar().getCarMaintainAmount());
                if (profit > 0) {
                    totalProfit += profit;
                }
            }

            topCars.add(TopPerformingCarDTO.builder()
                    .carMakeModel(makeModel)
                    .vin(vin)
                    .salesCount(count)
                    .averageProfit(totalProfit / count)
                    .build());
        }

        // Sort by average profit descending, then sales count descending
        return topCars.stream()
                .sorted(Comparator.comparingLong(TopPerformingCarDTO::getSalesCount).reversed() // First by sales count
                        .thenComparing(Comparator.comparingDouble(TopPerformingCarDTO::getAverageProfit).reversed())) // Then by average profit
                .collect(Collectors.toList());
    }

    @Transactional
    public List<TopPerformingCarDTO> getWorstPerformingCars() {
        List<Buyer> allBuyers = buyerService.getAllBuyers();

        Map<String, List<Buyer>> grouped = allBuyers.stream()
                .filter(b -> b.getSaleDate() != null)
                .collect(Collectors.groupingBy(b -> b.getCar().getMake() + " " + b.getCar().getModel()));

        List<TopPerformingCarDTO> worstCars = new ArrayList<>();

        for (Map.Entry<String, List<Buyer>> entry : grouped.entrySet()) {
            String makeModel = entry.getKey();
            List<Buyer> buyers = entry.getValue();

            long count = buyers.size();
            double totalProfit = 0.0;
            String vin = buyers.get(0).getCar().getVin();

            for (Buyer b : buyers) {
                double profit = b.getSalePrice() - (b.getCar().getPurchasePrice() + b.getCar().getCarMaintainAmount());
                totalProfit += profit; // profit can be negative or low
            }

            double avgProfit = totalProfit / count;

            // Filter out good performers (only keep low or negative average profit)
            if (avgProfit <= 10000.0) { // threshold for "low" profit
                worstCars.add(TopPerformingCarDTO.builder()
                        .carMakeModel(makeModel)
                        .vin(vin)
                        .salesCount(count)
                        .averageProfit(avgProfit)
                        .build());
            }
        }

        // Sort by average profit ascending (most negative/loss at top)
        return worstCars.stream()
                .sorted(Comparator.comparing(TopPerformingCarDTO::getAverageProfit))
                .collect(Collectors.toList());
    }

    @Transactional
    public List<QuarterlyProfitLossDTO> getQuarterlyProfitLoss(int year) {
        List<Buyer> allBuyers = buyerService.getAllBuyers();

        // List to hold the quarterly profit/loss data
        List<QuarterlyProfitLossDTO> quarterlyData = new ArrayList<>();

        // Initialize totals for each quarter
        double q1Profit = 0.0, q1Loss = 0.0;
        double q2Profit = 0.0, q2Loss = 0.0;
        double q3Profit = 0.0, q3Loss = 0.0;
        double q4Profit = 0.0, q4Loss = 0.0;

        // Loop through all buyers and calculate profit/loss based on the quarter
        for (Buyer buyer : allBuyers) {
            if (buyer.getSaleDate() != null && buyer.getSaleDate().getYear() == year) {
                int month = buyer.getSaleDate().getMonthValue();
                double salePrice = buyer.getSalePrice();
                double purchasePrice = buyer.getCar().getPurchasePrice();
                double maintenancePrice = buyer.getCar().getCarMaintainAmount();
                double totalCost = purchasePrice + maintenancePrice;
                double profit = salePrice - totalCost;

                // Determine the quarter for the sale
                if (month >= 1 && month <= 3) { // Q1: Jan-Mar
                    if (profit > 0) {
                        q1Profit += profit;
                    } else {
                        q1Loss += Math.abs(profit);
                    }
                } else if (month >= 4 && month <= 6) { // Q2: Apr-Jun
                    if (profit > 0) {
                        q2Profit += profit;
                    } else {
                        q2Loss += Math.abs(profit);
                    }
                } else if (month >= 7 && month <= 9) { // Q3: Jul-Sep
                    if (profit > 0) {
                        q3Profit += profit;
                    } else {
                        q3Loss += Math.abs(profit);
                    }
                } else if (month >= 10 && month <= 12) { // Q4: Oct-Dec
                    if (profit > 0) {
                        q4Profit += profit;
                    } else {
                        q4Loss += Math.abs(profit);
                    }
                }
            }
        }

        // Add the profit/loss for each quarter to the list
        quarterlyData.add(QuarterlyProfitLossDTO.builder().quarter("Q1").totalProfit(q1Profit).totalLoss(q1Loss).build());
        quarterlyData.add(QuarterlyProfitLossDTO.builder().quarter("Q2").totalProfit(q2Profit).totalLoss(q2Loss).build());
        quarterlyData.add(QuarterlyProfitLossDTO.builder().quarter("Q3").totalProfit(q3Profit).totalLoss(q3Loss).build());
        quarterlyData.add(QuarterlyProfitLossDTO.builder().quarter("Q4").totalProfit(q4Profit).totalLoss(q4Loss).build());

        return quarterlyData;
    }

    @Transactional
    public RoiDTO getReturnOnInvestment() {
        List<Buyer> allBuyers = buyerService.getAllBuyers();

        double totalInvestment = 0.0;
        double totalProfit = 0.0;

        for (Buyer buyer : allBuyers) {
            if (buyer.getSaleDate() != null) {
                double purchasePrice = buyer.getCar().getPurchasePrice();
                double maintenancePrice = buyer.getCar().getCarMaintainAmount();
                double salePrice = buyer.getSalePrice();

                double investment = purchasePrice + maintenancePrice;
                double profit = salePrice - investment;

                totalInvestment += investment;
                if (profit > 0) {
                    totalProfit += profit;
                }
            }
        }

        double roiPercentage = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
        String formattedRoi = String.format("%.2f%%", roiPercentage);
        return RoiDTO.builder()
                .totalInvestment(totalInvestment)
                .totalProfit(totalProfit)
                .roiPercentage(formattedRoi)
                .build();
    }

    @Transactional
    public RoiDTO calculateROIForYear(int year) {
        List<Buyer> allBuyers = buyerService.getAllBuyers();

        List<Buyer> buyersOfYear = allBuyers.stream()
                .filter(b -> b.getSaleDate() != null && b.getSaleDate().getYear() == year)
                .collect(Collectors.toList());

        double totalInvestment = 0.0;
        double totalProfit = 0.0;

        for (Buyer b : buyersOfYear) {
            double purchase = b.getCar().getPurchasePrice();
            double maintenance = b.getCar().getCarMaintainAmount();
            double cost = purchase + maintenance;
            double sale = b.getSalePrice();
            double profit = sale - cost;

            totalInvestment += cost;

            if (profit > 0) {
                totalProfit += profit;
            }
        }

        String roiPercentage = "0.00%";
        if (totalInvestment > 0) {
            double roi = (totalProfit / totalInvestment) * 100;
            roiPercentage = String.format("%.2f%%", roi);
        }

        return RoiDTO.builder()
                .totalInvestment(totalInvestment)
                .totalProfit(totalProfit)
                .roiPercentage(roiPercentage)
                .build();
    }

    @Transactional
    public RoiDTO calculateROIForMonth(int month, int year) {
        List<Buyer> allBuyers = buyerService.getAllBuyers();

        List<Buyer> buyersOfMonth = allBuyers.stream()
                .filter(b -> b.getSaleDate() != null &&
                        b.getSaleDate().getMonthValue() == month &&
                        b.getSaleDate().getYear() == year)
                .collect(Collectors.toList());

        double totalInvestment = 0.0;
        double totalProfit = 0.0;

        for (Buyer b : buyersOfMonth) {
            double purchase = b.getCar().getPurchasePrice();
            double maintenance = b.getCar().getCarMaintainAmount();
            double cost = purchase + maintenance;
            double sale = b.getSalePrice();
            double profit = sale - cost;

            totalInvestment += cost;

            if (profit > 0) {
                totalProfit += profit;
            }
        }

        String roiPercentage = "0.00%";
        if (totalInvestment > 0) {
            double roi = (totalProfit / totalInvestment) * 100;
            roiPercentage = String.format("%.2f%%", roi);
        }

        return RoiDTO.builder()
                .totalInvestment(totalInvestment)
                .totalProfit(totalProfit)
                .roiPercentage(roiPercentage)
                .build();
    }

    @Transactional
    public UnsoldCarsCostDTO getUnsoldCarsCostProjection() {
        List<Car> unsoldCars = carService.getAllCars().stream()
                .filter(car -> !"Sold".equalsIgnoreCase(car.getStatus()) && !car.isDeleteFlag())
                .collect(Collectors.toList());

        double totalStuckCapital = unsoldCars.stream()
                .mapToDouble(car -> car.getPurchasePrice() + car.getCarMaintainAmount())
                .sum();

        return UnsoldCarsCostDTO.builder()
                .totalStuckCapital(totalStuckCapital)
                .totalUnsoldCars(unsoldCars.size())
                .build();
    }

    @Transactional
    public void generateYearlyProfitLossPdf(int year, OutputStream outputStream) {
        List<Buyer> allBuyers = buyerService.getAllBuyers();
        Company company = companyService.getCompanyDetails();

        List<ProfitLossDetailsDTO> details = allBuyers.stream()
                .filter(b -> b.getSaleDate() != null && b.getSaleDate().getYear() == year)
                .map(profitLossHelper::buildProfitLossDTO)
                .filter(Objects::nonNull)
                .toList();

        // Adjust profit/loss calculation to include maintenance price
        details.forEach(dto -> {
            double totalCost = dto.getPurchasePrice() + dto.getMaintenancePrice();
            if (dto.getSalePrice() > totalCost) {
                dto.setProfit(dto.getSalePrice() - totalCost);
                dto.setLoss(0);
            } else {
                dto.setLoss(totalCost - dto.getSalePrice());
                dto.setProfit(0);
            }
        });

        BigDecimal totalProfit = details.stream()
                .map(dto -> BigDecimal.valueOf(dto.getProfit()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalLoss = details.stream()
                .map(dto -> BigDecimal.valueOf(dto.getLoss()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        profitLossPdfGenerator.generateYearlyReport(outputStream, year, details, totalProfit, totalLoss, company);
    }

    @Transactional
    public void generateMonthlyProfitLossPdf(int year, int month, OutputStream outputStream) {
        List<Buyer> allBuyers = buyerService.getAllBuyers();
        Company company = companyService.getCompanyDetails();

        List<ProfitLossDetailsDTO> details = allBuyers.stream()
                .filter(b -> b.getSaleDate() != null &&
                        b.getSaleDate().getYear() == year &&
                        b.getSaleDate().getMonthValue() == month)
                .map(profitLossHelper::buildProfitLossDTO)
                .filter(Objects::nonNull)
                .toList();

        // Include maintenance in profit/loss calculations
        details.forEach(dto -> {
            double totalCost = dto.getPurchasePrice() + dto.getMaintenancePrice();
            if (dto.getSalePrice() > totalCost) {
                dto.setProfit(dto.getSalePrice() - totalCost);
                dto.setLoss(0);
            } else {
                dto.setLoss(totalCost - dto.getSalePrice());
                dto.setProfit(0);
            }
        });

        BigDecimal totalProfit = details.stream()
                .map(dto -> BigDecimal.valueOf(dto.getProfit()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalLoss = details.stream()
                .map(dto -> BigDecimal.valueOf(dto.getLoss()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        profitLossPdfGenerator.generateMonthlyReport(outputStream, year, month, details, totalProfit, totalLoss, company);
    }

    @Transactional
    public void generateProfitLossBetweenDates(LocalDate fromDate, LocalDate toDate, OutputStream outputStream) {
        List<Buyer> allBuyers = buyerService.getAllBuyers();
        Company company = companyService.getCompanyDetails();

        List<ProfitLossDetailsDTO> details = allBuyers.stream()
                .filter(b -> b.getSaleDate() != null &&
                        !b.getSaleDate().isBefore(fromDate) &&
                        !b.getSaleDate().isAfter(toDate))
                .map(profitLossHelper::buildProfitLossDTO)
                .filter(Objects::nonNull)
                .toList();

        details.forEach(dto -> {
            double totalCost = dto.getPurchasePrice() + dto.getMaintenancePrice();
            if (dto.getSalePrice() > totalCost) {
                dto.setProfit(dto.getSalePrice() - totalCost);
                dto.setLoss(0);
            } else {
                dto.setLoss(totalCost - dto.getSalePrice());
                dto.setProfit(0);
            }
        });

        BigDecimal totalProfit = details.stream()
                .map(dto -> BigDecimal.valueOf(dto.getProfit()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalLoss = details.stream()
                .map(dto -> BigDecimal.valueOf(dto.getLoss()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        profitLossPdfGenerator.generateDateRangeReport(outputStream, fromDate, toDate, details, totalProfit, totalLoss, company);
    }

    public double getTotalPurchasePrice() {
        Long companyId = UserService.getCurrentUserInfo().getCompany().getId();
        return Optional.ofNullable(carRepository.getTotalPurchasePriceByCompanyId(companyId)).orElse(0.0);
    }

    public double getTotalSalePrice() {
        Long companyId = UserService.getCurrentUserInfo().getCompany().getId();
        return Optional.ofNullable(buyerRepository.getTotalSalePriceByCompanyId(companyId)).orElse(0.0);
    }

    public List<UserSalesCountDTO> getCurrentMonthUserSalesCounts() {
        LocalDate now = LocalDate.now();
        int month = now.getMonthValue();
        int year = now.getYear();
        Long companyId = UserService.getCurrentUserInfo().getCompany().getId();

        List<Object[]> rawResults = buyerRepository.getUserSalesCountsByMonthAndYear(month, year, companyId);

        return rawResults.stream()
                .map(obj -> new UserSalesCountDTO(
                        (Long) obj[0],  // userId
                        (String) obj[1], // ownerName
                        (Long) obj[2]   // salesCount
                )).collect(Collectors.toList());
    }
}
