package com.dealerops.core.security;

import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.security.dto.MeResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class MeController {

  private final MeService meService;

  public MeController(MeService meService) {
    this.meService = meService;
  }

  @GetMapping("/me")
  public MeResponse me() {
    return meService.me(TenantContext.get());
  }
}
