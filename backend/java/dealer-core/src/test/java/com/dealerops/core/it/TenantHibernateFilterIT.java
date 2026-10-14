package com.dealerops.core.it;

import static org.assertj.core.api.Assertions.assertThat;

import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.security.CurrentUser;
import com.dealerops.core.support.CoreItSupport;
import com.dealerops.core.support.TestTokens;
import com.dealerops.core.vehicle.ConditionCode;
import com.dealerops.core.vehicle.VehicleEntity;
import com.dealerops.core.vehicle.VehicleRepository;
import com.dealerops.core.vehicle.VehicleSource;
import com.dealerops.core.vehicle.VehicleStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Hibernate {@code tenantFilter}: dealer-scoped findAll without an explicit dealer predicate;
 * {@code findById} remains unfiltered (second-line finders still required).
 */
class TenantHibernateFilterIT extends CoreItSupport {

  @Autowired private VehicleRepository vehicleRepository;

  @Test
  void enabledFilterScopesFindAllButNotFindById() {
    TenantContext.clear();
    VehicleEntity mine = saveVehicle(dealerAId, "1HGCM82633A004001");
    VehicleEntity other = saveVehicle(dealerBId, "1HGCM82633A004002");

    TenantContext.set(
        new CurrentUser(TestTokens.STAFF_A_USERNAME, AppRole.DEALER_USER, dealerAId));

    List<VehicleEntity> scoped = vehicleRepository.findAll();
    assertThat(scoped).extracting(VehicleEntity::getId).containsExactly(mine.getId());
    assertThat(vehicleRepository.findByIdAndDealerId(other.getId(), dealerAId)).isEmpty();

    // Hibernate @Filter does not apply to Session.get / Spring Data findById.
    assertThat(vehicleRepository.findById(other.getId())).isPresent();

    TenantContext.clear();
    assertThat(vehicleRepository.findAll())
        .extracting(VehicleEntity::getId)
        .contains(mine.getId(), other.getId());
  }

  @Test
  void persistListenerSetsDealerIdFromContext() {
    TenantContext.set(
        new CurrentUser(TestTokens.STAFF_A_USERNAME, AppRole.DEALER_USER, dealerAId));

    VehicleEntity row = newVehicle("1HGCM82633A004099");
    row.setDealerId(dealerBId); // client spoof; listener must overwrite
    VehicleEntity saved = vehicleRepository.saveAndFlush(row);

    assertThat(saved.getDealerId()).isEqualTo(dealerAId);
    assertThat(vehicleRepository.findById(saved.getId()).orElseThrow().getDealerId())
        .isEqualTo(dealerAId);
  }

  private VehicleEntity saveVehicle(Long dealerId, String vin) {
    VehicleEntity row = newVehicle(vin);
    row.setDealerId(dealerId);
    return vehicleRepository.saveAndFlush(row);
  }

  private static VehicleEntity newVehicle(String vin) {
    VehicleEntity row = new VehicleEntity();
    row.setVin(vin);
    row.setMake("Toyota");
    row.setModel("Camry");
    row.setModelYear(2020);
    row.setSource(VehicleSource.AUCTION);
    row.setPurchaseCost(new BigDecimal("10000.00"));
    row.setAddedOn(LocalDate.of(2020, 1, 15));
    row.setConditionCode(ConditionCode.AS_IS);
    row.setStatus(VehicleStatus.IN_STOCK);
    return row;
  }
}
