package com.manager.logging;

import lombok.Builder;
import lombok.Value;

/**
 * Subset of Python {@code LogConfig}.
 */
@Value
@Builder
public class LogConfig {
    @Builder.Default
    boolean enabled = true;
    @Builder.Default
    boolean logRequests = true;
    @Builder.Default
    boolean logResponses = true;
    @Builder.Default
    boolean logErrors = true;
    @Builder.Default
    int maxContentLength = 1000;

    public static LogConfig enabledDefaults() {
        return LogConfig.builder().enabled(true).build();
    }
}
