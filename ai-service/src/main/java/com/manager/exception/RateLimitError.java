package com.manager.exception;

import lombok.Getter;

import java.util.Map;

@Getter
public class RateLimitError extends ProviderError {

    private final Integer retryAfterSeconds;
    private final Double backoffDelay;

    public RateLimitError(String message) {
        super(message, null, Map.of());
        this.retryAfterSeconds = null;
        this.backoffDelay = null;
    }

    public RateLimitError(String message, Integer retryAfterSeconds) {
        super(message, null, Map.of());
        this.retryAfterSeconds = retryAfterSeconds;
        this.backoffDelay = null;
    }

    private RateLimitError(String message, Integer retryAfterSeconds, Double backoffDelay) {
        super(message, null, Map.of());
        this.retryAfterSeconds = retryAfterSeconds;
        this.backoffDelay = backoffDelay;
    }

    public static RateLimitError withBackoff(String message, double backoffDelaySeconds) {
        return new RateLimitError(message, null, backoffDelaySeconds);
    }
}
