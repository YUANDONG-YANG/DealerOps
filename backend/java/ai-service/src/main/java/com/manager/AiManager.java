package com.manager;

import com.manager.core.AIConfig;
import com.manager.core.AIResponse;
import com.manager.core.ArtifactExtractor;
import com.manager.core.Message;
import com.manager.exception.ConfigurationError;
import com.manager.exception.InvalidModelError;
import com.manager.exception.InvalidProviderError;
import com.manager.exception.RateLimitError;
import com.manager.features.ProviderFeatures;
import com.manager.health.CircuitBreakerConfig;
import com.manager.health.HealthChecker;
import com.manager.limits.RateLimitConfig;
import com.manager.limits.RateLimitLease;
import com.manager.limits.RateLimiter;
import com.manager.logging.AILogger;
import com.manager.logging.LogConfig;
import com.manager.metrics.AIMetrics;
import com.manager.provider.BaseAIProvider;
import com.manager.provider.ProviderFactory;
import com.manager.session.Conversation;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

/**
 * Java port of Python {@code AIManager}.
 */
@Slf4j
public class AiManager {

    /**
     * Python {@code AIManager.PROVIDER_DEFAULTS}: suggested default <em>model id</em> per vendor when none is supplied.
     * Values like {@code latest}/{@code current} are aliases resolved by the active {@link com.manager.provider.BaseAIProvider}.
     */
    public static final Map<String, String> PROVIDER_DEFAULTS = Map.of(
            "claude", "current",
            "openai", "current",
            "deepseek", "latest",
            "groq", "latest",
            "xai", "current");

    /** Human-readable labels for universal model aliases ({@code latest}, {@code current}, …). */
    public static final Map<String, String> UNIVERSAL_ALIASES = Map.of(
            "latest", "Flagship model",
            "current", "High-performance model",
            "fast", "Efficient model",
            "reasoning", "Thinking-enabled model");

    private String providerName;
    @Getter
    private AIConfig config;
    private String apiKey;
    private String model;
    private BaseAIProvider providerInstance;

    @Getter
    private final AIMetrics metrics;
    @Getter
    private final RateLimiter rateLimiter;
    @Getter
    private final HealthChecker health;

    @Getter
    private final AILogger aiLogger;

    private final Map<String, Conversation> conversations = new ConcurrentHashMap<>();

    public AiManager(String apiKey, String provider, String model) {
        this(apiKey, provider, model, AIConfig.builder().build(), null, null, null,
                false, false, null, null, false, null, null, false, null);
    }

    public AiManager(String apiKey, String provider, String model, AIConfig config) {
        this(apiKey, provider, model, config, null, null, null,
                false, false, null, null, false, null, null, false, null);
    }

    /**
     * Python {@code AIManager(..., config=config, **kwargs)} — merge snake_case kwargs into {@link AIConfig}.
     */
    public AiManager(String apiKey, String provider, String model, AIConfig config, Map<String, Object> configKwargs) {
        this(apiKey, provider, model, mergeConfigKwargs(config, configKwargs), null, null, null,
                false, false, null, null, false, null, null, false, null);
    }

    private static AIConfig mergeConfigKwargs(AIConfig base, Map<String, Object> kwargs) {
        AIConfig b = base != null ? base : AIConfig.builder().build();
        return b.mergePythonKwargs(kwargs);
    }

