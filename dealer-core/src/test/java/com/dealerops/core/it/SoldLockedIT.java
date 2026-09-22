package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

/** BE-03 / TEST-03: after paired sell, purchase PATCH is 409 SOLD_LOCKED. */
class SoldLockedIT extends CoreItSupport {

  @Test
  void soldVehicleRejectsPurchasePatch() throws Exception {
    long id = createVehicle(TestTokens.staffA(), AdFixtures.V_ASIS_VIN);
    MvcResult sold = sellVehicle(TestTokens.staffA(), id, 0, "2026-09-21", "15000");
    assertThat(sold.getResponse().getStatus()).isEqualTo(200);
    int soldVersion = json(sold).path("version").asInt();

    MvcResult patched = patchVehicleMake(TestTokens.staffA(), id, soldVersion, "Honda", AdFixtures.V_ASIS_VIN);
    assertThat(patched.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(patched)).isEqualTo("SOLD_LOCKED");

    MvcResult after = mockMvc.perform(authed(get("/api/v1/vehicles/" + id), TestTokens.staffA())).andReturn();
    assertThat(json(after).path("make").asText()).isEqualTo("Toyota");
    assertThat(json(after).path("purchaseCost").asDouble()).isEqualTo(12000.0);

    MvcResult sellAgain = sellVehicle(TestTokens.staffA(), id, soldVersion, "2026-09-22", "1");
    assertThat(sellAgain.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(sellAgain)).isEqualTo("SOLD_LOCKED");
  }
}
