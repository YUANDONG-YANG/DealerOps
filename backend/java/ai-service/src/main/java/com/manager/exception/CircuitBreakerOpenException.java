package com.manager.exception;

public class CircuitBreakerOpenException extends AIError {
    public CircuitBreakerOpenException(String message) {
        super(message);
    }
}
