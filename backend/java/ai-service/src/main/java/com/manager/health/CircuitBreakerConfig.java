package com.manager.health;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class CircuitBreakerConfig {
    @Builder.Default int failureThreshold = 5;
    @Builder.Default int recoveryTimeout = 60;
    @Builder.Default int successThreshold = 3;
    @Builder.Default double timeout = 30.0;
    @Builder.Default int halfOpenMaxCalls = 3;
    @Builder.Default int resetTimeout = 300;
    @Builder.Default double failureRateThreshold = 0.5;
}
