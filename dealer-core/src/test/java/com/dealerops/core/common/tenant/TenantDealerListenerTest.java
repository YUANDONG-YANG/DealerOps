package com.dealerops.core.common.tenant;

import static org.assertj.core.api.Assertions.assertThat;

import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.security.CurrentUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class TenantDealerListenerTest {

  private final TenantDealerListener listener = new TenantDealerListener();

  @AfterEach
  void clearTenant() {
    TenantContext.clear();
  }

  @Test
  void dealerUserPersistOverwritesClientDealerId() {
    TenantContext.set(new CurrentUser("oid", "tid", AppRole.DEALER_USER, 42L));
    StubOwned row = new StubOwned();
    row.setDealerId(99L);

    listener.assignDealerId(row);

    assertThat(row.getDealerId()).isEqualTo(42L);
  }

  @Test
  void adminPersistDoesNotTouchDealerId() {
    TenantContext.set(new CurrentUser("oid", "tid", AppRole.PLATFORM_ADMIN, null));
    StubOwned row = new StubOwned();
    row.setDealerId(7L);

    listener.assignDealerId(row);

    assertThat(row.getDealerId()).isEqualTo(7L);
  }

  @Test
  void nullContextLeavesDealerIdUnchanged() {
    StubOwned row = new StubOwned();
    row.setDealerId(3L);

    listener.assignDealerId(row);

    assertThat(row.getDealerId()).isEqualTo(3L);
  }

  private static final class StubOwned implements TenantOwned {
    private Long dealerId;

    @Override
    public Long getDealerId() {
      return dealerId;
    }

    @Override
    public void setDealerId(Long dealerId) {
      this.dealerId = dealerId;
    }
  }
}
