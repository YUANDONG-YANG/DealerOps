package com.manager.provider.openai;

import com.manager.core.AIResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

/**
 * Parses OpenAI / OpenAI-compatible Chat Completions SSE ({@code data: {...}} lines).
 */
@Slf4j
final class OpenAiStreamingSupport {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private OpenAiStreamingSupport() {
    }

    static Flux<String> lineFlux(Flux<String> rawChunks) {
        return rawChunks
                .filter(Objects::nonNull)
                .flatMap(part -> {
                    String[] lines = part.split("\n", -1);
                    return Flux.fromArray(lines);
                })
                .map(String::trim)
                .filter(s -> !s.isEmpty());
    }

    /**
     * Blocking-friendly stream of {@link AIResponse} chunks (use with {@code flux.toStream()} lifecycle).
     */
    static Stream<AIResponse> toResponseStream(
            Flux<String> sseRawFlux,
            String model,
            String providerId,
            long startTimeMs,
            CostEstimator cost) {

        Flux<String> lines = lineFlux(sseRawFlux);
        OpenAiStreamState st = new OpenAiStreamState();
        return lines.toStream()
                .map(line -> parseDataLine(line, model, providerId, startTimeMs, st, cost))
                .flatMap(Optional::stream)
                .onClose(() -> log.trace("OpenAI SSE stream closed"));
    }

    @FunctionalInterface
    interface CostEstimator {
        double estimate(int inputTokens, int outputTokens);
    }

    private static final class OpenAiStreamState {
        final StringBuilder accumulated = new StringBuilder();
        final AtomicInteger chunkIndex = new AtomicInteger(0);
    }

    private static Optional<AIResponse> parseDataLine(
            String line,
            String model,
            String providerId,
            long startTimeMs,
            OpenAiStreamState st,
            CostEstimator cost) {
        if (!line.startsWith("data:")) {
            return Optional.empty();
        }
        String payload = line.substring(5).trim();
        if (payload.isEmpty() || "[DONE]".equalsIgnoreCase(payload)) {
            return Optional.empty();
        }
        JsonNode root;
        try {
            root = MAPPER.readTree(payload);
        } catch (Exception e) {
            log.debug("Skip non-JSON SSE line: {}", e.getMessage());
            return Optional.empty();
        }
        JsonNode choices = root.path("choices");
        if (!choices.isArray() || choices.isEmpty()) {
            return Optional.empty();
        }
        JsonNode ch0 = choices.get(0);
        JsonNode delta = ch0.path("delta");
        String piece = "";
        if (delta.hasNonNull("content")) {
            piece = delta.get("content").asText("");
        }
        String finishReason = ch0.path("finish_reason").asText(null);
        boolean hasFinish = finishReason != null && !finishReason.isBlank() && !"null".equalsIgnoreCase(finishReason);

        JsonNode usage = root.path("usage");
        boolean hasUsage = !usage.isMissingNode() && usage.isObject();

        if (!piece.isEmpty()) {
            st.accumulated.append(piece);
            int idx = st.chunkIndex.getAndIncrement();
            return Optional.of(AIResponse.builder()
                    .content(piece)
                    .provider(providerId)
                    .model(model)
                    .timestamp(Instant.now())
                    .streaming(true)
                    .chunkIndex(idx)
                    .finalChunk(false)
                    .finishReason("partial")
                    .metadata(Map.of("sse", "openai-delta"))
                    .latencyMs(System.currentTimeMillis() - startTimeMs)
                    .build());
        }

        if (hasFinish || hasUsage) {
            int inTok = usage.path("prompt_tokens").asInt(0);
            int outTok = usage.path("completion_tokens").asInt(0);
            int total = usage.path("total_tokens").asInt(inTok + outTok);
            if (total == 0) {
                total = Math.max(0, inTok + outTok);
            }
            String fullText = st.accumulated.toString();
            String fin = hasFinish ? finishReason : "stop";
            return Optional.of(AIResponse.builder()
                    .content(fullText)
                    .provider(providerId)
                    .model(model)
                    .timestamp(Instant.now())
                    .inputTokens(inTok)
                    .outputTokens(outTok)
                    .tokensUsed(total > 0 ? total : st.accumulated.length() / 4)
                    .costEstimate(cost.estimate(inTok, outTok))
                    .streaming(true)
                    .chunkIndex(st.chunkIndex.get())
                    .finalChunk(true)
                    .finishReason(fin)
                    .latencyMs(System.currentTimeMillis() - startTimeMs)
                    .metadata(Map.of("sse", "openai-final"))
                    .build());
        }
        return Optional.empty();
    }

    static Map<String, Object> chatBodyBase(
            String model,
            List<Map<String, String>> chatMessages,
            int maxTokens,
            double temperature,
            Double topP,
            boolean stream) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", model);
        body.put("messages", chatMessages);
        body.put("max_tokens", maxTokens);
        body.put("temperature", temperature);
        if (topP != null) {
            body.put("top_p", topP);
        }
        body.put("stream", stream);
        return body;
    }
}
