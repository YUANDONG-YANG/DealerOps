package com.manager.exception;

import lombok.Getter;

import java.util.List;

@Getter
public class InvalidModelError extends ConfigurationError {
    private final String model;
    private final List<String> availableModels;

    public InvalidModelError(String message) {
        super(message);
        this.model = null;
        this.availableModels = List.of();
    }

    public InvalidModelError(String message, String model, List<String> availableModels) {
        super(message);
        this.model = model;
        this.availableModels = availableModels == null ? List.of() : List.copyOf(availableModels);
    }
}
