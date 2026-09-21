package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

/** BE-13 / TEST-13: Admin JWT cannot read business fields. */
class AdminForbiddenOnBusinessIT extends CoreItSupport {

  @Test
  void adminBusinessUrlsAre403WithoutVinCostOrCustomer() throws Exception {
    assertNoBusiness(getVehicles(TestTokens.admin()));
    assertNoBusiness(authed(get("/api/v1/customers"), TestTokens.admin()));
    assertNoBusiness(authed(get("/api/v1/listings/1/checks"), TestTokens.admin()));
    assertNoBusiness(postJson("/api/v1/assistant/ask", TestTokens.admin(), "{\"text\":\"list vehicles\"}"));
  }

  @Test
  void adminWinsWhenBothRolesPresent() throws Exception {
    assertNoBusiness(getVehicles(TestTokens.adminAndStaff()));
  }

  @Test
  void missingJwtIs401Unauthorized() throws Exception {
    MvcResult result = mockMvc.perform(get("/api/v1/me")).andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(401);
    assertThat(errorCode(result)).isEqualTo("UNAUTHORIZED");
  }

  private void assertNoBusiness(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request)
      throws Exception {
    MvcResult result = mockMvc.perform(request).andReturn();
    int status = result.getResponse().getStatus();
    assertThat(status).isIn(403, 404);
    if (status == 403) {
      assertThat(errorCode(result)).isEqualTo("FORBIDDEN");
    } else {
      assertThat(errorCode(result)).isEqualTo("NOT_FOUND");
    }
    assertThat(bodyHasBusinessLeak(result.getResponse().getContentAsString())).isFalse();
  }
}
