package com.dealerops.core.lead;

import com.dealerops.core.audit.AuditAction;
import com.dealerops.core.audit.AuditService;
import com.dealerops.core.audit.EntityType;
import com.dealerops.core.common.PageResponse;
import com.dealerops.core.common.Paging;
import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.customer.CustomerEntity;
import com.dealerops.core.customer.CustomerRepository;
import com.dealerops.core.customer.CustomerService;
import com.dealerops.core.dealer.MembershipRepository;
import com.dealerops.core.lead.dto.AddLeadNoteRequest;
import com.dealerops.core.lead.dto.CreateLeadRequest;
import com.dealerops.core.lead.dto.LeadDetail;
import com.dealerops.core.lead.dto.LeadListItem;
import com.dealerops.core.lead.dto.LeadNoteItem;
import com.dealerops.core.lead.dto.LeadVehicleBrief;
import com.dealerops.core.lead.dto.PatchLeadRequest;
import com.dealerops.core.security.CurrentUser;
import com.dealerops.core.vehicle.VehicleRepository;
import com.dealerops.core.vehicle.VehicleStatus;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Lead follow-up for one dealership (design/21-Feature-Extensions.md §3). */
@Service
public class LeadService {

  private final LeadRepository leadRepository;
  private final LeadNoteRepository noteRepository;
  private final CustomerRepository customerRepository;
  private final CustomerService customerService;
  private final VehicleRepository vehicleRepository;
  private final MembershipRepository membershipRepository;
  private final AuditService auditService;

  public LeadService(
      LeadRepository leadRepository,
      LeadNoteRepository noteRepository,
      CustomerRepository customerRepository,
      CustomerService customerService,
      VehicleRepository vehicleRepository,
      MembershipRepository membershipRepository,
      AuditService auditService) {
    this.leadRepository = leadRepository;
    this.noteRepository = noteRepository;
    this.customerRepository = customerRepository;
    this.customerService = customerService;
    this.vehicleRepository = vehicleRepository;
    this.membershipRepository = membershipRepository;
    this.auditService = auditService;
  }

