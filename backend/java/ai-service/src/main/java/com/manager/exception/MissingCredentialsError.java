package com.manager.exception;

import lombok.Getter;

@Getter
public class MissingCredentialsError extends ConfigurationError {
    private final String requiredCredential;

    public MissingCredentialsError(String message) {
        super(message);
        this.requiredCredential = null;
    }

    public MissingCredentialsError(String message, String requiredCredential) {
        super(message);
        this.requiredCredential = requiredCredential;
    }
}
