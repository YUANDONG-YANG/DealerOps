package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/** BE-01 / TEST-01: cross-dealership ids are 404 NOT_FOUND, never 403. */
class CrossTenantIsolationIT extends CoreItSupport {

  @Test
  void staffACannotReadDealershipBIds() throws Exception {
    assertCrossStore(authed(get("/api/v1/vehicles/9001"), TestTokens.staffA()));
    assertCrossStore(authed(get("/api/v1/customers/9002"), TestTokens.staffA()));
    assertCrossStore(
        authed(
            patch("/api/v1/vehicles/9001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"version\":0,\"make\":\"X\",\"model\":\"Y\",\"modelYear\":2020,\"vin\":\"1HGCM82633A004352\",\"source\":\"AUCTION\",\"purchaseCost\":1,\"addedOn\":\"2020-01-01\",\"conditionCode\":\"AS_IS\"}"),
            TestTokens.staffA()));
    assertCrossStore(
        postJson("/api/v1/listings/9003/checks", TestTokens.staffA(), "{\"version\":0}"));
  }

  private void assertCrossStore(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request)
      throws Exception {
    MvcResult result = mockMvc.perform(request).andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(404);
    assertThat(errorCode(result)).isEqualTo("NOT_FOUND");
    assertThat(errorCode(result)).isNotEqualTo("FORBIDDEN");
    String body = result.getResponse().getContentAsString();
    assertThat(bodyHasBusinessLeak(body)).isFalse();
    assertThat(body.toLowerCase()).doesNotContain(AdFixturesVin());
  }

  private static String AdFixturesVin() {
    return "1hgcm82633a004352";
  }
}
