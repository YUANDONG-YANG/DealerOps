package com.dealerops.core.lead;

import com.dealerops.core.common.PageResponse;
import com.dealerops.core.lead.dto.AddLeadNoteRequest;
import com.dealerops.core.lead.dto.CreateLeadRequest;
import com.dealerops.core.lead.dto.LeadDetail;
import com.dealerops.core.lead.dto.LeadListItem;
import com.dealerops.core.lead.dto.LeadNoteItem;
import com.dealerops.core.lead.dto.PatchLeadRequest;
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

/** Lead follow-up (design/21-Feature-Extensions.md §3). */
@RestController
@RequestMapping("/api/v1/leads")
public class LeadController {

  private final LeadService leadService;

  public LeadController(LeadService leadService) {
    this.leadService = leadService;
  }

  @GetMapping
  public PageResponse<LeadListItem> list(
      @RequestParam(required = false) String q,
      @RequestParam(required = false) LeadStage stage,
      @RequestParam(required = false) String owner,
      @RequestParam(required = false) Long customerId,
      @RequestParam(required = false) Boolean overdue,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size) {
    return leadService.list(q, stage, owner, customerId, overdue, page, size);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public LeadDetail create(@Valid @RequestBody CreateLeadRequest body) {
    return leadService.create(body);
  }

  @GetMapping("/{id}")
  public LeadDetail get(@PathVariable Long id) {
    return leadService.get(id);
  }

  @PatchMapping("/{id}")
  public LeadDetail patch(@PathVariable Long id, @Valid @RequestBody PatchLeadRequest body) {
    return leadService.patch(id, body);
  }

  @PostMapping("/{id}/notes")
  @ResponseStatus(HttpStatus.CREATED)
  public LeadNoteItem addNote(@PathVariable Long id, @Valid @RequestBody AddLeadNoteRequest body) {
    return leadService.addNote(id, body);
  }
}
