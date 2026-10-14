package com.dealerops.core.support;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.dealerops.core.integration.AiGatewayClient;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.mock.mockito.MockBean;

/** FX-10 pass path: stub PROTOCOL success notes[]; do not hit a paid model. */
public abstract class PassingAiItSupport extends CoreItSupport {

  @MockBean protected AiGatewayClient aiGatewayClient;

  @BeforeEach
  void stubPassingAdCheck() {
    when(aiGatewayClient.adCheck(any())).thenReturn(List.of());
  }
}
