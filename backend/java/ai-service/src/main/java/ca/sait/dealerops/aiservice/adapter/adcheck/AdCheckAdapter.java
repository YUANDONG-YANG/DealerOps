package ca.sait.dealerops.aiservice.adapter.adcheck;

import ca.sait.dealerops.aiservice.adapter.adcheck.AdCheckDtos.AdCheckInternalRequest;
import ca.sait.dealerops.aiservice.adapter.adcheck.AdCheckDtos.AdCheckOkResponse;
import ca.sait.dealerops.aiservice.adapter.adcheck.AdCheckDtos.AiNote;
import ca.sait.dealerops.aiservice.prompt.SystemPrompts;
import ca.sait.dealerops.aiservice.support.AiManagerFactory;
import ca.sait.dealerops.aiservice.support.ModelFailureException;
import ca.sait.dealerops.aiservice.support.TimedModelCall;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manager.AiManager;
import com.manager.core.AIResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AdCheckAdapter {

  private final AiManagerFactory factory;
  private final ObjectMapper objectMapper;
  private final TimedModelCall timedModelCall;

  public AdCheckAdapter(
      AiManagerFactory factory, ObjectMapper objectMapper, TimedModelCall timedModelCall) {
    this.factory = factory;
    this.objectMapper = objectMapper;
    this.timedModelCall = timedModelCall;
  }

  public AdCheckOkResponse run(AdCheckInternalRequest req) {
    if (!factory.hasApiKey()) {
      throw ModelFailureException.keyMissing();
    }
    String conversationId = UUID.randomUUID().toString();
    AiManager mgr = factory.create();
    try {
      String userJson = toJson(req);
      AIResponse response =
          timedModelCall.request(
              () ->
                  mgr.startConversation(conversationId, SystemPrompts.AD_CHECK)
                      .request(userJson)
                      .send());
      if (response == null || !response.isSuccess()) {
        throw ModelFailureException.providerFailed();
      }
      List<AiNote> notes = notesFrom(response.getContent());
      // PROTOCOL B.2: a blank model reply is not a review; 200 + empty notes would be a fake pass.
      if (notes.isEmpty()) {
        throw ModelFailureException.providerFailed();
      }
      return new AdCheckOkResponse(true, notes);
    } finally {
      try {
        mgr.closeConversation(conversationId);
      } catch (RuntimeException ignored) {
        // conversation cleanup must not hide the original result
      }
    }
  }

  private String toJson(AdCheckInternalRequest req) {
    try {
      return objectMapper.writeValueAsString(req);
    } catch (JsonProcessingException e) {
      throw ModelFailureException.providerFailed();
    }
  }

  static List<AiNote> notesFrom(String content) {
    List<AiNote> notes = new ArrayList<>();
    if (content == null) {
      return notes;
    }
    for (String line : content.split("\\R")) {
      String trimmed = line.trim();
      if (!trimmed.isEmpty()) {
        notes.add(new AiNote(trimmed));
      }
    }
    return notes;
  }
}
