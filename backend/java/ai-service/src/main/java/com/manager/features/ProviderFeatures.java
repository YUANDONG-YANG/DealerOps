package com.manager.features;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Port of Python {@code PROVIDER_FEATURES}, {@code FEATURE_CATEGORIES}, and helper functions in {@code features.py}.
 */
public final class ProviderFeatures {

    private static final Map<String, Map<String, Object>> FEATURES = new HashMap<>();

    /** Mirrors Python {@code FEATURE_CATEGORIES}. */
    private static final Map<String, List<String>> FEATURE_CATEGORIES = new LinkedHashMap<>();

    static {
        FEATURE_CATEGORIES.put("core", List.of(
                "stateless_requests", "stateful_conversations", "streaming", "reasoning_mode", "function_calling"));
        FEATURE_CATEGORIES.put("content_types", List.of(
                "text_input", "image_input", "file_attachments", "pdf_processing", "document_parsing"));
        FEATURE_CATEGORIES.put("advanced", List.of(
                "system_messages", "message_caching", "artifact_generation", "code_execution", "web_search"));
        FEATURE_CATEGORIES.put("model_capabilities", List.of(
                "max_context_tokens", "max_output_tokens", "supports_json_mode", "supports_stop_sequences"));
        FEATURE_CATEGORIES.put("rate_limiting", List.of(
                "requests_per_minute", "tokens_per_minute", "concurrent_requests"));

        FEATURES.put("claude", features(
                entry("stateless_requests", true),
                entry("stateful_conversations", true),
                entry("streaming", true),
                entry("reasoning_mode", true),
                entry("function_calling", true),
                entry("text_input", true),
                entry("image_input", true),
                entry("file_attachments", true),
                entry("pdf_processing", true),
                entry("document_parsing", true),
                entry("system_messages", true),
                entry("message_caching", true),
                entry("artifact_generation", true),
                entry("code_execution", false),
                entry("web_search", false),
                entry("max_context_tokens", 200_000),
                entry("max_output_tokens", 4096),
                entry("supports_json_mode", false),
                entry("supports_stop_sequences", true),
                entry("requests_per_minute", 1000),
                entry("tokens_per_minute", 80_000),
                entry("concurrent_requests", 5),
                entry("available_models", List.of(
                        "claude-3-5-sonnet-20241022",
                        "claude-3-5-haiku-20241022",
                        "claude-3-opus-20240229",
                        "claude-3-sonnet-20240229",
                        "claude-3-haiku-20240307")),
                entry("thinking_trace", true),
                entry("tool_use", true),
                entry("vision_models", List.of("claude-3-5-sonnet-20241022")),
                entry("reasoning_models", List.of("claude-3-5-sonnet-20241022")),
                entry("input_cost_per_1m", 3.0),
                entry("output_cost_per_1m", 15.0),
                entry("quality_tier", "premium"),
                entry("response_quality", "excellent"),
                entry("coding_capability", "excellent"),
                entry("reasoning_capability", "excellent")
        ));
        FEATURES.put("openai", features(
                entry("stateless_requests", true),
                entry("stateful_conversations", true),
                entry("streaming", true),
                entry("reasoning_mode", true),
                entry("function_calling", true),
                entry("text_input", true),
                entry("image_input", true),
                entry("file_attachments", true),
                entry("pdf_processing", false),
                entry("document_parsing", true),
                entry("system_messages", true),
                entry("message_caching", false),
                entry("artifact_generation", true),
                entry("code_execution", true),
                entry("web_search", true),
                entry("max_context_tokens", 128_000),
                entry("max_output_tokens", 4096),
                entry("supports_json_mode", true),
                entry("supports_stop_sequences", true),
                entry("requests_per_minute", 3500),
                entry("tokens_per_minute", 200_000),
                entry("concurrent_requests", 20),
                entry("available_models", List.of(
                        "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo",
                        "o1-preview", "o1-mini")),
                entry("reasoning_models", List.of("o1-preview", "o1-mini")),
                entry("vision_models", List.of("gpt-4o", "gpt-4-turbo", "gpt-4")),
                entry("json_mode_models", List.of("gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo")),
                entry("function_calling_models", List.of("gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo")),
                entry("input_cost_per_1m", 2.5),
                entry("output_cost_per_1m", 10.0),
                entry("quality_tier", "premium"),
                entry("response_quality", "excellent"),
                entry("coding_capability", "excellent"),
                entry("reasoning_capability", "excellent")
        ));
        FEATURES.put("deepseek", features(
                entry("stateless_requests", true),
                entry("stateful_conversations", true),
                entry("streaming", true),
                entry("reasoning_mode", true),
                entry("function_calling", true),
                entry("text_input", true),
                entry("image_input", false),
                entry("file_attachments", true),
                entry("pdf_processing", false),
                entry("document_parsing", false),
                entry("system_messages", true),
                entry("message_caching", false),
                entry("artifact_generation", true),
                entry("code_execution", false),
                entry("web_search", false),
                entry("max_context_tokens", 64_000),
                entry("max_output_tokens", 8192),
                entry("supports_json_mode", true),
                entry("supports_stop_sequences", true),
                entry("requests_per_minute", 600),
                entry("tokens_per_minute", 100_000),
                entry("concurrent_requests", 10),
                entry("available_models", List.of("deepseek-r1", "deepseek-chat", "deepseek-coder", "deepseek-math")),
                entry("reasoning_models", List.of("deepseek-r1")),
                entry("vision_models", List.of()),
                entry("specialized_models", List.of("deepseek-coder", "deepseek-math")),
                entry("input_cost_per_1m", 0.14),
                entry("output_cost_per_1m", 0.28),
                entry("quality_tier", "standard"),
                entry("response_quality", "very_good"),
                entry("coding_capability", "excellent"),
                entry("reasoning_capability", "very_good")
        ));
        FEATURES.put("groq", features(
                entry("stateless_requests", true),
                entry("stateful_conversations", true),
                entry("streaming", true),
                entry("reasoning_mode", true),
                entry("function_calling", true),
                entry("text_input", true),
                entry("image_input", false),
                entry("file_attachments", false),
                entry("pdf_processing", false),
                entry("document_parsing", false),
                entry("system_messages", true),
                entry("message_caching", false),
                entry("artifact_generation", true),
                entry("code_execution", false),
                entry("web_search", false),
                entry("max_context_tokens", 131_072),
                entry("max_output_tokens", 8192),
                entry("supports_json_mode", true),
                entry("supports_stop_sequences", true),
                entry("requests_per_minute", 1000),
                entry("tokens_per_minute", 120_000),
                entry("concurrent_requests", 20),
                entry("available_models", List.of(
                        "llama-3.3-70b-versatile",
                        "llama-3.1-8b-instant",
                        "mixtral-8x7b-32768",
                        "gemma2-9b-it")),
                entry("reasoning_models", List.of("llama-3.3-70b-versatile", "mixtral-8x7b-32768")),
                entry("vision_models", List.of()),
                entry("input_cost_per_1m", 0.05),
                entry("output_cost_per_1m", 0.08),
                entry("quality_tier", "standard"),
                entry("response_quality", "very_good"),
                entry("coding_capability", "very_good"),
                entry("reasoning_capability", "good")
        ));
    }

