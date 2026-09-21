package com.dealerops.core.compliance;

import com.dealerops.core.common.exception.ApiException;
import com.dealerops.core.common.exception.ErrorCode;
import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.compliance.dto.AiNote;
import com.dealerops.core.compliance.dto.CheckResponse;
import com.dealerops.core.compliance.dto.RuleFinding;
import com.dealerops.core.dealer.DealerEntity;
import com.dealerops.core.dealer.DealerRepository;
import com.dealerops.core.integration.AiCallFailed;
import com.dealerops.core.integration.AiGatewayClient;
import com.dealerops.core.integration.dto.AdCheckInternalRequest;
import com.dealerops.core.integration.dto.DealerPublic;
import com.dealerops.core.integration.dto.ListingPublic;
import com.dealerops.core.integration.dto.VehiclePublic;
import com.dealerops.core.listing.ListingEntity;
import com.dealerops.core.listing.ListingRepository;
import com.dealerops.core.listing.dto.VersionBody;
import com.dealerops.core.vehicle.VehicleEntity;
import com.dealerops.core.vehicle.VehicleRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class ComplianceCheckService {

  private static final TypeReference<List<RuleFinding>> FINDINGS = new TypeReference<>() {};
  private static final TypeReference<List<AiNote>> NOTES = new TypeReference<>() {};

  private final ListingRepository listingRepository;
  private final VehicleRepository vehicleRepository;
  private final DealerRepository dealerRepository;
  private final ComplianceCheckRepository checkRepository;
  private final OmvicRuleEngine omvicRuleEngine;
  private final CheckStatusMapper checkStatusMapper;
  private final AiGatewayClient aiGatewayClient;
  private final TransactionTemplate transactionTemplate;
  private final ObjectMapper objectMapper;

  public ComplianceCheckService(
      ListingRepository listingRepository,
      VehicleRepository vehicleRepository,
      DealerRepository dealerRepository,
      ComplianceCheckRepository checkRepository,
      OmvicRuleEngine omvicRuleEngine,
      CheckStatusMapper checkStatusMapper,
      AiGatewayClient aiGatewayClient,
      TransactionTemplate transactionTemplate,
      ObjectMapper objectMapper) {
    this.listingRepository = listingRepository;
    this.vehicleRepository = vehicleRepository;
    this.dealerRepository = dealerRepository;
    this.checkRepository = checkRepository;
    this.omvicRuleEngine = omvicRuleEngine;
    this.checkStatusMapper = checkStatusMapper;
    this.aiGatewayClient = aiGatewayClient;
    this.transactionTemplate = transactionTemplate;
    this.objectMapper = objectMapper;
  }

  public CheckResponse check(Long listingId, VersionBody body) {
    Long tenant = requireTenant();
    ListingEntity listing =
        listingRepository
            .findByIdAndDealerId(listingId, tenant)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    if (!body.version().equals(listing.getVersion())) {
      throw new ApiException(ErrorCode.VERSION_CONFLICT, "Version conflict.");
    }
    VehicleEntity vehicle =
        vehicleRepository
            .findByIdAndDealerId(listing.getVehicleId(), tenant)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    DealerEntity dealer =
        dealerRepository
            .findById(tenant)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
    OmvicResult omvic = omvicRuleEngine.run(listing, vehicle, dealer);
    if (omvic.hardBlocked()) {
      ComplianceCheckEntity saved =
          persistCheck(listing, omvic.findings(), AiStatus.SKIPPED, null, Recommendation.BLOCKED);
      return toDto(listing, saved);
    }
    try {
      List<AiNote> notes =
          aiGatewayClient.adCheck(
              new AdCheckInternalRequest(
                  new ListingPublic(
                      listing.getTitle(),
                      listing.getBody(),
                      listing.getAdKind().name(),
                      listing.getMedium().name()),
                  new VehiclePublic(
                      vehicle.getModelYear(),
                      vehicle.getMake(),
                      vehicle.getModel(),
                      vehicle.getVin(),
                      vehicle.getConditionCode().name(),
                      vehicle.getSource().name()),
                  new DealerPublic(
                      dealer.getLegalName(),
                      dealer.getContactPhone(),
                      dealer.getContactEmail(),
                      dealer.getContactAddress())));
      ComplianceCheckEntity saved =
          persistCheck(listing, omvic.findings(), AiStatus.SUCCESS, notes, Recommendation.PASSED);
      return toDto(listing, saved);
    } catch (AiCallFailed ex) {
      persistCheck(listing, omvic.findings(), AiStatus.UNAVAILABLE, null, Recommendation.UNAVAILABLE);
      throw new ApiException(ErrorCode.AI_UNAVAILABLE, "Ad check AI is unavailable.");
    }
  }

  public CheckResponse toDto(ListingEntity listing, ComplianceCheckEntity check) {
    if (check == null) {
      return null;
    }
    return new CheckResponse(
        check.getId(),
        check.getListingId(),
        check.getContentVersion(),
        readFindings(check.getRuleFindingsJson()),
        check.getAiStatus(),
        readNotes(check.getAiNotes()),
        check.getRecommendation(),
        checkStatusMapper.derive(listing, check),
        check.getCreatedAt());
  }

  public ComplianceCheckEntity loadCheck(ListingEntity listing) {
    if (listing == null || listing.getLastCheckId() == null) {
      return null;
    }
    return checkRepository
        .findByIdAndDealerId(listing.getLastCheckId(), listing.getDealerId())
        .filter(
            check ->
                listing.getId().equals(check.getListingId())
                    && listing.getDealerId().equals(check.getDealerId()))
        .orElse(null);
  }

  private ComplianceCheckEntity persistCheck(
      ListingEntity listing,
      List<RuleFinding> findings,
      AiStatus aiStatus,
      List<AiNote> notes,
      Recommendation recommendation) {
    return transactionTemplate.execute(
        status -> {
          ListingEntity current =
              listingRepository
                  .findByIdAndDealerId(listing.getId(), listing.getDealerId())
                  .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Not found"));
          ComplianceCheckEntity check = new ComplianceCheckEntity();
          check.setDealerId(current.getDealerId());
          check.setListingId(current.getId());
          check.setContentVersion(current.getContentVersion());
          check.setRuleFindingsJson(writeJson(findings));
          check.setAiStatus(aiStatus);
          check.setAiNotes(notes == null ? null : writeJson(notes));
          check.setRecommendation(recommendation);
          check = checkRepository.saveAndFlush(check);
          current.setLastCheckId(check.getId());
          listingRepository.save(current);
          listing.setLastCheckId(check.getId());
          return check;
        });
  }

  private List<RuleFinding> readFindings(String json) {
    if (json == null || json.isBlank()) {
      return List.of();
    }
    try {
      return objectMapper.readValue(json, FINDINGS);
    } catch (Exception ex) {
      return List.of();
    }
  }

  private List<AiNote> readNotes(String json) {
    if (json == null || json.isBlank()) {
      return null;
    }
    try {
      return objectMapper.readValue(json, NOTES);
    } catch (Exception ex) {
      return null;
    }
  }

  private String writeJson(Object value) {
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception ex) {
      return "[]";
    }
  }

  private static Long requireTenant() {
    TenantGuard.requireDealerUser();
    return TenantContext.get().tenantDealerId();
  }
}
