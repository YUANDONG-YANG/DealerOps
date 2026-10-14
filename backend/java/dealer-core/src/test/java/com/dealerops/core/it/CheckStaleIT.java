package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.PassingAiItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * BE-07 / TEST-07 / classroom CL-6 (00 item 6).
 * FX-11: after FX-10 PASSED, change the advertised price; do not clear lastCheckId.
 * Ready/export → 409 CHECK_STALE. GET listing checkStatus=STALE.
 */
class CheckStaleIT extends PassingAiItSupport {

  @Test
  void priceChangeMakesReadyAndExportStale() throws Exception {
    long vehicleId = createVehicle(TestTokens.staffA(), AdFixtures.V_ASIS_VIN);
    mockMvc
        .perform(
            authed(
                patch("/api/v1/vehicles/" + vehicleId + "/listing")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"version":0,"title":%s,"body":%s,"adKind":"CASH","medium":"ONLINE"}
                        """
                            .formatted(jsonString(AdFixtures.FX10_TITLE), jsonString(AdFixtures.FX10_BODY))),
                TestTokens.staffA()))
        .andReturn();
    MvcResult listing =
        mockMvc
            .perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA()))
            .andReturn();
    long listingId = json(listing).path("id").asLong();
    int version = json(listing).path("version").asInt();
    Long lastCheckId = json(listing).path("lastCheckId").isNull() ? null : json(listing).path("lastCheckId").asLong();

    MvcResult checked =
        mockMvc
            .perform(postJson("/api/v1/listings/" + listingId + "/checks", TestTokens.staffA(), "{\"version\":" + version + "}"))
            .andReturn();
    assertThat(checked.getResponse().getStatus()).isEqualTo(200);
    assertThat(json(checked).path("recommendation").asText()).isEqualTo("PASSED");

    listing = mockMvc.perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA())).andReturn();
    version = json(listing).path("version").asInt();
    lastCheckId = json(listing).path("lastCheckId").asLong();

    mockMvc
        .perform(
            authed(
                patch("/api/v1/vehicles/" + vehicleId + "/listing")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"version":%d,"title":%s,"body":%s,"adKind":"CASH","medium":"ONLINE"}
                        """
                            .formatted(
                                version, jsonString(AdFixtures.FX10_TITLE), jsonString(AdFixtures.FX11_BODY))),
                TestTokens.staffA()))
        .andReturn();

    MvcResult after =
        mockMvc.perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA())).andReturn();
    assertThat(json(after).path("lastCheckId").asLong()).isEqualTo(lastCheckId);
    assertThat(json(after).path("checkStatus").asText()).isEqualTo("STALE");

    int staleVersion = json(after).path("version").asInt();
    MvcResult ready =
        mockMvc
            .perform(postJson("/api/v1/listings/" + listingId + "/ready", TestTokens.staffA(), "{\"version\":" + staleVersion + "}"))
            .andReturn();
    assertThat(ready.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(ready)).isEqualTo("CHECK_STALE");
    MvcResult export =
        mockMvc
            .perform(
                postJson("/api/v1/listings/" + listingId + "/exports", TestTokens.staffA(), "{\"version\":" + staleVersion + "}"))
            .andReturn();
    assertThat(export.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(export)).isEqualTo("CHECK_STALE");
  }

  private static String jsonString(String value) {
    return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
  }
}
