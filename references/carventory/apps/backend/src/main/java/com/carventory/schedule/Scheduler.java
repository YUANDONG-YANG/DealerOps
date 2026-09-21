package com.carventory.schedule;

import com.carventory.service.CarService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class Scheduler {

    private final CarService carService;

    // Runs every day at 2 AM
    @Scheduled(cron = "0 0 2 * * ?")
    public void cleanOldSoldCarData() {
        carService.deleteOldSoldCarImagesAndSpecifications();
    }
}
