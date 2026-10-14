package com.manager.metrics.backend;

/**
 * Python {@code AIMetrics} standard metric names (for StatsD / Prometheus parity).
 */
public final class PythonMetricNames {

    public static final String REQUESTS_TOTAL = "xlibrary_ai_requests_total";
    public static final String REQUEST_DURATION = "xlibrary_ai_request_duration_seconds";
    public static final String TOKENS_USED_TOTAL = "xlibrary_ai_tokens_used_total";
    public static final String COST_TOTAL = "xlibrary_ai_cost_total";
    public static final String ERRORS_TOTAL = "xlibrary_ai_errors_total";
    public static final String CONVERSATIONS_ACTIVE = "xlibrary_ai_conversations_active";
    public static final String STREAMING_CHUNKS_TOTAL = "xlibrary_ai_streaming_chunks_total";
    public static final String ARTIFACTS_GENERATED_TOTAL = "xlibrary_ai_artifacts_generated_total";

    private PythonMetricNames() {
    }
}
