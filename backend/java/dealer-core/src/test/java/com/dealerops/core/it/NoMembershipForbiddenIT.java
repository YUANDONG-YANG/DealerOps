package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

/** BE-02 / TEST-02: Dealer.User with 0 active memberships. */
class NoMembershipForbiddenIT extends CoreItSupport {

  @Test
  void getMeIs200WithNullDealerId() throws Exception {
    MvcResult result = mockMvc.perform(getMe(TestTokens.unboundStaff())).andExpect(status().isOk()).andReturn();
    assertThat(json(result).path("role").asText()).isEqualTo("Dealer.User");
    assertThat(json(result).path("dealerId").isNull()).isTrue();
  }

  @Test
  void businessApisAre403ForbiddenNot401() throws Exception {
    assertForbidden(getVehicles(TestTokens.unboundStaff()));
    assertForbidden(authed(get("/api/v1/customers"), TestTokens.unboundStaff()));
    assertForbidden(authed(get("/api/v1/listings/1"), TestTokens.unboundStaff()));
    assertForbidden(authed(get("/api/v1/audit").param("entityType", "VEHICLE").param("entityId", "1"), TestTokens.unboundStaff()));
    assertForbidden(postJson("/api/v1/assistant/ask", TestTokens.unboundStaff(), "{\"text\":\"hi\"}"));
  }

  private void assertForbidden(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request)
      throws Exception {
    MvcResult result = mockMvc.perform(request).andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(403);
    assertThat(errorCode(result)).isEqualTo("FORBIDDEN");
    assertThat(result.getResponse().getStatus()).isNotEqualTo(401);
  }
}
