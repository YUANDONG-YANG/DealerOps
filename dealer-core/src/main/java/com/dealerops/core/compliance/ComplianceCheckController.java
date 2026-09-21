package com.dealerops.core.compliance;

import com.dealerops.core.compliance.dto.CheckResponse;
import com.dealerops.core.listing.dto.VersionBody;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/listings")
public class ComplianceCheckController {

  private final ComplianceCheckService complianceCheckService;

  public ComplianceCheckController(ComplianceCheckService complianceCheckService) {
    this.complianceCheckService = complianceCheckService;
  }

  @PostMapping("/{id}/checks")
  public CheckResponse check(@PathVariable Long id, @Valid @RequestBody VersionBody body) {
    return complianceCheckService.check(id, body);
  }
}
