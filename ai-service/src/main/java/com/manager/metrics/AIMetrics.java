package com.manager.metrics;

import com.manager.core.Artifact;
import com.manager.metrics.backend.MemoryMetricsBackend;
import com.manager.metrics.backend.MetricsBackend;
import com.manager.metrics.backend.MetricPoint;
import com.manager.metrics.backend.PythonMetricNames;
import lombok.Getter;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Python {@code AIMetrics} — labeled counters/gauges/histograms + optional {@link MetricsBackend}.
 */
public class AIMetrics {

    public static final String REQUESTS_TOTAL = PythonMetricNames.REQUESTS_TOTAL;
    public static final String REQUEST_DURATION = PythonMetricNames.REQUEST_DURATION;
    public static final String TOKENS_USED_TOTAL = PythonMetricNames.TOKENS_USED_TOTAL;
    public static final String COST_TOTAL = PythonMetricNames.COST_TOTAL;
    public static final String ERRORS_TOTAL = PythonMetricNames.ERRORS_TOTAL;
    public static final String CONVERSATIONS_ACTIVE = PythonMetricNames.CONVERSATIONS_ACTIVE;
    public static final String STREAMING_CHUNKS_TOTAL = PythonMetricNames.STREAMING_CHUNKS_TOTAL;
    public static final String ARTIFACTS_GENERATED_TOTAL = PythonMetricNames.ARTIFACTS_GENERATED_TOTAL;

    private final Object lock = new Object();
    private final Map<String, Double> counters = new HashMap<>();
    private final Map<String, Double> gauges = new HashMap<>();
    private final Map<String, ArrayDeque<double[]>> histograms = new HashMap<>();
    private final Map<String, MetricSummary> summaries = new HashMap<>();
    private final Map<String, Map<String, String>> labelByKey = new HashMap<>();

    private long rollSuccess;
    private long rollFailed;

    private final int maxHistorySize;

    private volatile boolean enabled = true;

    @Getter
    private final String backend;

    @Getter
    private final MetricsBackend detailBackend;

    public AIMetrics() {
        this("memory", null, 10_000);
    }

    public AIMetrics(String backend) {
        this(backend, null, 10_000);
    }

    public AIMetrics(String backend, MetricsBackend detailBackend) {
        this(backend, detailBackend, 10_000);
    }

    public AIMetrics(String backend, MetricsBackend detailBackend, int maxHistorySize) {
        this.backend = backend != null ? backend : "memory";
        this.detailBackend = detailBackend;
        this.maxHistorySize = Math.max(1, maxHistorySize);
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void enable() {
        enabled = true;
    }

    public void disable() {
        enabled = false;
    }

    /** Python {@code _get_metric_key}. */
    public static String metricKey(String name, Map<String, String> labels) {
        if (labels == null || labels.isEmpty()) {
            return name;
        }
        String labelStr = labels.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining(","));
        return name + "{" + labelStr + "}";
    }

    /**
     * Python {@code record}.
     */
    public void record(String name, double value, MetricType metricType, Map<String, String> labels, Instant timestamp) {
        if (!enabled) {
            return;
        }
        Map<String, String> lbs = labels != null && !labels.isEmpty()
                ? Map.copyOf(labels)
                : Map.of();
        Instant ts = timestamp != null ? timestamp : Instant.now();
        String key = metricKey(name, lbs.isEmpty() ? null : lbs);
        synchronized (lock) {
            if (!lbs.isEmpty()) {
                labelByKey.put(key, new LinkedHashMap<>(lbs));
            }
            switch (metricType) {
                case COUNTER -> counters.merge(key, value, Double::sum);
                case GAUGE -> gauges.put(key, value);
                case HISTOGRAM, TIMER -> {
                    histograms.computeIfAbsent(key, k -> new ArrayDeque<>()).addLast(new double[] {value, ts.toEpochMilli()});
                    var dq = histograms.get(key);
                    while (dq.size() > maxHistorySize) {
                        dq.removeFirst();
                    }
                    summaries.computeIfAbsent(key, k -> new MetricSummary(name)).update(value, ts);
                }
                default -> {
                }
            }
        }
        forwardToDetailBackend(name, value, metricType, lbs, ts);
    }

    public void record(String name, double value, MetricType metricType, Map<String, String> labels) {
        record(name, value, metricType, labels, Instant.now());
    }

    public void increment(String name, double value, Map<String, String> labels) {
        record(name, value, MetricType.COUNTER, labels, Instant.now());
    }

    public void increment(String name) {
        increment(name, 1.0, Map.of());
    }

    public void setGauge(String name, double value, Map<String, String> labels) {
        record(name, value, MetricType.GAUGE, labels, Instant.now());
    }

    /** Python {@code time_histogram} — duration in seconds. */
    public void timeHistogram(String name, double durationSeconds, Map<String, String> labels) {
        record(name, durationSeconds, MetricType.HISTOGRAM, labels, Instant.now());
    }

