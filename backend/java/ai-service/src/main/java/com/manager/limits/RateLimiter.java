package com.manager.limits;

import com.manager.exception.RateLimitError;
import com.manager.health.HealthChecker;
import com.manager.metrics.AIMetrics;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Port of Python {@code RateLimiter}: token/request buckets, concurrency, backoff, optional {@link RequestQueue}.
 */
@Slf4j
public class RateLimiter {

    private enum Admission {
        ALLOWED,
        MUST_WAIT,
        BACKOFF
    }

    private String provider;
    @Getter
    private final RateLimitConfig config;
    private final String providerTierParam;
    private ProviderLimits providerLimits;
    private final AIMetrics metrics;

    @Getter
    private final HealthChecker healthChecker;

    private TokenBucket requestBucket;
    private TokenBucket tokenBucket;
    private RequestQueue requestQueue;
    private final BackoffCalculator backoffCalculator;

    private int consecutiveFailures;
    private int consecutiveSuccesses;
    private Instant lastFailureTime;

    private final Map<String, Instant> activeRequests = new ConcurrentHashMap<>();
    private int requestCount;
    private final Object lock = new Object();

    public RateLimiter(String provider, RateLimitConfig config, String providerTier, AIMetrics metrics) {
        this(provider, config, providerTier, metrics, null);
    }

    public RateLimiter(String provider, RateLimitConfig config, String providerTier, AIMetrics metrics, HealthChecker healthChecker) {
        this.provider = provider;
        this.config = config != null ? config : RateLimitConfig.builder().build();
        this.metrics = metrics;
        this.healthChecker = healthChecker;
        this.providerTierParam = providerTier;
        ProviderLimits pl = null;
        if (this.config.isUseProviderDefaults()) {
            pl = ProviderLimitsRegistry.get(provider, resolveTier(providerTier)).orElse(null);
        }
        this.providerLimits = pl;
        this.backoffCalculator = new BackoffCalculator(
                this.config.getBackoffStrategy(),
                this.config.getBaseDelay(),
                this.config.getMaxDelay(),
                this.config.isEnableJitter(),
                this.config.getJitterFactor());
        initBuckets();
    }

    private String resolveTier(String providerTier) {
        return providerTier != null ? providerTier : config.getProviderTier();
    }

    /**
     * After {@link com.manager.AiManager} switches vendor, re-bind default limits and reset buckets for the new provider key.
     */
    public void updateProviderKey(String newProvider) {
        if (newProvider == null || newProvider.isBlank()) {
            return;
        }
        synchronized (lock) {
            this.provider = newProvider.strip();
            if (config.isUseProviderDefaults()) {
                this.providerLimits = ProviderLimitsRegistry.get(this.provider, resolveTier(providerTierParam)).orElse(null);
            }
            initBuckets();
        }
    }

    private void initBuckets() {
        if (!config.isEnabled()) {
            requestBucket = null;
            tokenBucket = null;
            requestQueue = null;
            return;
        }
        int rpm = config.getRequestsPerMinute() != null ? config.getRequestsPerMinute() : 60;
        int tpm = config.getTokensPerMinute() != null ? config.getTokensPerMinute() : 60_000;
        int burst = config.getBurstAllowance() != null ? config.getBurstAllowance() : 10;
        if (providerLimits != null && config.isUseProviderDefaults()) {
            if (config.getRequestsPerMinute() == null) {
                rpm = providerLimits.getRequestsPerMinute();
            }
            if (config.getTokensPerMinute() == null) {
                tpm = providerLimits.getTokensPerMinute();
            }
            if (config.getBurstAllowance() == null) {
                burst = providerLimits.getBurstAllowance();
            }
        }
        requestBucket = new TokenBucket(rpm + burst, rpm / 60.0, 1.0, rpm);
        tokenBucket = new TokenBucket(tpm + burst * 100, tpm / 60.0, 1.0, tpm);

        if (config.isEnableQueuing()) {
            requestQueue = new RequestQueue(
                    config.getMaxQueueSize(),
                    config.getQueueTimeout(),
                    config.isEnablePriorities());
        } else {
            requestQueue = null;
        }
    }

