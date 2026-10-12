package com.manager.health;

public enum HealthState {
    HEALTHY("healthy"),
    DEGRADED("degraded"),
    UNHEALTHY("unhealthy"),
    UNKNOWN("unknown");

    private final String value;

    HealthState(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
