package com.manager.limits;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Default RPM/TPM per provider tier (Python {@code ai.limits.providers}).
 */
public final class ProviderLimitsRegistry {

    private static final Map<String, Map<String, ProviderLimits>> LIMITS = new LinkedHashMap<>();

    static {
        Map<String, ProviderLimits> claude = new LinkedHashMap<>();
        claude.put("free", ProviderLimits.builder().requestsPerMinute(5).tokensPerMinute(1_000).concurrentRequests(1).burstAllowance(2).build());
        claude.put("pro", ProviderLimits.builder().requestsPerMinute(50).tokensPerMinute(40_000).concurrentRequests(5).burstAllowance(10).build());
        claude.put("team", ProviderLimits.builder().requestsPerMinute(100).tokensPerMinute(100_000).concurrentRequests(10).burstAllowance(20).build());
        LIMITS.put("claude", claude);

        Map<String, ProviderLimits> openai = new LinkedHashMap<>();
        openai.put("tier1", ProviderLimits.builder().requestsPerMinute(500).tokensPerMinute(30_000).concurrentRequests(10).burstAllowance(20).build());
        LIMITS.put("openai", openai);

        Map<String, ProviderLimits> deepseek = new LinkedHashMap<>();
        deepseek.put("pro", ProviderLimits.builder().requestsPerMinute(100).tokensPerMinute(50_000).concurrentRequests(10).burstAllowance(20).build());
        LIMITS.put("deepseek", deepseek);

        Map<String, ProviderLimits> groq = new LinkedHashMap<>();
        groq.put("pro", ProviderLimits.builder().requestsPerMinute(200).tokensPerMinute(120_000).concurrentRequests(15).burstAllowance(30).build());
        LIMITS.put("groq", groq);
    }

    private ProviderLimitsRegistry() {}

    public static Optional<ProviderLimits> get(String provider, String tier) {
        Map<String, ProviderLimits> tiers = LIMITS.get(provider);
        if (tiers == null) {
            return Optional.empty();
        }
        if (tier != null && tiers.containsKey(tier)) {
            return Optional.of(tiers.get(tier));
        }
        for (String fallback : List.of("default", "pro", "team", "tier1")) {
            if (tiers.containsKey(fallback)) {
                return Optional.of(tiers.get(fallback));
            }
        }
        return tiers.values().stream().findFirst();
    }
}
