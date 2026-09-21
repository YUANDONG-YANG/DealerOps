package com.dealerops.core.audit;

import com.dealerops.core.audit.dto.AuditItem;
import com.dealerops.core.common.PageResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {

  private final AuditService auditService;

  public AuditController(AuditService auditService) {
    this.auditService = auditService;
  }

  @GetMapping
  public PageResponse<AuditItem> list(
      @RequestParam String entityType,
      @RequestParam Long entityId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size) {
    return auditService.list(entityType, entityId, page, size);
  }
}
