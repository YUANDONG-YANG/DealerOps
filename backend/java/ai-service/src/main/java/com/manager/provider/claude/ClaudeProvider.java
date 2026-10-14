package com.manager.provider.claude;

import com.manager.core.AIResponse;
import com.manager.core.Message;
import com.manager.exception.ContextWindowExceededError;
import com.manager.exception.InvalidAPIKeyError;
import com.manager.exception.InvalidParameterError;
import com.manager.exception.InsufficientPermissionsError;
import com.manager.exception.MissingCredentialsError;
import com.manager.exception.ModelNotFoundError;
import com.manager.exception.ProviderError;
import com.manager.exception.ProviderMaintenanceError;
import com.manager.exception.ProviderOverloadedError;
import com.manager.exception.ProviderServiceError;
import com.manager.exception.ProviderTimeoutError;
import com.manager.exception.RequestRateLimitError;
import com.manager.provider.AbstractProvider;
import com.manager.registry.ModelRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
public class ClaudeProvider extends AbstractProvider {

    private static final String BASE_URL = "https://api.anthropic.com";
    private static final String API_VERSION = "2023-06-01";
    private static final int DEFAULT_MAX_TOKENS = 4096;

    private final WebClient webClient;
    private final int maxTokensDefault;
    private final boolean enableCaching;

    public ClaudeProvider(String model, String apiKey, Map<String, Object> config) {
        super(model, validateKey(apiKey));
        this.maxTokensDefault = intFrom(config.get("max_tokens"), DEFAULT_MAX_TOKENS);
        this.enableCaching = boolFrom(config.get("enable_caching"), true);
        this.webClient = WebClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("x-api-key", getApiKey())
                .defaultHeader("anthropic-version", API_VERSION)
                .build();
    }

