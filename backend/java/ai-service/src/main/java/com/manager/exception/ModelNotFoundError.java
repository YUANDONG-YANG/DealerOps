package com.manager.exception;

/** Python {@code ModelNotFoundError}. */
public class ModelNotFoundError extends ModelUnavailableError {
    public ModelNotFoundError(String message) {
        super(message);
    }

    public ModelNotFoundError(String message, String model, String suggestedReplacement) {
        super(message, model, suggestedReplacement);
    }
}
