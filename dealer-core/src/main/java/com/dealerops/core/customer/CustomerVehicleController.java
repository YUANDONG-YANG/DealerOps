package com.dealerops.core.customer;

import com.dealerops.core.customer.dto.LinkResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers/{id}/vehicles")
public class CustomerVehicleController {

  private final CustomerService customerService;

  public CustomerVehicleController(CustomerService customerService) {
    this.customerService = customerService;
  }

  @PutMapping("/{vehicleId}")
  public LinkResponse link(@PathVariable Long id, @PathVariable Long vehicleId) {
    return customerService.link(id, vehicleId);
  }

  @DeleteMapping("/{vehicleId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void unlink(@PathVariable Long id, @PathVariable Long vehicleId) {
    customerService.unlink(id, vehicleId);
  }
}
