package com.manager.exception;

/** Python {@code InvalidAPIKeyError}. */
public class InvalidAPIKeyError extends AuthenticationError {
    public InvalidAPIKeyError(String message) {
        super(message);
    }
}
