package com.dealerops.core.assistant;

import com.dealerops.core.assistant.dto.AskRequest;
import com.dealerops.core.assistant.dto.AskResponse;
import com.dealerops.core.assistant.dto.ResourceCard;
import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.integration.AiCallFailed;
import com.dealerops.core.integration.AiGatewayClient;
import com.dealerops.core.integration.dto.AssistantInternalRequest;
import com.dealerops.core.integration.dto.ResourceRef;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class AssistantService {

  private final AssistantResourceQuery assistantResourceQuery;
  private final AiGatewayClient aiGatewayClient;

  public AssistantService(
      AssistantResourceQuery assistantResourceQuery, AiGatewayClient aiGatewayClient) {
    this.assistantResourceQuery = assistantResourceQuery;
    this.aiGatewayClient = aiGatewayClient;
  }

  public AskResponse ask(AskRequest body) {
    TenantGuard.requireDealerUser();
    Long tenant = TenantContext.get().tenantDealerId();
    List<ResourceCard> cards = assistantResourceQuery.load(tenant, body.text());
    try {
      String summary =
          aiGatewayClient.assistant(
              new AssistantInternalRequest(
                  body.text(),
                  cards.stream()
                      .map(card -> new ResourceRef(card.kind(), card.id(), card.label(), card.status()))
                      .toList()));
      List<ResourceCard> verified =
          cards.stream().filter(card -> summaryReferences(summary, card, cards)).toList();
      return new AskResponse(summary, true, verified);
    } catch (AiCallFailed ex) {
      return new AskResponse(null, false, cards);
    }
  }

  private static boolean summaryReferences(
      String summary, ResourceCard card, List<ResourceCard> cards) {
    if (summary == null || card.id() == null || card.kind() == null) {
      return false;
    }
    if (!containsWholeNumber(summary, card.id().toString())) {
      return false;
    }
    boolean idShared =
        cards.stream().anyMatch(other -> other != card && card.id().equals(other.id()));
    return !idShared || containsWholeWord(summary, card.kind());
  }

  private static boolean containsWholeNumber(String text, String token) {
    int from = 0;
    while (from <= text.length() - token.length()) {
      int at = text.indexOf(token, from);
      if (at < 0) {
        return false;
      }
      int end = at + token.length();
      boolean leftBounded = at == 0 || !Character.isDigit(text.charAt(at - 1));
      boolean rightBounded = end == text.length() || !Character.isDigit(text.charAt(end));
      if (leftBounded && rightBounded) {
        return true;
      }
      from = at + 1;
    }
    return false;
  }

  private static boolean containsWholeWord(String text, String word) {
    String haystack = text.toLowerCase(Locale.ROOT);
    String needle = word.toLowerCase(Locale.ROOT);
    int from = 0;
    while (from <= haystack.length() - needle.length()) {
      int at = haystack.indexOf(needle, from);
      if (at < 0) {
        return false;
      }
      int end = at + needle.length();
      boolean leftBounded = at == 0 || !Character.isLetter(haystack.charAt(at - 1));
      boolean rightBounded = end == haystack.length() || !Character.isLetter(haystack.charAt(end));
      if (leftBounded && rightBounded) {
        return true;
      }
      from = at + 1;
    }
    return false;
  }
}
