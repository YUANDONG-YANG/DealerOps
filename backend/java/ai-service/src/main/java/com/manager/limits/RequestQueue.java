package com.manager.limits;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Python {@code RequestQueue} — priority + FIFO; timeouts from queue front.
 * <p><b>Not thread-safe</b> — {@link RateLimiter} must hold its own monitor when calling.
 */
@Slf4j
public class RequestQueue {

    private final int maxSize;
    @Getter
    private final double defaultTimeoutSeconds;
    private final boolean enablePriorities;

    private final List<QueuedRequest> queue = new ArrayList<>();

    public RequestQueue(int maxSize, double defaultTimeoutSeconds, boolean enablePriorities) {
        this.maxSize = maxSize;
        this.defaultTimeoutSeconds = defaultTimeoutSeconds;
        this.enablePriorities = enablePriorities;
    }

    public boolean enqueue(String requestId, int tokensRequired, int priority, Double timeoutOverrideSeconds) {
        if (queue.size() >= maxSize) {
            log.warn("Request queue full, rejecting {}", requestId);
            return false;
        }
        double timeout = timeoutOverrideSeconds != null ? timeoutOverrideSeconds : defaultTimeoutSeconds;
        QueuedRequest req = new QueuedRequest(requestId, tokensRequired, Instant.now(), priority, timeout);

        if (enablePriorities && priority > 0) {
            int insertIndex = queue.size();
            for (int i = 0; i < queue.size(); i++) {
                if (queue.get(i).priority() > priority) {
                    insertIndex = i;
                    break;
                }
                insertIndex = i + 1;
            }
            queue.add(insertIndex, req);
        } else {
            queue.add(req);
        }
        log.debug("Queued request {} priority={} tokens={}", requestId, priority, tokensRequired);
        return true;
    }

    public QueuedRequest dequeue() {
        cleanupExpired();
        if (queue.isEmpty()) {
            return null;
        }
        QueuedRequest r = queue.remove(0);
        log.debug("Dequeued request {}", r.requestId());
        return r;
    }

    public QueuedRequest peek() {
        cleanupExpired();
        return queue.isEmpty() ? null : queue.get(0);
    }

    public boolean remove(String requestId) {
        if (requestId == null) {
            return false;
        }
        for (int i = 0; i < queue.size(); i++) {
            if (requestId.equals(queue.get(i).requestId())) {
                queue.remove(i);
                log.debug("Removed request {} from queue", requestId);
                return true;
            }
        }
        return false;
    }

    public void clear() {
        int n = queue.size();
        queue.clear();
        log.info("Cleared {} requests from queue", n);
    }

    public int size() {
        cleanupExpired();
        return queue.size();
    }

    private void cleanupExpired() {
        Instant now = Instant.now();
        while (!queue.isEmpty()) {
            QueuedRequest head = queue.get(0);
            double elapsed = Duration.between(head.queuedAt(), now).toMillis() / 1000.0;
            if (elapsed > head.timeoutSeconds()) {
                queue.remove(0);
                log.debug("Dropped expired queued request {}", head.requestId());
            } else {
                break;
            }
        }
    }

    public Map<String, Object> getStats() {
        cleanupExpired();
        if (queue.isEmpty()) {
            return Map.of(
                    "size", 0,
                    "max_size", maxSize,
                    "utilization", 0.0,
                    "oldest_request_age", 0.0,
                    "average_priority", 0.0
            );
        }
        Instant now = Instant.now();
        List<Double> ages = new ArrayList<>();
        List<Integer> prios = new ArrayList<>();
        for (QueuedRequest r : queue) {
            ages.add(Duration.between(r.queuedAt(), now).toMillis() / 1000.0);
            prios.add(r.priority());
        }
        double maxAge = ages.stream().mapToDouble(d -> d).max().orElse(0);
        double avgAge = ages.stream().mapToDouble(d -> d).average().orElse(0);
        double avgPrio = prios.stream().mapToInt(i -> i).average().orElse(0);
        return Map.of(
                "size", queue.size(),
                "max_size", maxSize,
                "utilization", (double) queue.size() / (double) maxSize,
                "oldest_request_age", maxAge,
                "average_age", avgAge,
                "average_priority", avgPrio
        );
    }
}
