package com.manager.registry;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Model registry (Python {@code model_registry.ModelRegistry}): classpath / file load,
 * optional HTTP refresh (Claude / OpenAI / DeepSeek), JSON persistence.
 */
@Slf4j
public final class ModelRegistry {

    public static final String PROP_MODELS_JSON_PATH = "aimanager.models.json.path";
    public static final String ENV_MODELS_JSON_PATH = "AIMANAGER_MODELS_JSON_PATH";

    /** Providers with HTTP model-list refresh ({@link #updateProviderModels}). */
    private static final List<String> REGISTRY_PROVIDERS = List.of("claude", "openai", "deepseek", "groq");

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private static volatile ModelRegistry instance;

    private final Object mutationLock = new Object();
    private final AtomicReference<ObjectNode> rootRef;
    private volatile Path persistencePath;

    private ModelRegistry(ObjectNode root, Path persistencePath) {
        this.rootRef = new AtomicReference<>(root);
        this.persistencePath = persistencePath;
    }

    public static ModelRegistry getInstance() {
        if (instance == null) {
            synchronized (ModelRegistry.class) {
                if (instance == null) {
                    Path ext = resolveExternalPath();
                    instance = new ModelRegistry(loadInitial(ext), ext);
                }
            }
        }
        return instance;
    }

    /** Python {@code get_model_registry()}. */
    public static ModelRegistry getModelRegistry() {
        return getInstance();
    }

    private static Path resolveExternalPath() {
        String prop = System.getProperty(PROP_MODELS_JSON_PATH);
        if (prop != null && !prop.isBlank()) {
            return Path.of(prop);
        }
        String env = System.getenv(ENV_MODELS_JSON_PATH);
        if (env != null && !env.isBlank()) {
            return Path.of(env);
        }
        return null;
    }

    private static ObjectNode loadInitial(Path externalPath) {
        if (externalPath != null && Files.isRegularFile(externalPath)) {
            try {
                JsonNode n = MAPPER.readTree(Files.newInputStream(externalPath));
                if (n instanceof ObjectNode) {
                    log.info("Loaded models registry from {}", externalPath.toAbsolutePath());
                    return (ObjectNode) n;
                }
            } catch (Exception e) {
                log.warn("Failed to load external models.json {}: {}", externalPath, e.getMessage());
            }
        }
        try (InputStream in = ModelRegistry.class.getResourceAsStream("/models.json")) {
            if (in != null) {
                JsonNode n = MAPPER.readTree(in);
                if (n instanceof ObjectNode) {
                    return (ObjectNode) n;
                }
            }
        } catch (Exception e) {
            log.error("Failed to load classpath models.json: {}", e.getMessage());
        }
        log.warn("Using empty model registry structure");
        return emptyStructure();
    }

    private static ObjectNode emptyStructure() {
        ObjectNode root = MAPPER.createObjectNode();
        root.putNull("last_updated");
        ObjectNode providers = MAPPER.createObjectNode();
        for (String pid : REGISTRY_PROVIDERS) {
            ObjectNode prov = MAPPER.createObjectNode();
            prov.set("models", MAPPER.createArrayNode());
            prov.putNull("last_fetched");
            prov.put("api_endpoint", defaultEndpoint(pid));
            prov.set("aliases", MAPPER.createObjectNode());
            providers.set(pid, prov);
        }
        root.set("providers", providers);
        return root;
    }

    private static String defaultEndpoint(String provider) {
        return switch (provider) {
            case "claude" -> "https://api.anthropic.com/v1/models";
            case "openai" -> "https://api.openai.com/v1/models";
            case "deepseek" -> "https://api.deepseek.com/v1/models";
            case "groq" -> "https://api.groq.com/openai/v1/models";
            default -> "";
        };
    }

    public Path getPersistencePath() {
        return persistencePath;
    }

    /**
     * When set, {@link #updateProviderModels} / {@link #saveToFile(Path)} can persist automatically.
     */
    public void setPersistencePath(Path persistencePath) {
        this.persistencePath = persistencePath;
    }

