package com.manager.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

import java.util.Map;
import java.util.UUID;

/**
 * Structured logging facade (Python {@code AILogger} subset).
 */
public class AILogger {

    private final Logger log;
    private final LogConfig config;

    private AILogger(String name, LogConfig config) {
        this.log = LoggerFactory.getLogger(name);
        this.config = config != null ? config : LogConfig.builder().build();
    }

    public static AILogger getLogger(String name, LogConfig config) {
        return new AILogger(name, config);
    }

    public void logAiRequest(String provider, String model, String prompt, String requestId,
                             int estimatedTokens, Map<String, Object> params) {
        logAiRequest(provider, model, prompt, requestId, false, estimatedTokens, params);
    }

    public void logAiRequest(String provider, String model, String prompt, String requestId,
                             boolean enableReasoning, int estimatedTokens, Map<String, Object> params) {
        if (!config.isEnabled() || !config.isLogRequests()) {
            return;
        }
        String p = truncate(prompt);
        log.info("ai_request provider={} model={} requestId={} reasoning={} estTokens={} params={} prompt={}",
                provider, model, requestId, enableReasoning, estimatedTokens, params, p);
    }

    public void logAiResponse(String provider, String model, int responseLength, int tokensUsed,
                              double cost, double latencyMs, String requestId) {
        logAiResponse(provider, model, responseLength, tokensUsed, cost, latencyMs, requestId, false, 0);
    }

    public void logAiResponse(String provider, String model, int responseLength, int tokensUsed,
                              double cost, double latencyMs, String requestId,
                              boolean reasoningEnabled, int artifactsCount) {
        if (!config.isEnabled() || !config.isLogResponses()) {
            return;
        }
        log.info("ai_response provider={} model={} requestId={} chars={} tokens={} cost={} latencyMs={} reasoning={} artifacts={}",
                provider, model, requestId, responseLength, tokensUsed, cost, latencyMs, reasoningEnabled, artifactsCount);
    }

    public void logAiError(String provider, String model, Throwable error, String requestId, String operationId) {
        if (!config.isEnabled() || !config.isLogErrors()) {
            return;
        }
        log.error("ai_error provider={} model={} requestId={} operationId={} msg={}",
                provider, model, requestId, operationId, error.getMessage(), error);
    }

    public OperationScope operation(String name, Map<String, String> context) {
        if (!config.isEnabled()) {
            return OperationScope.noop();
        }
        String opId = UUID.randomUUID().toString();
        MDC.put("ai_operation", name);
        MDC.put("ai_operation_id", opId);
        if (context != null) {
            context.forEach(MDC::put);
        }
        return new OperationScopeImpl(opId);
    }

    private String truncate(String s) {
        if (s == null) {
            return "";
        }
        if (s.length() <= config.getMaxContentLength()) {
            return s;
        }
        return s.substring(0, config.getMaxContentLength()) + "...";
    }

    public interface OperationScope extends AutoCloseable {
        String getOperationId();

        /** Narrow {@link AutoCloseable#close()} so try-with-resources does not require {@code throws Exception}. */
        @Override
        void close();

        static OperationScope noop() {
            return new OperationScope() {
                @Override
                public String getOperationId() {
                    return "";
                }

                @Override
                public void close() {
                }
            };
        }
    }

    private static final class OperationScopeImpl implements OperationScope {
        private final String operationId;

        OperationScopeImpl(String operationId) {
            this.operationId = operationId;
        }

        @Override
        public String getOperationId() {
            return operationId;
        }

        @Override
        public void close() {
            MDC.remove("ai_operation");
            MDC.remove("ai_operation_id");
        }
    }
}
