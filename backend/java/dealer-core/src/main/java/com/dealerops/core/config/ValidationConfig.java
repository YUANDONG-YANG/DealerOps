package com.dealerops.core.config;

import java.util.Locale;
import org.hibernate.validator.HibernateValidatorConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

/** Bean Validation messages are part of the English API (NFR-03), whatever the JVM locale is. */
@Configuration
public class ValidationConfig {

  @Bean
  LocalValidatorFactoryBean defaultValidator() {
    LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
    validator.setConfigurationInitializer(
        configuration -> ((HibernateValidatorConfiguration) configuration).defaultLocale(Locale.ENGLISH));
    return validator;
  }
}
