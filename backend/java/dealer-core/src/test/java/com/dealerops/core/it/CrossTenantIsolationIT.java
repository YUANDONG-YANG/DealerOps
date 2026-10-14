package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * BE-01 / TEST-01 / classroom CL-2 isolation (00 item 2).
 * Staff A using dealership B vehicleId / customerId / listingId → 404 NOT_FOUND, never 403.
 * Body has no vin, cost, or customer phone/email/address.
 */
class CrossTenantIsolationIT extends CoreItSupport {

  @Test
  void staffACannotReadDealershipBIds() throws Exception {
    long vehicleId = createVehicle(TestTokens.staffB(), AdFixtures.V_ASIS_VIN);
    long customerId = createCustomer(TestTokens.staffB(), "Other Store");
    mockMvc
        .perform(
            authed(
                patch("/api/v1/vehicles/" + vehicleId + "/listing")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"version\":0,\"title\":\"B store draft\",\"body\":\"Other store body\"}"),
                TestTokens.staffB()))
        .andReturn();
    MvcResult listing =
        mockMvc.perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffB())).andReturn();
    long listingId = json(listing).path("id").asLong();

    assertCrossStore(authed(get("/api/v1/vehicles/" + vehicleId), TestTokens.staffA()));
    assertCrossStore(authed(get("/api/v1/customers/" + customerId), TestTokens.staffA()));
    assertCrossStore(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA()));
    assertCrossStore(
        authed(
            patch("/api/v1/vehicles/" + vehicleId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {"version":0,"make":"X","model":"Y","modelYear":2020,"vin":"%s","source":"AUCTION","purchaseCost":1,"addedOn":"2020-01-01","conditionCode":"AS_IS"}
                    """
                        .formatted(AdFixtures.V_ASIS_VIN)),
            TestTokens.staffA()));
    assertCrossStore(postJson("/api/v1/listings/" + listingId + "/checks", TestTokens.staffA(), "{\"version\":0}"));
  }

  private void assertCrossStore(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request)
      throws Exception {
    MvcResult result = mockMvc.perform(request).andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(404);
    assertThat(errorCode(result)).isEqualTo("NOT_FOUND");
    String body = result.getResponse().getContentAsString();
    assertThat(bodyHasBusinessLeak(body)).isFalse();
    assertThat(body.toLowerCase()).doesNotContain(AdFixtures.V_ASIS_VIN.toLowerCase());
  }
}
