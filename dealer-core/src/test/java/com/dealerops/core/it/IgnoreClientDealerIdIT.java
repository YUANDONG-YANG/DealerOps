package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import com.dealerops.core.vehicle.VehicleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/** BE-16 / TEST-16: client dealerId cannot switch stores. */
class IgnoreClientDealerIdIT extends CoreItSupport {

  @Autowired private VehicleRepository vehicleRepository;

  @Test
  void spoofedDealerIdStillWritesDealershipA() throws Exception {
    String body =
        """
        {
          "make":"Toyota",
          "model":"Camry",
          "modelYear":2020,
          "vin":"%s",
          "source":"AUCTION",
          "purchaseCost":12000,
          "addedOn":"2020-03-01",
          "conditionCode":"AS_IS",
          "dealerId": %d
        }
        """
            .formatted(AdFixtures.V_ASIS_VIN, dealerBId);

    MvcResult created =
        mockMvc
            .perform(
                authed(
                    post("/api/v1/vehicles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .queryParam("dealerId", String.valueOf(dealerBId))
                        .header("X-Dealer-Id", String.valueOf(dealerBId)),
                    TestTokens.staffA()))
            .andReturn();

    assertThat(created.getResponse().getStatus()).isIn(200, 201);
    Long id = json(created).path("id").asLong();
    assertThat(vehicleRepository.findById(id)).isPresent();
    assertThat(vehicleRepository.findById(id).orElseThrow().getDealerId()).isEqualTo(dealerAId);

    MvcResult staffAGet = mockMvc.perform(authed(get("/api/v1/vehicles/" + id), TestTokens.staffA())).andReturn();
    assertThat(staffAGet.getResponse().getStatus()).isEqualTo(200);

    MvcResult staffBGet = mockMvc.perform(authed(get("/api/v1/vehicles/" + id), TestTokens.staffB())).andReturn();
    assertThat(staffBGet.getResponse().getStatus()).isEqualTo(404);
    assertThat(errorCode(staffBGet)).isEqualTo("NOT_FOUND");
  }
}
