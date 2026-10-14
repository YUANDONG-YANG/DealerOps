package com.dealerops.core.compliance;

import static org.assertj.core.api.Assertions.assertThat;

import com.dealerops.core.compliance.dto.RuleFinding;
import com.dealerops.core.dealer.DealerEntity;
import com.dealerops.core.listing.AdKind;
import com.dealerops.core.listing.AdMedium;
import com.dealerops.core.listing.ListingEntity;
import com.dealerops.core.listing.ListingStatus;
import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.vehicle.ConditionCode;
import com.dealerops.core.vehicle.VehicleEntity;
import com.dealerops.core.vehicle.VehicleSource;
import com.dealerops.core.vehicle.VehicleStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * PROTOCOL §C / 17 FX-01 FX-03 FX-10 / classroom CL-4 unit side.
 * Empty draft hard-adds PRICE_MISSING, DEALER_NAME_MISSING, CONDITION_UNDISCLOSED.
 * Missing price and FINANCE missing APR are hard blocks (do not call AI).
 */
class OmvicRuleEngineTest {

  private final OmvicRuleEngine engine = new OmvicRuleEngine();

  @Test
  void emptyDraftHardBlocksPriceNameAndCondition() {
    OmvicResult result = engine.run(listing("", "", AdKind.CASH), vAsis(), prairie());
    assertThat(result.hardBlocked()).isTrue();
    assertThat(ruleIds(result)).contains("PRICE_MISSING", "DEALER_NAME_MISSING", "CONDITION_UNDISCLOSED");
  }

  @Test
  void fx01MissingPriceIsHardBlock() {
    OmvicResult result = engine.run(listing(AdFixtures.FX01_TITLE, AdFixtures.FX01_BODY, AdKind.CASH), vAsis(), prairie());
    assertThat(result.hardBlocked()).isTrue();
    assertThat(ruleIds(result)).contains("PRICE_MISSING");
  }

  @Test
  void fx03FinanceMissingAprIsHardBlock() {
    OmvicResult result =
        engine.run(listing(AdFixtures.FX03_TITLE, AdFixtures.FX03_BODY, AdKind.FINANCE), vAsis(), prairie());
    assertThat(result.hardBlocked()).isTrue();
    assertThat(ruleIds(result)).contains("FINANCE_APR_MISSING");
  }

  @Test
  void fx10CleanCashAllowsAi() {
    OmvicResult result = engine.run(listing(AdFixtures.FX10_TITLE, AdFixtures.FX10_BODY, AdKind.CASH), vAsis(), prairie());
    assertThat(result.hardBlocked()).isFalse();
    assertThat(ruleIds(result)).doesNotContain("PRICE_MISSING", "FINANCE_APR_MISSING", "DEALER_NAME_MISSING");
  }

  @Test
  void cashAdShowingPaymentGetsFinanceRules() {
    String body = AdFixtures.FX10_BODY + " Or $299 per month.";
    OmvicResult result = engine.run(listing(AdFixtures.FX10_TITLE, body, AdKind.CASH), vAsis(), prairie());
    assertThat(result.hardBlocked()).isTrue();
    assertThat(ruleIds(result)).contains("FINANCE_APR_MISSING");
  }

  @Test
  void limousineCueWithoutDisclosureIsSoftPriorUse() {
    String body = AdFixtures.FX10_BODY + " Clean limousine history available on request.";
    OmvicResult result = engine.run(listing(AdFixtures.FX10_TITLE, body, AdKind.CASH), vAsis(), prairie());
    assertThat(result.hardBlocked()).isFalse();
    assertThat(ruleIds(result)).contains("PRIOR_USE_UNCLEAR");
  }

  @Test
  void limoCueWithDisclosureDoesNotAddPriorUse() {
    String body = AdFixtures.FX10_BODY + " Previously used as a limo.";
    OmvicResult result = engine.run(listing(AdFixtures.FX10_TITLE, body, AdKind.CASH), vAsis(), prairie());
    assertThat(ruleIds(result)).doesNotContain("PRIOR_USE_UNCLEAR");
  }

  private static List<String> ruleIds(OmvicResult result) {
    return result.findings().stream().map(RuleFinding::ruleId).toList();
  }

  private static ListingEntity listing(String title, String body, AdKind kind) {
    ListingEntity listing = new ListingEntity();
    listing.setTitle(title);
    listing.setBody(body);
    listing.setAdKind(kind);
    listing.setMedium(AdMedium.ONLINE);
    listing.setStatus(ListingStatus.DRAFT);
    return listing;
  }

  private static VehicleEntity vAsis() {
    VehicleEntity vehicle = new VehicleEntity();
    vehicle.setVin(AdFixtures.V_ASIS_VIN);
    vehicle.setMake("Toyota");
    vehicle.setModel("Camry");
    vehicle.setModelYear(2020);
    vehicle.setSource(VehicleSource.AUCTION);
    vehicle.setPurchaseCost(new BigDecimal("99999.00"));
    vehicle.setAddedOn(LocalDate.of(2020, 3, 1));
    vehicle.setConditionCode(ConditionCode.AS_IS);
    vehicle.setStatus(VehicleStatus.IN_STOCK);
    return vehicle;
  }

  private static DealerEntity prairie() {
    DealerEntity dealer = new DealerEntity();
    dealer.setLegalName(AdFixtures.PRAIRIE_NAME);
    dealer.setContactPhone(AdFixtures.PRAIRIE_PHONE);
    dealer.setContactEmail(AdFixtures.PRAIRIE_EMAIL);
    dealer.setContactAddress(AdFixtures.PRAIRIE_ADDRESS);
    return dealer;
  }
}