    private void forwardToDetailBackend(
            String name, double value, MetricType metricType, Map<String, String> labels, Instant ts) {
        if (detailBackend == null) {
            return;
        }
        try {
            Map<String, String> lb = new LinkedHashMap<>();
            lb.put("_metric_name", name);
            lb.put("_metric_type", metricType.getValue());
            lb.put("_metric_value", String.valueOf(value));
            if (labels != null) {
                labels.forEach(lb::putIfAbsent);
            }
            Double dur = (metricType == MetricType.HISTOGRAM || metricType == MetricType.TIMER) ? value : null;
            detailBackend.record(new MetricPoint(ts, "generic", null, null, dur, null, null, null, null, Map.copyOf(lb)));
        } catch (Exception ignored) {
            // same spirit as Python: metrics must not break the app
        }
    }

    public void recordRequest(String provider, String model, double durationSeconds, Integer tokensUsed,
                              Double costEstimate, boolean success, String errorType) {
        if (!enabled) {
            return;
        }
        Map<String, String> labels = Map.of(
                "provider", provider != null ? provider : "unknown",
                "model", model != null ? model : "unknown");
        synchronized (lock) {
            if (success) {
                rollSuccess++;
            } else {
                rollFailed++;
            }
        }
        increment(REQUESTS_TOTAL, 1.0, labels);
        timeHistogram(REQUEST_DURATION, durationSeconds, labels);
        if (tokensUsed != null && tokensUsed > 0) {
            increment(TOKENS_USED_TOTAL, tokensUsed.doubleValue(), labels);
        }
        if (costEstimate != null && costEstimate > 0) {
            increment(COST_TOTAL, costEstimate, labels);
        }
        if (!success && errorType != null && !errorType.isBlank()) {
            Map<String, String> errLabels = new LinkedHashMap<>(labels);
            errLabels.put("error_type", errorType);
            increment(ERRORS_TOTAL, 1.0, errLabels);
        }
    }

    public void recordStreaming(String provider, String model, int chunksCount) {
        if (!enabled || chunksCount <= 0) {
            return;
        }
        Map<String, String> labels = Map.of(
                "provider", provider != null ? provider : "unknown",
                "model", model != null ? model : "unknown");
        increment(STREAMING_CHUNKS_TOTAL, chunksCount, labels);
    }

    public void recordConversation(String provider, int activeCount) {
        if (!enabled) {
            return;
        }
        setGauge(CONVERSATIONS_ACTIVE, activeCount, Map.of("provider", provider != null ? provider : "unknown"));
    }

    public void recordArtifact(String provider, String model, String artifactType) {
        if (!enabled) {
            return;
        }
        Map<String, String> labels = new LinkedHashMap<>();
        labels.put("provider", provider != null ? provider : "unknown");
        labels.put("model", model != null ? model : "unknown");
        labels.put("type", artifactType != null ? artifactType : "unknown");
        increment(ARTIFACTS_GENERATED_TOTAL, 1.0, labels);
    }

    public void recordArtifacts(String provider, String model, List<Artifact> artifacts) {
        if (artifacts == null || artifacts.isEmpty()) {
            return;
        }
        for (Artifact a : artifacts) {
            String t = a != null && a.getType() != null ? a.getType().name().toLowerCase() : "unknown";
            recordArtifact(provider, model, t);
        }
    }

    public void recordCustomMetric(String name, double value, Map<String, String> labels) {
        record(name, value, MetricType.COUNTER, labels, Instant.now());
    }

    public Map<String, Object> exportJsonFormat() {
        return getStats();
    }

    /** Python {@code export_prometheus_format}. */
    public String exportPrometheusFormat() {
        long ts = Instant.now().toEpochMilli();
        List<String> lines = new ArrayList<>();
        synchronized (lock) {
            for (Map.Entry<String, Double> e : counters.entrySet()) {
                lines.add(prometheusLine(e.getKey(), e.getValue(), ts, labelByKey.get(e.getKey())));
            }
            for (Map.Entry<String, Double> e : gauges.entrySet()) {
                lines.add(prometheusLine(e.getKey(), e.getValue(), ts, labelByKey.get(e.getKey())));
            }
            for (Map.Entry<String, MetricSummary> e : summaries.entrySet()) {
                String metricKey = e.getKey();
                MetricSummary s = e.getValue();
                String baseName = s.getName();
                Map<String, String> ld = labelByKey.get(metricKey);
                String labelPrefix = prometheusLabelPrefix(ld);
                lines.add(baseName + "_count" + labelPrefix + " " + s.toDict().get("count") + " " + ts);
                lines.add(baseName + "_sum" + labelPrefix + " " + formatPromNum(((Number) s.toDict().get("sum")).doubleValue()) + " " + ts);
                lines.add(baseName + "_avg" + labelPrefix + " " + formatPromNum(((Number) s.toDict().get("avg")).doubleValue()) + " " + ts);
            }
        }
        return lines.isEmpty() ? "" : String.join("\n", lines) + "\n";
    }

