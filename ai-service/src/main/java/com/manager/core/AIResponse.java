package com.manager.core;

import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Getter
@EqualsAndHashCode
@ToString
@Builder(toBuilder = true)
public class AIResponse {

    private static final Set<String> ERROR_REASONS = Set.of("error", "content_filter", "function_call");

    private final String content;
    private final String provider;
    private final String model;
    private final Instant timestamp;
    @Builder.Default
    private final int tokensUsed;
    @Builder.Default
    private final int inputTokens;
    @Builder.Default
    private final int outputTokens;
    @Builder.Default
    private final int cachedTokens;
    @Builder.Default
    private final int reasoningTokens;
    @Builder.Default
    private final double costEstimate;
    @Builder.Default
    private final double latencyMs;
    @Builder.Default
    private final String finishReason;
    private final String requestId;
    private final String thinkingTrace;
    @Builder.Default
    private final List<Artifact> artifacts;
    private final Integer rateLimitRemaining;
    private final Instant rateLimitReset;
    private final Integer dailyUsage;
    @Builder.Default
    private final Map<String, Object> metadata;
    private final String conversationContext;
    private final Map<String, Double> safetyScores;
    @Builder.Default
    private final boolean streaming;
    private final Integer chunkIndex;
    @Builder.Default
    private final boolean finalChunk;
    private final String errorCode;
    private final String errorMessage;
    @Builder.Default
    private final boolean error;

    private AIResponse(
            String content,
            String provider,
            String model,
            Instant timestamp,
            int tokensUsed,
            int inputTokens,
            int outputTokens,
            int cachedTokens,
            int reasoningTokens,
            double costEstimate,
            double latencyMs,
            String finishReason,
            String requestId,
            String thinkingTrace,
            List<Artifact> artifacts,
            Integer rateLimitRemaining,
            Instant rateLimitReset,
            Integer dailyUsage,
            Map<String, Object> metadata,
            String conversationContext,
            Map<String, Double> safetyScores,
            boolean streaming,
            Integer chunkIndex,
            boolean finalChunk,
            String errorCode,
            String errorMessage,
            boolean error) {
        this.content = content;
        this.provider = provider;
        this.model = model;
        this.timestamp = timestamp == null ? Instant.now() : timestamp;
        int tu = tokensUsed;
        if (tu == 0 && (inputTokens != 0 || outputTokens != 0 || reasoningTokens != 0)) {
            tu = inputTokens + outputTokens + reasoningTokens;
        }
        this.tokensUsed = tu;
        this.inputTokens = inputTokens;
        this.outputTokens = outputTokens;
        this.cachedTokens = cachedTokens;
        this.reasoningTokens = reasoningTokens;
        this.costEstimate = costEstimate;
        this.latencyMs = latencyMs;
        this.finishReason = finishReason;
        this.requestId = requestId;
        this.thinkingTrace = thinkingTrace;
        this.artifacts = artifacts == null ? List.of() : List.copyOf(artifacts);
        this.rateLimitRemaining = rateLimitRemaining;
        this.rateLimitReset = rateLimitReset;
        this.dailyUsage = dailyUsage;
        this.metadata = metadata == null ? Collections.emptyMap() : Map.copyOf(metadata);
        this.conversationContext = conversationContext;
        this.safetyScores = safetyScores;
        this.streaming = streaming;
        this.chunkIndex = chunkIndex;
        this.finalChunk = finalChunk;
        this.errorCode = errorCode;
        this.errorMessage = errorMessage;
        this.error = error;
    }

    public boolean isSuccess() {
        if (error || content == null || content.isBlank()) {
            return false;
        }
        return finishReason == null || !ERROR_REASONS.contains(finishReason);
    }

    public static AIResponse createError(String errorMessage, String errorCode, String provider, String model) {
        return AIResponse.builder()
                .content("")
                .provider(provider != null ? provider : "unknown")
                .model(model != null ? model : "unknown")
                .errorCode(errorCode != null ? errorCode : AIErrorCodes.UNKNOWN_ERROR)
                .errorMessage(errorMessage)
                .error(true)
                .finishReason("error")
                .build();
    }
}
