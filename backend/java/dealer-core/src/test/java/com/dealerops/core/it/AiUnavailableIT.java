package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import com.dealerops.core.compliance.ComplianceCheckRepository;
import com.dealerops.core.compliance.Recommendation;
import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/**
 * BE-08 / TEST-08 / classroom CL-5 failure branch (FX-12).
 * Hard rules already pass; model timeout/fail → 502 AI_UNAVAILABLE, row written UNAVAILABLE.
 * Ready/export → 409 NOT_PASSED. Do not impersonate with a hard-miss ad.
 */
class AiUnavailableIT extends CoreItSupport {

  @Autowired private ComplianceCheckRepository complianceCheckRepository;

  @Test
  void fx12PersistsUnavailableAndBlocksReady() throws Exception {
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

    MvcResult check =
        mockMvc
            .perform(postJson("/api/v1/listings/" + listingId + "/checks", TestTokens.staffA(), "{\"version\":" + version + "}"))
            .andReturn();
    assertThat(check.getResponse().getStatus()).isEqualTo(502);
    assertThat(errorCode(check)).isEqualTo("AI_UNAVAILABLE");
    assertThat(complianceCheckRepository.findAll())
        .anyMatch(
            row ->
                row.getRecommendation() == Recommendation.UNAVAILABLE
                    && row.getListingId().equals(listingId)
                    && row.getRuleFindingsJson() != null
                    && !row.getRuleFindingsJson().isBlank());

    MvcResult after =
        mockMvc.perform(authed(get("/api/v1/vehicles/" + vehicleId + "/listing"), TestTokens.staffA())).andReturn();
    assertThat(json(after).path("checkStatus").asText()).isEqualTo("AI_UNAVAILABLE");

    MvcResult ready =
        mockMvc
            .perform(
                postJson(
                    "/api/v1/listings/" + listingId + "/ready",
                    TestTokens.staffA(),
                    "{\"version\":" + json(after).path("version").asInt() + "}"))
            .andReturn();
    assertThat(ready.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(ready)).isEqualTo("NOT_PASSED");
    MvcResult export =
        mockMvc
            .perform(
                postJson(
                    "/api/v1/listings/" + listingId + "/exports",
                    TestTokens.staffA(),
                    "{\"version\":" + json(after).path("version").asInt() + "}"))
            .andReturn();
    assertThat(export.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(export)).isEqualTo("NOT_PASSED");
  }

  private static String jsonString(String value) {
    return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
  }
}
