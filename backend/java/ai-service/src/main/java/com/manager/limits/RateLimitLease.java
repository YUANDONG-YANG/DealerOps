package com.manager.limits;

import com.manager.exception.RateLimitError;

/**
 * Try-with-resources helper: {@link #maybe} → {@link #markSuccess()} on happy path → {@link #close()} releases slot.
 * Shared acquire/release for {@link AiManager} and {@link com.manager.session.Conversation} rate limiting (DRY).
 */
public final class RateLimitLease implements AutoCloseable {

    private final RateLimiter limiter;
    private final String requestId;
    private boolean success;
    private boolean closed;

    private RateLimitLease(RateLimiter limiter, String requestId) {
        this.limiter = limiter;
        this.requestId = requestId;
    }

    /**
     * @return no-op instance when {@code limiter == null} ({@code close} is a no-op)
     */
    public static RateLimitLease maybe(RateLimiter limiter, String requestId, int tokensEstimate)
            throws InterruptedException {
        if (limiter == null) {
            return new RateLimitLease(null, null);
        }
        long queueWaitMs = (long) (limiter.getConfig().getQueueTimeout() * 1000);
        limiter.blockUntilAdmitted(requestId, tokensEstimate, 0, queueWaitMs);
        if (!limiter.consumeTokens(requestId, tokensEstimate)) {
            throw new RateLimitError("Failed to consume rate limit tokens");
        }
        return new RateLimitLease(limiter, requestId);
    }

    public void markSuccess() {
        if (limiter != null) {
            this.success = true;
        }
    }

    @Override
    public void close() {
        if (limiter == null || closed) {
            return;
        }
        closed = true;
        limiter.releaseRequest(requestId, success);
    }
}
