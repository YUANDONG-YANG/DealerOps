package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import com.dealerops.core.customer.CustomerEntity;
import com.dealerops.core.customer.CustomerRepository;
import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import com.dealerops.core.vehicle.ConditionCode;
import com.dealerops.core.vehicle.VehicleEntity;
import com.dealerops.core.vehicle.VehicleRepository;
import com.dealerops.core.vehicle.VehicleSource;
import com.dealerops.core.vehicle.VehicleStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

/** BE-05 / TEST-05: link 200 / 409 / 400 / 404 as specified. */
class CustomerVehicleLinkIT extends CoreItSupport {

  @Autowired private CustomerRepository customerRepository;
  @Autowired private VehicleRepository vehicleRepository;

  @Test
  void sameStoreInStockLinkSucceedsThenDuplicateConflicts() throws Exception {
    long customerId = customer(dealerAId, "Alex").getId();
    long vehicleId = vehicle(dealerAId, AdFixtures.V_ASIS_VIN, VehicleStatus.IN_STOCK).getId();

    MvcResult first =
        mockMvc.perform(authed(put("/api/v1/customers/" + customerId + "/vehicles/" + vehicleId), TestTokens.staffA()))
            .andReturn();
    assertThat(first.getResponse().getStatus()).isEqualTo(200);

    MvcResult again =
        mockMvc.perform(authed(put("/api/v1/customers/" + customerId + "/vehicles/" + vehicleId), TestTokens.staffA()))
            .andReturn();
    assertThat(again.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(again)).isEqualTo("VEHICLE_ALREADY_LINKED");
  }

  @Test
  void soldCannotBeNewlyLinked() throws Exception {
    long customerId = customer(dealerAId, "Sam").getId();
    long vehicleId = vehicle(dealerAId, "1HGCM82633A004353", VehicleStatus.SOLD).getId();
    MvcResult result =
        mockMvc.perform(authed(put("/api/v1/customers/" + customerId + "/vehicles/" + vehicleId), TestTokens.staffA()))
            .andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(400);
    assertThat(errorCode(result)).isEqualTo("WRONG_DEALER_OR_SOLD");
  }

  @Test
  void otherStoreIdIs404NotWrongDealer() throws Exception {
    long customerId = customer(dealerAId, "Pat").getId();
    long otherVehicle = vehicle(dealerBId, "1HGCM82633A004354", VehicleStatus.IN_STOCK).getId();
    MvcResult result =
        mockMvc.perform(authed(put("/api/v1/customers/" + customerId + "/vehicles/" + otherVehicle), TestTokens.staffA()))
            .andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(404);
    assertThat(errorCode(result)).isEqualTo("NOT_FOUND");
  }

  private CustomerEntity customer(Long dealerId, String name) {
    CustomerEntity customer = new CustomerEntity();
    customer.setDealerId(dealerId);
    customer.setName(name);
    customer.setEmail(name.toLowerCase() + "@prairie.example");
    customer.setPhone("403-555-0199");
    customer.setHomeAddress("9 Hidden Rd");
    return customerRepository.save(customer);
  }

  private VehicleEntity vehicle(Long dealerId, String vin, VehicleStatus status) {
    VehicleEntity vehicle = new VehicleEntity();
    vehicle.setDealerId(dealerId);
    vehicle.setVin(vin);
    vehicle.setMake("Toyota");
    vehicle.setModel("Camry");
    vehicle.setModelYear(2020);
    vehicle.setSource(VehicleSource.AUCTION);
    vehicle.setPurchaseCost(new BigDecimal("12000.00"));
    vehicle.setAddedOn(LocalDate.of(2020, 3, 1));
    vehicle.setConditionCode(ConditionCode.AS_IS);
    vehicle.setStatus(status);
    if (status == VehicleStatus.SOLD) {
      vehicle.setSoldOn(LocalDate.of(2026, 9, 1));
      vehicle.setSoldPrice(new BigDecimal("15000.00"));
    }
    return vehicleRepository.save(vehicle);
  }
}
