package com.manager.provider.openai;

import com.manager.core.AIResponse;
import com.manager.core.Message;
import com.manager.exception.ContextWindowExceededError;
import com.manager.exception.InvalidAPIKeyError;
import com.manager.exception.MissingCredentialsError;
import com.manager.exception.InsufficientPermissionsError;
import com.manager.exception.InvalidParameterError;
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
import java.util.stream.Stream;

/**
 * OpenAI Chat Completions via WebClient (Python {@code openai.OpenAI} equivalent).
 */
@Slf4j
public class OpenAIProvider extends AbstractProvider {

    private final WebClient webClient;
    private final int maxTokensDefault;

    public OpenAIProvider(String model, String apiKey, Map<String, Object> config) {
        super(model, requireApiKey(apiKey));
        this.maxTokensDefault = intFrom(config.get("max_tokens"), 4096);
        this.webClient = WebClient.builder()
                .baseUrl(getApiBase())
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    protected String getApiBase() {
        return "https://api.openai.com";
    }

    protected String getProviderId() {
        return "openai";
    }

    private static String requireApiKey(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new MissingCredentialsError("API key is required", "api_key");
        }
        return apiKey;
    }

    @Override
    public AIResponse complete(List<Message> messages, boolean enableReasoning, Map<String, Object> options) {
        String resolvedModel = resolveOpenAiModel(strOr(options.get("model"), getModel()));
        int maxTokens = intFrom(options.get("max_tokens"), maxTokensDefault);
        double temperature = doubleFrom(options.get("temperature"), 0.7);

        List<Map<String, String>> chatMessages = new ArrayList<>();
        for (Message m : messages) {
            if ("system".equals(m.getRole()) || "user".equals(m.getRole()) || "assistant".equals(m.getRole())) {
                chatMessages.add(Map.of("role", m.getRole(), "content", m.getContent()));
            }
        }

        Double topP = options.containsKey("top_p") ? doubleFrom(options.get("top_p"), 1.0) : null;
        Map<String, Object> body = OpenAiStreamingSupport.chatBodyBase(resolvedModel, chatMessages, maxTokens, temperature, topP, false);

        long start = System.currentTimeMillis();
        OpenAiChatResponse resp = webClient.post()
                .uri("/v1/chat/completions")
                .bodyValue(body)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, this::map4xx)
                .onStatus(HttpStatusCode::is5xxServerError, this::map5xx)
                .bodyToMono(OpenAiChatResponse.class)
                .blockOptional()
                .orElseThrow(() -> new ProviderServiceError("Empty response from OpenAI API", getProviderId()));

