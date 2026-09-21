package com.dealerops.core.config;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

  @Bean
  Jackson2ObjectMapperBuilderCustomizer jsonCustomizer() {
    DateTimeFormatter date = DateTimeFormatter.ISO_LOCAL_DATE;
    JavaTimeModule module = new JavaTimeModule();
    module.addSerializer(LocalDate.class, new LocalDateSerializer(date));
    module.addDeserializer(LocalDate.class, new LocalDateDeserializer(date));
    return builder -> {
      builder.modules(module);
      builder.featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    };
  }
}
