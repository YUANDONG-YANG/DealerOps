package com.manager.exception;

import java.util.Map;

public class ConfigurationError extends AIError {
    public ConfigurationError(String message) {
        super(message);
    }

    public ConfigurationError(String message, Map<String, Object> metadata) {
        super(message, metadata);
    }
}
