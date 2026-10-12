package com.manager.exception;

public class AuthenticationError extends ProviderError {
    public AuthenticationError(String message) {
        super(message, null);
    }
}
