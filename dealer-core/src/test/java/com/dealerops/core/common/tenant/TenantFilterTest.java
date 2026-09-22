package com.dealerops.core.common.tenant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

/** JWT + membership; ignore client dealerId. Runs with Failsafe + Testcontainers MySQL 8.4. */
@Tag("it")
class TenantFilterTest extends CoreItSupport {

  @Test
  void staffMeUsesMembershipNotClientDealerId() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                getMe(TestTokens.staffA())
                    .header("X-Dealer-Id", String.valueOf(dealerBId))
                    .queryParam("dealerId", String.valueOf(dealerBId)))
            .andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(200);
    assertThat(json(result).path("role").asText()).isEqualTo("Dealer.User");
    assertThat(json(result).path("dealerId").asLong()).isEqualTo(dealerAId);
    assertThat(json(result).path("dealerLegalName").asText()).isEqualTo(AdFixtures.PRAIRIE_NAME);
  }

  @Test
  void staffCannotCallAdminUrls() throws Exception {
    MvcResult result = mockMvc.perform(authed(get("/api/v1/admin/dealers"), TestTokens.staffA())).andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(403);
    assertThat(errorCode(result)).isEqualTo("FORBIDDEN");
  }

  @Test
  void adminCanListDealersAndStaffCannot() throws Exception {
    MvcResult admin = mockMvc.perform(authed(get("/api/v1/admin/dealers"), TestTokens.admin())).andReturn();
    assertThat(admin.getResponse().getStatus()).isEqualTo(200);
    assertThat(json(admin).path("items").isArray()).isTrue();

    MvcResult one = mockMvc.perform(authed(get("/api/v1/admin/dealers/" + dealerAId), TestTokens.admin())).andReturn();
    assertThat(one.getResponse().getStatus()).isEqualTo(200);
    assertThat(json(one).path("legalName").asText()).isEqualTo(AdFixtures.PRAIRIE_NAME);

    MvcResult staff = mockMvc.perform(authed(get("/api/v1/admin/dealers"), TestTokens.staffA())).andReturn();
    assertThat(staff.getResponse().getStatus()).isEqualTo(403);
    assertThat(errorCode(staff)).isEqualTo("FORBIDDEN");
  }

  @Test
  void adminCanBindMembersAndStaffCannot() throws Exception {
    String body =
        "{\"entraOid\":\"" + TestTokens.UNBOUND_OID + "\",\"displayName\":\"Unbound Staff\"}";
    MvcResult created =
        mockMvc.perform(postJson("/api/v1/admin/dealers/" + dealerAId + "/members", TestTokens.admin(), body)).andReturn();
    assertThat(created.getResponse().getStatus()).isEqualTo(201);

    MvcResult dup =
        mockMvc
            .perform(
                postJson(
                    "/api/v1/admin/dealers/" + dealerAId + "/members",
                    TestTokens.admin(),
                    "{\"entraOid\":\"" + TestTokens.STAFF_A_OID + "\",\"displayName\":\"Staff A\"}"))
            .andReturn();
    assertThat(dup.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(dup)).isEqualTo("DUP_MEMBER");

    MvcResult otherStore =
        mockMvc
            .perform(
                postJson(
                    "/api/v1/admin/dealers/" + dealerBId + "/members",
                    TestTokens.admin(),
                    "{\"entraOid\":\"" + TestTokens.STAFF_A_OID + "\",\"displayName\":\"Staff A\"}"))
            .andReturn();
    assertThat(otherStore.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(otherStore)).isEqualTo("DUP_MEMBER");

    MvcResult members =
        mockMvc.perform(authed(get("/api/v1/admin/dealers/" + dealerAId + "/members"), TestTokens.admin())).andReturn();
    assertThat(members.getResponse().getStatus()).isEqualTo(200);
    assertThat(json(members).path("items").isArray()).isTrue();

    MvcResult unbound =
        mockMvc
            .perform(
                authed(
                    delete("/api/v1/admin/dealers/" + dealerAId + "/members/" + TestTokens.UNBOUND_OID),
                    TestTokens.admin()))
            .andReturn();
    assertThat(unbound.getResponse().getStatus()).isEqualTo(204);

    MvcResult staff =
        mockMvc
            .perform(postJson("/api/v1/admin/dealers/" + dealerAId + "/members", TestTokens.staffA(), body))
            .andReturn();
    assertThat(staff.getResponse().getStatus()).isEqualTo(403);
    assertThat(errorCode(staff)).isEqualTo("FORBIDDEN");
  }

  @Test
  void unmappedRolesAreForbiddenOnBusinessUrls() throws Exception {
    MvcResult result = mockMvc.perform(getVehicles(TestTokens.noRoles())).andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(403);
    assertThat(errorCode(result)).isEqualTo("FORBIDDEN");
  }
}