    /** Reload from classpath / {@value #PROP_MODELS_JSON_PATH} / {@value #ENV_MODELS_JSON_PATH} (same rules as {@link #getInstance}). */
    public void reloadFromConfiguredSources() {
        Path ext = resolveExternalPath();
        synchronized (mutationLock) {
            persistencePath = ext;
            rootRef.set(loadInitial(ext));
        }
    }

    /** Load registry from a specific file (replaces in-memory root). */
    public void reloadFromFile(Path path) throws IOException {
        if (path == null || !Files.isRegularFile(path)) {
            throw new IOException("models file not found: " + path);
        }
        synchronized (mutationLock) {
            JsonNode n = MAPPER.readTree(Files.newInputStream(path));
            if (!(n instanceof ObjectNode)) {
                throw new IOException("models.json must be a JSON object");
            }
            rootRef.set((ObjectNode) n);
        }
    }

    /** Write current registry to path (pretty-printed). */
    public void saveToFile(Path path) throws IOException {
        if (path == null) {
            throw new IllegalArgumentException("path required");
        }
        synchronized (mutationLock) {
            persistUnlocked(rootRef.get(), path);
        }
    }

    /** Save to {@link #persistencePath} if set. */
    public void saveIfPersistenceConfigured() throws IOException {
        Path p = persistencePath;
        if (p == null) {
            return;
        }
        saveToFile(p);
    }

    private static void persistUnlocked(ObjectNode root, Path path) throws IOException {
        Files.createDirectories(path.getParent() != null ? path.getParent() : Path.of("."));
        MAPPER.writerWithDefaultPrettyPrinter().writeValue(path.toFile(), root);
        log.info("Saved model registry to {}", path.toAbsolutePath());
    }

    /**
     * Python {@code update_provider_models}: fetch models from provider API, merge, auto-aliases, optional save.
     *
     * @return number of model objects stored
     */
    public int updateProviderModels(String provider, String apiKey, String setAsDefault)
            throws IOException, InterruptedException {
        if (provider == null || !REGISTRY_PROVIDERS.contains(provider)) {
            throw new IllegalArgumentException("Unknown provider: " + provider);
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalArgumentException("API key required");
        }
        ArrayNode modelsArray = fetchModelsFromApi(provider, apiKey);
        synchronized (mutationLock) {
            ObjectNode root = rootRef.get().deepCopy();
            ObjectNode providers = ensureObject(root, "providers");
            ObjectNode prov = ensureObject(providers, provider);
            prov.set("models", modelsArray);
            prov.put("last_fetched", Instant.now().toString());

            List<String> ids = new ArrayList<>();
            for (JsonNode m : modelsArray) {
                if (m != null && m.has("id")) {
                    ids.add(m.get("id").asText());
                }
            }

            if (setAsDefault != null && !setAsDefault.isBlank()) {
                prov.put("default_model", setAsDefault);
            } else if (!ids.isEmpty()) {
                JsonNode cur = prov.get("default_model");
                if (cur == null || cur.isNull() || cur.asText().isBlank()) {
                    prov.put("default_model", ids.get(0));
                }
            }

            applyAutoAliases(provider, ids, prov);
            root.put("last_updated", Instant.now().toString());
            rootRef.set(root);

            if (persistencePath != null) {
                persistUnlocked(root, persistencePath);
            }
            return modelsArray.size();
        }
    }

    /**
     * Python {@code update_all_models}: calls {@link #updateProviderModels} only for non-blank keys in the map (avoids duplicate loops at call sites).
     */
    public Map<String, Integer> updateAllModels(Map<String, String> apiKeysByProvider)
            throws IOException, InterruptedException {
        Map<String, Integer> out = new LinkedHashMap<>();
        if (apiKeysByProvider == null || apiKeysByProvider.isEmpty()) {
            return Map.copyOf(out);
        }
        for (Map.Entry<String, String> e : apiKeysByProvider.entrySet()) {
            String p = e.getKey();
            String key = e.getValue();
            if (key == null || key.isBlank()) {
                continue;
            }
            if (!REGISTRY_PROVIDERS.contains(p)) {
                log.warn("updateAllModels: skip unknown provider {}", p);
                continue;
            }
            out.put(p, updateProviderModels(p, key, null));
        }
        return Collections.unmodifiableMap(out);
    }

