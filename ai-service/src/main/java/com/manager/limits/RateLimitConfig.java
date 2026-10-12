package com.manager.limits;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class RateLimitConfig {
    @Builder.Default boolean enabled = true;
    Integer requestsPerMinute;
    Integer tokensPerMinute;
    Integer concurrentRequests;
    Integer burstAllowance;
    @Builder.Default boolean enableQueuing = true;
    @Builder.Default int maxQueueSize = 1000;
    @Builder.Default double queueTimeout = 300.0;
    @Builder.Default boolean enablePriorities = true;
    @Builder.Default BackoffStrategy backoffStrategy = BackoffStrategy.EXPONENTIAL;
    @Builder.Default double baseDelay = 1.0;
    @Builder.Default double maxDelay = 300.0;
    @Builder.Default boolean enableJitter = true;
    @Builder.Default double jitterFactor = 0.1;
    @Builder.Default boolean useProviderDefaults = true;
    String providerTier;
    @Builder.Default boolean adaptiveLimits = false;
    @Builder.Default int failureThreshold = 5;
    @Builder.Default int successResetThreshold = 10;
}
