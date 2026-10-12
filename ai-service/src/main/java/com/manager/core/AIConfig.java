package com.manager.core;

import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Getter
@EqualsAndHashCode
@ToString
@Builder(toBuilder = true)
public class AIConfig {

    private final Double temperature;
    private final Integer maxTokens;
    private final Double topP;
    @Builder.Default
    private final boolean educationalMode;
    @Builder.Default
    private final boolean verboseLogging;
    @Builder.Default
    private final boolean conversationLogging;
    @Builder.Default
    private final boolean autoExtractArtifacts;
    @Builder.Default
    private final String logLevel;
    private final String logFormat;
    private final Integer rateLimitRequests;
    @Builder.Default
    private final int maxHistoryLength;
    @Builder.Default
    private final int maxConcurrentRequests;
    @Builder.Default
    private final Map<String, Map<String, Object>> providerConfig = Map.of();

    private static Map<String, Map<String, Object>> deepCopyProviderConfig(Map<String, Map<String, Object>> src) {
        return src.entrySet().stream()
                .collect(Collectors.toUnmodifiableMap(Map.Entry::getKey, e -> Map.copyOf(e.getValue())));
    }

    public Object getProviderSetting(String provider, String setting, Object defaultVal) {
        Map<String, Object> m = providerConfig.get(provider);
        return m == null ? defaultVal : m.getOrDefault(setting, defaultVal);
    }

    /**
     * Python {@code set_provider_setting} — returns a new immutable instance; does not mutate this object.
     */
    public AIConfig withProviderSetting(String provider, String setting, Object value) {
        if (provider == null || provider.isBlank() || setting == null) {
            return this;
        }
        Map<String, Map<String, Object>> merged = new HashMap<>();
        providerConfig.forEach((k, v) -> merged.put(k, new HashMap<>(v)));
        merged.computeIfAbsent(provider, k -> new HashMap<>()).put(setting, value);
        Map<String, Map<String, Object>> frozen = merged.entrySet().stream()
                .collect(Collectors.toUnmodifiableMap(Map.Entry::getKey, e -> Map.copyOf(e.getValue())));
        return toBuilder().providerConfig(frozen).build();
    }

    public AIConfig mergeWith(AIConfig other) {
        Map<String, Map<String, Object>> merged = new HashMap<>();
        providerConfig.forEach((k, v) -> merged.put(k, new HashMap<>(v)));
        other.providerConfig.forEach((k, v) ->
                merged.merge(k, new HashMap<>(v), (a, b) -> {
                    a.putAll(b);
                    return a;
                }));
        Map<String, Map<String, Object>> frozen = merged.entrySet().stream()
                .collect(Collectors.toUnmodifiableMap(Map.Entry::getKey, e -> Map.copyOf(e.getValue())));

        return AIConfig.builder()
                .temperature(other.temperature != null ? other.temperature : temperature)
                .maxTokens(other.maxTokens != null ? other.maxTokens : maxTokens)
                .topP(other.topP != null ? other.topP : topP)
                .educationalMode(other.educationalMode)
                .verboseLogging(other.verboseLogging)
                .conversationLogging(other.conversationLogging)
                .autoExtractArtifacts(other.autoExtractArtifacts)
                .logLevel(!"INFO".equals(other.logLevel) ? other.logLevel : logLevel)
                .logFormat(other.logFormat != null ? other.logFormat : logFormat)
                .rateLimitRequests(other.rateLimitRequests != null ? other.rateLimitRequests : rateLimitRequests)
                .maxHistoryLength(other.maxHistoryLength)
                .maxConcurrentRequests(other.maxConcurrentRequests)
                .providerConfig(frozen)
                .build();
    }

    /** Flat map for provider ctor (Python **config.__dict__). */
    public Map<String, Object> toProviderKwargs() {
        Map<String, Object> m = new HashMap<>();
        if (temperature != null) m.put("temperature", temperature);
        if (maxTokens != null) m.put("max_tokens", maxTokens);
        if (topP != null) m.put("top_p", topP);
        m.put("educational_mode", educationalMode);
        m.put("verbose_logging", verboseLogging);
        m.put("conversation_logging", conversationLogging);
        m.put("auto_extract_artifacts", autoExtractArtifacts);
        m.put("log_level", logLevel);
        if (logFormat != null) m.put("log_format", logFormat);
        if (rateLimitRequests != null) m.put("rate_limit_requests", rateLimitRequests);
        m.put("max_history_length", maxHistoryLength);
        m.put("max_concurrent_requests", maxConcurrentRequests);
        m.put("provider_config", new HashMap<>(providerConfig != null ? providerConfig : Map.of()));
        return m;
    }

