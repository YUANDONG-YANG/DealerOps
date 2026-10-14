package com.manager.provider.deepseek;

import com.manager.provider.openai.OpenAIProvider;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * DeepSeek OpenAI-compatible API.
 */
public class DeepSeekProvider extends OpenAIProvider {

    public DeepSeekProvider(String model, String apiKey, Map<String, Object> config) {
        super(model, apiKey, config);
    }

    @Override
    protected String getApiBase() {
        return "https://api.deepseek.com";
    }

    @Override
    protected String getProviderId() {
        return "deepseek";
    }

    @Override
    protected Map<String, String> legacyModels(boolean real, boolean aliases) {
        Map<String, String> m = new LinkedHashMap<>();
        if (aliases) {
            m.put("latest", "DeepSeek (deepseek-chat)");
        }
        if (real) {
            m.put("deepseek-chat", "DeepSeek Chat");
            m.put("deepseek-reasoner", "DeepSeek Reasoner");
        }
        return Map.copyOf(m);
    }

    @Override
    public double estimateCost(int inputTokens, int outputTokens) {
        return (inputTokens / 1_000_000.0) * 0.14 + (outputTokens / 1_000_000.0) * 0.28;
    }

    @Override
    public Map<String, Object> getCapabilities() {
        return Map.of("provider", "deepseek", "streaming", true);
    }
}
