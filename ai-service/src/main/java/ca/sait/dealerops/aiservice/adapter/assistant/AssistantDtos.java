package ca.sait.dealerops.aiservice.adapter.assistant;

import java.util.List;

public final class AssistantDtos {
  private AssistantDtos() {}

  public record AssistantInternalRequest(String question, List<ResourceIn> resources) {}

  public record ResourceIn(String kind, Long id, String label, String status) {}

  public record AssistantOkResponse(boolean success, String summary) {}
}
