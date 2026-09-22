package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;

import com.dealerops.core.audit.AuditAction;
import com.dealerops.core.audit.AuditEventRepository;
import com.dealerops.core.audit.EntityType;
import com.dealerops.core.customer.CustomerVehicleRepository;
import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

/** BE-06 / TEST-06: sold unlink is 409 SOLD_LOCKED; in-stock unlink is 204. */
class SoldUnlinkLockedIT extends CoreItSupport {

  @Autowired private CustomerVehicleRepository customerVehicleRepository;
  @Autowired private AuditEventRepository auditEventRepository;

  @Test
  void soldUnlinkIsLockedAndRowRemains() throws Exception {
    long customerId = createCustomer(TestTokens.staffA(), "Alex");
    long vehicleId = createVehicle(TestTokens.staffA(), AdFixtures.V_ASIS_VIN);
    assertThat(linkVehicle(TestTokens.staffA(), customerId, vehicleId).getResponse().getStatus()).isEqualTo(200);
    assertThat(sellVehicle(TestTokens.staffA(), vehicleId, 0, "2026-09-21", "15000").getResponse().getStatus())
        .isEqualTo(200);

    MvcResult sold =
        mockMvc
            .perform(authed(delete("/api/v1/customers/" + customerId + "/vehicles/" + vehicleId), TestTokens.staffA()))
            .andReturn();
    assertThat(sold.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(sold)).isEqualTo("SOLD_LOCKED");
    assertThat(customerVehicleRepository.existsByVehicleId(vehicleId)).isTrue();
    assertThat(
            customerVehicleRepository.findByCustomerIdAndVehicleId(customerId, vehicleId).orElseThrow().getDealerId())
        .isEqualTo(dealerAId);
    long linkId =
        customerVehicleRepository.findByCustomerIdAndVehicleId(customerId, vehicleId).orElseThrow().getId();
    assertThat(customerVehicleRepository.findByIdAndDealerId(linkId, dealerAId)).isPresent();
    assertThat(customerVehicleRepository.findByIdAndDealerId(linkId, dealerBId)).isEmpty();
  }

  @Test
  void inStockUnlinkIs204() throws Exception {
    long customerId = createCustomer(TestTokens.staffA(), "Sam");
    long vehicleId = createVehicle(TestTokens.staffA(), "1HGCM82633A004360");
    MvcResult linked = linkVehicle(TestTokens.staffA(), customerId, vehicleId);
    assertThat(linked.getResponse().getStatus()).isEqualTo(200);
    long linkId = json(linked).path("id").asLong();

    MvcResult result =
        mockMvc
            .perform(authed(delete("/api/v1/customers/" + customerId + "/vehicles/" + vehicleId), TestTokens.staffA()))
            .andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(204);
    assertThat(customerVehicleRepository.existsByVehicleId(vehicleId)).isFalse();
    assertThat(auditEventRepository.findAll())
        .anyMatch(
            row ->
                EntityType.CUSTOMER_VEHICLE.name().equals(row.getEntityType())
                    && row.getEntityId() == linkId
                    && AuditAction.UNLINK.name().equals(row.getAction()));
  }
}
