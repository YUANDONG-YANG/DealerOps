package com.manager.core;

import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.Set;

@Getter
@EqualsAndHashCode
@ToString
@Builder
public class Message {

    private static final Set<String> VALID_ROLES = Set.of("user", "assistant", "system");

    private final String role;
    private final String content;
    @Builder.Default
    private final Map<String, Object> metadata;
    @Builder.Default
    private final Instant timestamp;

    private Message(String role, String content, Map<String, Object> metadata, Instant timestamp) {
        if (role == null || !VALID_ROLES.contains(role)) {
            throw new IllegalArgumentException("Invalid role: " + role);
        }
        this.role = role;
        this.content = content;
        this.metadata = metadata == null ? Collections.emptyMap() : Map.copyOf(metadata);
        this.timestamp = timestamp == null ? Instant.now() : timestamp;
    }

    public static Message user(String content) {
        return Message.builder().role("user").content(content).build();
    }

    public static Message assistant(String content) {
        return Message.builder().role("assistant").content(content).build();
    }

    public static Message system(String content) {
        return Message.builder().role("system").content(content).build();
    }
}
