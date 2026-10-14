package com.manager.provider.xai;

import com.manager.provider.openai.OpenAIProvider;

import java.util.LinkedHashMap;
import java.util.Map;

/** xAI's OpenAI-compatible Chat Completions API. */
public class XaiProvider extends OpenAIProvider {

    public XaiProvider(String model, String apiKey, Map<String, Object> config) {
        super(model, apiKey, config);
    }

    @Override
    protected String getApiBase() {
        return "https://api.x.ai";
    }

    @Override
    protected String getProviderId() {
        return "xai";
    }

    @Override
    protected Map<String, String> legacyModels(boolean real, boolean aliases) {
        Map<String, String> models = new LinkedHashMap<>();
        if (aliases) {
            models.put("latest", "xAI (grok-3-mini)");
            models.put("current", "xAI (grok-3-mini)");
        }
        if (real) {
            models.put("grok-3-mini", "Grok 3 Mini");
            models.put("grok-3", "Grok 3");
        }
        return Map.copyOf(models);
    }

    @Override
    public Map<String, Object> getCapabilities() {
        return Map.of("provider", "xai", "streaming", true, "function_calling", true);
    }
}
