package com.manager.provider;

import com.manager.core.AIResponse;
import com.manager.core.Message;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

public interface BaseAIProvider {

    AIResponse complete(List<Message> messages, boolean enableReasoning, Map<String, Object> options);

    default AIResponse complete(List<Message> messages) {
        return complete(messages, false, Map.of());
    }

    default AIResponse complete(List<Message> messages, boolean enableReasoning) {
        return complete(messages, enableReasoning, Map.of());
    }

    Stream<AIResponse> stream(List<Message> messages, Map<String, Object> options);

    default Stream<AIResponse> stream(List<Message> messages) {
        return stream(messages, Map.of());
    }

    int countTokens(String text);

    Map<String, String> getModels(boolean real, boolean aliases);

    default Map<String, String> getModels() {
        return getModels(true, true);
    }

    boolean validateModel(String model);

    default double estimateCost(int inputTokens, int outputTokens) {
        return 0.0;
    }

    Map<String, Object> getCapabilities();

    String getModel();

    void setModel(String model);

    String getApiKey();

    void setApiKey(String apiKey);
}