    /**
     * Full constructor (Python-style optional metrics / rate limit / health).
     */
    public AiManager(
            String apiKey,
            String provider,
            String model,
            AIConfig config,
            AIMetrics injectedMetrics,
            RateLimiter injectedRateLimiter,
            HealthChecker injectedHealth,
            boolean enableMetrics,
            boolean enableRateLimiting,
            RateLimitConfig rateLimitConfig,
            String providerTier,
            boolean enableHealthChecks,
            CircuitBreakerConfig circuitBreakerConfig,
            AILogger injectedAiLogger,
            boolean enableLogging,
            LogConfig logConfig) {

        if (apiKey == null || apiKey.isBlank()) {
            throw new ConfigurationError("API key is required and must be a non-empty string");
        }
        validateProvider(provider);
        this.providerName = provider;
        this.apiKey = apiKey;
        this.model = model;
        this.config = config != null ? config : AIConfig.builder().build();

        if (injectedMetrics != null) {
            this.metrics = injectedMetrics;
        } else if (enableMetrics) {
            this.metrics = new AIMetrics();
        } else {
            this.metrics = null;
        }

        initProvider();

        // Health before rate limiter so Python-style RateLimiter(..., health_checker=self.health) can receive it
        if (injectedHealth != null) {
            this.health = injectedHealth;
            this.health.registerProvider(providerName, providerInstance);
        } else if (enableHealthChecks) {
            this.health = new HealthChecker(
                    List.of(providerName),
                    60,
                    10,
                    true,
                    circuitBreakerConfig != null ? circuitBreakerConfig : CircuitBreakerConfig.builder().build());
            this.health.registerProvider(providerName, providerInstance);
        } else {
            this.health = null;
        }

        if (injectedRateLimiter != null) {
            this.rateLimiter = injectedRateLimiter;
        } else if (enableRateLimiting) {
            this.rateLimiter = new RateLimiter(
                    providerName,
                    rateLimitConfig != null ? rateLimitConfig : RateLimitConfig.builder().build(),
                    providerTier,
                    this.metrics,
                    this.health);
        } else {
            this.rateLimiter = null;
        }

        if (injectedAiLogger != null) {
            this.aiLogger = injectedAiLogger;
        } else if (enableLogging) {
            this.aiLogger = AILogger.getLogger(
                    "aimanager",
                    logConfig != null ? logConfig : LogConfig.enabledDefaults());
        } else {
            this.aiLogger = null;
        }

        log.info("AiManager initialized: {} with model {}", provider, this.model);
    }

    private static void validateProvider(String provider) {
        List<String> ok = List.of("claude", "openai", "deepseek", "groq", "xai");
        if (!ok.contains(provider)) {
            throw new InvalidProviderError(
                    "Provider '" + provider + "' not supported. Supported: " + ok,
                    provider,
                    ok);
        }
    }

    private void initProvider() {
        try {
            Map<String, Object> kwargs = new HashMap<>(config.toProviderKwargs());
            providerInstance = ProviderFactory.create(providerName, model, apiKey, kwargs);
        } catch (InvalidProviderError e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to initialize {} provider: {}", providerName, e.getMessage());
            throw new ConfigurationError("Could not initialize " + providerName + " provider: " + e.getMessage());
        }
    }

    public String getProvider() {
        return providerName;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String value) {
        if (!providerInstance.validateModel(value)) {
            throw new InvalidModelError("Model '" + value + "' not valid for provider '" + providerName + "'");
        }
        this.model = value;
        providerInstance.setModel(value);
        log.info("Model changed to: {}", value);
    }

    /**
     * Python {@code api_key} property (masked).
     */
    public String getApiKey() {
        return getApiKeyMasked();
    }

    public String getApiKeyMasked() {
        if (apiKey == null || apiKey.length() < 4) {
            return null;
        }
        return "sk-..." + apiKey.substring(apiKey.length() - 4);
    }

    public void setApiKey(String value) {
        if (value == null || value.isBlank()) {
            throw new ConfigurationError("API key must be a non-empty string");
        }
        this.apiKey = value;
        providerInstance.setApiKey(value);
        log.info("API key updated");
    }

    /**
     * Switches the active vendor at runtime: new {@link BaseAIProvider}, optional health re-registration,
     * rate-limiter provider key update, and clears all conversations (they referenced the previous provider).
     *
     * @param provider vendor id ({@code openai}, {@code claude}, {@code deepseek}, {@code groq}, {@code xai})
     * @param model    model id valid for that vendor (required)
     * @param apiKey   API key for the new vendor (required)
     */
    public synchronized void switchProvider(String provider, String model, String apiKey) {
        if (provider == null || provider.isBlank()) {
            throw new ConfigurationError("provider is required");
        }
        String p = provider.strip();
        validateProvider(p);
        if (model == null || model.isBlank()) {
            throw new ConfigurationError("model is required when switching provider");
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new ConfigurationError("apiKey is required when switching provider");
        }
        String m = model.strip();
        String k = apiKey.strip();
        String old = this.providerName;
        if (old.equals(p) && m.equals(this.model) && k.equals(this.apiKey)) {
            return;
        }
        Map<String, Object> kwargs = new HashMap<>(config.toProviderKwargs());
        BaseAIProvider next = ProviderFactory.create(p, m, k, kwargs);
        if (!next.validateModel(m)) {
            throw new InvalidModelError("Model '" + m + "' not valid for provider '" + p + "'");
        }
        for (String id : new ArrayList<>(conversations.keySet())) {
            closeConversation(id);
        }
        if (health != null && old != null && !old.isBlank()) {
            health.unregisterProvider(old);
        }
        this.providerName = p;
        this.model = m;
        this.apiKey = k;
        this.providerInstance = next;
        if (health != null) {
            health.registerProvider(providerName, providerInstance);
        }
        if (rateLimiter != null) {
            rateLimiter.updateProviderKey(providerName);
        }
        if (metrics != null) {
            metrics.recordConversation(providerName, conversations.size());
        }
        log.info("Switched AI provider from {} to {} (model={})", old, providerName, this.model);
    }

