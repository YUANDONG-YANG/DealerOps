package com.manager.limits;

import lombok.Getter;

import java.util.Map;

/**
 * Token bucket for rate limiting (Python {@code ai.limits.strategies.TokenBucket}).
 */
public class TokenBucket {

    private final int capacity;
    private final double refillRate;
    private final double refillPeriodSeconds;
    @Getter
    private double tokens;
    private long lastRefillNanos;

    public TokenBucket(int capacity, double refillRate, double refillPeriodSeconds, Integer initialTokens) {
        this.capacity = capacity;
        this.refillRate = refillRate;
        this.refillPeriodSeconds = refillPeriodSeconds;
        this.tokens = initialTokens != null ? initialTokens : capacity;
        this.lastRefillNanos = System.nanoTime();
    }

    public synchronized boolean peek(int n) {
        refill();
        return tokens >= n;
    }

    public synchronized boolean consume(int n) {
        refill();
        if (tokens >= n) {
            tokens -= n;
            return true;
        }
        return false;
    }

    public synchronized void reset() {
        tokens = capacity;
        lastRefillNanos = System.nanoTime();
    }

    private void refill() {
        long now = System.nanoTime();
        double elapsed = (now - lastRefillNanos) / 1_000_000_000.0;
        if (elapsed < refillPeriodSeconds) {
            return;
        }
        double periods = elapsed / refillPeriodSeconds;
        int toAdd = (int) (periods * refillRate);
        if (toAdd > 0) {
            tokens = Math.min(capacity, tokens + toAdd);
            lastRefillNanos = now;
        }
    }

    /** Python {@code TokenBucket.get_status}. */
    public synchronized Map<String, Object> getStatus() {
        refill();
        double util = capacity > 0 ? 1.0 - (tokens / capacity) : 0.0;
        return Map.of(
                "capacity", capacity,
                "current_tokens", tokens,
                "refill_rate", refillRate,
                "refill_period", refillPeriodSeconds,
                "utilization", util
        );
    }
}
