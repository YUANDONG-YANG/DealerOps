package com.manager.exception;

/** Python {@code ProviderTimeoutError}. */
public class ProviderTimeoutError extends ProviderServiceError {
    public ProviderTimeoutError(String message) {
        super(message);
    }

    public ProviderTimeoutError(String message, String provider) {
        super(message, provider);
    }
}
