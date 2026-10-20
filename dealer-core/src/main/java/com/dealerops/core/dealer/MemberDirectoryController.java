package com.dealerops.core.dealer;

import com.dealerops.core.dealer.dto.MemberOption;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MemberDirectoryController {

  private final MemberDirectoryService memberDirectoryService;

  public MemberDirectoryController(MemberDirectoryService memberDirectoryService) {
    this.memberDirectoryService = memberDirectoryService;
  }

  @GetMapping("/api/v1/members")
  public List<MemberOption> list() {
    return memberDirectoryService.activeMembers();
  }
}
