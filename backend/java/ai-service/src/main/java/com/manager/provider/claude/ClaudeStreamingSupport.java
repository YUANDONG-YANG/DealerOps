package com.manager.provider.claude;

import com.manager.core.AIResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

/**
 * Parses Anthropic Messages API SSE ({@code data: {...}} JSON lines).
 */
@Slf4j
final class ClaudeStreamingSupport {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ClaudeStreamingSupport() {
    }

    static Flux<String> lineFlux(Flux<String> rawChunks) {
        return rawChunks
                .filter(Objects::nonNull)
                .flatMap(part -> Flux.fromArray(part.split("\n", -1)))
                .map(String::trim)
                .filter(s -> !s.isEmpty());
    }

    static Stream<AIResponse> toResponseStream(
            Flux<String> sseRawFlux,
            String model,
            long startTimeMs,
            java.util.function.BiFunction<Integer, Integer, Double> cost) {

        Flux<String> lines = lineFlux(sseRawFlux);
        ClaudeStreamState st = new ClaudeStreamState();
        return lines.toStream()
                .map(line -> parseDataLine(line, model, startTimeMs, st, cost))
                .flatMap(Optional::stream)
                .onClose(() -> log.trace("Claude SSE stream closed"));
    }

    private static final class ClaudeStreamState {
        final StringBuilder accumulated = new StringBuilder();
        final AtomicInteger chunkIndex = new AtomicInteger(0);
        String stopReason = "stop";
        boolean finalEmitted;
    }

    private static Optional<AIResponse> parseDataLine(
            String line,
            String model,
            long startTimeMs,
            ClaudeStreamState st,
            java.util.function.BiFunction<Integer, Integer, Double> cost) {
        if (!line.startsWith("data:")) {
            return Optional.empty();
        }
        String payload = line.substring(5).trim();
        if (payload.isEmpty()) {
            return Optional.empty();
        }
        JsonNode root;
        try {
            root = MAPPER.readTree(payload);
        } catch (Exception e) {
            log.debug("Skip Claude SSE JSON: {}", e.getMessage());
            return Optional.empty();
        }

        if (root.has("error")) {
            String msg = root.path("error").path("message").asText(root.path("error").toString());
            return Optional.of(AIResponse.builder()
                    .content("")
                    .provider("claude")
                    .model(model)
                    .error(true)
                    .errorMessage(msg)
                    .finishReason("error")
                    .streaming(true)
                    .finalChunk(true)
                    .latencyMs(System.currentTimeMillis() - startTimeMs)
                    .build());
        }

        String type = root.path("type").asText("");
        if ("content_block_delta".equals(type)) {
            JsonNode delta = root.path("delta");
            String text = "";
            if ("text_delta".equals(delta.path("type").asText("")) || delta.has("text")) {
                text = delta.path("text").asText("");
            }
            if (text.isEmpty()) {
                return Optional.empty();
            }
            st.accumulated.append(text);
            int idx = st.chunkIndex.getAndIncrement();
            return Optional.of(AIResponse.builder()
                    .content(text)
                    .provider("claude")
                    .model(model)
                    .timestamp(Instant.now())
                    .streaming(true)
                    .chunkIndex(idx)
                    .finalChunk(false)
                    .finishReason("partial")
                    .metadata(Map.of("sse", "claude-delta"))
                    .latencyMs(System.currentTimeMillis() - startTimeMs)
                    .build());
        }

        if ("message_delta".equals(type)) {
            JsonNode delta = root.path("delta");
            if (delta.hasNonNull("stop_reason")) {
                st.stopReason = delta.get("stop_reason").asText(st.stopReason);
            }
            JsonNode usage = delta.path("usage");
            if (usage.isMissingNode() || usage.isNull()) {
                return Optional.empty();
            }
            int outTok = usage.path("output_tokens").asInt(0);
            int inTok = usage.path("input_tokens").asInt(0);
            if (outTok == 0 && inTok == 0) {
                return Optional.empty();
            }
            if (st.finalEmitted) {
                return Optional.empty();
            }
            st.finalEmitted = true;
            String full = st.accumulated.toString();
            int idx = st.chunkIndex.get();
            int total = inTok + outTok;
            if (total <= 0) {
                total = Math.max(1, full.length() / 4);
            }
            return Optional.of(AIResponse.builder()
                    .content(full)
                    .provider("claude")
                    .model(model)
                    .timestamp(Instant.now())
                    .inputTokens(inTok)
                    .outputTokens(outTok)
                    .tokensUsed(total)
                    .costEstimate(cost.apply(inTok, outTok))
                    .streaming(true)
                    .chunkIndex(idx)
                    .finalChunk(true)
                    .finishReason(st.stopReason != null ? st.stopReason : "stop")
                    .latencyMs(System.currentTimeMillis() - startTimeMs)
                    .metadata(Map.of("sse", "claude-final"))
                    .build());
        }

        if ("message_stop".equals(type)) {
            if (st.finalEmitted) {
                return Optional.empty();
            }
            if (st.chunkIndex.get() == 0 && st.accumulated.isEmpty()) {
                return Optional.empty();
            }
            st.finalEmitted = true;
            String full = st.accumulated.toString();
            return Optional.of(AIResponse.builder()
                    .content(full)
                    .provider("claude")
                    .model(model)
                    .timestamp(Instant.now())
                    .tokensUsed(Math.max(1, full.length() / 4))
                    .costEstimate(cost.apply(0, Math.max(1, full.length() / 4)))
                    .streaming(true)
                    .chunkIndex(st.chunkIndex.get())
                    .finalChunk(true)
                    .finishReason(st.stopReason)
                    .latencyMs(System.currentTimeMillis() - startTimeMs)
                    .metadata(Map.of("sse", "claude-stop"))
                    .build());
        }

        return Optional.empty();
    }
}
