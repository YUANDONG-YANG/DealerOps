package com.manager.health;

import com.manager.exception.CircuitBreakerOpenException;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Supplier;

/**
 * Port of Python {@code CircuitBreaker}.
 */
@Slf4j
public class CircuitBreaker {

    private final String name;
    private final CircuitBreakerConfig config;

    @Getter
    private volatile CircuitState state = CircuitState.CLOSED;
    private final AtomicInteger failureCount = new AtomicInteger();
    private final AtomicInteger successCount = new AtomicInteger();
    private volatile Instant nextAttemptTime;
    private final AtomicInteger halfOpenCalls = new AtomicInteger();
    private final ReentrantLock lock = new ReentrantLock();

    public CircuitBreaker(String name, CircuitBreakerConfig config) {
        this.name = name;
        this.config = config != null ? config : CircuitBreakerConfig.builder().build();
    }

    public boolean isAvailable() {
        lock.lock();
        try {
            Instant now = Instant.now();
            if (state == CircuitState.CLOSED) {
                return true;
            }
            if (state == CircuitState.HALF_OPEN) {
                return halfOpenCalls.get() < config.getHalfOpenMaxCalls();
            }
            if (state == CircuitState.OPEN && nextAttemptTime != null && !now.isBefore(nextAttemptTime)) {
                transitionToHalfOpen();
                return true;
            }
            return false;
        } finally {
            lock.unlock();
        }
    }

    public <T> T call(Supplier<T> func) {
        if (!isAvailable()) {
            throw new CircuitBreakerOpenException("Circuit breaker '" + name + "' is OPEN");
        }
        lock.lock();
        try {
            if (state == CircuitState.HALF_OPEN) {
                halfOpenCalls.incrementAndGet();
            }
        } finally {
            lock.unlock();
        }
        try {
            T result = func.get();
            recordSuccess();
            return result;
        } catch (RuntimeException e) {
            recordFailure();
            throw e;
        }
    }

    private void recordSuccess() {
        lock.lock();
        try {
            if (state == CircuitState.HALF_OPEN) {
                int s = successCount.incrementAndGet();
                if (s >= config.getSuccessThreshold()) {
                    transitionToClosed();
                }
            } else if (state == CircuitState.CLOSED) {
                failureCount.set(0);
            }
        } finally {
            lock.unlock();
        }
    }

    private void recordFailure() {
        lock.lock();
        try {
            failureCount.incrementAndGet();
            if (state == CircuitState.CLOSED && failureCount.get() >= config.getFailureThreshold()) {
                transitionToOpen();
            } else if (state == CircuitState.HALF_OPEN) {
                transitionToOpen();
            }
        } finally {
            lock.unlock();
        }
    }

    private void transitionToOpen() {
        state = CircuitState.OPEN;
        nextAttemptTime = Instant.now().plus(Duration.ofSeconds(config.getRecoveryTimeout()));
        halfOpenCalls.set(0);
        log.warn("CircuitBreaker '{}' opened", name);
    }

    private void transitionToHalfOpen() {
        state = CircuitState.HALF_OPEN;
        successCount.set(0);
        halfOpenCalls.set(0);
        log.info("CircuitBreaker '{}' half-open", name);
    }

    private void transitionToClosed() {
        state = CircuitState.CLOSED;
        failureCount.set(0);
        successCount.set(0);
        nextAttemptTime = null;
        halfOpenCalls.set(0);
        log.info("CircuitBreaker '{}' closed", name);
    }

    public void reset() {
        lock.lock();
        try {
            state = CircuitState.CLOSED;
            failureCount.set(0);
            successCount.set(0);
            halfOpenCalls.set(0);
            nextAttemptTime = null;
        } finally {
            lock.unlock();
        }
    }
}
