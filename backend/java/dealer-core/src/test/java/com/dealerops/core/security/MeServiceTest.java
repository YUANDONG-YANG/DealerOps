package com.dealerops.core.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.dealer.AppUserEntity;
import com.dealerops.core.dealer.AppUserRepository;
import com.dealerops.core.dealer.DealerEntity;
import com.dealerops.core.dealer.DealerRepository;
import com.dealerops.core.security.dto.MeResponse;
import com.dealerops.core.support.AdFixtures;
import com.dealerops.core.support.TestTokens;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class MeServiceTest {

  @Mock private AppUserRepository appUserRepository;
  @Mock private DealerRepository dealerRepository;
  @InjectMocks private MeService meService;

  @Test
  void adminHasNullDealer() {
    AppUserEntity user = new AppUserEntity();
    user.setDisplayName("Platform Admin");
    when(appUserRepository.findByUsername(TestTokens.ADMIN_USERNAME))
        .thenReturn(Optional.of(user));

    MeResponse me =
        meService.me(new CurrentUser(TestTokens.ADMIN_USERNAME, AppRole.PLATFORM_ADMIN, null));
    assertThat(me.role()).isEqualTo("Platform.Admin");
    assertThat(me.dealerId()).isNull();
    assertThat(me.dealerLegalName()).isNull();
  }

  @Test
  void staffWithDealershipUsesMembershipDealer() {
    AppUserEntity user = new AppUserEntity();
    user.setDisplayName("Staff A");
    user.setDealerId(9L);
    when(appUserRepository.findByUsername(TestTokens.STAFF_A_USERNAME))
        .thenReturn(Optional.of(user));
    DealerEntity dealer = new DealerEntity();
    dealer.setLegalName(AdFixtures.PRAIRIE_NAME);
    when(dealerRepository.findById(1L)).thenReturn(Optional.of(dealer));

    MeResponse me =
        meService.me(new CurrentUser(TestTokens.STAFF_A_USERNAME, AppRole.DEALER_USER, 1L));
    assertThat(me.role()).isEqualTo("Dealer.User");
    assertThat(me.dealerId()).isEqualTo(1L);
    assertThat(me.dealerLegalName()).isEqualTo(AdFixtures.PRAIRIE_NAME);
  }

  @Test
  void unboundStaffHasNullDealer() {
    AppUserEntity user = new AppUserEntity();
    user.setDisplayName("Unbound");
    when(appUserRepository.findByUsername(TestTokens.UNBOUND_USERNAME))
        .thenReturn(Optional.of(user));

    MeResponse me =
        meService.me(new CurrentUser(TestTokens.UNBOUND_USERNAME, AppRole.DEALER_USER, null));
    assertThat(me.role()).isEqualTo("Dealer.User");
    assertThat(me.dealerId()).isNull();
    assertThat(me.dealerLegalName()).isNull();
  }
}
