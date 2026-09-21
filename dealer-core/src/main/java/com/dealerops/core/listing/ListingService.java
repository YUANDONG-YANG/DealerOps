package com.dealerops.core.listing;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.compliance.CheckStatusMapper;
import com.dealerops.core.compliance.ComplianceCheckEntity;
import com.dealerops.core.compliance.ComplianceCheckService;
import com.dealerops.core.compliance.Recommendation;
import com.dealerops.core.dealer.DealerEntity;
import com.dealerops.core.dealer.DealerRepository;
import com.dealerops.core.listing.dto.ListingResponse;
import com.dealerops.core.listing.dto.PatchListingRequest;
import com.dealerops.core.listing.dto.VersionBody;
import com.dealerops.core.vehicle.VehicleEntity;
import com.dealerops.core.vehicle.VehicleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ListingService {

  private final VehicleRepository vehicleRepository;
  private final ListingRepository listingRepository;
  private final DealerRepository dealerRepository;
  private final ComplianceCheckService complianceCheckService;
  private final CheckStatusMapper checkStatusMapper;

  public ListingService(
      VehicleRepository vehicleRepository,
      ListingRepository listingRepository,
      DealerRepository dealerRepository,
      ComplianceCheckService complianceCheckService,
      CheckStatusMapper checkStatusMapper) {
    this.vehicleRepository = vehicleRepository;
    this.listingRepository = listingRepository;
    this.dealerRepository = dealerRepository;
    this.complianceCheckService = complianceCheckService;
    this.checkStatusMapper = checkStatusMapper;
  }

  @Transactional(readOnly = true)
  public ListingResponse getByVehicle(Long vehicleId) {
    Long tenant = requireTenant();
    requireVehicle(vehicleId, tenant);
    return listingRepository
        .findByVehicleIdAndDealerId(vehicleId, tenant)
        .map(this::toResponse)
        .orElseGet(() -> virtualDraft(vehicleId));
  }

  @Transactional
  public ListingResponse patchByVehicle(Long vehicleId, PatchListingRequest body) {
    Long tenant = requireTenant();
    requireVehicle(vehicleId, tenant);
    String title = blankToEmpty(body == null ? null : body.title());
    String text = blankToEmpty(body == null ? null : body.body());
    AdKind kind = body == null || body.adKind() == null ? AdKind.CASH : body.adKind();
    AdMedium medium = body == null || body.medium() == null ? AdMedium.ONLINE : body.medium();
    ListingEntity row = listingRepository.findByVehicleIdAndDealerId(vehicleId, tenant).orElse(null);
    if (row == null) {
      Integer version = body == null ? null : body.version();
      if (version != null && version != 0) {
        throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
      }
      row = new ListingEntity();
      row.setDealerId(tenant);
      row.setVehicleId(vehicleId);
      row.setTitle(title);
      row.setBody(text);
      row.setAdKind(kind);
      row.setMedium(medium);
      row.setStatus(ListingStatus.DRAFT);
      row.setContentVersion(1);
      row.setLastCheckId(null);
      listingRepository.save(row);
    } else {
      if (body == null || body.version() == null || !body.version().equals(row.getVersion())) {
        throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
      }
      row.setTitle(title);
      row.setBody(text);
      row.setAdKind(kind);
      row.setMedium(medium);
      row.setContentVersion(row.getContentVersion() + 1);
      row.setStatus(ListingStatus.DRAFT);
      listingRepository.save(row);
    }
    return getByVehicle(vehicleId);
  }

  @Transactional
  public ListingResponse ready(Long listingId, VersionBody body) {
    ListingEntity listing = assertExportable(listingId, body.version());
    listing.setStatus(ListingStatus.READY);
    listingRepository.save(listing);
    return toResponse(listing);
  }

  @Transactional(readOnly = true)
  public String export(Long listingId, VersionBody body) {
    ListingEntity listing = assertExportable(listingId, body.version());
    Long tenant = listing.getDealerId();
    DealerEntity dealer =
        dealerRepository.findById(tenant).orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    VehicleEntity vehicle =
        vehicleRepository
            .findByIdAndDealerId(listing.getVehicleId(), tenant)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    ComplianceCheckEntity last = complianceCheckService.loadCheck(listing);
    StringBuilder text = new StringBuilder();
    text.append(dealer.getLegalName()).append('\n');
    text.append(dealer.getContactPhone()).append('\n');
    text.append(dealer.getContactEmail()).append('\n');
    text.append(dealer.getContactAddress()).append('\n');
    text.append(vehicle.getModelYear()).append(' ');
    text.append(vehicle.getMake()).append(' ');
    text.append(vehicle.getModel()).append('\n');
    text.append(vehicle.getVin()).append('\n');
    text.append(vehicle.getConditionCode().name()).append('\n');
    text.append(vehicle.getSource().name()).append('\n');
    text.append(listing.getTitle()).append('\n');
    text.append(listing.getBody()).append('\n');
    if (last != null && last.getCreatedAt() != null) {
      text.append(last.getCreatedAt());
    }
    return text.toString();
  }

  private ListingEntity assertExportable(Long listingId, Integer version) {
    Long tenant = requireTenant();
    ListingEntity listing =
        listingRepository
            .findByIdAndDealerId(listingId, tenant)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    if (!version.equals(listing.getVersion())) {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }
    ComplianceCheckEntity last = complianceCheckService.loadCheck(listing);
    if (last == null || last.getRecommendation() != Recommendation.PASSED) {
      throw new ApiException(ErrorCode.NOT_PASSED, "Listing has not passed the current check.");
    }
    if (last.getContentVersion() != listing.getContentVersion()
        || CheckStatusMapper.STALE.equals(checkStatusMapper.derive(listing, last))) {
      throw new ApiException(ErrorCode.CHECK_STALE, "Check is stale.");
    }
    return listing;
  }

  private ListingResponse toResponse(ListingEntity listing) {
    ComplianceCheckEntity last = complianceCheckService.loadCheck(listing);
    return new ListingResponse(
        listing.getId(),
        listing.getVehicleId(),
        listing.getTitle(),
        listing.getBody(),
        listing.getAdKind(),
        listing.getMedium(),
        listing.getStatus(),
        listing.getContentVersion(),
        listing.getLastCheckId(),
        complianceCheckService.toDto(listing, last),
        checkStatusMapper.derive(listing, last),
        listing.getVersion());
  }

  private static ListingResponse virtualDraft(Long vehicleId) {
    return new ListingResponse(
        null,
        vehicleId,
        "",
        "",
        AdKind.CASH,
        AdMedium.ONLINE,
        ListingStatus.DRAFT,
        1,
        null,
        null,
        CheckStatusMapper.NEEDS_AI,
        0);
  }

  private VehicleEntity requireVehicle(Long vehicleId, Long tenant) {
    return vehicleRepository
        .findByIdAndDealerId(vehicleId, tenant)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
  }

  private static String blankToEmpty(String value) {
    return value == null || value.isBlank() ? "" : value;
  }

  private static Long requireTenant() {
    TenantGuard.requireDealerUser();
    return TenantContext.get().tenantDealerId();
  }
}
