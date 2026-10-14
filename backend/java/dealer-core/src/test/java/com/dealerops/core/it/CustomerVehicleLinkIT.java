package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

/** BE-05 / TEST-05: link 200 / 409 / 404 as specified. */
class CustomerVehicleLinkIT extends CoreItSupport {

  @Test
  void sameStoreInStockLinkSucceedsThenDuplicateConflicts() throws Exception {
    long customerId = createCustomer(TestTokens.staffA(), "Alex");
    long vehicleId = createVehicle(TestTokens.staffA(), AdFixtures.V_ASIS_VIN);

    MvcResult first = linkVehicle(TestTokens.staffA(), customerId, vehicleId);
    assertThat(first.getResponse().getStatus()).isEqualTo(200);

    MvcResult again = linkVehicle(TestTokens.staffA(), customerId, vehicleId);
    assertThat(again.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(again)).isEqualTo("VEHICLE_ALREADY_LINKED");
  }

  @Test
  void soldVehicleWithoutCustomerCanStillBeLinkedOnce() throws Exception {
    long customerId = createCustomer(TestTokens.staffA(), "Sam");
    long vehicleId = createVehicle(TestTokens.staffA(), "1HGCM82633A004353");
    assertThat(sellVehicle(TestTokens.staffA(), vehicleId, 0, "2026-09-01", "15000").getResponse().getStatus())
        .isEqualTo(200);

    MvcResult result = linkVehicle(TestTokens.staffA(), customerId, vehicleId);
    assertThat(result.getResponse().getStatus()).isEqualTo(200);

    long other = createCustomer(TestTokens.staffA(), "Lee");
    MvcResult again = linkVehicle(TestTokens.staffA(), other, vehicleId);
    assertThat(again.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(again)).isEqualTo("VEHICLE_ALREADY_LINKED");
  }

  @Test
  void otherStoreIdIs404NotWrongDealer() throws Exception {
    long customerId = createCustomer(TestTokens.staffA(), "Pat");
    long otherVehicle = createVehicle(TestTokens.staffB(), "1HGCM82633A004354");
    MvcResult result = linkVehicle(TestTokens.staffA(), customerId, otherVehicle);
    assertThat(result.getResponse().getStatus()).isEqualTo(404);
    assertThat(errorCode(result)).isEqualTo("NOT_FOUND");
  }

  @Test
  void oneCustomerMayLinkManyVehicles() throws Exception {
    long customerId = createCustomer(TestTokens.staffA(), "Kim");
    long first = createVehicle(TestTokens.staffA(), "1HGCM82633A004355");
    long second = createVehicle(TestTokens.staffA(), "1HGCM82633A004356");
    assertThat(linkVehicle(TestTokens.staffA(), customerId, first).getResponse().getStatus()).isEqualTo(200);
    assertThat(linkVehicle(TestTokens.staffA(), customerId, second).getResponse().getStatus()).isEqualTo(200);
  }
}
