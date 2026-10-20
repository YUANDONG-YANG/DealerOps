package com.manager.metrics.backend;

import java.util.Map;

/**
 * Python {@code metrics.backends.BaseBackend} — optional detailed metric stream alongside {@link com.manager.metrics.AIMetrics} aggregates.
 */
public interface MetricsBackend {

    void record(MetricPoint metric);

    default void reset() {
    }

    default void close() {
    }

    /** Python {@code get_stats()} subset for this backend (for {@link com.manager.metrics.AIMetrics#getStats()}). */
    default Map<String, Object> getBackendStats() {
        return Map.of("backend_type", getClass().getSimpleName());
    }
}
