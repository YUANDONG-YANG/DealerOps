package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/** BE-03 / TEST-03: after paired sell, purchase PATCH is 409 SOLD_LOCKED. */
class SoldLockedIT extends CoreItSupport {

  @Test
  void soldVehicleRejectsPurchasePatch() throws Exception {
    String create =
        """
        {"make":"Toyota","model":"Camry","modelYear":2020,"vin":"%s","source":"AUCTION","purchaseCost":12000,"addedOn":"2020-03-01","conditionCode":"AS_IS"}
        """
            .formatted(AdFixtures.V_ASIS_VIN);
    MvcResult created =
        mockMvc
            .perform(
                authed(post("/api/v1/vehicles").contentType(MediaType.APPLICATION_JSON).content(create), TestTokens.staffA()))
            .andReturn();
    JsonNode vehicle = json(created);
    long id = vehicle.path("id").asLong();
    int version = vehicle.path("version").asInt();

    MvcResult sold =
        mockMvc
            .perform(
                authed(
                    post("/api/v1/vehicles/" + id + "/sell")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"soldOn\":\"2026-09-21\",\"soldPrice\":15000,\"version\":" + version + "}"),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(sold.getResponse().getStatus()).isEqualTo(200);
    int soldVersion = json(sold).path("version").asInt();

    MvcResult patched =
        mockMvc
            .perform(
                authed(
                    patch("/api/v1/vehicles/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            """
                            {"version":%d,"make":"Honda","model":"Civic","modelYear":2022,"vin":"%s","source":"TRADE_IN","purchaseCost":1,"addedOn":"2020-03-01","conditionCode":"AS_IS"}
                            """
                                .formatted(soldVersion, AdFixtures.V_ASIS_VIN)),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(patched.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(patched)).isEqualTo("SOLD_LOCKED");

    MvcResult sellAgain =
        mockMvc
            .perform(
                authed(
                    post("/api/v1/vehicles/" + id + "/sell")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"soldOn\":\"2026-09-22\",\"soldPrice\":1,\"version\":" + soldVersion + "}"),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(sellAgain.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(sellAgain)).isEqualTo("SOLD_LOCKED");
  }
}
