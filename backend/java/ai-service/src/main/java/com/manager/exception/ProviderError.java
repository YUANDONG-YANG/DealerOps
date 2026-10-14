package com.manager.exception;

import lombok.Getter;

import java.util.Map;

@Getter
public class ProviderError extends AIError {
    private final String provider;

    public ProviderError(String message) {
        this(message, null, Map.of());
    }

    public ProviderError(String message, String provider) {
        this(message, provider, Map.of());
    }

    public ProviderError(String message, String provider, Map<String, Object> metadata) {
        super(message, metadata);
        this.provider = provider;
    }
}