    private static String prometheusLine(String metricKey, double value, long ts, Map<String, String> labelsDict) {
        String baseName = baseNameFromKey(metricKey);
        String labelPrefix = prometheusLabelPrefix(labelsDict);
        return baseName + labelPrefix + " " + formatPromNum(value) + " " + ts;
    }

    private static String baseNameFromKey(String metricKey) {
        int i = metricKey.indexOf('{');
        return i < 0 ? metricKey : metricKey.substring(0, i);
    }

    private static String prometheusLabelPrefix(Map<String, String> labelsDict) {
        if (labelsDict == null || labelsDict.isEmpty()) {
            return "";
        }
        String labelsStr = labelsDict.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=\"" + escapePrometheusLabel(e.getValue()) + "\"")
                .collect(Collectors.joining(","));
        return "{" + labelsStr + "}";
    }

    private static String escapePrometheusLabel(String v) {
        if (v == null) {
            return "";
        }
        return v.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static String formatPromNum(double v) {
        if (Double.isNaN(v) || Double.isInfinite(v)) {
            return "0";
        }
        if (v == (long) v) {
            return String.valueOf((long) v);
        }
        return String.valueOf(v);
    }

    public void reset() {
        if (!enabled) {
            return;
        }
        synchronized (lock) {
            counters.clear();
            gauges.clear();
            histograms.clear();
            summaries.clear();
            labelByKey.clear();
            rollSuccess = 0;
            rollFailed = 0;
        }
        if (detailBackend != null) {
            detailBackend.reset();
        }
    }

    public void closeDetailBackend() {
        if (detailBackend != null) {
            detailBackend.close();
        }
    }

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        synchronized (lock) {
            stats.put("counters", new HashMap<>(counters));
            stats.put("gauges", new HashMap<>(gauges));
            Map<String, Object> sumMap = new LinkedHashMap<>();
            for (Map.Entry<String, MetricSummary> e : summaries.entrySet()) {
                sumMap.put(e.getKey(), e.getValue().toDict());
            }
            stats.put("summaries", sumMap);
            stats.put("collection_time", Instant.now().toString());
            stats.put("backend", backendClassName());
            stats.put("enabled", enabled);
            if (!counters.isEmpty()) {
                Map<String, Number> t = computeTotalsLocked();
                stats.put("totals", t);
                stats.put("total_requests", t.get("total_requests"));
                stats.put("total_tokens", t.get("total_tokens"));
                stats.put("total_cost", t.get("total_cost"));
                stats.put("total_errors", t.get("total_errors"));
            } else {
                stats.put("total_requests", 0L);
                stats.put("total_tokens", 0L);
                stats.put("total_cost", 0.0);
                stats.put("total_errors", 0L);
            }
            stats.put("success_requests", rollSuccess);
            stats.put("failed_requests", rollFailed);
            stats.put("streaming_chunks", sumCounterPrefixLocked(STREAMING_CHUNKS_TOTAL));
            stats.put("artifacts_generated", sumCounterPrefixLocked(ARTIFACTS_GENERATED_TOTAL));
            stats.put("active_conversations", maxGaugeForPrefixLocked(CONVERSATIONS_ACTIVE));
        }
        if (detailBackend != null) {
            stats.put("detail_backend_stats", detailBackend.getBackendStats());
        }
        if (detailBackend instanceof MemoryMetricsBackend mm) {
            stats.put("detail_memory_points", mm.getPoints().size());
        }
        return Map.copyOf(stats);
    }

    private Map<String, Number> computeTotalsLocked() {
        return Map.of(
                "total_requests", sumCounterPrefixLocked(REQUESTS_TOTAL),
                "total_tokens", sumCounterPrefixLocked(TOKENS_USED_TOTAL),
                "total_cost", sumCounterPrefixLocked(COST_TOTAL),
                "total_errors", sumCounterPrefixLocked(ERRORS_TOTAL));
    }

    private double sumCounterPrefixLocked(String prefix) {
        return counters.entrySet().stream()
                .filter(e -> e.getKey().equals(prefix) || e.getKey().startsWith(prefix + "{"))
                .mapToDouble(Map.Entry::getValue)
                .sum();
    }

    private double maxGaugeForPrefixLocked(String prefix) {
        return gauges.entrySet().stream()
                .filter(e -> e.getKey().equals(prefix) || e.getKey().startsWith(prefix + "{"))
                .mapToDouble(Map.Entry::getValue)
                .max()
                .orElse(0);
    }

    private String backendClassName() {
        return detailBackend == null ? "none" : detailBackend.getClass().getSimpleName();
    }

    @Override
    public String toString() {
        synchronized (lock) {
            int n = counters.size() + gauges.size() + summaries.size();
            return "AIMetrics(backend=" + backendClassName() + ", enabled=" + enabled + ", metrics=" + n + ")";
        }
    }
}