    /**
     * Python {@code update_all_models(claude_key=..., openai_key=..., deepseek_key=..., groq_key=...)} — null/blank keys are skipped.
     */
    public Map<String, Integer> updateAllModels(String claudeKey, String openaiKey, String deepseekKey, String groqKey)
            throws IOException, InterruptedException {
        Map<String, String> keys = new LinkedHashMap<>();
        if (claudeKey != null && !claudeKey.isBlank()) {
            keys.put("claude", claudeKey);
        }
        if (openaiKey != null && !openaiKey.isBlank()) {
            keys.put("openai", openaiKey);
        }
        if (deepseekKey != null && !deepseekKey.isBlank()) {
            keys.put("deepseek", deepseekKey);
        }
        if (groqKey != null && !groqKey.isBlank()) {
            keys.put("groq", groqKey);
        }
        return updateAllModels(keys);
    }

    /** @deprecated Use {@link #updateAllModels(String, String, String, String)} with groq key, or {@link #updateAllModels(Map)}. */
    @Deprecated
    public Map<String, Integer> updateAllModels(String claudeKey, String openaiKey, String deepseekKey)
            throws IOException, InterruptedException {
        return updateAllModels(claudeKey, openaiKey, deepseekKey, null);
    }

    /**
     * Python {@code set_alias(provider, alias, model_id)} — persists when {@link #persistencePath} is set.
     */
    public void setAlias(String provider, String alias, String modelId) throws IOException {
        if (provider == null || !REGISTRY_PROVIDERS.contains(provider)) {
            throw new IllegalArgumentException("Unknown provider: " + provider);
        }
        if (alias == null || alias.isBlank() || modelId == null || modelId.isBlank()) {
            throw new IllegalArgumentException("alias and modelId required");
        }
        synchronized (mutationLock) {
            ObjectNode root = rootRef.get().deepCopy();
            ObjectNode providers = ensureObject(root, "providers");
            ObjectNode prov = ensureObject(providers, provider);
            ObjectNode aliases;
            JsonNode cur = prov.get("aliases");
            if (cur instanceof ObjectNode) {
                aliases = (ObjectNode) cur.deepCopy();
            } else {
                aliases = MAPPER.createObjectNode();
            }
            aliases.put(alias, modelId);
            prov.set("aliases", aliases);
            rootRef.set(root);
            if (persistencePath != null) {
                persistUnlocked(root, persistencePath);
            }
        }
    }

    private static ObjectNode ensureObject(ObjectNode parent, String field) {
        JsonNode n = parent.get(field);
        if (n instanceof ObjectNode) {
            return (ObjectNode) n;
        }
        ObjectNode created = MAPPER.createObjectNode();
        parent.set(field, created);
        return created;
    }

    private ArrayNode fetchModelsFromApi(String provider, String apiKey) throws IOException, InterruptedException {
        return switch (provider) {
            case "claude" -> fetchClaude(apiKey);
            case "openai" -> fetchOpenAiFiltered(apiKey);
            case "deepseek" -> fetchOpenAiCompatible("https://api.deepseek.com/v1/models", apiKey);
            case "groq" -> fetchOpenAiCompatible("https://api.groq.com/openai/v1/models", apiKey);
            default -> throw new IllegalArgumentException(provider);
        };
    }