    /**
     * Python {@code AIConfig(**kwargs)} merged onto this instance (only keys present in {@code kwargs} override).
     * Keys use snake_case like {@code max_tokens}, {@code top_p}, {@code rate_limit_requests}, etc.
     */
    public AIConfig mergePythonKwargs(Map<String, Object> kwargs) {
        if (kwargs == null || kwargs.isEmpty()) {
            return this;
        }
        Map<String, Map<String, Object>> newPc = mergeProviderConfigPatch(kwargs.get("provider_config"));
        return AIConfig.builder()
                .temperature(override("temperature", kwargs, temperature, AIConfig::asDouble))
                .maxTokens(override("max_tokens", kwargs, maxTokens, AIConfig::asInteger))
                .topP(override("top_p", kwargs, topP, AIConfig::asDouble))
                .educationalMode(kwargs.containsKey("educational_mode") ? asBool(kwargs.get("educational_mode")) : educationalMode)
                .verboseLogging(kwargs.containsKey("verbose_logging") ? asBool(kwargs.get("verbose_logging")) : verboseLogging)
                .conversationLogging(kwargs.containsKey("conversation_logging") ? asBool(kwargs.get("conversation_logging")) : conversationLogging)
                .autoExtractArtifacts(kwargs.containsKey("auto_extract_artifacts") ? asBool(kwargs.get("auto_extract_artifacts")) : autoExtractArtifacts)
                .logLevel(kwargs.containsKey("log_level") ? String.valueOf(kwargs.get("log_level")) : logLevel)
                .logFormat(kwargs.containsKey("log_format")
                        ? (kwargs.get("log_format") == null ? null : String.valueOf(kwargs.get("log_format")))
                        : logFormat)
                .rateLimitRequests(override("rate_limit_requests", kwargs, rateLimitRequests, AIConfig::asInteger))
                .maxHistoryLength(kwargs.containsKey("max_history_length") ? asInt(kwargs.get("max_history_length"), maxHistoryLength) : maxHistoryLength)
                .maxConcurrentRequests(kwargs.containsKey("max_concurrent_requests")
                        ? asInt(kwargs.get("max_concurrent_requests"), maxConcurrentRequests) : maxConcurrentRequests)
                .providerConfig(newPc != null ? newPc : providerConfig)
                .build();
    }

    @SuppressWarnings("unchecked")
    private Map<String, Map<String, Object>> mergeProviderConfigPatch(Object patch) {
        if (patch == null) {
            return null;
        }
        if (!(patch instanceof Map<?, ?> raw)) {
            return null;
        }
        Map<String, Map<String, Object>> merged = new HashMap<>();
        providerConfig.forEach((k, v) -> merged.put(k, new HashMap<>(v)));
        for (Map.Entry<?, ?> e : raw.entrySet()) {
            String prov = String.valueOf(e.getKey());
            Object v = e.getValue();
            if (v instanceof Map<?, ?> inner) {
                Map<String, Object> bucket = merged.computeIfAbsent(prov, x -> new HashMap<>());
                inner.forEach((ik, iv) -> bucket.put(String.valueOf(ik), iv));
            }
        }
        return merged.entrySet().stream()
                .collect(Collectors.toUnmodifiableMap(Map.Entry::getKey, e -> Map.copyOf(e.getValue())));
    }

    private static <T> T override(String key, Map<String, Object> kwargs, T current, Function<Object, T> conv) {
        if (!kwargs.containsKey(key)) {
            return current;
        }
        return conv.apply(kwargs.get(key));
    }

    private static Double asDouble(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof Number n) {
            return n.doubleValue();
        }
        try {
            return Double.parseDouble(o.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static Integer asInteger(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof Number n) {
            return n.intValue();
        }
        try {
            return Integer.parseInt(o.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static boolean asBool(Object o) {
        if (o instanceof Boolean b) {
            return b;
        }
        return Boolean.parseBoolean(String.valueOf(o));
    }

    private static int asInt(Object o, int def) {
        Integer x = asInteger(o);
        return x != null ? x : def;
    }
}