    public Map<String, String> getModels(boolean real, boolean aliases) {
        return providerInstance.getModels(real, aliases);
    }

    /** Python {@code models()} alias. */
    public Map<String, String> models(boolean real, boolean aliases) {
        return getModels(real, aliases);
    }

    public boolean validateModel(String m) {
        return providerInstance.validateModel(m);
    }

    public int countTokens(String text) {
        return providerInstance.countTokens(text);
    }

    /**
     * Python {@code get_capabilities()} — feature matrix from {@code PROVIDER_FEATURES}, not {@link BaseAIProvider#getCapabilities()}.
     */
    public Map<String, Object> getCapabilities() {
        return ProviderFeatures.getProviderFeatures(providerName);
    }

    /** Same as {@link #getCapabilities()} (Python {@code get_provider_features}). */
    public Map<String, Object> getProviderFeatures() {
        return getCapabilities();
    }

    /** Runtime capability flags from the active provider implementation. */
    public Map<String, Object> getProviderRuntimeCapabilities() {
        return providerInstance.getCapabilities();
    }

    public boolean checkFeatureSupport(String feature) {
        return ProviderFeatures.checkFeatureSupport(providerName, feature);
    }

    public Map<String, Integer> getContextLimits() {
        return ProviderFeatures.getContextLimits(providerName);
    }

    public Map<String, String> getQualityMetrics() {
        return ProviderFeatures.getQualityAssessment(providerName);
    }

    /** Python {@code get_model_capabilities}. */
    public Map<String, Object> getModelCapabilities(String model) {
        String m = model != null && !model.isBlank() ? model : this.model;
        return ProviderFeatures.getModelCapabilities(providerName, m);
    }

    /**
     * Python {@code get_feature_matrix()} — mutable copy of the current provider feature row (same source as {@link #getCapabilities()}).
     */
    public Map<String, Object> getFeatureMatrix() {
        return new HashMap<>(getCapabilities());
    }

    /** Full vendor feature matrix; equivalent to Python {@code features.get_feature_matrix(None)}. */
    public Map<String, Map<String, Object>> getAllProvidersFeatureMatrix() {
        return ProviderFeatures.getFeatureMatrix(null);
    }

    /** Slice by category; {@code category} is a built-in category key in {@link ProviderFeatures}. */
    public Map<String, Map<String, Object>> getFeatureMatrixByCategory(String category) {
        return ProviderFeatures.getFeatureMatrix(Objects.requireNonNull(category, "category"));
    }

    /** Delegates to {@link ProviderFeatures#getFeatureComparison}. */
    public Map<String, Object> getFeatureComparison(String feature) {
        return ProviderFeatures.getFeatureComparison(feature);
    }

    /** Delegates to {@link ProviderFeatures#getProvidersWithFeature}. */
    public List<String> getProvidersWithFeature(String feature, Object expected) {
        return ProviderFeatures.getProvidersWithFeature(feature, expected);
    }

    /** Delegates to {@link ProviderFeatures#getRecommendedProvider}. */
    public String getRecommendedProvider(Map<String, Object> requirements) {
        return ProviderFeatures.getRecommendedProvider(requirements);
    }

    /** Python {@code get_supported_models}. */
    public List<String> getSupportedModels() {
        return ProviderFeatures.getSupportedModels(providerName);
    }

    public boolean supportsReasoning() {
        return supportsReasoning(null);
    }

    public boolean supportsReasoning(String model) {
        String m = model != null && !model.isBlank() ? model : this.model;
        return ProviderFeatures.supportsReasoning(providerName, m);
    }

    public boolean supportsVision() {
        return supportsVision(null);
    }

    public boolean supportsVision(String model) {
        String m = model != null && !model.isBlank() ? model : this.model;
        return ProviderFeatures.supportsVision(providerName, m);
    }

    public boolean supportsStreaming() {
        return ProviderFeatures.checkFeatureSupport(providerName, "streaming");
    }

    /** Python {@code get_rate_limits}. */
    public Map<String, Number> getRateLimits() {
        return ProviderFeatures.getRateLimits(providerName);
    }