    private static String validateKey(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new MissingCredentialsError("Claude API key is required", "api_key");
        }
        if (apiKey.length() < 20) {
            throw new InvalidAPIKeyError("Claude API key too short");
        }
        if (!apiKey.startsWith("sk-ant-") && !apiKey.startsWith("sk-")) {
            throw new InvalidAPIKeyError("Invalid Claude API key format. Must start with 'sk-ant-' or 'sk-'");
        }
        return apiKey;
    }

    @Override
    public AIResponse complete(List<Message> messages, boolean enableReasoning, Map<String, Object> options) {
        String resolvedModel = resolveClaudeModel(strOr(options.get("model"), getModel()));
        int maxTokens = intFrom(options.get("max_tokens"), maxTokensDefault);
        double temperature = doubleFrom(options.get("temperature"), 0.7);

        Prepared prepared = prepareMessages(messages);

        var bodyBuilder = ClaudeMessageRequest.builder()
                .model(resolvedModel)
                .maxTokens(maxTokens)
                .messages(prepared.messages())
                .temperature(temperature)
                .stream(false);

        if (prepared.system() != null) {
            bodyBuilder.system(prepared.system());
        }
        if (options.containsKey("top_p")) {
            bodyBuilder.topP(doubleFrom(options.get("top_p"), 1.0));
        }

        ClaudeMessageRequest body = bodyBuilder.build();

        long start = System.currentTimeMillis();
        ClaudeMessageResponse response = webClient.post()
                .uri("/v1/messages")
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, this::map4xx)
                .onStatus(HttpStatusCode::is5xxServerError, this::map5xx)
                .bodyToMono(ClaudeMessageResponse.class)
                .blockOptional()
                .orElseThrow(() -> new ProviderServiceError("Empty response from Claude API", "claude"));

        double latency = System.currentTimeMillis() - start;
        return mapResponse(response, resolvedModel, latency);
    }

    @Override
    public Stream<AIResponse> stream(List<Message> messages, Map<String, Object> options) {
        String resolvedModel = resolveClaudeModel(strOr(options.get("model"), getModel()));
        int maxTokens = intFrom(options.get("max_tokens"), maxTokensDefault);
        double temperature = doubleFrom(options.get("temperature"), 0.7);
        Prepared prepared = prepareMessages(messages);

        var bodyBuilder = ClaudeMessageRequest.builder()
                .model(resolvedModel)
                .maxTokens(maxTokens)
                .messages(prepared.messages())
                .temperature(temperature)
                .stream(true);
        if (prepared.system() != null) {
            bodyBuilder.system(prepared.system());
        }
        if (options.containsKey("top_p")) {
            bodyBuilder.topP(doubleFrom(options.get("top_p"), 1.0));
        }
        ClaudeMessageRequest body = bodyBuilder.build();

        long t0 = System.currentTimeMillis();
        Flux<String> flux = webClient.post()
                .uri("/v1/messages")
                .bodyValue(body)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, this::map4xx)
                .onStatus(HttpStatusCode::is5xxServerError, this::map5xx)
                .bodyToFlux(String.class);

        return ClaudeStreamingSupport.toResponseStream(flux, resolvedModel, t0, this::estimateCost);
    }

    @Override
    public int countTokens(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        return Math.max(1, text.length() / 4);
    }

    @Override
    public Map<String, String> getModels(boolean real, boolean aliases) {
        Map<String, String> reg = ModelRegistry.getInstance().getModelListing("claude", real, aliases);
        if (!reg.isEmpty()) {
            return reg;
        }
        Map<String, String> m = new LinkedHashMap<>();
        if (aliases) {
            m.put("latest", "Claude (claude-3-5-sonnet-20241022)");
            m.put("current", "Claude (claude-3-5-sonnet-20241022)");
            m.put("fast", "Claude (claude-3-5-haiku-20241022)");
            m.put("reasoning", "Claude reasoning alias");
        }
        if (real) {
            m.put("claude-3-5-sonnet-20241022", "Claude Model: claude-3-5-sonnet-20241022");
            m.put("claude-3-5-haiku-20241022", "Claude Model: claude-3-5-haiku-20241022");
        }
        return Map.copyOf(m);
    }

    @Override
    public boolean validateModel(String modelName) {
        ModelRegistry reg = ModelRegistry.getInstance();
        if (reg.resolveAlias("claude", modelName) != null) {
            return true;
        }
        if (reg.isModelAvailable("claude", modelName)) {
            return true;
        }
        return getModels(true, true).containsKey(modelName);
    }

    private static String resolveClaudeModel(String raw) {
        if (raw == null) {
            return null;
        }
        String r = ModelRegistry.getInstance().resolveAlias("claude", raw);
        return r != null ? r : raw;
    }

    @Override
    public double estimateCost(int inputTokens, int outputTokens) {
        return (inputTokens / 1_000_000.0) * 3.0 + (outputTokens / 1_000_000.0) * 15.0;
    }

    @Override
    public Map<String, Object> getCapabilities() {
        return Map.of(
                "streaming", true,
                "reasoning_mode", true,
                "max_context_tokens", 200_000,
                "provider", "claude",
                "caching_enabled", enableCaching
        );
    }

    private AIResponse mapResponse(ClaudeMessageResponse r, String modelUsed, double latencyMs) {
        String content = "";
        if (r.getContent() != null) {
            content = r.getContent().stream()
                    .filter(b -> b.getText() != null)
                    .map(ClaudeMessageResponse.ContentBlock::getText)
                    .collect(Collectors.joining());
        }
        int inTok = r.getUsage() != null ? r.getUsage().getInputTokens() : 0;
        int outTok = r.getUsage() != null ? r.getUsage().getOutputTokens() : 0;
        int cached = r.getUsage() != null && r.getUsage().getCacheReadInputTokens() != null
                ? r.getUsage().getCacheReadInputTokens() : 0;
        int reasoning = r.getUsage() != null && r.getUsage().getCacheCreationInputTokens() != null
                ? r.getUsage().getCacheCreationInputTokens() : 0;

        Map<String, Object> meta = new LinkedHashMap<>();
        meta.put("api_version", "claude");
        meta.put("caching_enabled", enableCaching);

        return AIResponse.builder()
                .content(content)
                .provider("claude")
                .model(modelUsed)
                .timestamp(Instant.now())
                .inputTokens(inTok)
                .outputTokens(outTok)
                .cachedTokens(cached)
                .reasoningTokens(reasoning)
                .tokensUsed(inTok + outTok + reasoning)
                .costEstimate(estimateCost(inTok, outTok))
                .latencyMs(latencyMs)
                .finishReason(r.getStopReason() != null ? r.getStopReason() : "stop")
                .metadata(meta)
                .build();
    }

    private Mono<? extends Throwable> map4xx(ClientResponse response) {
        return response.bodyToMono(String.class)
                .defaultIfEmpty("")
                .map(body -> {
                    int status = response.statusCode().value();
                    if (status == 401) {
                        return new InvalidAPIKeyError("Invalid Claude API key");
                    }
                    if (status == 403) {
                        return new InsufficientPermissionsError("Claude API access denied");
                    }
                    if (status == 429) {
                        String ra = response.headers().asHttpHeaders().getFirst("retry-after");
                        Integer retry = null;
                        if (ra != null) {
                            try {
                                retry = Integer.parseInt(ra);
                            } catch (NumberFormatException ignored) {
                            }
                        }
                        return new RequestRateLimitError("Claude rate limit exceeded", retry);
                    }
                    if (status == 404) {
                        return new ModelNotFoundError("Claude API not found: " + body, null, null);
                    }
                    if (status == 400) {
                        String bl = body.toLowerCase();
                        if (bl.contains("maximum context length") || bl.contains("context length")) {
                            return new ContextWindowExceededError("Claude context length exceeded");
                        }
                        if (bl.contains("model")) {
                            return new InvalidParameterError("Claude model error: " + body);
                        }
                    }
                    return new ProviderError("Claude API error (" + status + "): " + body, "claude");
                });
    }

    private Mono<? extends Throwable> map5xx(ClientResponse response) {
        return response.bodyToMono(String.class)
                .defaultIfEmpty("")
                .map(body -> {
                    int s = response.statusCode().value();
                    if (s == 503) {
                        return new ProviderMaintenanceError("Claude temporarily unavailable: " + body, "claude");
                    }
                    if (s == 504) {
                        return new ProviderTimeoutError("Claude gateway timeout: " + body, "claude");
                    }
                    if (s == 502) {
                        return new ProviderOverloadedError("Claude bad gateway: " + body, "claude");
                    }
                    return new ProviderServiceError("Claude server error (" + s + "): " + body, "claude");
                });
    }

    private record Prepared(List<ClaudeMessageRequest.ClaudeMessage> messages, String system) {
    }

    private Prepared prepareMessages(List<Message> messages) {
        List<String> systemParts = new ArrayList<>();
        List<ClaudeMessageRequest.ClaudeMessage> conv = new ArrayList<>();
        for (Message m : messages) {
            if ("system".equals(m.getRole())) {
                systemParts.add(m.getContent());
            } else if ("user".equals(m.getRole()) || "assistant".equals(m.getRole())) {
                conv.add(new ClaudeMessageRequest.ClaudeMessage(m.getRole(), (Object) m.getContent()));
            }
        }
        String system = systemParts.isEmpty() ? null : String.join("\n\n", systemParts);
        return new Prepared(conv, system);
    }

    private static int intFrom(Object o, int def) {
        if (o == null) return def;
        if (o instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(o.toString());
        } catch (NumberFormatException e) {
            return def;
        }
    }

    private static double doubleFrom(Object o, double def) {
        if (o == null) return def;
        if (o instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(o.toString());
        } catch (NumberFormatException e) {
            return def;
        }
    }

    private static boolean boolFrom(Object o, boolean def) {
        if (o == null) return def;
        if (o instanceof Boolean b) return b;
        return Boolean.parseBoolean(o.toString());
    }

    private static String strOr(Object o, String def) {
        return o == null ? def : o.toString();
    }
}
