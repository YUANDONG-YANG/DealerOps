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

/**
 * Swagger UI reads info.description: dealer-core's release time ({@link ReleaseInfo}), the same
 * value the web footer lists for core.
 */
@Configuration
public class OpenApiConfig {

  private static final String BEARER_AUTH = "bearerAuth";

  @Bean
  OpenAPI dealerCoreOpenApi(
      ReleaseInfo releaseInfo,
      @Value("${dealerops.public-gateway-url:http://localhost:8080}") String gatewayBaseUrl) {
    String server = gatewayBaseUrl == null || gatewayBaseUrl.isBlank()
        ? "http://localhost:8080"
        : gatewayBaseUrl.trim().replaceAll("/+$", "");
    return new OpenAPI()
        .info(new Info().title("dealer-core").version("v1").description(
            "dealer-core published " + releaseInfo.publishedAt()
                + ". Release times of all services: GET /actuator/release on this gateway, also shown"
                + " at the bottom left of the web app."))
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
