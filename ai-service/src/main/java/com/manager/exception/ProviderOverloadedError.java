package com.manager.exception;

/** Python {@code ProviderOverloadedError}. */
public class ProviderOverloadedError extends ProviderServiceError {
    public ProviderOverloadedError(String message) {
        super(message);
    }

    public ProviderOverloadedError(String message, String provider) {
        super(message, provider);
    }
}
