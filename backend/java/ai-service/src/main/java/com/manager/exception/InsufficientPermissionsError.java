package com.manager.exception;

/** Python {@code InsufficientPermissionsError}. */
public class InsufficientPermissionsError extends AuthenticationError {
    public InsufficientPermissionsError(String message) {
        super(message);
    }
}
