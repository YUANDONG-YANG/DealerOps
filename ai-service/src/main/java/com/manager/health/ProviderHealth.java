package com.manager.health;

import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

import java.time.Instant;
import java.util.List;

@Getter
@EqualsAndHashCode
@ToString
@Builder
public class ProviderHealth {
    private final String providerName;
    @Builder.Default
    private final HealthState state = HealthState.UNKNOWN;
    private final Instant lastCheck;
    @Builder.Default
    private final double responseTimeMs = 0.0;
    @Builder.Default
    private final double successRate = 0.0;
    @Builder.Default
    private final int errorCount = 0;
    @Builder.Default
    private final int consecutiveFailures = 0;
    private final String lastError;
    @Builder.Default
    private final CircuitState circuitBreakerState = CircuitState.CLOSED;
    @Builder.Default
    private final boolean available = true;
    @Builder.Default
    private final List<Boolean> recentChecks = List.of();
    @Builder.Default
    private final double avgResponseTime = 0.0;
}
