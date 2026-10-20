package com.manager.exception;

/** Python {@code ProviderServiceError}. */
public class ProviderServiceError extends ProviderError {
    public ProviderServiceError(String message) {
        super(message);
    }

    public ProviderServiceError(String message, String provider) {
        super(message, provider);
    }
}
