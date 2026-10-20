package com.manager.metrics.backend;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Single metric event (Python metrics backend {@code record(metric)} payload subset).
 */
public record MetricPoint(
        Instant timestamp,
        String event,
        String provider,
        String model,
        Double durationSeconds,
        Integer tokensUsed,
        Double costEstimate,
        Boolean success,
        String errorType,
        Map<String, String> labels
) {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public Map<String, Object> toMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("timestamp", timestamp != null ? timestamp.toString() : null);
        m.put("event", event);
        m.put("provider", provider);
        m.put("model", model);
        m.put("duration_seconds", durationSeconds);
        m.put("tokens_used", tokensUsed);
        m.put("cost_estimate", costEstimate);
        m.put("success", success);
        m.put("error_type", errorType);
        m.put("labels", labels != null ? labels : Map.of());
        return m;
    }

    public String toJsonLine() {
        try {
            return MAPPER.writeValueAsString(toMap());
        } catch (JsonProcessingException e) {
            return "{\"error\":\"serialize_failed\"}";
        }
    }
}
