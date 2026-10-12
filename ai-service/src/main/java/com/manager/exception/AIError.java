package com.manager.exception;

import lombok.Getter;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;

@Getter
public class AIError extends RuntimeException {

    private final Map<String, Object> metadata;
    private final Instant timestamp;

    public AIError(String message) {
        this(message, Collections.emptyMap());
    }

    public AIError(String message, Map<String, Object> metadata) {
        super(message);
        this.metadata = metadata == null ? Collections.emptyMap() : Map.copyOf(metadata);
        this.timestamp = Instant.now();
    }
}
