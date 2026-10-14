package com.manager.health;

import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Getter
@EqualsAndHashCode
@ToString
@Builder
public class HealthStatus {
    @Builder.Default
    private final boolean overallHealthy;
    @Builder.Default
    private final List<String> healthyProviders;
    @Builder.Default
    private final List<String> unhealthyProviders;
    @Builder.Default
    private final List<String> degradedProviders;
    @Builder.Default
    private final Map<String, ProviderHealth> providerDetails;
    private final Instant lastCheck;
    @Builder.Default
    private final int totalProviders;

    private HealthStatus(
            boolean overallHealthy,
            List<String> healthyProviders,
            List<String> unhealthyProviders,
            List<String> degradedProviders,
            Map<String, ProviderHealth> providerDetails,
            Instant lastCheck,
            int totalProviders) {
        this.overallHealthy = overallHealthy;
        this.healthyProviders = healthyProviders == null ? List.of() : List.copyOf(healthyProviders);
        this.unhealthyProviders = unhealthyProviders == null ? List.of() : List.copyOf(unhealthyProviders);
        this.degradedProviders = degradedProviders == null ? List.of() : List.copyOf(degradedProviders);
        this.providerDetails = providerDetails == null ? Map.of() : Map.copyOf(providerDetails);
        this.lastCheck = lastCheck;
        this.totalProviders = totalProviders;
    }
}
