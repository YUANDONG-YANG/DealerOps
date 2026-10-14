package ca.sait.dealerops.aiservice.support;

/** PROTOCOL §D: connect 2s + response 13s. {@code timeout-ms} is the sum only. */
public record AiTimeouts(int connectTimeoutMs, int responseTimeoutMs) {

  public AiTimeouts {
    if (connectTimeoutMs <= 0 || responseTimeoutMs <= 0) {
      throw new IllegalArgumentException("connect and response timeouts must be positive");
    }
  }

  public long totalMs() {
    return (long) connectTimeoutMs + responseTimeoutMs;
  }
}