        double latency = System.currentTimeMillis() - start;
        return mapResponse(resp, resolvedModel, latency);
    }

    @Override
    public Stream<AIResponse> stream(List<Message> messages, Map<String, Object> options) {
        String resolvedModel = resolveOpenAiModel(strOr(options.get("model"), getModel()));
        int maxTokens = intFrom(options.get("max_tokens"), maxTokensDefault);
        double temperature = doubleFrom(options.get("temperature"), 0.7);
        Double topP = options.containsKey("top_p") ? doubleFrom(options.get("top_p"), 1.0) : null;

        List<Map<String, String>> chatMessages = new ArrayList<>();
        for (Message m : messages) {
            if ("system".equals(m.getRole()) || "user".equals(m.getRole()) || "assistant".equals(m.getRole())) {
                chatMessages.add(Map.of("role", m.getRole(), "content", m.getContent()));
            }
        }

        Map<String, Object> body = OpenAiStreamingSupport.chatBodyBase(resolvedModel, chatMessages, maxTokens, temperature, topP, true);
        if ("openai".equals(getProviderId())) {
            body.put("stream_options", Map.of("include_usage", true));
        }

        long t0 = System.currentTimeMillis();
        Flux<String> flux = webClient.post()
                .uri("/v1/chat/completions")
                .bodyValue(body)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, this::map4xx)
                .onStatus(HttpStatusCode::is5xxServerError, this::map5xx)
                .bodyToFlux(String.class);

        return OpenAiStreamingSupport.toResponseStream(flux, resolvedModel, getProviderId(), t0, this::estimateCost);
    }

    @Override
    public int countTokens(String text) {
        return text == null || text.isEmpty() ? 0 : Math.max(1, text.length() / 4);
    }

    @Override
    public Map<String, String> getModels(boolean real, boolean aliases) {
        Map<String, String> reg = ModelRegistry.getInstance().getModelListing(getProviderId(), real, aliases);
        if (!reg.isEmpty()) {
            return reg;
        }
        return legacyModels(real, aliases);
    }

    /**
     * Used when {@code models.json} has no entries for this provider id.
     */
    protected Map<String, String> legacyModels(boolean real, boolean aliases) {
        Map<String, String> m = new LinkedHashMap<>();
        if (aliases) {
            m.put("latest", "OpenAI (gpt-4o)");
            m.put("current", "OpenAI (gpt-4o)");
        }
        if (real) {
            m.put("gpt-4o", "GPT-4o");
            m.put("gpt-4o-mini", "GPT-4o mini");
            m.put("gpt-4-turbo", "GPT-4 Turbo");
            m.put("gpt-4", "GPT-4");
            m.put("gpt-3.5-turbo", "GPT-3.5 Turbo");
        }
        return Map.copyOf(m);
    }

    @Override
    public boolean validateModel(String modelName) {
        ModelRegistry reg = ModelRegistry.getInstance();
        String pid = getProviderId();
        if (reg.resolveAlias(pid, modelName) != null) {
            return true;
        }
        if (reg.isModelAvailable(pid, modelName)) {
            return true;
        }
        return legacyModels(true, true).containsKey(modelName);
    }

    private String resolveOpenAiModel(String raw) {
        if (raw == null) {
            return null;
        }
        String r = ModelRegistry.getInstance().resolveAlias(getProviderId(), raw);
        return r != null ? r : raw;
    }

    @Override
    public double estimateCost(int inputTokens, int outputTokens) {
        return (inputTokens / 1_000_000.0) * 2.5 + (outputTokens / 1_000_000.0) * 10.0;
    }

    @Override
    public Map<String, Object> getCapabilities() {
        return Map.of("provider", "openai", "streaming", true, "function_calling", true);
    }

    private AIResponse mapResponse(OpenAiChatResponse r, String modelUsed, double latencyMs) {
        String content = "";
        String finish = "stop";
        if (r.getChoices() != null && !r.getChoices().isEmpty()) {
            OpenAiChatResponse.Choice c = r.getChoices().get(0);
            if (c.getMessage() != null && c.getMessage().getContent() != null) {
                content = c.getMessage().getContent();
            }
            if (c.getFinishReason() != null) {
                finish = c.getFinishReason();
            }
        }
        int inTok = r.getUsage() != null ? r.getUsage().getPromptTokens() : 0;
        int outTok = r.getUsage() != null ? r.getUsage().getCompletionTokens() : 0;
        int total = r.getUsage() != null ? r.getUsage().getTotalTokens() : inTok + outTok;

        return AIResponse.builder()
                .content(content)
                .provider(getProviderId())
                .model(modelUsed)
                .timestamp(Instant.now())
                .inputTokens(inTok)
                .outputTokens(outTok)
                .tokensUsed(total)
                .costEstimate(estimateCost(inTok, outTok))
                .latencyMs(latencyMs)
                .finishReason(finish)
                .metadata(Map.of("api", getProviderId() + "-chat-completions"))
                .build();
    }

    private Mono<? extends Throwable> map4xx(ClientResponse response) {
        return response.bodyToMono(String.class)
                .defaultIfEmpty("")
                .map(body -> {
                    int status = response.statusCode().value();
                    String pid = getProviderId();
                    if (status == 401) {
                        return new InvalidAPIKeyError("Invalid " + pid + " API key");
                    }
                    if (status == 403) {
                        return new InsufficientPermissionsError(pid + " API access denied");
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
                        return new RequestRateLimitError(pid + " rate limit exceeded", retry);
                    }
                    if (status == 404) {
                        return new ModelNotFoundError(pid + " API not found: " + body, null, null);
                    }
                    if (status == 400) {
                        String bl = body.toLowerCase();
                        if (bl.contains("context") && (bl.contains("length") || bl.contains("window"))) {
                            return new ContextWindowExceededError(pid + " context length exceeded");
                        }
                        if (bl.contains("model")) {
                            return new InvalidParameterError(pid + " model error: " + body);
                        }
                    }
                    return new ProviderError(pid + " API error (" + status + "): " + body, pid);
                });
    }

    private Mono<? extends Throwable> map5xx(ClientResponse response) {
        return response.bodyToMono(String.class)
                .defaultIfEmpty("")
                .map(body -> {
                    String pid = getProviderId();
                    int s = response.statusCode().value();
                    if (s == 503) {
                        return new ProviderMaintenanceError(pid + " temporarily unavailable: " + body, pid);
                    }
                    if (s == 504) {
                        return new ProviderTimeoutError(pid + " gateway timeout: " + body, pid);
                    }
                    if (s == 502) {
                        return new ProviderOverloadedError(pid + " bad gateway: " + body, pid);
                    }
                    return new ProviderServiceError(pid + " server error (" + s + "): " + body, pid);
                });
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

    private static String strOr(Object o, String def) {
        return o == null ? def : o.toString();
    }
}
