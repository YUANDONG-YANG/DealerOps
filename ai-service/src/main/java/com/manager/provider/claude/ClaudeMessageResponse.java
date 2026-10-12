package com.manager.provider.claude;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ClaudeMessageResponse {

    private String id;
    private String type;
    private String role;
    private List<ContentBlock> content;
    @JsonProperty("stop_reason")
    private String stopReason;
    private Usage usage;
    private String model;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ContentBlock {
        private String type;
        private String text;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Usage {
        @JsonProperty("input_tokens")
        private int inputTokens;
        @JsonProperty("output_tokens")
        private int outputTokens;
        @JsonProperty("cache_read_input_tokens")
        private Integer cacheReadInputTokens;
        @JsonProperty("cache_creation_input_tokens")
        private Integer cacheCreationInputTokens;
    }
}
