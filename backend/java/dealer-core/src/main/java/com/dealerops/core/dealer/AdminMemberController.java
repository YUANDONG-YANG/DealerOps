package com.dealerops.core.dealer;

import com.dealerops.core.common.PageResponse;
import com.dealerops.core.dealer.dto.CreateMemberRequest;
import com.dealerops.core.dealer.dto.MemberResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dealers/{id}/members")
public class AdminMemberController {

  private final MembershipService membershipService;

  public AdminMemberController(MembershipService membershipService) {
    this.membershipService = membershipService;
  }

  @GetMapping
  public PageResponse<MemberResponse> list(
      @PathVariable Long id,
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size) {
    return membershipService.list(id, q, page, size);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public MemberResponse add(@PathVariable Long id, @Valid @RequestBody CreateMemberRequest body) {
    return membershipService.add(id, body);
  }

  @DeleteMapping("/{username}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(@PathVariable Long id, @PathVariable String username) {
    membershipService.remove(id, username);
  }
}
