package com.manager.metrics;

public enum MetricType {
    COUNTER("counter"),
    GAUGE("gauge"),
    HISTOGRAM("histogram"),
    TIMER("timer");

    private final String value;

    MetricType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
