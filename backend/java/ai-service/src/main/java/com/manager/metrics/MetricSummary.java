package com.manager.metrics;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Python {@code MetricSummary} — mutable rolling stats for histogram/timer series.
 */
public final class MetricSummary {

    private final String name;
    private int count;
    private double sum;
    private double min = Double.POSITIVE_INFINITY;
    private double max = Double.NEGATIVE_INFINITY;
    private double avg;
    private double lastValue;
    private Instant lastUpdated = Instant.now();

    public MetricSummary(String name) {
        this.name = name != null ? name : "";
    }

    public void update(double value, Instant timestamp) {
        count++;
        sum += value;
        min = Math.min(min, value);
        max = Math.max(max, value);
        avg = sum / count;
        lastValue = value;
        lastUpdated = timestamp != null ? timestamp : Instant.now();
    }

    public String getName() {
        return name;
    }

    public Map<String, Object> toDict() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("count", count);
        m.put("sum", sum);
        m.put("min", min == Double.POSITIVE_INFINITY ? 0.0 : min);
        m.put("max", max == Double.NEGATIVE_INFINITY ? 0.0 : max);
        m.put("avg", avg);
        m.put("last_value", lastValue);
        m.put("last_updated", lastUpdated != null ? lastUpdated.toString() : null);
        return m;
    }
}
