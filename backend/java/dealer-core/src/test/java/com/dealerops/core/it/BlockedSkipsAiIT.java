package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import com.dealerops.core.integration.AiGatewayClient;
import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * BE-09 / TEST-09 / classroom CL-4 (00 item 4 · NN-15).
 * Missing price (FX-01) or FINANCE missing APR (FX-03) → HTTP 200 BLOCKED / SKIPPED.
 * Do not call Gateway POST /internal/v1/ad-check. Ready/export → 409 NOT_PASSED.
 */
class BlockedSkipsAiIT extends CoreItSupport {

  @MockBean private AiGatewayClient aiGatewayClient;

  @Test
  void fx01MissingPriceIsBlockedWithoutCallingAi() throws Exception {
    long vehicleId = createVehicle(TestTokens.staffA(), AdFixtures.V_ASIS_VIN);
    patchListing(vehicleId, AdFixtures.FX01_TITLE, AdFixtures.FX01_BODY, "CASH");
    MvcResult listing =
        mockMvc.perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA())).andReturn();
    long listingId = json(listing).path("id").asLong();
    int version = json(listing).path("version").asInt();

    MvcResult check =
        mockMvc
            .perform(postJson("/api/v1/listings/" + listingId + "/checks", TestTokens.staffA(), "{\"version\":" + version + "}"))
            .andReturn();
    assertThat(check.getResponse().getStatus()).isEqualTo(200);
    assertThat(json(check).path("recommendation").asText()).isEqualTo("BLOCKED");
    assertThat(json(check).path("aiStatus").asText()).isEqualTo("SKIPPED");
    assertThat(check.getResponse().getContentAsString()).contains("PRICE_MISSING");
    verify(aiGatewayClient, never()).adCheck(any());

    listing = mockMvc.perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA())).andReturn();
    MvcResult ready =
        mockMvc
            .perform(
                postJson(
                    "/api/v1/listings/" + listingId + "/ready",
                    TestTokens.staffA(),
                    "{\"version\":" + json(listing).path("version").asInt() + "}"))
            .andReturn();
    assertThat(ready.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(ready)).isEqualTo("NOT_PASSED");
    MvcResult export =
        mockMvc
            .perform(
                postJson(
                    "/api/v1/listings/" + listingId + "/exports",
                    TestTokens.staffA(),
                    "{\"version\":" + json(listing).path("version").asInt() + "}"))
            .andReturn();
    assertThat(export.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(export)).isEqualTo("NOT_PASSED");
  }

  @Test
  void fx03FinanceMissingAprIsBlocked() throws Exception {
    long vehicleId = createVehicle(TestTokens.staffA(), "1HGCM82633A004361");
    patchListing(vehicleId, AdFixtures.FX03_TITLE, AdFixtures.FX03_BODY, "FINANCE");
    MvcResult listing =
        mockMvc
            .perform(
                authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA()))
            .andReturn();
    MvcResult check =
        mockMvc
            .perform(
                postJson(
                    "/api/v1/listings/" + json(listing).path("id").asLong() + "/checks",
                    TestTokens.staffA(),
                    "{\"version\":" + json(listing).path("version").asInt() + "}"))
            .andReturn();
    assertThat(check.getResponse().getStatus()).isEqualTo(200);
    assertThat(json(check).path("recommendation").asText()).isEqualTo("BLOCKED");
    assertThat(json(check).path("aiStatus").asText()).isEqualTo("SKIPPED");
    assertThat(check.getResponse().getContentAsString()).contains("FINANCE_APR_MISSING");
    verify(aiGatewayClient, never()).adCheck(any());

    listing =
        mockMvc.perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA())).andReturn();
    long listingId = json(listing).path("id").asLong();
    int version = json(listing).path("version").asInt();
    MvcResult ready =
        mockMvc
            .perform(postJson("/api/v1/listings/" + listingId + "/ready", TestTokens.staffA(), "{\"version\":" + version + "}"))
            .andReturn();
    assertThat(ready.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(ready)).isEqualTo("NOT_PASSED");
    MvcResult export =
        mockMvc
            .perform(
                postJson("/api/v1/listings/" + listingId + "/exports", TestTokens.staffA(), "{\"version\":" + version + "}"))
            .andReturn();
    assertThat(export.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(export)).isEqualTo("NOT_PASSED");
  }

  private void patchListing(long vehicleId, String title, String body, String adKind) throws Exception {
    mockMvc
        .perform(
            authed(
                patch("/api/v1/vehicles/" + vehicleId + "/listing")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(
                        """
                        {"version":0,"title":%s,"body":%s,"adKind":"%s","medium":"ONLINE"}
                        """
                            .formatted(quote(title), quote(body), adKind)),
                TestTokens.staffA()))
        .andReturn();
  }

  private static String quote(String value) {
    return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
  }
}
