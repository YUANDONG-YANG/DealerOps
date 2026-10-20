package com.manager.limits;

public enum BackoffStrategy {
    NONE("none"),
    LINEAR("linear"),
    EXPONENTIAL("exponential"),
    FIBONACCI("fibonacci");

    private final String value;

    BackoffStrategy(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
