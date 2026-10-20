package com.manager.session;

import com.manager.core.AIConfig;
import com.manager.core.AIResponse;
import com.manager.core.Artifact;
import com.manager.core.ArtifactExtractor;
import com.manager.core.ArtifactType;
import com.manager.core.Message;
import com.manager.exception.RateLimitError;
import com.manager.limits.RateLimitLease;
import com.manager.limits.RateLimiter;
import com.manager.provider.BaseAIProvider;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Stateful conversation (Python {@code Conversation}).
 */
@Slf4j
public class Conversation {

    @Getter
    private final String conversationId;
    private final BaseAIProvider provider;
    private final AIConfig config;
    /** Optional; when set, {@link #executeRequest} uses the same acquire/release pattern as {@link com.manager.AiManager}. */
    @Getter
    private final RateLimiter rateLimiter;

    @Getter
    private final List<Message> messages = new ArrayList<>();
    @Getter
    private final Map<String, Object> metadata = new HashMap<>();
    /** Mutable list; use {@link #getArtifacts()} for an unmodifiable view. */
    private final List<Artifact> artifacts = new ArrayList<>();

    @Getter
    private Instant createdAt = Instant.now();
    @Getter
    private Instant lastActivity = Instant.now();
    @Getter
    private int totalTokensUsed;
    @Getter
    private double totalCost;

    public Conversation(BaseAIProvider provider, AIConfig config, String conversationId, String systemMessage) {
        this(provider, config, conversationId, systemMessage, null, null);
    }

    /**
     * Python {@code Conversation(..., **kwargs)} → initial {@link #metadata} entries.
     */
    public Conversation(
            BaseAIProvider provider,
            AIConfig config,
            String conversationId,
            String systemMessage,
            Map<String, Object> conversationKwargs) {
        this(provider, config, conversationId, systemMessage, conversationKwargs, null);
    }

    /**
     * Same as {@link #Conversation(BaseAIProvider, AIConfig, String, String, Map)} plus optional {@link RateLimiter} for turns.
     */
    public Conversation(
            BaseAIProvider provider,
            AIConfig config,
            String conversationId,
            String systemMessage,
            Map<String, Object> conversationKwargs,
            RateLimiter rateLimiter) {
        this.provider = provider;
        this.config = config != null ? config : AIConfig.builder().build();
        this.rateLimiter = rateLimiter;
        this.conversationId = conversationId != null ? conversationId : UUID.randomUUID().toString();
        if (systemMessage != null && !systemMessage.isBlank()) {
            messages.add(Message.builder()
                    .role("system")
                    .content(systemMessage)
                    .metadata(Map.of("conversation_id", this.conversationId))
                    .build());
        }
        if (conversationKwargs != null && !conversationKwargs.isEmpty()) {
            metadata.putAll(conversationKwargs);
        }
        log.info("Conversation created: {}", this.conversationId);
    }

    public ChainableRequest request(String prompt) {
        return new ChainableRequest(this, prompt);
    }

    public ChainableRequest request(String prompt, boolean enableReasoning, Double temperature, Integer maxTokens) {
        return request(prompt, enableReasoning, temperature, maxTokens, null);
    }

    /** Python {@code conversation.request(..., **kwargs)}. */
    public ChainableRequest request(
            String prompt,
            boolean enableReasoning,
            Double temperature,
            Integer maxTokens,
            Map<String, Object> kwargs) {
        ChainableRequest c = new ChainableRequest(this, prompt);
        if (enableReasoning) {
            c.withReasoning(true);
        }
        if (temperature != null) {
            c.withTemperature(temperature);
        }
        if (maxTokens != null) {
            c.withMaxTokens(maxTokens);
        }
        if (kwargs != null) {
            kwargs.forEach(c::withParam);
        }
        return c;
    }

