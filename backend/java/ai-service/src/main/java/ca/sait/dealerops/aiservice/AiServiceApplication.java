package ca.sait.dealerops.aiservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "ca.sait.dealerops.aiservice")
public class AiServiceApplication {
  public static void main(String[] args) {
    SpringApplication.run(AiServiceApplication.class, args);
  }
}
