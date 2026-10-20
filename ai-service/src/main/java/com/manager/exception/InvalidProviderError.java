package com.manager.exception;

import lombok.Getter;

import java.util.List;

@Getter
public class InvalidProviderError extends ConfigurationError {
    private final String provider;
    private final List<String> availableProviders;

    public InvalidProviderError(String message, String provider, List<String> availableProviders) {
        super(message);
        this.provider = provider;
        this.availableProviders = availableProviders == null ? List.of() : List.copyOf(availableProviders);
    }
}