    AIResponse executeRequest(String prompt, boolean enableReasoning, Map<String, Object> kwargs) {
        messages.add(Message.builder()
                .role("user")
                .content(prompt)
                .metadata(Map.of("conversation_id", conversationId))
                .build());

        Map<String, Object> requestParams = new HashMap<>();
        if (kwargs.containsKey("temperature")) {
            requestParams.put("temperature", kwargs.get("temperature"));
        } else if (config.getTemperature() != null) {
            requestParams.put("temperature", config.getTemperature());
        }
        if (kwargs.containsKey("max_tokens")) {
            requestParams.put("max_tokens", kwargs.get("max_tokens"));
        } else if (config.getMaxTokens() != null) {
            requestParams.put("max_tokens", config.getMaxTokens());
        }
        if (kwargs.containsKey("top_p")) {
            requestParams.put("top_p", kwargs.get("top_p"));
        } else if (config.getTopP() != null) {
            requestParams.put("top_p", config.getTopP());
        }
        kwargs.forEach((k, v) -> {
            if (!"temperature".equals(k) && !"max_tokens".equals(k) && !"top_p".equals(k)) {
                requestParams.put(k, v);
            }
        });
        requestParams.put("model", provider.getModel());

        List<Message> toSend = getContextMessages();
        String rlId = "conv_" + conversationId + "_" + System.nanoTime();
        int estTokens = Math.max(1, prompt.length() / 4);
        try (RateLimitLease lease = RateLimitLease.maybe(rateLimiter, rlId, estTokens)) {

            Instant start = Instant.now();
            AIResponse response = provider.complete(toSend, enableReasoning, requestParams);
            long latencyMs = java.time.Duration.between(start, Instant.now()).toMillis();

            var rb = response.toBuilder()
                    .latencyMs(latencyMs)
                    .conversationContext(conversationId);

            Map<String, Object> ameta = new HashMap<>(response.getMetadata());
            Map<String, Object> assistantMeta = new HashMap<>();
            assistantMeta.put("conversation_id", conversationId);
            assistantMeta.put("tokens_used", response.getTokensUsed());
            assistantMeta.put("cost", response.getCostEstimate());
            if (response.getThinkingTrace() != null) {
                assistantMeta.put("thinking_trace", response.getThinkingTrace());
            }
            Message assistant = Message.builder()
                    .role("assistant")
                    .content(response.getContent())
                    .metadata(assistantMeta)
                    .build();
            messages.add(assistant);

            totalTokensUsed += response.getTokensUsed();
            totalCost += response.getCostEstimate();
            lastActivity = Instant.now();

            if (config.isAutoExtractArtifacts()) {
                List<Artifact> extracted = ArtifactExtractor.extractFromContent(response.getContent(), "conversation", provider.getModel());
                List<Artifact> withParent = new ArrayList<>();
                for (Artifact a : extracted) {
                    withParent.add(Artifact.builder()
                            .artifactId(a.getArtifactId())
                            .type(a.getType())
                            .filename(a.getFilename())
                            .content(a.getContent())
                            .language(a.getLanguage())
                            .title(a.getTitle())
                            .description(a.getDescription())
                            .sizeBytes(a.getSizeBytes())
                            .createdAt(a.getCreatedAt())
                            .createdFromProvider(a.getCreatedFromProvider())
                            .createdFromModel(a.getCreatedFromModel())
                            .executable(a.isExecutable())
                            .mimeType(a.getMimeType())
                            .encoding(a.getEncoding())
                            .parentConversationId(conversationId)
                            .derivedFromArtifact(a.getDerivedFromArtifact())
                            .metadata(a.getMetadata())
                            .build());
                }
                if (!withParent.isEmpty()) {
                    artifacts.addAll(withParent);
                    List<Artifact> merged = new ArrayList<>(response.getArtifacts());
                    merged.addAll(withParent);
                    rb.artifacts(merged);
                }
            }

            AIResponse built = rb.metadata(ameta).build();
            lease.markSuccess();
            log.info("Conversation {}: {} chars, {} tokens", conversationId,
                    built.getContent() != null ? built.getContent().length() : 0, built.getTokensUsed());
            return built;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RateLimitError("Interrupted while waiting in rate limit queue");
        }
    }

