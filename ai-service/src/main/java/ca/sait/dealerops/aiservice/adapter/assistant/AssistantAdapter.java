package ca.sait.dealerops.aiservice.adapter.assistant;

import ca.sait.dealerops.aiservice.adapter.assistant.AssistantDtos.AssistantInternalRequest;
import ca.sait.dealerops.aiservice.adapter.assistant.AssistantDtos.AssistantOkResponse;
import ca.sait.dealerops.aiservice.prompt.SystemPrompts;
import ca.sait.dealerops.aiservice.support.AiManagerFactory;
import ca.sait.dealerops.aiservice.support.ModelFailureException;
import ca.sait.dealerops.aiservice.support.TimedModelCall;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manager.AiManager;
import com.manager.core.AIResponse;
import com.manager.session.Conversation;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AssistantAdapter {

  private final AiManagerFactory factory;
  private final ObjectMapper objectMapper;
  private final TimedModelCall timedModelCall;

  public AssistantAdapter(
      AiManagerFactory factory, ObjectMapper objectMapper, TimedModelCall timedModelCall) {
    this.factory = factory;
    this.objectMapper = objectMapper;
    this.timedModelCall = timedModelCall;
  }

  public AssistantOkResponse run(AssistantInternalRequest req) {
    if (!factory.hasApiKey()) {
      throw ModelFailureException.keyMissing();
    }
    String conversationId = UUID.randomUUID().toString();
    AiManager mgr = factory.create();
    try {
      Conversation conversation = mgr.startConversation(conversationId, SystemPrompts.ASSISTANT);
      String userJson = toJson(req);
      AIResponse response = timedModelCall.request(() -> conversation.request(userJson).send());
      if (response == null || !response.isSuccess() || !StringUtils.hasText(response.getContent())) {
        throw ModelFailureException.providerFailed();
      }
      return new AssistantOkResponse(true, response.getContent().trim());
    } finally {
      try {
        mgr.closeConversation(conversationId);
      } catch (RuntimeException ignored) {
        // conversation cleanup must not hide the original result
      }
    }
  }

  private String toJson(AssistantInternalRequest req) {
    try {
      return objectMapper.writeValueAsString(req);
    } catch (JsonProcessingException e) {
      throw ModelFailureException.providerFailed();
    }
  }
}
