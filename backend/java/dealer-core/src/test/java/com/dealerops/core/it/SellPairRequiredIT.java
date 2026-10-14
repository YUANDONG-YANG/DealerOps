package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/** BE-15 / TEST-15: soldOn and soldPrice must be a pair; price must be > 0. */
class SellPairRequiredIT extends CoreItSupport {

  @Test
  void missingSoldPriceIs400() throws Exception {
    long id = createVehicle(TestTokens.staffA(), AdFixtures.V_ASIS_VIN);
    MvcResult result = sellVehicle(TestTokens.staffA(), id, 0, "2026-09-21", "null");
    assertThat(result.getResponse().getStatus()).isEqualTo(400);
    assertThat(errorCode(result)).isEqualTo("SOLD_PAIR_REQUIRED");
  }

  @Test
  void missingSoldOnIs400() throws Exception {
    long id = createVehicle(TestTokens.staffA(), "1HGCM82633A004399");
    MvcResult result =
        mockMvc
            .perform(
                postJson(
                    "/api/v1/vehicles/" + id + "/sell",
                    TestTokens.staffA(),
                    "{\"soldPrice\":15000,\"version\":0}"))
            .andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(400);
    assertThat(errorCode(result)).isEqualTo("SOLD_PAIR_REQUIRED");
  }

  @Test
  void nonPositivePriceIs400() throws Exception {
    long id = createVehicle(TestTokens.staffA(), "1HGCM82633A004398");
    MvcResult result = sellVehicle(TestTokens.staffA(), id, 0, "2026-09-21", "0");
    assertThat(result.getResponse().getStatus()).isEqualTo(400);
    assertThat(errorCode(result)).isEqualTo("SOLD_PAIR_REQUIRED");
  }

  @Test
  void patchCannotChangeSaleFields() throws Exception {
    long id = createVehicle(TestTokens.staffA(), "1HGCM82633A004397");
    MvcResult sold = sellVehicle(TestTokens.staffA(), id, 0, "2026-09-21", "15000");
    assertThat(sold.getResponse().getStatus()).isEqualTo(200);
    int version = json(sold).path("version").asInt();
    MvcResult patched =
        mockMvc
            .perform(
                authed(
                    patch("/api/v1/vehicles/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            """
                            {"version":%d,"make":"Toyota","model":"Camry","modelYear":2020,"vin":"1HGCM82633A004397","source":"AUCTION","purchaseCost":12000,"addedOn":"2020-03-01","conditionCode":"AS_IS","soldOn":"2026-12-31","soldPrice":1,"status":"IN_STOCK"}
                            """
                                .formatted(version)),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(patched.getResponse().getStatus()).isIn(200, 409);
    MvcResult after = mockMvc.perform(authed(get("/api/v1/vehicles/" + id), TestTokens.staffA())).andReturn();
    assertThat(json(after).path("soldOn").asText()).isEqualTo("2026-09-21");
    assertThat(json(after).path("soldPrice").asDouble()).isEqualTo(15000.0);
    assertThat(json(after).path("status").asText()).isEqualTo("SOLD");
  }
}
