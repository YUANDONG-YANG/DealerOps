package com.dealerops.core.dealer;

import com.dealerops.core.dealer.dto.LoginRequest;
import com.dealerops.core.dealer.dto.LoginResponse;
import com.dealerops.core.dealer.dto.RegisterRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RestController;

/** Public login and self-registration routes. */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthService authService;
  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/login")
  @Operation(
      summary = "Login",
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              required = true,
              content =
                  @Content(
                      mediaType = "application/json",
                      examples =
                          @ExampleObject(
                              name = "Local admin",
                              value = "{\"identifier\":\"admin@example.com\",\"password\":\"change-me\"}"))))
  @SecurityRequirements
  public LoginResponse login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/register")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Register a DealerOps account (starts without a dealership)")
  @SecurityRequirements
  public LoginResponse register(@Valid @RequestBody RegisterRequest request) {
    return authService.register(request);
  }
}
