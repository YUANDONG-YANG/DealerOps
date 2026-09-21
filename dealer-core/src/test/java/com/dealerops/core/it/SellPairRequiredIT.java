package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/** BE-15 / TEST-15: soldOn and soldPrice must be a pair; price must be > 0. */
class SellPairRequiredIT extends CoreItSupport {

  @Test
  void missingSoldPriceIs400() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                authed(
                    post("/api/v1/vehicles/1/sell")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"soldOn\":\"2026-09-21\",\"version\":0}"),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(400);
    assertThat(errorCode(result)).isIn("SOLD_PAIR_REQUIRED", "VALIDATION");
  }

  @Test
  void missingSoldOnIs400() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                authed(
                    post("/api/v1/vehicles/1/sell")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"soldPrice\":15000,\"version\":0}"),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(400);
    assertThat(errorCode(result)).isIn("SOLD_PAIR_REQUIRED", "VALIDATION");
  }

  @Test
  void nonPositivePriceIs400() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                authed(
                    post("/api/v1/vehicles/1/sell")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"soldOn\":\"2026-09-21\",\"soldPrice\":0,\"version\":0}"),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(400);
    assertThat(errorCode(result)).isIn("SOLD_PAIR_REQUIRED", "VALIDATION");
  }
}
