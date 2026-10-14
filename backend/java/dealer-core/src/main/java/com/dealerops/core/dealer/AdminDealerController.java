package com.dealerops.core.dealer;

import com.dealerops.core.common.PageResponse;
import com.dealerops.core.dealer.dto.CreateDealerRequest;
import com.dealerops.core.dealer.dto.DealerResponse;
import com.dealerops.core.dealer.dto.PatchDealerRequest;
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
@RequestMapping("/api/v1/admin/dealers")
public class AdminDealerController {

  private final DealerAdminService dealerAdminService;

  public AdminDealerController(DealerAdminService dealerAdminService) {
    this.dealerAdminService = dealerAdminService;
  }

  @GetMapping
  public PageResponse<DealerResponse> list(
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size) {
    return dealerAdminService.list(q, page, size);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public DealerResponse create(@Valid @RequestBody CreateDealerRequest body) {
    return dealerAdminService.create(body);
  }

  @GetMapping("/{id}")
  public DealerResponse get(@PathVariable Long id) {
    return dealerAdminService.get(id);
  }

  @PatchMapping("/{id}")
  public DealerResponse patch(@PathVariable Long id, @Valid @RequestBody PatchDealerRequest body) {
    return dealerAdminService.patch(id, body);
  }
}
