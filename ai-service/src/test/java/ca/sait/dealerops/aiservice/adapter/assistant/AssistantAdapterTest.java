package ca.sait.dealerops.aiservice.adapter.assistant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import ca.sait.dealerops.aiservice.adapter.assistant.AssistantDtos.AssistantInternalRequest;
import ca.sait.dealerops.aiservice.support.AiManagerFactory;
import ca.sait.dealerops.aiservice.support.ModelFailureException;
import ca.sait.dealerops.aiservice.support.TimedModelCall;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class AssistantAdapterTest {

  @Test
  void missingKeyFailsImmediately() {
    AiManagerFactory factory = mock(AiManagerFactory.class);
    when(factory.hasApiKey()).thenReturn(false);
    AssistantAdapter adapter = new AssistantAdapter(factory, new ObjectMapper(), mock(TimedModelCall.class));

    assertThatThrownBy(() -> adapter.run(new AssistantInternalRequest("list cars", List.of())))
        .isInstanceOf(ModelFailureException.class)
        .satisfies(
            ex -> {
              ModelFailureException failure = (ModelFailureException) ex;
              assertThat(failure.code()).isEqualTo("AI_KEY_MISSING");
              assertThat(failure.status().value()).isEqualTo(503);
            });
  }
}
