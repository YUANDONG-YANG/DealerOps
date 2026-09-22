package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

import com.dealerops.core.audit.AuditAction;
import com.dealerops.core.audit.AuditEventRepository;
import com.dealerops.core.audit.EntityType;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

/** BE-11 / TEST-11: audit fieldSummary has no full phone/email/address. */
class AuditNoPiiIT extends CoreItSupport {

  @Autowired private AuditEventRepository auditEventRepository;

  @Test
  void customerUpdateAuditOmitsFullContact() throws Exception {
    long customerId = createCustomer(TestTokens.staffA(), "Alex");
    MvcResult patched =
        mockMvc
            .perform(
                authed(
                    patch("/api/v1/customers/" + customerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                            """
                            {"version":0,"name":"Alex","email":"new@prairie.example","phone":"403-555-0188","homeAddress":"88 Secret Ave"}
                            """),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(patched.getResponse().getStatus()).isEqualTo(200);

    MvcResult audit =
        mockMvc
            .perform(
                authed(
                    get("/api/v1/audit").param("entityType", "CUSTOMER").param("entityId", String.valueOf(customerId)),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(audit.getResponse().getStatus()).isEqualTo(200);
    String body = audit.getResponse().getContentAsString();
    assertThat(body).doesNotContain("403-555-0199");
    assertThat(body).doesNotContain("403-555-0188");
    assertThat(body).doesNotContain("new@prairie.example");
    assertThat(body).doesNotContain("88 Secret Ave");
    assertThat(body).contains("CUSTOMER");
  }

  @Test
  void linkAndUnlinkAuditOmitsCustomerContact() throws Exception {
    long customerId = createCustomer(TestTokens.staffA(), "Lee");
    long vehicleId = createVehicle(TestTokens.staffA(), "1HGCM82633A004380");
    MvcResult linked = linkVehicle(TestTokens.staffA(), customerId, vehicleId);
    assertThat(linked.getResponse().getStatus()).isEqualTo(200);
    long linkId = json(linked).path("id").asLong();

    MvcResult linkAudit =
        mockMvc
            .perform(
                authed(
                    get("/api/v1/audit")
                        .param("entityType", "CUSTOMER_VEHICLE")
                        .param("entityId", String.valueOf(linkId)),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(linkAudit.getResponse().getStatus()).isEqualTo(200);
    String linkBody = linkAudit.getResponse().getContentAsString();
    assertThat(linkBody).contains("LINK");
    assertThat(linkBody).doesNotContain("403-555-0199");
    assertThat(linkBody).doesNotContain("lee@prairie.example");
    assertThat(linkBody).doesNotContain("9 Hidden Rd");

    MvcResult unlinked =
        mockMvc
            .perform(
                authed(
                    delete("/api/v1/customers/" + customerId + "/vehicles/" + vehicleId),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(unlinked.getResponse().getStatus()).isEqualTo(204);

    assertThat(auditEventRepository.findAll())
        .anyMatch(
            row ->
                EntityType.CUSTOMER_VEHICLE.name().equals(row.getEntityType())
                    && row.getEntityId() == linkId
                    && AuditAction.UNLINK.name().equals(row.getAction())
                    && row.getFieldSummary() != null
                    && !row.getFieldSummary().contains("403-555-0199")
                    && !row.getFieldSummary().contains("lee@prairie.example")
                    && !row.getFieldSummary().contains("9 Hidden Rd"));
  }

  @Test
  void crossStoreAuditEntityIs404() throws Exception {
    long customerId = createCustomer(TestTokens.staffB(), "Other");
    MvcResult audit =
        mockMvc
            .perform(
                authed(
                    get("/api/v1/audit").param("entityType", "CUSTOMER").param("entityId", String.valueOf(customerId)),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(audit.getResponse().getStatus()).isEqualTo(404);
    assertThat(errorCode(audit)).isEqualTo("NOT_FOUND");
  }

  @Test
  void adminCannotReadBusinessAudit() throws Exception {
    MvcResult audit =
        mockMvc
            .perform(
                authed(get("/api/v1/audit").param("entityType", "VEHICLE").param("entityId", "1"), TestTokens.admin()))
            .andReturn();
    assertThat(audit.getResponse().getStatus()).isEqualTo(403);
    assertThat(errorCode(audit)).isEqualTo("FORBIDDEN");
    assertThat(bodyHasBusinessLeak(audit.getResponse().getContentAsString())).isFalse();
  }

  @Test
  void staffCannotQueryListingAudit() throws Exception {
    MvcResult audit =
        mockMvc
            .perform(
                authed(get("/api/v1/audit").param("entityType", "LISTING").param("entityId", "1"), TestTokens.staffA()))
            .andReturn();
    assertThat(audit.getResponse().getStatus()).isEqualTo(400);
    assertThat(errorCode(audit)).isEqualTo("VALIDATION");
  }
}