    /**
     * Python {@code check_rate_limit(..., priority=0)}.
     */
    public RateLimitResult checkRateLimit(String requestId, int tokensRequired) {
        return checkRateLimit(requestId, tokensRequired, 0);
    }

    public RateLimitResult checkRateLimit(String requestId, int tokensRequired, int priority) {
        if (!config.isEnabled()) {
            return RateLimitResult.ALLOWED;
        }
        recordMetric("rate_limit_check", "checking");
        synchronized (lock) {
            Admission a = evaluateAdmission(tokensRequired);
            if (a == Admission.BACKOFF) {
                recordMetric("rate_limit_check", "backoff");
                return RateLimitResult.BACKOFF;
            }
            if (a == Admission.MUST_WAIT) {
                if (!config.isEnableQueuing() || requestQueue == null) {
                    return RateLimitResult.REJECTED;
                }
                if (requestQueue.enqueue(requestId, tokensRequired, priority, null)) {
                    recordMetric("rate_limit_check", "queued");
                    return RateLimitResult.QUEUED;
                }
                return RateLimitResult.REJECTED;
            }
            recordMetric("rate_limit_check", "allowed");
            return RateLimitResult.ALLOWED;
        }
    }

    /**
     * Blocks until admission (immediate ALLOWED, or QUEUED then promoted by {@link #processQueue}), or throws {@link RateLimitError}.
     */
    public void blockUntilAdmitted(String requestId, int tokensRequired, int priority, long maxWaitMs) throws InterruptedException {
        if (!config.isEnabled()) {
            return;
        }
        RateLimitResult r = checkRateLimit(requestId, tokensRequired, priority);
        if (r == RateLimitResult.ALLOWED) {
            return;
        }
        if (r == RateLimitResult.REJECTED) {
            throw new RateLimitError("Request rejected due to rate limiting");
        }
        if (r == RateLimitResult.BACKOFF) {
            throw RateLimitError.withBackoff(
                    "Request requires backoff: " + getBackoffDelay() + "s",
                    getBackoffDelay());
        }
        long deadline = System.currentTimeMillis() + Math.max(1, maxWaitMs);
        while (System.currentTimeMillis() < deadline) {
            List<String> ready = processQueue(100);
            if (ready.contains(requestId)) {
                return;
            }
            Thread.sleep(25);
        }
        removeQueued(requestId);
        throw new RateLimitError("Rate limit queue wait timeout");
    }

    /**
     * Python {@code process_queue}: dequeue head while limits allow; returns request ids that may proceed (caller should {@link #consumeTokens}).
     */
    public List<String> processQueue(int maxItems) {
        if (!config.isEnabled() || !config.isEnableQueuing() || requestQueue == null) {
            return List.of();
        }
        List<String> processed = new ArrayList<>();
        synchronized (lock) {
            for (int i = 0; i < maxItems; i++) {
                QueuedRequest head = requestQueue.peek();
                if (head == null) {
                    break;
                }
                Admission a = evaluateAdmission(head.tokensRequired());
                if (a == Admission.BACKOFF) {
                    break;
                }
                if (a == Admission.MUST_WAIT) {
                    break;
                }
                QueuedRequest removed = requestQueue.dequeue();
                if (removed != null) {
                    processed.add(removed.requestId());
                }
            }
        }
        if (!processed.isEmpty()) {
            log.debug("Processed {} queued requests", processed.size());
        }
        return processed;
    }

    public boolean removeQueued(String requestId) {
        synchronized (lock) {
            return requestQueue != null && requestQueue.remove(requestId);
        }
    }

    private Admission evaluateAdmission(int tokensRequired) {
        if (shouldBackoff()) {
            return Admission.BACKOFF;
        }
        if (!checkConcurrentLimit()) {
            return Admission.MUST_WAIT;
        }
        if (tokensRequired > 0 && tokenBucket != null && !tokenBucket.peek(tokensRequired)) {
            return Admission.MUST_WAIT;
        }
        if (requestBucket != null && !requestBucket.peek(1)) {
            return Admission.MUST_WAIT;
        }
        return Admission.ALLOWED;
    }

