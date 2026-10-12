package com.manager.health;

public enum CircuitState {
    CLOSED("closed"),
    OPEN("open"),
    HALF_OPEN("half_open");

    private final String value;

    CircuitState(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
