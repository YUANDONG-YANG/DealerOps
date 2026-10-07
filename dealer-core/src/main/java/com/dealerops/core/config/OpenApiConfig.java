package com.dealerops.core.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Swagger UI reads info.description. The value is the same string the web footer shows. */
@Configuration
public class OpenApiConfig {

  private static final String BEARER_AUTH = "bearerAuth";

  @Bean
  OpenAPI dealerCoreOpenApi(
      @Value("${dealerops.published-at:local}") String publishedAt,
      @Value("${dealerops.public-gateway-url:http://localhost:8080}") String gatewayBaseUrl) {
    String value = publishedAt == null || publishedAt.isBlank() ? "local" : publishedAt.trim();
    String server = gatewayBaseUrl == null || gatewayBaseUrl.isBlank()
        ? "http://localhost:8080"
        : gatewayBaseUrl.trim().replaceAll("/+$", "");
    return new OpenAPI()
        .info(new Info().title("dealer-core").version("v1").description("Published " + value))
        .servers(List.of(new Server().url(server).description("dealer-gateway")))
        .components(
            new Components()
                .addSecuritySchemes(
                    BEARER_AUTH,
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description(
                            "JWT issued by POST /api/v1/auth/login. Paste only the token value into Swagger Authorize.")))
        .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH));
  }
}