    public boolean consumeTokens(String requestId, int tokensUsed) {
        if (!config.isEnabled()) {
            return true;
        }
        synchronized (lock) {
            boolean okReq = requestBucket == null || requestBucket.consume(1);
            boolean okTok = tokensUsed <= 0 || tokenBucket == null || tokenBucket.consume(tokensUsed);
            if (okReq && okTok) {
                activeRequests.put(requestId, Instant.now());
                requestCount++;
                return true;
            }
            return false;
        }
    }

    public void releaseRequest(String requestId, boolean success) {
        synchronized (lock) {
            activeRequests.remove(requestId);
            if (config.isAdaptiveLimits()) {
                if (success) {
                    consecutiveFailures = 0;
                    consecutiveSuccesses++;
                    if (consecutiveSuccesses >= config.getSuccessResetThreshold()) {
                        consecutiveSuccesses = 0;
                        log.debug("Adaptive limits: sustained success threshold reached for {}", provider);
                    }
                } else {
                    consecutiveSuccesses = 0;
                    consecutiveFailures++;
                    lastFailureTime = Instant.now();
                    if (consecutiveFailures >= config.getFailureThreshold()) {
                        log.debug("Adaptive limits: failure threshold reached for {}", provider);
                    }
                }
            }
        }
    }

    public double getBackoffDelay() {
        if (!config.isEnabled() || consecutiveFailures <= 0) {
            return 0;
        }
        return backoffCalculator.calculate(consecutiveFailures - 1);
    }

    private boolean shouldBackoff() {
        if (!config.isAdaptiveLimits() || consecutiveFailures == 0 || lastFailureTime == null) {
            return false;
        }
        double delay = getBackoffDelay();
        if (delay <= 0) {
            return false;
        }
        double elapsed = (Instant.now().toEpochMilli() - lastFailureTime.toEpochMilli()) / 1000.0;
        return elapsed < delay;
    }

    private boolean checkConcurrentLimit() {
        if (providerLimits == null) {
            return true;
        }
        return activeRequests.size() < providerLimits.getConcurrentRequests();
    }

    private void recordMetric(String name, String result) {
        if (metrics != null) {
            metrics.recordCustomMetric(name, 1, Map.of("provider", provider, "result", result));
        }
    }

    public Map<String, Object> getStatus() {
        if (!config.isEnabled()) {
            return Map.of(
                    "enabled", false,
                    "provider", provider,
                    "provider_tier", config.getProviderTier() != null ? config.getProviderTier() : "");
        }
        synchronized (lock) {
            Map<String, Object> status = new HashMap<>();
            status.put("enabled", true);
            status.put("provider", provider);
            status.put("provider_tier", config.getProviderTier() != null ? config.getProviderTier() : "");
            status.put("request_count", requestCount);
            status.put("consecutive_failures", consecutiveFailures);
            status.put("consecutive_successes", consecutiveSuccesses);
            status.put("active_requests", activeRequests.size());
            status.put("backoff_delay", getBackoffDelay());
            status.put("in_backoff", shouldBackoff());
            if (requestBucket != null) {
                status.put("request_bucket", requestBucket.getStatus());
            }
            if (tokenBucket != null) {
                status.put("token_bucket", tokenBucket.getStatus());
            }
            if (requestQueue != null) {
                status.put("queue", requestQueue.getStats());
            }
            return status;
        }
    }

    public void reset() {
        synchronized (lock) {
            consecutiveFailures = 0;
            consecutiveSuccesses = 0;
            lastFailureTime = null;
            requestCount = 0;
            activeRequests.clear();
            if (requestBucket != null) {
                requestBucket.reset();
            }
            if (tokenBucket != null) {
                tokenBucket.reset();
            }
            if (requestQueue != null) {
                requestQueue.clear();
            }
            backoffCalculator.reset();
        }
    }
}
