package com.manager.session;

import com.manager.core.AIResponse;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Fluent request builder (Python {@code ChainableRequest}).
 */
public class ChainableRequest {

    private final Conversation conversation;
    private final String prompt;
    private final Map<String, Object> parameters = new HashMap<>();

    ChainableRequest(Conversation conversation, String prompt) {
        this.conversation = conversation;
        this.prompt = prompt;
    }

    public ChainableRequest withTemperature(double temperature) {
        parameters.put("temperature", temperature);
        return this;
    }

    public ChainableRequest withMaxTokens(int maxTokens) {
        parameters.put("max_tokens", maxTokens);
        return this;
    }

    public ChainableRequest withReasoning(boolean enable) {
        parameters.put("enable_reasoning", enable);
        return this;
    }

    public ChainableRequest withParam(String key, Object value) {
        parameters.put(key, value);
        return this;
    }

    public ChainableRequest attachFile(String filePath) throws IOException {
        return attachFile(filePath, null);
    }

    /** Python {@code attach_file(path, description=None)}. */
    public ChainableRequest attachFile(String filePath, String description) throws IOException {
        conversation.addFile(filePath, description, null);
        return this;
    }

    /** Attach multiple files (Python-style batch). */
    public ChainableRequest attachFiles(List<String> filePaths) throws IOException {
        if (filePaths != null) {
            for (String path : filePaths) {
                if (path != null && !path.isBlank()) {
                    attachFile(path, null);
                }
            }
        }
        return this;
    }

    public AIResponse send() {
        boolean enableReasoning = Boolean.TRUE.equals(parameters.get("enable_reasoning"));
        Map<String, Object> params = new HashMap<>(parameters);
        params.remove("enable_reasoning");
        return conversation.executeRequest(prompt, enableReasoning, params);
    }
}
