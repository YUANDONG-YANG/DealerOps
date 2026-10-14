package com.manager.exception;

import lombok.Getter;

@Getter
public class ModelUnavailableError extends ProviderError {
    private final String model;
    private final String suggestedReplacement;

    public ModelUnavailableError(String message) {
        super(message);
        this.model = null;
        this.suggestedReplacement = null;
    }

    public ModelUnavailableError(String message, String model, String suggestedReplacement) {
        super(message);
        this.model = model;
        this.suggestedReplacement = suggestedReplacement;
    }
}
