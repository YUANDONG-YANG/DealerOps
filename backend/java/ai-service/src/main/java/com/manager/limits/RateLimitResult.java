package com.manager.limits;

public enum RateLimitResult {
    ALLOWED("allowed"),
    QUEUED("queued"),
    REJECTED("rejected"),
    BACKOFF("backoff");

    private final String value;

    RateLimitResult(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
