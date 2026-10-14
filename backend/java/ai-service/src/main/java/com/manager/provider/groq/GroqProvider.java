package com.manager.provider.groq;

import com.manager.provider.openai.OpenAIProvider;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Groq Cloud OpenAI-compatible API ({@code https://api.groq.com/openai/v1/...}).
 */
public class GroqProvider extends OpenAIProvider {

    public GroqProvider(String model, String apiKey, Map<String, Object> config) {
        super(model, apiKey, config);
    }

    @Override
    protected String getApiBase() {
        return "https://api.groq.com/openai";
    }

    @Override
    protected String getProviderId() {
        return "groq";
    }

    @Override
    protected Map<String, String> legacyModels(boolean real, boolean aliases) {
        Map<String, String> m = new LinkedHashMap<>();
        if (aliases) {
            m.put("latest", "Groq (llama-3.3-70b-versatile)");
            m.put("current", "Groq (llama-3.3-70b-versatile)");
        }
        if (real) {
            m.put("llama-3.3-70b-versatile", "Llama 3.3 70B Versatile");
            m.put("llama-3.1-8b-instant", "Llama 3.1 8B Instant");
            m.put("mixtral-8x7b-32768", "Mixtral 8x7B");
            m.put("gemma2-9b-it", "Gemma 2 9B IT");
        }
        return Map.copyOf(m);
    }

    @Override
    public double estimateCost(int inputTokens, int outputTokens) {
        // Groq pricing is low; approximate blended rate for UI/metrics only
        return (inputTokens / 1_000_000.0) * 0.05 + (outputTokens / 1_000_000.0) * 0.08;
    }

    @Override
    public Map<String, Object> getCapabilities() {
        return Map.of("provider", "groq", "streaming", true, "function_calling", true);
    }
}
