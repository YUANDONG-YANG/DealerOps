package com.manager.health;

import com.manager.core.Message;
import com.manager.exception.CircuitBreakerOpenException;
import com.manager.provider.BaseAIProvider;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Simplified port of Python {@code HealthChecker}: register providers, optional circuit breaker, manual check.
 */
@Slf4j
public class HealthChecker {

    private final boolean enableCircuitBreakers;
    private final CircuitBreakerConfig circuitConfig;

    private final Map<String, BaseAIProvider> providers = new ConcurrentHashMap<>();
    private final Map<String, ProviderHealth> healthMap = new ConcurrentHashMap<>();
    private final Map<String, CircuitBreaker> breakers = new ConcurrentHashMap<>();

    private final Object monitorLock = new Object();
    private volatile ScheduledExecutorService monitoringScheduler;
    private volatile ScheduledFuture<?> monitoringFuture;

    @Getter
    private volatile boolean monitoringActive;

    /** Python {@code HealthChecker} default interval (seconds). */
    @Getter
    private final int checkIntervalSeconds;

    /** Python {@code timeout_seconds} for individual checks. */
    @Getter
    private final int timeoutSeconds;

    public HealthChecker(List<String> providerNames, boolean enableCircuitBreakers, CircuitBreakerConfig circuitConfig) {
        this(providerNames, 30, 10, enableCircuitBreakers, circuitConfig);
    }

    /**
     * Python {@code HealthChecker(providers, check_interval_seconds=..., timeout_seconds=..., ...)}.
     * {@code AIManager} uses 60 / 10 in {@code manager.py}.
     */
    public HealthChecker(
            List<String> providerNames,
            int checkIntervalSeconds,
            int timeoutSeconds,
            boolean enableCircuitBreakers,
            CircuitBreakerConfig circuitConfig) {
        this.checkIntervalSeconds = checkIntervalSeconds;
        this.timeoutSeconds = timeoutSeconds;
        this.enableCircuitBreakers = enableCircuitBreakers;
        this.circuitConfig = circuitConfig != null ? circuitConfig : CircuitBreakerConfig.builder().build();
        for (String p : providerNames) {
            healthMap.putIfAbsent(p, ProviderHealth.builder().providerName(p).build());
        }
    }

    public void registerProvider(String name, BaseAIProvider instance) {
        providers.put(name, instance);
        healthMap.putIfAbsent(name, ProviderHealth.builder().providerName(name).build());
        if (enableCircuitBreakers) {
            breakers.putIfAbsent(name, new CircuitBreaker(name + "_circuit", circuitConfig));
        }
    }

    /** Removes a vendor from monitoring maps (e.g. after runtime provider switch). */
    public void unregisterProvider(String name) {
        if (name == null || name.isBlank()) {
            return;
        }
        providers.remove(name);
        breakers.remove(name);
        healthMap.remove(name);
    }

    /**
     * Lightweight check: optional call through circuit breaker with a tiny prompt.
     */
    public ProviderHealth checkProvider(String name) {
        BaseAIProvider p = providers.get(name);
        var hb = ProviderHealth.builder().providerName(name).lastCheck(Instant.now());
        ProviderHealth result;
        if (p == null) {
            result = hb.state(HealthState.UNKNOWN).available(false).build();
        } else {
            CircuitBreaker cb = breakers.get(name);
            try {
                if (cb != null && !cb.isAvailable()) {
                    result = hb.state(HealthState.UNHEALTHY).available(false).circuitBreakerState(CircuitState.OPEN).build();
                } else if (cb != null) {
                    cb.call(() -> {
                        p.complete(List.of(Message.builder().role("user").content("ping").build()), false, Map.of("max_tokens", 8));
                        return true;
                    });
                    result = hb.state(HealthState.HEALTHY).available(true).circuitBreakerState(cb.getState()).build();
                } else {
                    p.complete(List.of(Message.builder().role("user").content("ping").build()), false, Map.of("max_tokens", 8));
                    result = hb.state(HealthState.HEALTHY).available(true).circuitBreakerState(CircuitState.CLOSED).build();
                }
            } catch (CircuitBreakerOpenException e) {
                result = hb.state(HealthState.UNHEALTHY).available(false).circuitBreakerState(CircuitState.OPEN).build();
            } catch (Exception e) {
                log.warn("Health check failed for {}: {}", name, e.getMessage());
                result = hb.state(HealthState.UNHEALTHY).available(false).lastError(e.getMessage()).build();
            }
        }
        healthMap.put(name, result);
        return result;
    }

    public HealthStatus checkAllProviders() {
        Map<String, ProviderHealth> details = new LinkedHashMap<>();
        List<String> healthy = new ArrayList<>();
        List<String> unhealthy = new ArrayList<>();
        for (String name : providers.keySet()) {
            ProviderHealth h = checkProvider(name);
            details.put(name, h);
            healthMap.put(name, h);
            if (h.getState() == HealthState.HEALTHY) {
                healthy.add(name);
            } else if (h.getState() == HealthState.UNHEALTHY) {
                unhealthy.add(name);
            }
        }
        return HealthStatus.builder()
                .overallHealthy(!healthy.isEmpty() && unhealthy.isEmpty())
                .healthyProviders(healthy)
                .unhealthyProviders(unhealthy)
                .degradedProviders(List.of())
                .providerDetails(details)
                .lastCheck(Instant.now())
                .totalProviders(details.size())
                .build();
    }

    /**
     * Python {@code start_monitoring}: periodic {@link #checkAllProviders()} and refresh {@link #healthMap}.
     */
    public void startMonitoring() {
        synchronized (monitorLock) {
            if (monitoringActive) {
                log.warn("Health monitoring already active");
                return;
            }
            monitoringScheduler = Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "aimanager-health-monitor");
                t.setDaemon(true);
                return t;
            });
            monitoringFuture = monitoringScheduler.scheduleAtFixedRate(() -> {
                try {
                    HealthStatus st = checkAllProviders();
                    st.getProviderDetails().forEach(healthMap::put);
                } catch (Exception e) {
                    log.warn("Health monitoring tick failed: {}", e.getMessage());
                }
            }, 0, checkIntervalSeconds, TimeUnit.SECONDS);
            monitoringActive = true;
            log.info("Health monitoring started (interval={}s)", checkIntervalSeconds);
        }
    }

    /**
     * Python {@code stop_monitoring}.
     */
    public void stopMonitoring() {
        synchronized (monitorLock) {
            if (!monitoringActive) {
                return;
            }
            monitoringActive = false;
            if (monitoringFuture != null) {
                monitoringFuture.cancel(false);
                monitoringFuture = null;
            }
            if (monitoringScheduler != null) {
                monitoringScheduler.shutdown();
                try {
                    if (!monitoringScheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                        monitoringScheduler.shutdownNow();
                    }
                } catch (InterruptedException e) {
                    monitoringScheduler.shutdownNow();
                    Thread.currentThread().interrupt();
                }
                monitoringScheduler = null;
            }
            log.info("Health monitoring stopped");
        }
    }

    /** Last known health per provider (updated by monitoring or manual checks if you merge externally). */
    public Map<String, ProviderHealth> getHealthSnapshot() {
        return Map.copyOf(healthMap);
    }
}
