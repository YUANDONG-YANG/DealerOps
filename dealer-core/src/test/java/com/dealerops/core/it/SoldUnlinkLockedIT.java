package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;

import com.dealerops.core.customer.CustomerEntity;
import com.dealerops.core.customer.CustomerRepository;
import com.dealerops.core.customer.CustomerVehicleEntity;
import com.dealerops.core.customer.CustomerVehicleRepository;
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

/** BE-06 / TEST-06: sold unlink 409; in-stock unlink 204. */
class SoldUnlinkLockedIT extends CoreItSupport {

  @Autowired private CustomerRepository customerRepository;
  @Autowired private VehicleRepository vehicleRepository;
  @Autowired private CustomerVehicleRepository customerVehicleRepository;

  @Test
  void soldUnlinkRemainsLocked() throws Exception {
    CustomerEntity customer = saveCustomer("Sold Link");
    VehicleEntity vehicle = saveVehicle("1HGCM82633A009001", VehicleStatus.SOLD);
    CustomerVehicleEntity link = link(customer.getId(), vehicle.getId());

    MvcResult result =
        mockMvc
            .perform(
                authed(
                    delete("/api/v1/customers/" + customer.getId() + "/vehicles/" + vehicle.getId()),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(409);
    assertThat(errorCode(result)).isEqualTo("SOLD_LOCKED");
    assertThat(customerVehicleRepository.findById(link.getId())).isPresent();
  }

  @Test
  void inStockUnlinkIs204() throws Exception {
    CustomerEntity customer = saveCustomer("Open Link");
    VehicleEntity vehicle = saveVehicle("1HGCM82633A009002", VehicleStatus.IN_STOCK);
    CustomerVehicleEntity link = link(customer.getId(), vehicle.getId());

    MvcResult result =
        mockMvc
            .perform(
                authed(
                    delete("/api/v1/customers/" + customer.getId() + "/vehicles/" + vehicle.getId()),
                    TestTokens.staffA()))
            .andReturn();
    assertThat(result.getResponse().getStatus()).isEqualTo(204);
    assertThat(customerVehicleRepository.findById(link.getId())).isEmpty();
  }

  private CustomerEntity saveCustomer(String name) {
    CustomerEntity customer = new CustomerEntity();
    customer.setDealerId(dealerAId);
    customer.setName(name);
    customer.setEmail(name.replace(" ", "").toLowerCase() + "@prairie.example");
    customer.setPhone("403-555-0199");
    customer.setHomeAddress("9 Hidden Rd");
    return customerRepository.save(customer);
  }

  private VehicleEntity saveVehicle(String vin, VehicleStatus status) {
    VehicleEntity vehicle = new VehicleEntity();
    vehicle.setDealerId(dealerAId);
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

  private CustomerVehicleEntity link(Long customerId, Long vehicleId) {
    CustomerVehicleEntity row = new CustomerVehicleEntity();
    row.setDealerId(dealerAId);
    row.setCustomerId(customerId);
    row.setVehicleId(vehicleId);
    return customerVehicleRepository.save(row);
  }
}