    private ProviderFeatures() {}

    @SafeVarargs
    private static Map<String, Object> features(Map.Entry<String, Object>... entries) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (Map.Entry<String, Object> e : entries) {
            m.put(e.getKey(), e.getValue());
        }
        return Collections.unmodifiableMap(m);
    }

    private static Map.Entry<String, Object> entry(String k, Object v) {
        return Map.entry(k, v);
    }

    public static Map<String, Object> getProviderFeatures(String provider) {
        return Map.copyOf(FEATURES.getOrDefault(provider, Map.of()));
    }

    /**
     * Python {@code check_feature_support}: {@code PROVIDER_FEATURES.get(provider, {}).get(feature, False)} with truthy lists/numbers.
     */
    public static boolean checkFeatureSupport(String provider, String feature) {
        Map<String, Object> f = FEATURES.get(provider);
        if (f == null) {
            return false;
        }
        if (!f.containsKey(feature)) {
            return false;
        }
        Object v = f.get(feature);
        if (v instanceof Boolean b) {
            return b;
        }
        if (v instanceof List<?> list) {
            return !list.isEmpty();
        }
        if (v instanceof Number n) {
            return n.doubleValue() != 0;
        }
        return v != null;
    }

    public static double getCostEstimate(String provider, int inputTokens, int outputTokens) {
        Map<String, Object> f = FEATURES.get(provider);
        if (f == null) {
            return 0;
        }
        double in = toDouble(f.get("input_cost_per_1m"));
        double out = toDouble(f.get("output_cost_per_1m"));
        return (inputTokens / 1_000_000.0) * in + (outputTokens / 1_000_000.0) * out;
    }

    public static Map<String, String> getQualityAssessment(String provider) {
        Map<String, Object> f = FEATURES.get(provider);
        if (f == null) {
            return Map.of();
        }
        Map<String, String> q = new HashMap<>();
        q.put("quality_tier", String.valueOf(f.getOrDefault("quality_tier", "unknown")));
        q.put("response_quality", String.valueOf(f.getOrDefault("response_quality", "unknown")));
        q.put("coding_capability", String.valueOf(f.getOrDefault("coding_capability", "unknown")));
        q.put("reasoning_capability", String.valueOf(f.getOrDefault("reasoning_capability", "unknown")));
        return Collections.unmodifiableMap(q);
    }

    /** Python {@code get_context_limits} style: always both keys, default 0. */
    public static Map<String, Integer> getContextLimits(String provider) {
        Map<String, Object> f = FEATURES.get(provider);
        int maxCtx = f == null ? 0 : intOrZero(f.get("max_context_tokens"));
        int maxOut = f == null ? 0 : intOrZero(f.get("max_output_tokens"));
        return Map.of("max_context_tokens", maxCtx, "max_output_tokens", maxOut);
    }

    /** Python {@code get_model_capabilities}. */
    public static Map<String, Object> getModelCapabilities(String provider, String model) {
        Map<String, Object> providerFeatures = FEATURES.getOrDefault(provider, Map.of());
        Map<String, Object> capabilities = new LinkedHashMap<>();
        putIfNonNull(capabilities, "max_context_tokens", providerFeatures.get("max_context_tokens"));
        putIfNonNull(capabilities, "max_output_tokens", providerFeatures.get("max_output_tokens"));
        putIfNonNull(capabilities, "supports_json_mode", providerFeatures.get("supports_json_mode"));
        putIfNonNull(capabilities, "supports_stop_sequences", providerFeatures.get("supports_stop_sequences"));
        Object am = providerFeatures.get("available_models");
        if (am != null) {
            capabilities.put("available_models", am);
        }
        if (model != null && !model.isBlank()) {
            List<String> reasoning = asStringList(providerFeatures.get("reasoning_models"));
            List<String> vision = asStringList(providerFeatures.get("vision_models"));
            capabilities.put("supports_reasoning", reasoning.contains(model));
            capabilities.put("supports_vision", vision.contains(model));
            capabilities.put("model_specific", true);
        }
        return Collections.unmodifiableMap(capabilities);
    }

    /** Python {@code get_feature_comparison}. */
    public static Map<String, Object> getFeatureComparison(String feature) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<String, Map<String, Object>> e : FEATURES.entrySet()) {
            Object v = e.getValue().get(feature);
            out.put(e.getKey(), v != null ? v : Boolean.FALSE);
        }
        return Collections.unmodifiableMap(out);
    }

    /** Python {@code get_providers_with_feature}. */
    public static List<String> getProvidersWithFeature(String feature, Object expected) {
        List<String> out = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> e : FEATURES.entrySet()) {
            if (Objects.equals(e.getValue().get(feature), expected)) {
                out.add(e.getKey());
            }
        }
        return Collections.unmodifiableList(out);
    }

    /**
     * Python {@code get_feature_matrix(category=None)} — all providers or filtered by category keys.
     */
    public static Map<String, Map<String, Object>> getFeatureMatrix(String category) {
        if (category != null && FEATURE_CATEGORIES.containsKey(category)) {
            List<String> keys = FEATURE_CATEGORIES.get(category);
            Map<String, Map<String, Object>> out = new LinkedHashMap<>();
            for (Map.Entry<String, Map<String, Object>> e : FEATURES.entrySet()) {
                Map<String, Object> slice = new LinkedHashMap<>();
                for (String k : keys) {
                    slice.put(k, e.getValue().containsKey(k) ? e.getValue().get(k) : Boolean.FALSE);
                }
                out.put(e.getKey(), Collections.unmodifiableMap(slice));
            }
            return Collections.unmodifiableMap(out);
        }
        Map<String, Map<String, Object>> copy = new LinkedHashMap<>();
        FEATURES.forEach((k, v) -> copy.put(k, Map.copyOf(v)));
        return Collections.unmodifiableMap(copy);
    }

    /** Python {@code get_recommended_provider} (subset). */
    public static String getRecommendedProvider(Map<String, Object> requirements) {
        if (requirements == null || requirements.isEmpty()) {
            return null;
        }
        List<String> required = castStringList(requirements.getOrDefault("required_features", List.of()));
        List<String> preferred = castStringList(requirements.getOrDefault("preferred_features", List.of()));
        String qualityPreference = requirements.get("quality_tier") != null
                ? requirements.get("quality_tier").toString() : null;
        String costPreference = requirements.getOrDefault("cost_preference", "balanced").toString();

        List<Map.Entry<String, Integer>> scored = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> e : FEATURES.entrySet()) {
            String provider = e.getKey();
            Map<String, Object> feat = e.getValue();
            int score = 0;
            boolean disqualified = false;
            for (String f : required) {
                if (!isTruthy(feat.get(f))) {
                    disqualified = true;
                    break;
                }
                score += 10;
            }
            if (disqualified) {
                continue;
            }
            for (String f : preferred) {
                if (checkFeatureSupport(provider, f)) {
                    score += 5;
                }
            }
            if (qualityPreference != null && qualityPreference.equals(String.valueOf(feat.get("quality_tier")))) {
                score += 15;
            }
            double inputCost = toDouble(feat.get("input_cost_per_1m"));
            if ("low_cost".equals(costPreference) && inputCost < 1.0) {
                score += 10;
            } else if ("premium".equals(costPreference) && inputCost > 2.0) {
                score += 5;
            }
            scored.add(Map.entry(provider, score));
        }
        return scored.stream().max(Comparator.comparingInt(Map.Entry::getValue)).map(Map.Entry::getKey).orElse(null);
    }

    private static List<String> castStringList(Object o) {
        if (o instanceof List<?> l) {
            return l.stream().filter(Objects::nonNull).map(Object::toString).toList();
        }
        return List.of();
    }

    private static boolean isTruthy(Object v) {
        if (v == null) {
            return false;
        }
        if (v instanceof Boolean b) {
            return b;
        }
        if (v instanceof Number n) {
            return n.doubleValue() != 0;
        }
        if (v instanceof List<?> l) {
            return !l.isEmpty();
        }
        return true;
    }

    public static List<String> validateProviderConfig(String provider, Map<String, Object> config) {
        List<String> warnings = new ArrayList<>();
        Map<String, Object> f = FEATURES.get(provider);
        if (f == null) {
            warnings.add("Unknown provider: " + provider);
            return warnings;
        }
        Object maxTok = config.get("max_tokens");
        if (maxTok instanceof Number n) {
            Integer maxOut = toInt(f.get("max_output_tokens"));
            if (maxOut != null && n.intValue() > maxOut) {
                warnings.add("max_tokens (" + n + ") exceeds provider limit (" + maxOut + ")");
            }
        }
        if (Boolean.TRUE.equals(config.get("json_mode")) && !Boolean.TRUE.equals(f.get("supports_json_mode"))) {
            warnings.add("JSON mode requested but not supported by provider");
        }
        if (Boolean.TRUE.equals(config.get("enable_reasoning")) && !Boolean.TRUE.equals(f.get("reasoning_mode"))) {
            warnings.add("Reasoning mode requested but not supported by provider");
        }
        if (config.containsKey("functions") && !Boolean.TRUE.equals(f.get("function_calling"))) {
            warnings.add("Function calling requested but not supported by provider");
        }
        return warnings;
    }

    public static Map<String, Number> getRateLimits(String provider) {
        Map<String, Object> f = FEATURES.get(provider);
        if (f == null) {
            return Map.of();
        }
        Map<String, Number> m = new LinkedHashMap<>();
        m.put("requests_per_minute", toNumber(f.get("requests_per_minute"), 0));
        m.put("tokens_per_minute", toNumber(f.get("tokens_per_minute"), 0));
        m.put("concurrent_requests", toNumber(f.get("concurrent_requests"), 0));
        return Collections.unmodifiableMap(m);
    }

    @SuppressWarnings("unchecked")
    public static List<String> getSupportedModels(String provider) {
        Object v = FEATURES.getOrDefault(provider, Map.of()).get("available_models");
        if (v instanceof List<?> l) {
            return l.stream().filter(Objects::nonNull).map(Object::toString).collect(Collectors.toUnmodifiableList());
        }
        return List.of();
    }

    public static boolean supportsReasoning(String provider, String model) {
        Map<String, Object> f = FEATURES.get(provider);
        if (f == null || !Boolean.TRUE.equals(f.get("reasoning_mode"))) {
            return false;
        }
        List<String> rm = asStringList(f.get("reasoning_models"));
        if (rm.isEmpty()) {
            return true;
        }
        return model != null && rm.contains(model);
    }

    public static boolean supportsVision(String provider, String model) {
        Map<String, Object> f = FEATURES.get(provider);
        if (f == null || !Boolean.TRUE.equals(f.get("image_input"))) {
            return false;
        }
        List<String> vm = asStringList(f.get("vision_models"));
        if (vm.isEmpty()) {
            return true;
        }
        return model != null && vm.contains(model);
    }

    private static void putIfNonNull(Map<String, Object> m, String k, Object v) {
        if (v != null) {
            m.put(k, v);
        }
    }

    private static List<String> asStringList(Object o) {
        if (o instanceof List<?> l) {
            return l.stream().filter(Objects::nonNull).map(Object::toString).toList();
        }
        return List.of();
    }

    private static Number toNumber(Object o, int defaultInt) {
        if (o instanceof Number n) {
            return n;
        }
        return defaultInt;
    }

    private static double toDouble(Object o) {
        if (o instanceof Number n) {
            return n.doubleValue();
        }
        return 0;
    }

    private static Integer toInt(Object o) {
        if (o instanceof Number n) {
            return n.intValue();
        }
        return null;
    }

    private static int intOrZero(Object o) {
        Integer i = toInt(o);
        return i != null ? i : 0;
    }
}