    /**
     * Python {@code estimate_cost} / {@code get_cost_estimate} only (no provider override).
     */
    public double estimateCost(int inputTokens, int outputTokens) {
        return ProviderFeatures.getCostEstimate(providerName, inputTokens, outputTokens);
    }

    public List<String> validateConfiguration() {
        Map<String, Object> cfg = new HashMap<>();
        cfg.put("max_tokens", config.getMaxTokens());
        cfg.put("temperature", config.getTemperature());
        cfg.put("top_p", config.getTopP());
        return ProviderFeatures.validateProviderConfig(providerName, cfg);
    }

    public AIResponse request(String prompt) {
        return request(prompt, false, null, null, null, Map.of());
    }

    public AIResponse request(String prompt, boolean enableReasoning,
                              Double temperature, Integer maxTokens, Double topP,
                              Map<String, Object> extra) {
        if (providerInstance == null) {
            throw new ConfigurationError("Provider not initialized");
        }

        Map<String, Object> requestParams = buildRequestParams(temperature, maxTokens, topP, extra);

        String requestId = newClientRequestId();
        int tokensEstimate = countTokens(prompt);

        try (RateLimitLease lease = RateLimitLease.maybe(rateLimiter, requestId, tokensEstimate)) {

            List<Message> messages = List.of(Message.builder().role("user").content(prompt).build());

            if (aiLogger != null) {
                aiLogger.logAiRequest(providerName, model, prompt, requestId, enableReasoning, tokensEstimate, requestParams);
            }

            Instant start = Instant.now();
            String errorType = null;
            boolean success;
            AIResponse response;
            try (AILogger.OperationScope scope = aiLogger != null
                    ? aiLogger.operation("ai_request", Map.of("provider", providerName, "model", model))
                    : AILogger.OperationScope.noop()) {
                try {
                    response = providerInstance.complete(messages, enableReasoning, requestParams);
                    success = true;
                } catch (RuntimeException e) {
                    success = false;
                    errorType = e.getClass().getSimpleName();
                    if (aiLogger != null) {
                        aiLogger.logAiError(providerName, model, e, requestId, scope.getOperationId());
                    }
                    if (metrics != null) {
                        double dur = java.time.Duration.between(start, Instant.now()).toMillis() / 1000.0;
                        metrics.recordRequest(providerName, model, dur, null, null, false, errorType);
                    }
                    throw e;
                }
            }

            long latencyMs = java.time.Duration.between(start, Instant.now()).toMillis();
            var b = response.toBuilder().latencyMs(latencyMs);

            if (config.isAutoExtractArtifacts()) {
                var extracted = ArtifactExtractor.extractFromContent(response.getContent(), providerName, model);
                if (!extracted.isEmpty()) {
                    List<com.manager.core.Artifact> merged = new java.util.ArrayList<>(response.getArtifacts());
                    merged.addAll(extracted);
                    b.artifacts(merged);
                }
            }

            AIResponse built = b.build();

            if (metrics != null) {
                metrics.recordRequest(
                        providerName,
                        model,
                        built.getLatencyMs() / 1000.0,
                        built.getTokensUsed(),
                        built.getCostEstimate(),
                        success,
                        errorType);
            }
            if (metrics != null && built.getArtifacts() != null && !built.getArtifacts().isEmpty()) {
                metrics.recordArtifacts(providerName, model, built.getArtifacts());
            }
            if (metrics != null) {
                metrics.recordConversation(providerName, conversations.size());
            }

            if (aiLogger != null) {
                int artifactCount = built.getArtifacts() != null ? built.getArtifacts().size() : 0;
                aiLogger.logAiResponse(
                        providerName,
                        model,
                        built.getContent() != null ? built.getContent().length() : 0,
                        built.getTokensUsed(),
                        built.getCostEstimate(),
                        built.getLatencyMs(),
                        requestId,
                        enableReasoning,
                        artifactCount);
            }

            log.info("Request completed: {} chars, {} tokens, {}ms",
                    built.getContent() != null ? built.getContent().length() : 0,
                    built.getTokensUsed(),
                    built.getLatencyMs());
            lease.markSuccess();
            return built;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RateLimitError("Interrupted while waiting in rate limit queue");
        }
    }

    public Stream<AIResponse> requestStream(String prompt, Map<String, Object> extra) {
        return requestStream(
                prompt,
                false,
                null,
                null,
                null,
                null,
                1024,
                false,
                null,
                null,
                extra);
    }

