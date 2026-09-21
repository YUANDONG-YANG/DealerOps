package com.carventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CarventoryApplication {

	public static void main(String[] args) {
		SpringApplication.run(CarventoryApplication.class, args);
	}

}
