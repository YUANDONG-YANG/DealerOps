package com.manager.limits;

import java.time.Instant;

/**
 * Python {@code strategies.QueuedRequest} — waiting for rate limit clearance.
 */
public record QueuedRequest(
        String requestId,
        int tokensRequired,
        Instant queuedAt,
        int priority,
        double timeoutSeconds
) {
}
