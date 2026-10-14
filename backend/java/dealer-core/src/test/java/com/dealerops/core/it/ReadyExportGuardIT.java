package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import com.dealerops.core.listing.ListingRepository;
import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.PassingAiItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * BE-10 / TEST-10 / classroom CL-6 Ready/export latch.
 * Only current Passed and matching versions → ready 200 and export 200 text/plain
 * (public dealer + vehicle fields + title/body; no purchase cost, no customer).
 * Blocked / Needs AI / AI unavailable / no check → 409 NOT_PASSED; Stale → 409 CHECK_STALE.
 */
class ReadyExportGuardIT extends PassingAiItSupport {

  @Autowired private ListingRepository listingRepository;

  @Test
  void noCheckCannotReadyOrExport() throws Exception {
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

  @Test
  void emptyDraftGetDoesNotPersistAndBlankPatchWritesEmptyStrings() throws Exception {
    long vehicleId = createVehicle(TestTokens.staffA(), "1HGCM82633A004372");
    MvcResult empty =
        mockMvc.perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA())).andReturn();
    assertThat(empty.getResponse().getStatus()).isEqualTo(200);
    assertThat(json(empty).path("id").isNull()).isTrue();
    assertThat(json(empty).path("title").asText()).isEmpty();
    assertThat(json(empty).path("body").asText()).isEmpty();
    assertThat(listingRepository.findByVehicleIdAndDealerId(vehicleId, dealerAId)).isEmpty();

    MvcResult patched =
        mockMvc
            .perform(
                authed(
                    patch("/api/v1/vehicles/" + vehicleId + "/listing")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0}"),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(patched.getResponse().getStatus()).isEqualTo(200);
    var row = listingRepository.findByVehicleIdAndDealerId(vehicleId, dealerAId).orElseThrow();
    assertThat(row.getTitle()).isEmpty();
    assertThat(row.getBody()).isEmpty();
  }

  @Test
  void passedExportIsPlainTextWithoutCostOrCustomer() throws Exception {
    long vehicleId = createVehicle(TestTokens.staffA(), "1HGCM82633A004370");
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
        mockMvc.perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA())).andReturn();
    long listingId = json(listing).path("id").asLong();
    MvcResult checked =
        mockMvc
            .perform(
                postJson(
                    "/api/v1/listings/" + listingId + "/checks",
                    TestTokens.staffA(),
                    "{\"version\":" + json(listing).path("version").asInt() + "}"))
            .andReturn();
    assertThat(checked.getResponse().getStatus()).isEqualTo(200);
    assertThat(json(checked).path("recommendation").asText()).isEqualTo("PASSED");
    listing = mockMvc.perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA())).andReturn();
    int version = json(listing).path("version").asInt();
    assertThat(json(listing).path("checkStatus").asText()).isEqualTo("PASSED");
    MvcResult ready =
        mockMvc
            .perform(postJson("/api/v1/listings/" + listingId + "/ready", TestTokens.staffA(), "{\"version\":" + version + "}"))
            .andReturn();
    assertThat(ready.getResponse().getStatus()).isEqualTo(200);
    listing = mockMvc.perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA())).andReturn();
    version = json(listing).path("version").asInt();
    MvcResult export =
        mockMvc
            .perform(
                postJson("/api/v1/listings/" + listingId + "/exports", TestTokens.staffA(), "{\"version\":" + version + "}"))
            .andReturn();
    assertThat(export.getResponse().getStatus()).isEqualTo(200);
    assertThat(export.getResponse().getContentType()).contains("text/plain");
    String text = export.getResponse().getContentAsString();
    assertThat(text).contains(AdFixtures.PRAIRIE_NAME);
    assertThat(text).doesNotContain("12000");
    assertThat(text).doesNotContain("403-555-0199");
  }

  private static String jsonString(String value) {
    return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
  }
}
