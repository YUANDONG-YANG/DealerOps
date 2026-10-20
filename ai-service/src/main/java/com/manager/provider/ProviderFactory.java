package com.manager.provider;

import com.manager.exception.InvalidProviderError;
import com.manager.provider.claude.ClaudeProvider;
import com.manager.provider.deepseek.DeepSeekProvider;
import com.manager.provider.groq.GroqProvider;
import com.manager.provider.openai.OpenAIProvider;
import com.manager.provider.xai.XaiProvider;

import java.util.List;
import java.util.Map;

public final class ProviderFactory {

    private ProviderFactory() {}

    public static BaseAIProvider create(String providerName, String model, String apiKey, Map<String, Object> config) {
        return switch (providerName) {
            case "claude" -> new ClaudeProvider(model, apiKey, config);
            case "openai" -> new OpenAIProvider(model, apiKey, config);
            case "deepseek" -> new DeepSeekProvider(model, apiKey, config);
            case "groq" -> new GroqProvider(model, apiKey, config);
            case "xai" -> new XaiProvider(model, apiKey, config);
            default -> throw new InvalidProviderError(
                    "Provider '" + providerName + "' not supported. Supported: claude, openai, deepseek, groq, xai",
                    providerName,
                    List.of("claude", "openai", "deepseek", "groq", "xai"));
        };
    }

    public static BaseAIProvider create(String providerName, String model, String apiKey) {
        return create(providerName, model, apiKey, Map.of());
    }
}
