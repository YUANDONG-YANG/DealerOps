package com.manager.metrics.backend;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;

/** Python {@code MemoryBackend} — ring buffer of {@link MetricPoint}. */
public final class MemoryMetricsBackend implements MetricsBackend {

    private final int maxPoints;
    private final Deque<MetricPoint> points = new ArrayDeque<>();
    private final Object lock = new Object();

    public MemoryMetricsBackend() {
        this(10_000);
    }

    public MemoryMetricsBackend(int maxPoints) {
        this.maxPoints = Math.max(1, maxPoints);
    }

    @Override
    public void record(MetricPoint metric) {
        synchronized (lock) {
            while (points.size() >= maxPoints) {
                points.pollFirst();
            }
            points.addLast(metric);
        }
    }

    @Override
    public void reset() {
        synchronized (lock) {
            points.clear();
        }
    }

    public List<MetricPoint> getPoints() {
        synchronized (lock) {
            return new ArrayList<>(points);
        }
    }

    @Override
    public Map<String, Object> getBackendStats() {
        synchronized (lock) {
            MetricPoint oldest = points.peekFirst();
            MetricPoint newest = points.peekLast();
            return Map.of(
                    "backend_type", "memory",
                    "total_points", points.size(),
                    "max_points", maxPoints,
                    "oldest_metric", oldest != null && oldest.timestamp() != null ? oldest.timestamp().toString() : null,
                    "newest_metric", newest != null && newest.timestamp() != null ? newest.timestamp().toString() : null
            );
        }
    }
}
