package com.dealerops.core.dealer;

import com.dealerops.core.common.PageResponse;
import com.dealerops.core.dealer.dto.PendingUserResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Accounts waiting for a dealership; the admin binds them with the member endpoint. */
@RestController
public class AdminPendingUserController {

  private final MembershipService membershipService;

  public AdminPendingUserController(MembershipService membershipService) {
    this.membershipService = membershipService;
  }

  @GetMapping("/api/v1/admin/pending-users")
  public PageResponse<PendingUserResponse> list(
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size) {
    return membershipService.pending(q, page, size);
  }
}
