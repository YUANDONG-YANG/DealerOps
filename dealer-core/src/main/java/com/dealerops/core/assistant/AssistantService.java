package com.dealerops.core.assistant;

import com.dealerops.core.assistant.dto.AskRequest;
import com.dealerops.core.assistant.dto.AskResponse;
import com.dealerops.core.assistant.dto.ResourceCard;
import com.dealerops.core.common.tenant.TenantContext;
import com.dealerops.core.common.tenant.TenantGuard;
import com.dealerops.core.dealer.AppRole;
import com.dealerops.core.integration.AiCallFailed;
import com.dealerops.core.integration.AiGatewayClient;
import com.dealerops.core.integration.dto.AssistantInternalRequest;
import com.dealerops.core.integration.dto.ResourceRef;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class AssistantService {

  private static final Pattern ID_REFERENCE =
      Pattern.compile(
          "(?:\\b(vehicle|customer|listing)\\s*(?:id\\s*)?[:#]?\\s*|\\bid\\s*[:#]?\\s*|#\\s*)(\\d+)(?!\\d)",
          Pattern.CASE_INSENSITIVE);

  private final AssistantResourceQuery assistantResourceQuery;
  private final AiGatewayClient aiGatewayClient;

  public AssistantService(
      AssistantResourceQuery assistantResourceQuery, AiGatewayClient aiGatewayClient) {
    this.assistantResourceQuery = assistantResourceQuery;
    this.aiGatewayClient = aiGatewayClient;
  }

  public AskResponse ask(AskRequest body) {
    TenantGuard.requireBusinessAccess();
    Long tenant = TenantContext.get().role() == AppRole.PLATFORM_ADMIN
        ? null
        : TenantContext.get().tenantDealerId();
    List<ResourceCard> cards = assistantResourceQuery.load(tenant, body.text());
    try {
      String summary =
          aiGatewayClient.assistant(
              new AssistantInternalRequest(
                  body.text(),
                  cards.stream()
                      .map(card -> new ResourceRef(card.kind(), card.id(), card.label(), card.status()))
                      .toList()));
      // Cards come from the caller's tenant-scoped retrieval, or from the cross-dealer admin
      // retrieval. When the summary names specific ids, show only those; when it names none,
      // show the whole retrieval list (design/14 §10).
      List<ResourceCard> referenced = referencedCards(summary, cards);
      return new AskResponse(summary, true, referenced.isEmpty() ? cards : referenced);
    } catch (AiCallFailed ex) {
      return new AskResponse(null, false, cards);
    }
  }

  /**
   * Retrieved cards the summary names by id. An id counts only when written as one: "#12", "id 12",
   * or "vehicle 12" / "customer id 12". A bare number such as "2 Toyotas match" or "2020 Camry" is
   * a count or a year, not a reference. A bare "#12" names a card only when no other retrieved card
   * shares that id.
   */
  private static List<ResourceCard> referencedCards(String summary, List<ResourceCard> cards) {
    Set<String> kindIds = new HashSet<>();
    Set<String> bareIds = new HashSet<>();
    Matcher m = ID_REFERENCE.matcher(summary);
    while (m.find()) {
      if (m.group(1) != null) {
        kindIds.add(m.group(1).toUpperCase(Locale.ROOT) + ":" + m.group(2));
      } else {
        bareIds.add(m.group(2));
      }
    }
    return cards.stream()
        .filter(card -> card.id() != null && card.kind() != null)
        .filter(
            card ->
                kindIds.contains(card.kind() + ":" + card.id())
                    || (bareIds.contains(card.id().toString())
                        && cards.stream().filter(other -> card.id().equals(other.id())).count() == 1))
        .toList();
  }
}
