package com.dealerops.core.customer;

import com.dealerops.core.common.PageResponse;
import com.dealerops.core.customer.dto.CreateCustomerRequest;
import com.dealerops.core.customer.dto.CustomerDetail;
import com.dealerops.core.customer.dto.CustomerListItem;
import com.dealerops.core.customer.dto.PatchCustomerRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/customers")
public class CustomerController {

  private final CustomerService customerService;

  public CustomerController(CustomerService customerService) {
    this.customerService = customerService;
  }

  @GetMapping
  public PageResponse<CustomerListItem> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Boolean linked,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size) {
    return customerService.list(q, linked, page, size);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public CustomerDetail create(@Valid @RequestBody CreateCustomerRequest body) {
    return customerService.create(body);
  }

  @GetMapping("/{id}")
  public CustomerDetail get(@PathVariable Long id) {
    return customerService.get(id);
  }

  @PatchMapping("/{id}")
  public CustomerDetail patch(@PathVariable Long id, @Valid @RequestBody PatchCustomerRequest body) {
    return customerService.patch(id, body);
  }
}