    private ArrayNode fetchClaude(String apiKey) throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://api.anthropic.com/v1/models"))
                .timeout(Duration.ofSeconds(15))
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .GET()
                .build();
        return parseDataArray(send(req));
    }

    private ArrayNode fetchOpenAiFiltered(String apiKey) throws IOException, InterruptedException {
        ArrayNode all = fetchOpenAiCompatible("https://api.openai.com/v1/models", apiKey);
        ArrayNode gpt = MAPPER.createArrayNode();
        for (JsonNode m : all) {
            String id = m.path("id").asText("");
            String lower = id.toLowerCase();
            if (lower.contains("gpt") || lower.contains("chatgpt")) {
                gpt.add(m);
            }
        }
        log.info("OpenAI models: {} GPT entries (of {} total)", gpt.size(), all.size());
        return gpt;
    }

    private ArrayNode fetchOpenAiCompatible(String url, String apiKey) throws IOException, InterruptedException {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + apiKey)
                .GET()
                .build();
        return parseDataArray(send(req));
    }

    private String send(HttpRequest req) throws IOException, InterruptedException {
        HttpResponse<String> resp = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
            throw new IOException("HTTP " + resp.statusCode() + ": " + truncate(resp.body(), 500));
        }
        return resp.body();
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "...";
    }

    private ArrayNode parseDataArray(String jsonBody) throws IOException {
        JsonNode root = MAPPER.readTree(jsonBody);
        JsonNode data = root.get("data");
        if (data == null || !data.isArray()) {
            throw new IOException("Response missing data[]");
        }
        return (ArrayNode) data;
    }

    private void applyAutoAliases(String provider, List<String> modelIds, ObjectNode provNode) {
        if (modelIds.isEmpty()) {
            return;
        }
        ObjectNode aliases = MAPPER.createObjectNode();
        if ("claude".equals(provider)) {
            List<String> sonnet = modelIds.stream().filter(id -> id.toLowerCase().contains("sonnet")).toList();
            List<String> haiku = modelIds.stream().filter(id -> id.toLowerCase().contains("haiku")).toList();
            String sonnet0 = sonnet.isEmpty() ? modelIds.get(0) : sonnet.get(0);
            String haiku0 = haiku.isEmpty() ? modelIds.get(0) : haiku.get(0);
            aliases.put("latest", sonnet0);
            aliases.put("current", sonnet0);
            aliases.put("fast", haiku0);
            aliases.put("reasoning", sonnet0);
        } else if ("openai".equals(provider)) {
            List<String> gpt4o = modelIds.stream()
                    .filter(m -> m.contains("gpt-4o") && !m.contains("mini"))
                    .toList();
            List<String> gpt4oMini = modelIds.stream().filter(m -> m.contains("gpt-4o-mini")).toList();
            List<String> chatgpt = modelIds.stream().filter(m -> m.toLowerCase().contains("chatgpt")).toList();
            String latest = chatgpt.isEmpty() ? (gpt4o.isEmpty() ? modelIds.get(0) : gpt4o.get(0)) : chatgpt.get(0);
            String current = gpt4o.isEmpty() ? modelIds.get(0) : gpt4o.get(0);
            String fast = gpt4oMini.isEmpty() ? modelIds.get(0) : gpt4oMini.get(0);
            String reasoning = modelIds.contains("o1-mini") ? "o1-mini" : modelIds.get(0);
            aliases.put("latest", latest);
            aliases.put("current", current);
            aliases.put("fast", fast);
            aliases.put("reasoning", reasoning);
        } else if ("deepseek".equals(provider)) {
            List<String> chat = modelIds.stream().filter(m -> m.toLowerCase().contains("chat")).toList();
            List<String> reasoner = modelIds.stream()
                    .filter(m -> {
                        String l = m.toLowerCase();
                        return l.contains("reasoner") || l.contains("r1");
                    })
                    .toList();
            String chat0 = chat.isEmpty() ? modelIds.get(0) : chat.get(0);
            String r0 = reasoner.isEmpty() ? modelIds.get(0) : reasoner.get(0);
            aliases.put("latest", chat0);
            aliases.put("current", chat0);
            aliases.put("fast", chat0);
            aliases.put("reasoning", r0);
        } else if ("groq".equals(provider)) {
            List<String> llama = modelIds.stream().filter(m -> m.toLowerCase().contains("llama")).toList();
            List<String> mixtral = modelIds.stream().filter(m -> m.toLowerCase().contains("mixtral")).toList();
            String fast = modelIds.stream()
                    .filter(m -> {
                        String l = m.toLowerCase();
                        return l.contains("8b") || l.contains("instant") || l.contains("gemma");
                    })
                    .findFirst()
                    .orElse(modelIds.get(0));
            String large = modelIds.stream()
                    .filter(m -> {
                        String l = m.toLowerCase();
                        return l.contains("70b") || l.contains("versatile") || l.contains("405b");
                    })
                    .findFirst()
                    .orElse(llama.isEmpty() ? modelIds.get(0) : llama.get(0));
            String reason = mixtral.isEmpty() ? large : mixtral.get(0);
            aliases.put("latest", large);
            aliases.put("current", large);
            aliases.put("fast", fast);
            aliases.put("reasoning", reason);
        }
        provNode.set("aliases", aliases);
        log.info("Auto-updated aliases for {}: {}", provider, aliases);
    }

    private JsonNode root() {
        return rootRef.get();
    }

    public List<String> getModels(String provider) {
        JsonNode prov = root().path("providers").path(provider);
        JsonNode models = prov.path("models");
        if (!models.isArray()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (JsonNode m : models) {
            if (m.isTextual()) {
                out.add(m.asText());
            } else if (m.has("id")) {
                out.add(m.get("id").asText());
            }
        }
        return Collections.unmodifiableList(out);
    }

    public Map<String, String> getAliases(String provider) {
        JsonNode prov = root().path("providers").path(provider);
        JsonNode aliases = prov.path("aliases");
        if (!aliases.isObject()) {
            return Map.of();
        }
        Map<String, String> map = new LinkedHashMap<>();
        Iterator<String> it = aliases.fieldNames();
        while (it.hasNext()) {
            String k = it.next();
            map.put(k, aliases.get(k).asText());
        }
        return Collections.unmodifiableMap(map);
    }

    public String resolveAlias(String provider, String aliasOrModel) {
        if (aliasOrModel == null) {
            return null;
        }
        Map<String, String> aliases = getAliases(provider);
        String resolved = aliases.get(aliasOrModel);
        if (resolved != null) {
            return resolved;
        }
        if (isModelAvailable(provider, aliasOrModel)) {
            return aliasOrModel;
        }
        return null;
    }

    public boolean isModelAvailable(String provider, String modelId) {
        return getModels(provider).contains(modelId);
    }

    public String getDefaultModel(String provider) {
        JsonNode prov = root().path("providers").path(provider);
        if (prov.has("default_model") && !prov.get("default_model").isNull()) {
            String t = prov.get("default_model").asText();
            if (!t.isBlank()) {
                return t;
            }
        }
        List<String> models = getModels(provider);
        return models.isEmpty() ? null : models.get(0);
    }

    public String getLastUpdated() {
        JsonNode n = root().get("last_updated");
        return n != null && !n.isNull() ? n.asText() : null;
    }

    /**
     * Python {@code get_last_updated(provider)} — per-provider {@code last_fetched}; {@code null}/blank {@code provider} → {@link #getLastUpdated()} (global).
     */
    public String getLastUpdated(String provider) {
        if (provider == null || provider.isBlank()) {
            return getLastUpdated();
        }
        JsonNode n = root().path("providers").path(provider).get("last_fetched");
        if (n == null || n.isNull()) {
            return null;
        }
        String t = n.asText();
        return t.isBlank() ? null : t;
    }

    public Map<String, String> getModelListing(String provider, boolean includeReal, boolean includeAliases) {
        Map<String, String> out = new LinkedHashMap<>();
        if (includeAliases) {
            getAliases(provider).forEach((alias, id) -> out.put(alias, "Alias → " + id));
        }
        if (includeReal) {
            for (String id : getModels(provider)) {
                out.putIfAbsent(id, "Model: " + id);
            }
        }
        return Map.copyOf(out);
    }
}
