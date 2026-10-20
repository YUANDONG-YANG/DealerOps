package com.manager.limits;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ProviderLimits {
    int requestsPerMinute;
    int tokensPerMinute;
    int concurrentRequests;
    @Builder.Default int burstAllowance = 10;
    @Builder.Default int maxTokensPerRequest = 8192;
    Integer dailyTokenLimit;
    Integer streamingRequestsPerMinute;
    Integer reasoningRequestsPerMinute;
}
