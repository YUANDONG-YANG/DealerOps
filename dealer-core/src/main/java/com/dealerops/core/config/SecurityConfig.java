package com.dealerops.core.config;

import com.dealerops.core.common.ErrorBody;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  SecurityFilterChain filterChain(HttpSecurity http, TenantFilter tenantFilter, ObjectMapper objectMapper)
      throws Exception {
    http.csrf(csrf -> csrf.disable());
    http.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
    http.oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()));
    http.authorizeHttpRequests(
        a ->
            a.requestMatchers("/error")
                .permitAll()
                .requestMatchers("/actuator/health")
                .permitAll()
                .requestMatchers("/api/v1/**")
                .authenticated()
                .anyRequest()
                .denyAll());
    http.exceptionHandling(
        e ->
            e.authenticationEntryPoint((req, res, ex) -> write(res, objectMapper, ErrorCode.UNAUTHORIZED, "Unauthorized"))
                .accessDeniedHandler((req, res, ex) -> write(res, objectMapper, ErrorCode.FORBIDDEN, "Forbidden")));
    http.addFilterAfter(tenantFilter, BearerTokenAuthenticationFilter.class);
    return http.build();
  }

  private static void write(HttpServletResponse res, ObjectMapper mapper, ErrorCode code, String message)
      throws IOException {
    res.setStatus(code.getHttpStatus());
    res.setContentType(MediaType.APPLICATION_JSON_VALUE);
    mapper.writeValue(res.getOutputStream(), new ErrorBody(code.name(), message, null));
  }
}
