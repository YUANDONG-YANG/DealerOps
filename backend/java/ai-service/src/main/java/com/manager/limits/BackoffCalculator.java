package com.manager.limits;

import java.util.concurrent.ThreadLocalRandom;

public class BackoffCalculator {

    private final BackoffStrategy strategy;
    private final double baseDelay;
    private final double maxDelay;
    private final boolean jitter;
    private final double jitterFactor;

    public BackoffCalculator(BackoffStrategy strategy, double baseDelay, double maxDelay, boolean jitter, double jitterFactor) {
        this.strategy = strategy != null ? strategy : BackoffStrategy.EXPONENTIAL;
        this.baseDelay = baseDelay;
        this.maxDelay = maxDelay;
        this.jitter = jitter;
        this.jitterFactor = jitterFactor;
    }

    public double calculate(int failureIndexZeroBased) {
        double delay = switch (strategy) {
            case NONE -> 0;
            case LINEAR -> baseDelay * (failureIndexZeroBased + 1);
            case EXPONENTIAL -> Math.min(maxDelay, baseDelay * Math.pow(2, failureIndexZeroBased));
            case FIBONACCI -> Math.min(maxDelay, baseDelay * fib(failureIndexZeroBased + 1));
        };
        if (jitter && delay > 0) {
            double spread = delay * jitterFactor;
            delay += ThreadLocalRandom.current().nextDouble(-spread, spread);
        }
        return Math.max(0, Math.min(maxDelay, delay));
    }

    private static long fib(int n) {
        if (n <= 1) return 1;
        long a = 1, b = 1;
        for (int i = 2; i < n; i++) {
            long c = a + b;
            a = b;
            b = c;
        }
        return b;
    }

    public void reset() {
        // stateless
    }
}
