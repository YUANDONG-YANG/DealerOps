package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/** BE-04 / TEST-04: same-store VIN duplicate is 400 VIN_DUP. */
class VinDuplicateIT extends CoreItSupport {

  @Test
  void sameStoreDuplicateVinIs400() throws Exception {
    createVehicle(TestTokens.staffA(), AdFixtures.V_ASIS_VIN);
    String payload =
        """
        {"make":"Toyota","model":"Camry","modelYear":2020,"vin":"%s","source":"AUCTION","purchaseCost":12000,"addedOn":"2020-03-01","conditionCode":"AS_IS"}
        """
            .formatted(AdFixtures.V_ASIS_VIN);
    MvcResult second =
        mockMvc
            .perform(
                authed(post("/api/v1/vehicles").contentType(MediaType.APPLICATION_JSON).content(payload), TestTokens.staffA()))
            .andReturn();
    assertThat(second.getResponse().getStatus()).isEqualTo(400);
    assertThat(errorCode(second)).isEqualTo("VIN_DUP");
  }

  @Test
  void sameVinAtOtherDealershipIsAllowed() throws Exception {
    createVehicle(TestTokens.staffA(), AdFixtures.V_ASIS_VIN);
    MvcResult otherStore =
        mockMvc
            .perform(
                authed(
                    post("/api/v1/vehicles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            """
                            {"make":"Toyota","model":"Camry","modelYear":2020,"vin":"%s","source":"AUCTION","purchaseCost":12000,"addedOn":"2020-03-01","conditionCode":"AS_IS"}
                            """
                                .formatted(AdFixtures.V_ASIS_VIN)),
                    TestTokens.staffB()))
            .andReturn();
    assertThat(otherStore.getResponse().getStatus()).isEqualTo(201);
  }
}
