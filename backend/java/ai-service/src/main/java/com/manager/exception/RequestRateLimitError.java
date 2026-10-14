package com.manager.exception;

/** Python {@code RequestRateLimitError}. */
public class RequestRateLimitError extends RateLimitError {
    public RequestRateLimitError(String message) {
        super(message);
    }

    public RequestRateLimitError(String message, Integer retryAfterSeconds) {
        super(message, retryAfterSeconds);
    }
}
