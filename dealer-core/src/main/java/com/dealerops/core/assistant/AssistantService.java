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
import com.dealerops.core.security.CurrentUser;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class AssistantService {

  private final ConcurrentHashMap<String, Deque<String>> recent = new ConcurrentHashMap<>();
  private final AssistantResourceQuery assistantResourceQuery;
  private final AiGatewayClient aiGatewayClient;

  public AssistantService(
      AssistantResourceQuery assistantResourceQuery, AiGatewayClient aiGatewayClient) {
    this.assistantResourceQuery = assistantResourceQuery;
    this.aiGatewayClient = aiGatewayClient;
  }

  public AskResponse ask(AskRequest body) {
    TenantGuard.requireDealerUser();
    CurrentUser user = TenantContext.get();
    Long tenant = user.tenantDealerId();
    List<ResourceCard> cards = assistantResourceQuery.load(tenant, body.text());
    remember(user.oid(), body.text());
    try {
      String summary =
          aiGatewayClient.assistant(
              new AssistantInternalRequest(
                  body.text(),
                  cards.stream()
                      .map(card -> new ResourceRef(card.kind(), card.id(), card.label(), card.status()))
                      .toList()));
      Set<String> allowed =
          cards.stream().map(card -> card.kind() + ":" + card.id()).collect(Collectors.toSet());
      List<ResourceCard> verified =
          cards.stream().filter(card -> allowed.contains(card.kind() + ":" + card.id())).toList();
      return new AskResponse(summary, true, verified);
    } catch (AiCallFailed ex) {
      return new AskResponse(null, false, cards);
    }
  }

  private void remember(String oid, String text) {
    if (oid == null || text == null || text.isBlank()) {
      return;
    }
    recent.compute(
        oid,
        (key, deque) -> {
          Deque<String> turns = deque == null ? new ArrayDeque<>() : deque;
          turns.addLast(text.trim());
          while (turns.size() > 3) {
            turns.removeFirst();
          }
          return turns;
        });
  }
}