    /**
     * Python {@code request_stream} parameter surface (values merged into provider {@code stream} kwargs).
     */
    public Stream<AIResponse> requestStream(
            String prompt,
            boolean enableReasoning,
            Double temperature,
            Integer maxTokens,
            Double topP,
            List<String> stopSequences,
            int streamChunkSize,
            boolean includeUsageInChunks,
            Double timeout,
            Map<String, Object> messageMetadata,
            Map<String, Object> extra) {
        if (providerInstance == null) {
            throw new ConfigurationError("Provider not initialized");
        }
        Map<String, Object> requestParams = buildRequestParams(temperature, maxTokens, topP, extra != null ? extra : Map.of());
        if (stopSequences != null && !stopSequences.isEmpty()) {
            requestParams.put("stop", stopSequences);
        }
        if (enableReasoning) {
            requestParams.put("enable_reasoning", true);
        }
        if (timeout != null) {
            requestParams.put("timeout", timeout);
        }
        requestParams.put("stream_chunk_size", streamChunkSize);
        requestParams.put("include_usage_in_chunks", includeUsageInChunks);

        Message user = Message.builder()
                .role("user")
                .content(prompt)
                .metadata(messageMetadata != null && !messageMetadata.isEmpty() ? messageMetadata : Map.of())
                .build();
        List<Message> messages = List.of(user);

        String streamRateId = newClientRequestId();
        int streamTokensEstimate = countTokens(prompt);
        final RateLimitLease streamLease;
        try {
            streamLease = RateLimitLease.maybe(rateLimiter, streamRateId, streamTokensEstimate);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RateLimitError("Interrupted while waiting in rate limit queue");
        }

        log.info("Streaming request: {} chars, reasoning={}", prompt.length(), enableReasoning);
        Stream<AIResponse> stream = providerInstance.stream(messages, requestParams);
        final int[] chunkCount = {0};
        Stream<AIResponse> peeked = stream.peek(r -> chunkCount[0]++);
        return peeked.onClose(() -> {
            if (metrics != null) {
                metrics.recordStreaming(providerName, model, chunkCount[0]);
            }
            streamLease.markSuccess();
            streamLease.close();
        });
    }

    private Map<String, Object> buildRequestParams(Double temperature, Integer maxTokens, Double topP, Map<String, Object> extra) {
        Map<String, Object> requestParams = new HashMap<>();
        if (temperature != null) {
            requestParams.put("temperature", temperature);
        } else if (config.getTemperature() != null) {
            requestParams.put("temperature", config.getTemperature());
        }
        if (maxTokens != null) {
            requestParams.put("max_tokens", maxTokens);
        } else if (config.getMaxTokens() != null) {
            requestParams.put("max_tokens", config.getMaxTokens());
        }
        if (topP != null) {
            requestParams.put("top_p", topP);
        } else if (config.getTopP() != null) {
            requestParams.put("top_p", config.getTopP());
        }
        if (extra != null) {
            requestParams.putAll(extra);
        }
        requestParams.put("model", model);
        return requestParams;
    }

    public Conversation startConversation() {
        return startConversation(null, null);
    }

    public Conversation startConversation(String conversationId, String systemMessage) {
        return startConversation(conversationId, systemMessage, null);
    }

    /** Python {@code start_conversation(..., **kwargs)} — kwargs become conversation {@link Conversation#getMetadata()}. */
    public Conversation startConversation(String conversationId, String systemMessage, Map<String, Object> conversationKwargs) {
        Conversation c = new Conversation(providerInstance, config, conversationId, systemMessage, conversationKwargs, rateLimiter);
        conversations.put(c.getConversationId(), c);
        if (metrics != null) {
            metrics.recordConversation(providerName, conversations.size());
        }
        return c;
    }

    public Conversation getConversation(String id) {
        return conversations.get(id);
    }

    public List<String> getActiveConversationIds() {
        return List.copyOf(conversations.keySet());
    }

    /** Python {@code get_active_conversations}. */
    public List<String> getActiveConversations() {
        return getActiveConversationIds();
    }

    public void closeConversation(String id) {
        conversations.remove(id);
        if (metrics != null) {
            metrics.recordConversation(providerName, conversations.size());
        }
    }

    public BaseAIProvider getProviderInstance() {
        return providerInstance;
    }

    private String newClientRequestId() {
        return providerName + "_" + System.nanoTime();
    }

    @Override
    public String toString() {
        return "AIManager(provider=" + providerName + ", model=" + model + ")";
    }
}
