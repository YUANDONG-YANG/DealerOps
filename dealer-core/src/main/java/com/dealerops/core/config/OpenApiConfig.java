package com.dealerops.core.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Swagger UI reads info.description. The value is the same string the web footer shows. */
@Configuration
public class OpenApiConfig {

  @Bean
  OpenAPI dealerCoreOpenApi(@Value("${dealerops.published-at:local}") String publishedAt) {
    String value = publishedAt == null || publishedAt.isBlank() ? "local" : publishedAt.trim();
    return new OpenAPI()
        .info(new Info().title("dealer-core").version("v1").description("Published " + value));
  }
}
