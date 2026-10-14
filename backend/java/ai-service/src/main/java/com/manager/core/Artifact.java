package com.manager.core;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.ToString;

import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@EqualsAndHashCode
@ToString
@Builder(toBuilder = true)
public class Artifact {
    private final String artifactId;
    private final ArtifactType type;
    private final String filename;
    private final String content;
    private final String language;
    private final String title;
    private final String description;
    @Builder.Default
    private final int sizeBytes;
    @Builder.Default
    private final Instant createdAt;
    @Builder.Default
    private final String createdFromProvider;
    @Builder.Default
    private final String createdFromModel;
    @Builder.Default
    private final boolean executable;
    @Builder.Default
    private final String mimeType;
    @Builder.Default
    private final String encoding;
    private final String parentConversationId;
    private final String derivedFromArtifact;
    @Builder.Default
    private final Map<String, Object> metadata;

    private Artifact(
            String artifactId,
            ArtifactType type,
            String filename,
            String content,
            String language,
            String title,
            String description,
            int sizeBytes,
            Instant createdAt,
            String createdFromProvider,
            String createdFromModel,
            boolean executable,
            String mimeType,
            String encoding,
            String parentConversationId,
            String derivedFromArtifact,
            Map<String, Object> metadata) {
        this.artifactId =
                (artifactId == null || artifactId.isEmpty()) ? UUID.randomUUID().toString() : artifactId;
        this.type = type;
        this.filename = filename;
        this.content = content;
        this.language = language;
        this.title = title;
        this.description = description;
        String enc = encoding == null ? "utf-8" : encoding;
        Charset cs = encoding == null ? StandardCharsets.UTF_8 : Charset.forName(enc);
        int sz = sizeBytes;
        if (sz == 0 && content != null) {
            sz = content.getBytes(cs).length;
        }
        this.sizeBytes = sz;
        this.createdAt = createdAt;
        this.createdFromProvider = createdFromProvider;
        this.createdFromModel = createdFromModel;
        this.executable = executable;
        this.mimeType = mimeType == null ? "text/plain" : mimeType;
        this.encoding = enc;
        this.parentConversationId = parentConversationId;
        this.derivedFromArtifact = derivedFromArtifact;
        this.metadata = metadata == null ? Collections.emptyMap() : Map.copyOf(metadata);
    }

    private static final ObjectMapper JSON = new ObjectMapper();

    /**
     * Write content to a file or under a directory (uses {@link #getFilename()}).
     *
     * @param path      file path, or existing / creatable directory
     * @param overwrite if false and file exists, throws {@link FileAlreadyExistsException}
     * @return resolved file path
     */
    public Path save(Path path, boolean overwrite) throws IOException {
        Path filePath = Files.isDirectory(path) ? path.resolve(safeFilename(filename)) : path;
        if (filePath.getParent() != null) {
            Files.createDirectories(filePath.getParent());
        }
        if (Files.exists(filePath) && !overwrite) {
            throw new FileAlreadyExistsException(filePath.toString());
        }
        Charset cs = Charset.forName(encoding);
        Files.writeString(filePath, content != null ? content : "", cs);
        return filePath;
    }

    /** Python-style: record {@code saved_path} / {@code saved_at} in metadata (immutable copy). */
    public Artifact withSavedPath(Path savedFile) {
        if (savedFile == null) {
            return this;
        }
        Map<String, Object> m = new LinkedHashMap<>(metadata);
        m.put("saved_path", savedFile.toAbsolutePath().toString());
        m.put("saved_at", Instant.now().toString());
        return toBuilder().metadata(Map.copyOf(m)).build();
    }

    private static String safeFilename(String name) {
        if (name == null || name.isBlank()) {
            return "artifact.txt";
        }
        return name.replaceAll("[\\\\/:*?\"<>|]", "_");
    }

    /**
     * Python {@code Artifact.validate()} subset: empty content, size, encoding, JSON for DATA/SCHEMA.
     */
    public Map<String, Object> validate() {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        List<String> checks = new ArrayList<>();
        boolean valid = true;

        if (content == null || content.isBlank()) {
            valid = false;
            errors.add("Artifact content is empty");
        }
        checks.add("content_not_empty");

        if (sizeBytes > 10L * 1024 * 1024) {
            warnings.add("Artifact is very large (>10MB)");
        }
        checks.add("size_check");

        try {
            Charset cs = Charset.forName(encoding);
            (content != null ? content : "").getBytes(cs);
        } catch (Exception e) {
            valid = false;
            errors.add("Content cannot be encoded as " + encoding + ": " + e.getMessage());
        }
        checks.add("encoding_check");

        if (type == ArtifactType.DATA || type == ArtifactType.SCHEMA) {
            try {
                JSON.readTree(content != null ? content : "{}");
                checks.add("json_syntax");
            } catch (Exception e) {
                valid = false;
                errors.add("Invalid JSON: " + e.getMessage());
            }
        }

        if (type == ArtifactType.CODE || type == ArtifactType.SCRIPT) {
            long lines = content == null ? 0 : content.lines().count();
            if (lines > 1000) {
                warnings.add("Code artifact is very long (>1000 lines)");
            }
            checks.add("code_structure");
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("is_valid", valid);
        out.put("errors", errors);
        out.put("warnings", warnings);
        out.put("checks_performed", checks);
        return Collections.unmodifiableMap(out);
    }
}
