package com.manager.core;

public final class AIErrorCodes {
    private AIErrorCodes() {}

    public static final String API_ERROR = "api_error";
    public static final String RATE_LIMIT = "rate_limit";
    public static final String AUTHENTICATION = "authentication";
    public static final String TIMEOUT = "timeout";
    public static final String SERVICE_UNAVAILABLE = "service_unavailable";
    public static final String INVALID_INPUT = "invalid_input";
    public static final String CONTENT_FILTER = "content_filter";
    public static final String TOKEN_LIMIT = "token_limit";
    public static final String CONTEXT_LENGTH = "context_length";
    public static final String MODEL_UNAVAILABLE = "model_unavailable";
    public static final String UNSUPPORTED_FEATURE = "unsupported_feature";
    public static final String NETWORK_ERROR = "network_error";
    public static final String CONNECTION_ERROR = "connection_error";
    public static final String UNKNOWN_ERROR = "unknown_error";
    public static final String INTERNAL_ERROR = "internal_error";
}