    private List<Message> getContextMessages() {
        int max = config.getMaxHistoryLength();
        if (messages.size() <= max) {
            return List.copyOf(messages);
        }
        List<Message> head = new ArrayList<>();
        int i = 0;
        while (i < messages.size() && "system".equals(messages.get(i).getRole())) {
            head.add(messages.get(i));
            i++;
        }
        int tailStart = Math.max(i, messages.size() - (max - head.size()));
        List<Message> out = new ArrayList<>(head);
        out.addAll(messages.subList(tailStart, messages.size()));
        return out;
    }

    public Map<String, Object> addFile(String filePath, String description, String fileType) throws IOException {
        return addFile(filePath, description, fileType, null);
    }

    /**
     * Python {@code add_file(..., **kwargs)} — extra entries merged into message metadata.
     */
    public Map<String, Object> addFile(String filePath, String description, String fileType, Map<String, Object> extraMetadata) throws IOException {
        Path p = Path.of(filePath);
        if (!Files.exists(p)) {
            throw new java.io.FileNotFoundException("File not found: " + filePath);
        }
        String content;
        try {
            content = Files.readString(p, StandardCharsets.UTF_8);
        } catch (Exception e) {
            content = "[Binary file: " + p.getFileName() + "]";
        }
        long sizeBytes = Files.size(p);
        String fileDescription = description != null ? description : "File: " + p.getFileName();
        String block = fileDescription + "\n\n```" + (fileType != null ? fileType : "") + "\n" + content + "\n```";
        Map<String, Object> meta = new HashMap<>();
        meta.put("conversation_id", conversationId);
        meta.put("file_path", p.toString());
        meta.put("file_type", fileType != null ? fileType : getExtension(p));
        meta.put("file_size", sizeBytes);
        meta.put("is_file_attachment", true);
        if (extraMetadata != null) {
            meta.putAll(extraMetadata);
        }
        messages.add(Message.builder().role("user").content(block).metadata(meta).build());
        lastActivity = Instant.now();
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("file_path", p.toString());
        info.put("description", fileDescription);
        info.put("file_type", meta.get("file_type"));
        info.put("size_bytes", sizeBytes);
        info.put("added_at", Instant.now().toString());
        return Collections.unmodifiableMap(info);
    }

    /** Python {@code get_history}. */
    public List<Map<String, Object>> getHistory(boolean includeSystem, boolean includeFiles) {
        List<Map<String, Object>> history = new ArrayList<>();
        for (Message msg : messages) {
            if (!includeSystem && "system".equals(msg.getRole())) {
                continue;
            }
            if (!includeFiles && Boolean.TRUE.equals(msg.getMetadata().get("is_file_attachment"))) {
                continue;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("role", msg.getRole());
            row.put("content", msg.getContent());
            row.put("timestamp", msg.getTimestamp() != null ? msg.getTimestamp().toString() : null);
            row.put("metadata", msg.getMetadata());
            history.add(Collections.unmodifiableMap(row));
        }
        return history;
    }

    /** Python {@code clear_history}. */
    public void clearHistory(boolean keepSystem) {
        if (keepSystem) {
            messages.removeIf(m -> !"system".equals(m.getRole()));
        } else {
            messages.clear();
        }
        totalTokensUsed = 0;
        totalCost = 0.0;
        lastActivity = Instant.now();
        log.info("Cleared history for conversation {}", conversationId);
    }

    /** Python {@code get_stats}. */
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("conversation_id", conversationId);
        stats.put("created_at", createdAt.toString());
        stats.put("last_activity", lastActivity.toString());
        stats.put("message_count", messages.size());
        stats.put("total_tokens_used", totalTokensUsed);
        stats.put("total_cost", totalCost);
        stats.put("provider", provider.getClass().getSimpleName());
        stats.put("model", provider.getModel());
        stats.put("artifact_count", artifacts.size());
        stats.put("artifacts_by_type", getArtifactsByTypeCount());
        return stats;
    }

