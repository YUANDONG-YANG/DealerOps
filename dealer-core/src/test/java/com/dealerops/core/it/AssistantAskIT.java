package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.dealerops.core.compliance.ComplianceCheckRepository;
import com.dealerops.core.customer.CustomerRepository;
import com.dealerops.core.listing.ListingRepository;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import com.dealerops.core.vehicle.VehicleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

/**
 * BE-12 / TEST-12 / 16 FE-10 API side.
 * Staff ask: 200, cards.length≤5, no phone/email/address, no writes. Admin → 403.
 * Model down: still 200 + summaryAvailable=false; cards may remain.
 */
class AssistantAskIT extends CoreItSupport {

  @Autowired private VehicleRepository vehicleRepository;
  @Autowired private CustomerRepository customerRepository;
  @Autowired private ListingRepository listingRepository;
  @Autowired private ComplianceCheckRepository complianceCheckRepository;

  @Test
  void adminAskIsForbidden() throws Exception {
    MvcResult result = mockMvc.perform(postJson("/api/v1/assistant/ask", TestTokens.admin(), "{\"text\":\"list cars\"}")).andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(403);
    assertThat(errorCode(result)).isEqualTo("FORBIDDEN");
    assertThat(bodyHasBusinessLeak(result.getResponse().getContentAsString())).isFalse();
  }

  @Test
  void staffAskIsAtMostFiveCardsAndReadOnly() throws Exception {
    createVehicle(TestTokens.staffA(), "1HGCM82633A004371");
    long vehicles = vehicleRepository.count();
    long customers = customerRepository.count();
    long listings = listingRepository.count();
    long checks = complianceCheckRepository.count();

    MvcResult result =
        mockMvc.perform(postJson("/api/v1/assistant/ask", TestTokens.staffA(), "{\"text\":\"Which Toyotas are in stock?\"}")).andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(200);
    assertThat(json(result).path("cards").size()).isLessThanOrEqualTo(5);
    assertThat(result.getResponse().getContentAsString()).doesNotContain("403-555-0199");
    assertThat(result.getResponse().getContentAsString()).doesNotContain("homeAddress");
    if (!json(result).path("summaryAvailable").asBoolean()) {
      assertThat(json(result).path("summary").isNull()).isTrue();
    }
    assertThat(vehicleRepository.count()).isEqualTo(vehicles);
    assertThat(customerRepository.count()).isEqualTo(customers);
    assertThat(listingRepository.count()).isEqualTo(listings);
    assertThat(complianceCheckRepository.count()).isEqualTo(checks);
  }
}
