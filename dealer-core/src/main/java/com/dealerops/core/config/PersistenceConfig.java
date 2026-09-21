package com.dealerops.core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

/** JPA/Flyway only. Schema is V1; Hibernate ddl-auto stays validate. */
@Configuration
@EnableTransactionManagement
@EnableJpaRepositories(basePackages = "com.dealerops.core")
public class PersistenceConfig {

  @Bean
  TransactionTemplate transactionTemplate(PlatformTransactionManager transactionManager) {
    return new TransactionTemplate(transactionManager);
  }
}