    /** Python {@code get_artifacts} with optional filters. */
    public List<Artifact> getArtifacts(ArtifactType artifactType, String language) {
        return artifacts.stream()
                .filter(a -> artifactType == null || a.getType() == artifactType)
                .filter(a -> language == null || language.isBlank()
                        || (a.getLanguage() != null && a.getLanguage().equalsIgnoreCase(language)))
                .toList();
    }

    /** All artifacts (defensive copy, unmodifiable). */
    public List<Artifact> getArtifacts() {
        return List.copyOf(artifacts);
    }

    /** Python {@code save_all_artifacts}. */
    public List<Path> saveAllArtifacts(Path directory, boolean overwrite) {
        try {
            Files.createDirectories(directory);
        } catch (IOException e) {
            log.error("Cannot create directory {}: {}", directory, e.getMessage());
            return List.of();
        }
        List<Path> saved = new ArrayList<>();
        for (int i = 0; i < artifacts.size(); i++) {
            Artifact artifact = artifacts.get(i);
            try {
                Path p = artifact.save(directory, overwrite);
                artifacts.set(i, artifact.withSavedPath(p));
                saved.add(p);
            } catch (Exception e) {
                log.error("Failed to save artifact {}: {}", artifact.getArtifactId(), e.getMessage());
            }
        }
        return saved;
    }

    /** Python {@code validate_all_artifacts}. */
    public Map<String, Object> validateAllArtifacts() {
        int valid = 0;
        int invalid = 0;
        int withWarnings = 0;
        List<Map<String, Object>> details = new ArrayList<>();
        for (Artifact a : artifacts) {
            Map<String, Object> validation = a.validate();
            boolean isValid = Boolean.TRUE.equals(validation.get("is_valid"));
            if (isValid) {
                valid++;
            } else {
                invalid++;
            }
            @SuppressWarnings("unchecked")
            List<String> warns = (List<String>) validation.get("warnings");
            if (warns != null && !warns.isEmpty()) {
                withWarnings++;
            }
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("artifact_id", a.getArtifactId());
            row.put("filename", a.getFilename());
            row.put("type", a.getType().getValue());
            row.put("validation", validation);
            details.add(row);
        }
        Map<String, Object> results = new LinkedHashMap<>();
        results.put("total_artifacts", artifacts.size());
        results.put("valid_artifacts", valid);
        results.put("invalid_artifacts", invalid);
        results.put("artifacts_with_warnings", withWarnings);
        results.put("validation_details", details);
        return results;
    }

    public Optional<Artifact> findArtifact(String artifactId) {
        if (artifactId == null) {
            return Optional.empty();
        }
        return artifacts.stream().filter(a -> artifactId.equals(a.getArtifactId())).findFirst();
    }

    public boolean removeArtifact(String artifactId) {
        if (artifactId == null) {
            return false;
        }
        Iterator<Artifact> it = artifacts.iterator();
        while (it.hasNext()) {
            if (artifactId.equals(it.next().getArtifactId())) {
                it.remove();
                log.info("Removed artifact {} from conversation {}", artifactId, conversationId);
                return true;
            }
        }
        return false;
    }

    /** Python {@code __len__} — message count. */
    public int getMessageCount() {
        return messages.size();
    }

    private Map<String, Integer> getArtifactsByTypeCount() {
        Map<String, Integer> counts = new HashMap<>();
        for (Artifact a : artifacts) {
            String key = a.getType().getValue();
            counts.merge(key, 1, Integer::sum);
        }
        return counts;
    }

    private static String getExtension(Path p) {
        String n = p.getFileName().toString();
        int dot = n.lastIndexOf('.');
        return dot > 0 ? n.substring(dot) : "";
    }

    @Override
    public String toString() {
        String idShort = conversationId.length() > 8 ? conversationId.substring(0, 8) : conversationId;
        return "Conversation(id=" + idShort + "..., messages=" + messages.size() + ", tokens=" + totalTokensUsed + ")";
    }
}
