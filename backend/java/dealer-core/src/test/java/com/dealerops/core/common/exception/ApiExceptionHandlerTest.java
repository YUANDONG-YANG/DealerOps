package com.dealerops.core.common.exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dealerops.core.common.ErrorBody;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

class ApiExceptionHandlerTest {

  private MockMvc mockMvc;

  @BeforeEach
  void setUp() {
    mockMvc = MockMvcBuilders.standaloneSetup(new DummyApi()).setControllerAdvice(new ApiExceptionHandler()).build();
  }

  @Test
  void mapsEachDesignedErrorCode() throws Exception {
    assertCode("/e/unauthorized", 401, "UNAUTHORIZED");
    assertCode("/e/forbidden", 403, "FORBIDDEN");
    assertCode("/e/not-found", 404, "NOT_FOUND");
    assertCode("/e/vin-dup", 400, "VIN_DUP");
    assertCode("/e/sold-pair", 400, "SOLD_PAIR_REQUIRED");
    assertCode("/e/wrong-dealer", 400, "WRONG_DEALER_OR_SOLD");
    assertCode("/e/sold-locked", 409, "SOLD_LOCKED");
    assertCode("/e/version", 409, "VERSION_CONFLICT");
    assertCode("/e/dup-member", 409, "DUP_MEMBER");
    assertCode("/e/already-linked", 409, "VEHICLE_ALREADY_LINKED");
    assertCode("/e/stale", 409, "CHECK_STALE");
    assertCode("/e/not-passed", 409, "NOT_PASSED");
    assertCode("/e/ai", 502, "AI_UNAVAILABLE");
  }

  @Test
  void validationIncludesFieldErrors() throws Exception {
    var result =
        mockMvc
            .perform(post("/e/valid").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest())
            .andReturn();
    assertThat(result.getResponse().getContentAsString()).contains("VALIDATION");
    assertThat(result.getResponse().getContentAsString()).contains("fieldErrors");
  }

  @Test
  void uniqueVinConstraintMapsToVinDupWithoutSql() throws Exception {
    var result = mockMvc.perform(get("/e/sql-vin")).andExpect(status().isBadRequest()).andReturn();
    assertThat(result.getResponse().getContentAsString()).contains("VIN_DUP");
    assertThat(result.getResponse().getContentAsString()).doesNotContain("insert into");
    assertThat(result.getResponse().getContentAsString()).doesNotContain("SQLException");
  }

  private void assertCode(String path, int http, String code) throws Exception {
    var result = mockMvc.perform(get(path)).andExpect(status().is(http)).andReturn();
    assertThat(result.getResponse().getContentAsString()).contains("\"code\":\"" + code + "\"");
  }

  @RestController
  static class DummyApi {
    record Body(@NotBlank String name) {}

    @GetMapping("/e/unauthorized")
    ErrorBody unauthorized() {
      throw new ApiException(ErrorCode.UNAUTHORIZED, "Unauthorized");
    }

    @GetMapping("/e/forbidden")
    ErrorBody forbidden() {
      throw new ApiException(ErrorCode.FORBIDDEN, "Forbidden");
    }

    @GetMapping("/e/not-found")
    ErrorBody notFound() {
      throw new ApiException(ErrorCode.NOT_FOUND, "Not found");
    }

    @GetMapping("/e/vin-dup")
    ErrorBody vinDup() {
      throw new ApiException(ErrorCode.VIN_DUP, "VIN already exists in this dealership.");
    }

    @GetMapping("/e/sold-pair")
    ErrorBody soldPair() {
      throw new ApiException(ErrorCode.SOLD_PAIR_REQUIRED, "Sold date and a positive sold price are required.");
    }

    @GetMapping("/e/wrong-dealer")
    ErrorBody wrongDealer() {
      throw new ApiException(ErrorCode.WRONG_DEALER_OR_SOLD, "Vehicle is sold or not in this dealership.");
    }

    @GetMapping("/e/sold-locked")
    ErrorBody soldLocked() {
      throw new ApiException(ErrorCode.SOLD_LOCKED, "Sold vehicle is locked.");
    }

    @GetMapping("/e/version")
    ErrorBody version() {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }

    @GetMapping("/e/dup-member")
    ErrorBody dupMember() {
      throw new ApiException(ErrorCode.DUP_MEMBER, "Membership already exists");
    }

    @GetMapping("/e/already-linked")
    ErrorBody alreadyLinked() {
      throw new ApiException(ErrorCode.VEHICLE_ALREADY_LINKED, "Vehicle is already linked");
    }

    @GetMapping("/e/stale")
    ErrorBody stale() {
      throw new ApiException(ErrorCode.CHECK_STALE, "Check is stale.");
    }

    @GetMapping("/e/not-passed")
    ErrorBody notPassed() {
      throw new ApiException(ErrorCode.NOT_PASSED, "Check has not passed.");
    }

    @GetMapping("/e/ai")
    ErrorBody ai() {
      throw new ApiException(ErrorCode.AI_UNAVAILABLE, "AI check failed.");
    }

    @GetMapping("/e/sql-vin")
    ErrorBody sqlVin() {
      throw new DataIntegrityViolationException("uk_vehicle_vin duplicate", new RuntimeException("uk_vehicle_vin"));
    }

    @PostMapping("/e/valid")
    ErrorBody valid(@Valid @RequestBody Body body) {
      return new ErrorBody("OK", body.name(), null);
    }
  }
}
