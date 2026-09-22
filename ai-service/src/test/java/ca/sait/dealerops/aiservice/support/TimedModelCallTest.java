package ca.sait.dealerops.aiservice.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

/** PROTOCOL §D: hard cap is 2s connect + 13s response, not a lone 15000. */
class TimedModelCallTest {

  @Test
  void totalIsConnectPlusResponse() {
    assertThat(new AiTimeouts(2000, 13000).totalMs()).isEqualTo(15000);
  }

  @Test
  void timeoutUsesSplitNotSingle15000() {
    assertThatThrownBy(
            () ->
                TimedModelCall.request(
                    50,
                    50,
                    () -> {
                      try {
                        Thread.sleep(300);
                      } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                      }
                      return null;
                    }))
        .isInstanceOf(ModelFailureException.class)
        .extracting(ex -> ((ModelFailureException) ex).code())
        .isEqualTo(ModelFailureException.TIMEOUT);
  }
}