  @Transactional(readOnly = true)
  public PageResponse<LeadListItem> list(
      String q, LeadStage stage, String owner, Long customerId, Boolean overdue, int page, int size) {
    Long tenant = requireTenant();
    Page<LeadEntity> result =
        leadRepository.search(
            tenant,
            trimToNull(q),
            stage,
            trimToNull(owner),
            customerId,
            overdue,
            LocalDate.now(),
            Paging.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id")));
    List<LeadListItem> items =
        result.getContent().stream()
            .map(
                lead ->
                    new LeadListItem(
                        lead.getId(),
                        lead.getCustomerId(),
                        customerName(lead),
                        vehicleBrief(lead),
                        lead.getStage(),
                        lead.getOwnerUsername(),
                        lead.getNextFollowUpOn(),
                        isOverdue(lead),
                        lead.getVersion()))
            .toList();
    return new PageResponse<>(items, result.getNumber(), result.getSize(), result.getTotalElements());
  }

  @Transactional
  public LeadDetail create(CreateLeadRequest body) {
    Long tenant = requireTenant();
    if ((body.customerId() == null) == (body.newCustomer() == null)) {
      throw new ApiException(ErrorCode.VALIDATION, "Choose an existing customer or enter a new one.");
    }
    Long customerId =
        body.customerId() != null
            ? loadCustomer(body.customerId(), tenant).getId()
            : customerService.create(body.newCustomer()).id();
    String owner = trimToNull(body.ownerUsername());
    requireMember(tenant, owner);
    requireInStockVehicle(tenant, body.vehicleId());
    LeadEntity lead = new LeadEntity();
    lead.setDealerId(tenant);
    lead.setCustomerId(customerId);
    lead.setVehicleId(body.vehicleId());
    lead.setOwnerUsername(owner);
    lead.setStage(LeadStage.NEW);
    lead.setNextFollowUpOn(body.nextFollowUpOn());
    lead = leadRepository.save(lead);
    Map<String, Object> fields = new LinkedHashMap<>();
    fields.put("customerId", customerId);
    fields.put("stage", LeadStage.NEW.name());
    if (body.vehicleId() != null) {
      fields.put("vehicleId", body.vehicleId());
    }
    audit(lead.getId(), AuditAction.CREATE, tenant, fields);
    String note = trimToNull(body.note());
    if (note != null) {
      saveNote(lead, note);
    }
    return toDetail(lead);
  }

  @Transactional(readOnly = true)
  public LeadDetail get(Long id) {
    Long tenant = requireTenant();
    return toDetail(load(id, tenant));
  }

  @Transactional
  public LeadDetail patch(Long id, PatchLeadRequest body) {
    Long tenant = requireTenant();
    LeadEntity lead = load(id, tenant);
    if (!body.version().equals(lead.getVersion())) {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }
    if (lead.getStage().isClosed()) {
      throw new ApiException(ErrorCode.LEAD_CLOSED, "Won and lost leads cannot be changed.");
    }
    String owner = trimToNull(body.ownerUsername());
    String lostReason = trimToNull(body.lostReason());
    if (body.stage() == LeadStage.LOST && lostReason == null) {
      throw new ApiException(ErrorCode.VALIDATION, "A lost lead needs a reason.");
    }
    if (body.stage() != LeadStage.LOST) {
      lostReason = null;
    }
    Map<String, Object> changed = new LinkedHashMap<>();
    if (lead.getStage() != body.stage()) {
      changed.put("stage", body.stage().name());
    }
    if (!Objects.equals(lead.getOwnerUsername(), owner)) {
      requireMember(tenant, owner);
      changed.put("ownerUsername", owner == null ? "" : owner);
    }
    if (!Objects.equals(lead.getNextFollowUpOn(), body.nextFollowUpOn())) {
      changed.put("nextFollowUpOn", true);
    }
    if (!Objects.equals(lead.getVehicleId(), body.vehicleId())) {
      requireInStockVehicle(tenant, body.vehicleId());
      changed.put("vehicleId", body.vehicleId() == null ? "" : body.vehicleId());
    }
    if (!Objects.equals(lead.getLostReason(), lostReason)) {
      changed.put("lostReason", true);
    }
    lead.setStage(body.stage());
    lead.setOwnerUsername(owner);
    lead.setNextFollowUpOn(body.nextFollowUpOn());
    lead.setVehicleId(body.vehicleId());
    lead.setLostReason(lostReason);
    lead = leadRepository.saveAndFlush(lead);
    if (!changed.isEmpty()) {
      audit(lead.getId(), AuditAction.UPDATE, tenant, changed);
    }
    return toDetail(lead);
  }

  /** Closed leads still accept notes, so the outcome can be explained later. */
  @Transactional
  public LeadNoteItem addNote(Long id, AddLeadNoteRequest body) {
    Long tenant = requireTenant();
    return toNote(saveNote(load(id, tenant), body.body().trim()));
  }

  private LeadNoteEntity saveNote(LeadEntity lead, String text) {
    LeadNoteEntity note = new LeadNoteEntity();
    note.setDealerId(lead.getDealerId());
    note.setLeadId(lead.getId());
    note.setAuthorUsername(actorUsername());
    note.setBody(text);
    note = noteRepository.save(note);
    // Note text is free text that may hold personal details, so the audit keeps only the note id.
    audit(lead.getId(), AuditAction.NOTE, lead.getDealerId(), Map.of("noteId", note.getId()));
    return note;
  }

  private LeadDetail toDetail(LeadEntity lead) {
    List<LeadNoteItem> notes =
        noteRepository.findByLeadIdAndDealerIdOrderByCreatedAtDescIdDesc(lead.getId(), lead.getDealerId()).stream()
            .map(LeadService::toNote)
            .toList();
    return new LeadDetail(
        lead.getId(),
        lead.getCustomerId(),
        customerName(lead),
        vehicleBrief(lead),
        lead.getStage(),
        lead.getOwnerUsername(),
        lead.getNextFollowUpOn(),
        isOverdue(lead),
        lead.getLostReason(),
        notes,
        lead.getCreatedAt(),
        lead.getVersion());
  }

  private static LeadNoteItem toNote(LeadNoteEntity note) {
    return new LeadNoteItem(note.getId(), note.getAuthorUsername(), note.getBody(), note.getCreatedAt());
  }

  private String customerName(LeadEntity lead) {
    return customerRepository
        .findByIdAndDealerId(lead.getCustomerId(), lead.getDealerId())
        .map(CustomerEntity::getName)
        .orElse("");
  }

  private LeadVehicleBrief vehicleBrief(LeadEntity lead) {
    if (lead.getVehicleId() == null) {
      return null;
    }
    return vehicleRepository
        .findByIdAndDealerId(lead.getVehicleId(), lead.getDealerId())
        .map(v -> new LeadVehicleBrief(v.getId(), v.getVin(), v.getModelYear(), v.getMake(), v.getModel(), v.getStatus()))
        .orElse(null);
  }

  private static boolean isOverdue(LeadEntity lead) {
    return !lead.getStage().isClosed()
        && lead.getNextFollowUpOn() != null
        && lead.getNextFollowUpOn().isBefore(LocalDate.now());
  }

  private void requireMember(Long tenant, String username) {
    if (username != null && !membershipRepository.existsByDealerIdAndUsernameAndActiveTrue(tenant, username)) {
      throw new ApiException(ErrorCode.VALIDATION, "Owner must be a member of this dealership.");
    }
  }

  private void requireInStockVehicle(Long tenant, Long vehicleId) {
    if (vehicleId == null) {
      return;
    }
    boolean ok =
        vehicleRepository
            .findByIdAndDealerId(vehicleId, tenant)
            .filter(v -> v.getStatus() == VehicleStatus.IN_STOCK)
            .isPresent();
    if (!ok) {
      throw new ApiException(ErrorCode.WRONG_DEALER_OR_SOLD, "Vehicle must be in stock at this dealership.");
    }
  }

  private CustomerEntity loadCustomer(Long id, Long tenant) {
    return customerRepository
        .findByIdAndDealerId(id, tenant)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
  }

  private LeadEntity load(Long id, Long tenant) {
    return leadRepository
        .findByIdAndDealerId(id, tenant)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
  }

  private void audit(Long leadId, AuditAction action, Long tenant, Map<String, Object> fields) {
    auditService.record(EntityType.LEAD.name(), leadId, action.name(), tenant, actorUsername(), fields);
  }

  private static String trimToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }

  private static Long requireTenant() {
    TenantGuard.requireDealerUser();
    return TenantContext.get().tenantDealerId();
  }

  private static String actorUsername() {
    CurrentUser user = TenantContext.get();
    return user == null ? "" : user.username();
  }
}
