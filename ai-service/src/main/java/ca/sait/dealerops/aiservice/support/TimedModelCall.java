package ca.sait.dealerops.aiservice.support;

import com.manager.core.AIResponse;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Library {@code blockOptional} has no 15s guarantee (PROTOCOL §D). Hard cap is connect +
 * response (2s+13s), not a single undifferentiated 15000. The {@link WebClient} bean carries the
 * same HttpClient split for any adapter-owned HTTP.
 */
@Component
public class TimedModelCall {

  private final WebClient aiWebClient;
  private final AiTimeouts timeouts;

  public TimedModelCall(WebClient aiWebClient, AiTimeouts timeouts) {
    this.aiWebClient = aiWebClient;
    this.timeouts = timeouts;
  }

  public WebClient aiWebClient() {
    return aiWebClient;
  }

  public AIResponse request(Supplier<AIResponse> call) {
    return request(timeouts.connectTimeoutMs(), timeouts.responseTimeoutMs(), call);
  }

  public static AIResponse request(int connectTimeoutMs, int responseTimeoutMs, Supplier<AIResponse> call) {
    long totalMs = (long) connectTimeoutMs + responseTimeoutMs;
    try {
      return CompletableFuture.supplyAsync(call)
          .orTimeout(totalMs, TimeUnit.MILLISECONDS)
          .join();
    } catch (CompletionException ex) {
      Throwable cause = ex.getCause() != null ? ex.getCause() : ex;
      if (cause instanceof TimeoutException) {
        throw ModelFailureException.timeout();
      }
      if (cause instanceof ModelFailureException mfe) {
        throw mfe;
      }
      throw ModelFailureException.providerFailed();
    }
  }
}
