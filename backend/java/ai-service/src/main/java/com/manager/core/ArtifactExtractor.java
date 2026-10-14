package com.manager.core;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Minimal port of Python AIResponse.extract_artifacts (fenced code blocks only).
 */
public final class ArtifactExtractor {

    private static final Pattern FENCED = Pattern.compile("```(\\w*)\\s*\\n(.*?)\\n```", Pattern.DOTALL);

    private ArtifactExtractor() {}

    public static List<Artifact> extractFromContent(String content, String provider, String model) {
        if (content == null || content.isBlank()) {
            return List.of();
        }
        List<Artifact> out = new ArrayList<>();
        Matcher m = FENCED.matcher(content);
        int i = 0;
        while (m.find()) {
            String lang = m.group(1);
            String code = m.group(2) != null ? m.group(2).trim() : "";
            if (code.isEmpty()) {
                continue;
            }
            ArtifactType type = guessType(lang, code);
            String ext = extensionFor(lang, type);
            out.add(Artifact.builder()
                    .artifactId(UUID.randomUUID().toString())
                    .type(type)
                    .filename("extracted_" + i + ext)
                    .content(code)
                    .language(lang != null && !lang.isEmpty() ? lang.toLowerCase() : null)
                    .createdFromProvider(provider)
                    .createdFromModel(model)
                    .build());
            i++;
        }
        return List.copyOf(out);
    }

    private static ArtifactType guessType(String lang, String code) {
        if (lang == null || lang.isEmpty()) {
            if (code.stripLeading().startsWith("{") || code.stripLeading().startsWith("[")) {
                return ArtifactType.DATA;
            }
            return ArtifactType.CODE;
        }
        return switch (lang.toLowerCase()) {
            case "json", "yaml", "yml" -> ArtifactType.DATA;
            case "sql" -> ArtifactType.QUERY;
            case "html", "md", "markdown", "xml" -> ArtifactType.MARKUP;
            default -> ArtifactType.CODE;
        };
    }

    private static String extensionFor(String lang, ArtifactType type) {
        if (lang != null && !lang.isEmpty()) {
            return switch (lang.toLowerCase()) {
                case "python", "py" -> ".py";
                case "javascript", "js" -> ".js";
                case "json" -> ".json";
                case "sql" -> ".sql";
                case "markdown", "md" -> ".md";
                default -> ".txt";
            };
        }
        return type == ArtifactType.DATA ? ".json" : ".txt";
    }
}
