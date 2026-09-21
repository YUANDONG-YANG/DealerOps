package com.dealerops.core.support;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.MySQLContainer;

/**
 * One MySQL {@code dealer_core} for ITs. Schema comes only from Flyway {@code V1__init.sql}.
 */
@TestConfiguration(proxyBeanMethods = false)
public class MysqlFlywayTestConfig {

  @Bean
  @ServiceConnection
  MySQLContainer<?> dealerCoreMysql() {
    return new MySQLContainer<>("mysql:8.4")
        .withDatabaseName("dealer_core")
        .withUsername("dealer")
        .withPassword("dealer_dev_only");
  }
}
