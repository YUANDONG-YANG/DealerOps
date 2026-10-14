package com.manager.provider.claude;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;

@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ClaudeMessageRequest {

    String model;
    @JsonProperty("max_tokens")
    int maxTokens;
    List<ClaudeMessage> messages;
    Object system;
    Double temperature;
    @JsonProperty("top_p")
    Double topP;
    Boolean stream;
    Map<String, Object> thinking;
    List<Map<String, Object>> tools;
    @JsonProperty("tool_choice")
    Map<String, Object> toolChoice;

    public record ClaudeMessage(String role, Object content) {}
}
